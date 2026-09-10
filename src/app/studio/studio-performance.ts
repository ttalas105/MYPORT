import type { WebGLRenderer } from 'three';

/** Opt-in, local console measurements. No telemetry or GPU synchronization. */
export class StudioPerformance {
  private previous = 0;
  private started = 0;
  private intervals: number[] = [];
  private cpu: number[] = [];
  private calls = 0;
  private triangles = 0;

  record(now: number, cpuMs: number, renderer: WebGLRenderer, view: number, quality: string): void {
    if (!this.started) this.started = now;
    if (this.previous && now - this.previous < 250) {
      this.intervals.push(now - this.previous);
      this.cpu.push(cpuMs);
      this.calls += renderer.info.render.calls;
      this.triangles += renderer.info.render.triangles;
    }
    this.previous = now;
    if (now - this.started < 5000 || !this.intervals.length) return;
    const count = this.intervals.length;
    const mean = (values: number[]) => values.reduce((sum, n) => sum + n, 0) / values.length;
    const p95 = (values: number[]) => values.sort((a, b) => a - b)[Math.floor((values.length - 1) * .95)];
    console.info('[studio-performance]', JSON.stringify({
      quality,
      view: Math.round(view * 100) / 100,
      fps: Math.round(1000 / mean(this.intervals)),
      frameP95Ms: Math.round(p95(this.intervals) * 10) / 10,
      cpuP95Ms: Math.round(p95(this.cpu) * 10) / 10,
      drawCalls: Math.round(this.calls / count), triangles: Math.round(this.triangles / count),
      pixels: renderer.domElement.width * renderer.domElement.height,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
    }));
    this.started = now;
    this.intervals = [];
    this.cpu = [];
    this.calls = this.triangles = 0;
  }

  idle(): void {
    this.previous = this.started = this.calls = this.triangles = 0;
    this.intervals = [];
    this.cpu = [];
    console.info('[studio-performance]', JSON.stringify({ idle: true, reason: 'exterior settled' }));
  }
}
