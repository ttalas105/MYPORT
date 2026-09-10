export type StudioQualityLevel = 'high' | 'balanced' | 'low';

/** Canvas quality only: HTML, camera framing and project content stay independent. */
export function studioPixelRatio(width: number, height: number, deviceRatio: number, level: StudioQualityLevel): number {
  const settings = { high: [1.5, 3_000_000], balanced: [1.25, 2_000_000], low: [1, 1_250_000] }[level];
  return Math.max(.5, Math.min(Math.max(1, deviceRatio), settings[0], Math.sqrt(settings[1] / Math.max(1, width * height))));
}

/** Sustained slow movement lowers quality; isolated stalls and idle frames do not. */
export class StudioQuality {
  level: StudioQualityLevel;
  private samples: number[] = [];
  private cooldown = 0;

  constructor(constrained: boolean) { this.level = constrained ? 'balanced' : 'high'; }

  observe(frameMs: number, moving: boolean, now: number): boolean {
    if (!moving || !Number.isFinite(frameMs) || frameMs <= 0 || now < this.cooldown) {
      this.samples = [];
      return false;
    }
    this.samples.push(Math.min(frameMs, 250));
    if (this.samples.length < 60) return false;
    const sorted = this.samples.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.samples = [];
    if (median < 24 || this.level === 'low') return false;
    this.level = this.level === 'high' ? 'balanced' : 'low';
    this.cooldown = now + 4000;
    return true;
  }
}

/** Pace render work independently of high-refresh displays. */
export class StudioFrameBudget {
  private next = 0;
  private rate = 0;
  shouldRender(now: number, moving: boolean): boolean {
    const rate = moving ? 60 : 30;
    if (rate !== this.rate) { this.rate = rate; this.next = now; }
    if (now + .5 < this.next) return false;
    const interval = 1000 / rate;
    this.next = this.next && now - this.next < interval ? this.next + interval : now + interval;
    return true;
  }
}
