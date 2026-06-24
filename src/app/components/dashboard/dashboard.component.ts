import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ViewCounterService } from '../../services/view-counter.service';
import { ThemeService } from '../../services/theme.service';

type SortMode = 'important' | 'cool';
type BubbleId = 'sort' | 'connect' | 'location' | 'counter' | 'now' | 'theme' | 'accent';
type BubblePosition = { top: number; left: number };
type BubbleLayouts = Record<SortMode, Partial<Record<BubbleId, BubblePosition>>>;
type ConnectorLine = { x1: number; y1: number; x2: number; y2: number };

type DragState = {
  id: BubbleId;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  @ViewChild('bento') private bento?: ElementRef<HTMLElement>;

  private counter = inject(ViewCounterService);
  private storageKey = 'portfolio:bubble-layout-debug:v1';
  theme = inject(ThemeService);

  totalClicks = signal<number | null>(null);
  localClicks = signal(0);
  sortMode = signal<SortMode>('important');
  debugEnabled = signal(false);
  layoutLocked = signal(false);
  copiedLayout = signal(false);
  layouts = signal<BubbleLayouts>({ important: {}, cool: {} });
  connectorLines = signal<ConnectorLine[]>([
    { x1: 12, y1: -93, x2: 165, y2: 227 },
    { x1: 165, y1: 227, x2: 634, y2: 345 },
    { x1: 634, y1: 345, x2: 980, y2: 102 },
    { x1: 980, y1: 102, x2: 1062, y2: 676 },
    { x1: 1062, y1: 676, x2: 395, y2: 764 },
    { x1: 1062, y1: 676, x2: 1271, y2: 518 },
  ]);
  private dragState: DragState | null = null;
  private connectorAnimation: number | null = null;

  ngOnInit(): void {
    this.loadLayouts();
    this.counter.hit('clicks').subscribe((res) => {
      if (res) this.totalClicks.set(res.value);
    });
  }

  click(): void {
    if (this.debugEnabled()) return;
    this.localClicks.update((n) => n + 1);
    this.counter.hit('clicks').subscribe((res) => {
      if (res) this.totalClicks.set(res.value);
    });
  }

  onSpace(event: Event): void {
    event.preventDefault();
    this.click();
  }

  setSortMode(mode: SortMode): void {
    if (mode === this.sortMode()) return;
    this.sortMode.set(mode);
    this.animateConnectors(mode);
  }

  toggleDebug(): void {
    this.debugEnabled.update((enabled) => !enabled);
  }

  toggleLock(): void {
    this.layoutLocked.update((locked) => !locked);
    this.saveLayouts();
  }

  resetCurrentLayout(): void {
    const mode = this.sortMode();
    this.layouts.update((layouts) => ({ ...layouts, [mode]: {} }));
    this.saveLayouts();
  }

  async copyLayout(): Promise<void> {
    const text = this.layoutJson();
    await navigator.clipboard?.writeText(text);
    this.copiedLayout.set(true);
    window.setTimeout(() => this.copiedLayout.set(false), 1400);
  }

  layoutJson(): string {
    return JSON.stringify(this.layouts(), null, 2);
  }

  bubbleTop(id: BubbleId): string | null {
    const position = this.layouts()[this.sortMode()][id];
    return position ? `${position.top}px` : null;
  }

  bubbleLeft(id: BubbleId): string | null {
    const position = this.layouts()[this.sortMode()][id];
    return position ? `${position.left}px` : null;
  }

  startDrag(event: PointerEvent, id: BubbleId): void {
    if (!this.debugEnabled() || this.layoutLocked()) return;
    if ((event.target as HTMLElement).closest('a, button')) return;

    const bentoRect = this.bento?.nativeElement.getBoundingClientRect();
    const cardRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!bentoRect) return;

    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragState = {
      id,
      offsetX: event.clientX - cardRect.left,
      offsetY: event.clientY - cardRect.top,
      width: cardRect.width,
      height: cardRect.height,
    };
    this.setBubblePosition(id, {
      top: Math.round(cardRect.top - bentoRect.top),
      left: Math.round(cardRect.left - bentoRect.left),
    });
  }

  drag(event: PointerEvent): void {
    if (!this.dragState || !this.bento) return;

    const bentoRect = this.bento.nativeElement.getBoundingClientRect();
    const maxLeft = bentoRect.width - this.dragState.width;
    const maxTop = bentoRect.height - this.dragState.height;
    const left = this.clamp(event.clientX - bentoRect.left - this.dragState.offsetX, -420, maxLeft + 120);
    const top = this.clamp(event.clientY - bentoRect.top - this.dragState.offsetY, -360, maxTop + 80);

    this.setBubblePosition(this.dragState.id, {
      top: Math.round(top),
      left: Math.round(left),
    });
  }

  endDrag(): void {
    if (!this.dragState) return;
    this.dragState = null;
    this.saveLayouts();
  }

  private setBubblePosition(id: BubbleId, position: BubblePosition): void {
    const mode = this.sortMode();
    this.layouts.update((layouts) => ({
      ...layouts,
      [mode]: {
        ...layouts[mode],
        [id]: position,
      },
    }));
  }

  private loadLayouts(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;

    try {
      this.layouts.set(JSON.parse(raw) as BubbleLayouts);
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  private saveLayouts(): void {
    localStorage.setItem(this.storageKey, this.layoutJson());
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private animateConnectors(mode: SortMode): void {
    const from = this.connectorLines();
    const to = this.connectorLineTargets(mode);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.connectorLines.set(to);
      return;
    }

    if (this.connectorAnimation !== null) {
      cancelAnimationFrame(this.connectorAnimation);
    }

    const start = performance.now();
    const duration = 720;
    const tick = (now: number) => {
      const progress = this.clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.connectorLines.set(to.map((target, index) => {
        const source = from[index] ?? target;
        return {
          x1: this.lerp(source.x1, target.x1, eased),
          y1: this.lerp(source.y1, target.y1, eased),
          x2: this.lerp(source.x2, target.x2, eased),
          y2: this.lerp(source.y2, target.y2, eased),
        };
      }));

      if (progress < 1) {
        this.connectorAnimation = requestAnimationFrame(tick);
      } else {
        this.connectorAnimation = null;
      }
    };

    this.connectorAnimation = requestAnimationFrame(tick);
  }

  private connectorLineTargets(mode: SortMode): ConnectorLine[] {
    if (mode === 'cool') {
      return [
        { x1: 12, y1: -93, x2: 161, y2: 225 },
        { x1: 161, y1: 225, x2: 735, y2: 237 },
        { x1: 735, y1: 237, x2: 1125, y2: 661 },
        { x1: 1125, y1: 661, x2: 643, y2: 691 },
        { x1: 643, y1: 691, x2: 150, y2: 722 },
        { x1: 150, y1: 722, x2: 150, y2: 722 },
      ];
    }

    return [
      { x1: 12, y1: -93, x2: 165, y2: 227 },
      { x1: 165, y1: 227, x2: 634, y2: 345 },
      { x1: 634, y1: 345, x2: 980, y2: 102 },
      { x1: 980, y1: 102, x2: 1062, y2: 676 },
      { x1: 1062, y1: 676, x2: 395, y2: 764 },
      { x1: 1062, y1: 676, x2: 1271, y2: 518 },
    ];
  }

  private lerp(start: number, end: number, progress: number): number {
    return Math.round((start + (end - start) * progress) * 10) / 10;
  }
}
