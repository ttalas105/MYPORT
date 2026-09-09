import {
  AfterViewInit,
  Component,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  signal,
  computed,
  inject,
} from '@angular/core';
import { SystemSceneComponent } from './system-scene.component';
import { STUDIO_CITY_APPROACH, STUDIO_LOOK_AROUND, STUDIO_STOPS, STUDIO_STORY_HEIGHT_SVH, studioProgressFromScroll, studioScrollFromProgress } from './studio/studio-route';
import { PROJECT_DETAILS, ProjectDetail } from './project-details';
import { STUDIO_ABOUT } from './studio/studio-about';
import { StudioAudioService } from './studio/studio-audio.service';
import { StudioMusicComponent } from './studio/studio-music.component';
import { STUDIO_ALL_ALBUMS, StudioAlbum } from './studio/studio-albums';

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [SystemSceneComponent, StudioMusicComponent],
  providers: [StudioAudioService],
  templateUrl: './portfolio-page.component.html',
})
export class PortfolioPageComponent implements AfterViewInit, OnDestroy {
  readonly storyHeight = STUDIO_STORY_HEIGHT_SVH;
  readonly about = STUDIO_ABOUT;
  readonly audio = inject(StudioAudioService);
  @ViewChild('story', { static: true }) private readonly storyRef!: ElementRef<HTMLElement>;
  @ViewChild('indexTrigger', { static: true }) private readonly indexTriggerRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('musicTrigger', { static: true }) private readonly musicTriggerRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('indexDialog') set indexDialog(ref: ElementRef<HTMLElement> | undefined) {
    this.indexDialogElement = ref?.nativeElement;
  }
  @ViewChild('projectDialog') set projectDialog(ref: ElementRef<HTMLElement> | undefined) {
    this.projectDialogElement = ref?.nativeElement;
    if (ref) queueMicrotask(() => this.projectDialogElement?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }));
  }
  @ViewChild('albumDialog') set albumDialog(ref: ElementRef<HTMLElement> | undefined) {
    this.albumDialogElement = ref?.nativeElement;
    if (ref) queueMicrotask(() => {
      if (this.detailAlbum()) this.albumDialogElement?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    });
  }
  @ViewChild('aboutDialog') set aboutDialog(ref: ElementRef<HTMLElement> | undefined) {
    this.aboutResizeObserver?.disconnect();
    this.aboutDialogElement = ref?.nativeElement;
    if (ref) queueMicrotask(() => {
      const bubble = ref.nativeElement;
      if (this.aboutDialogElement !== bubble) return;
      this.positionAboutBubble();
      this.aboutResizeObserver = new ResizeObserver(() => this.positionAboutBubble());
      this.aboutResizeObserver.observe(bubble);
      if (this.aboutTrigger) this.aboutResizeObserver.observe(this.aboutTrigger);
      bubble.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
      this.presentAboutBubble();
    });
  }

  private indexDialogElement?: HTMLElement;
  private aboutDialogElement?: HTMLElement;
  private aboutResizeObserver?: ResizeObserver;
  private aboutTrigger?: HTMLElement;
  private aboutOpenedWithPointer = false;
  private aboutScrollProgress = 0;
  private aboutPresentationFrame = 0;
  private aboutRemovalTimer?: ReturnType<typeof setTimeout>;
  private projectDialogElement?: HTMLElement;
  private projectTrigger?: HTMLElement;
  private projectScrollProgress = 0;
  private albumDialogElement?: HTMLElement;
  private albumScrollProgress = 0;
  private albumRemovalTimer?: ReturnType<typeof setTimeout>;
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly chapters = ['Thomas Talas', 'Stanley for YouTube', 'OKRA', 'Portal V2', 'Tapi', 'Get in touch'] as const;

  readonly indexProjects = [
    { chapter: 1, title: 'Stanley for YouTube', description: 'Creative tools for YouTube.', context: 'Independent project.' },
    { chapter: 2, title: 'OKRA', description: 'Operational metrics.', context: 'Built from scratch at TapMango.' },
    { chapter: 3, title: 'Portal V2', description: 'Merchant tools.', context: 'A team redesign at TapMango.' },
    { chapter: 4, title: 'Tapi', description: 'AI for TapMango.', context: 'Reporting, knowledge, and memory.' },
  ];

  readonly activeChapter = signal(0);
  readonly captionChapter = signal<number | null>(0);
  readonly studioReady = signal(false);
  readonly atEntrance = signal(true);
  readonly studioUnavailable = signal(false);
  readonly indexOpen = signal(false);
  readonly indexPreview = signal<number | null>(null);
  readonly musicOpen = signal(false);
  readonly detailProject = signal<ProjectDetail | null>(null);
  readonly readerPositions = signal<Record<number, number>>({});
  readonly detailAlbum = signal<StudioAlbum | null>(null);
  readonly leavingAlbum = signal<StudioAlbum | null>(null);
  readonly albumReaderLeft = signal<number | null>(null);
  readonly aboutOpen = signal(false);
  readonly aboutPresented = signal(false);
  readonly aboutLeaving = signal(false);
  readonly aboutOcclusion = signal({ header: false, intro: false, rail: false });
  readonly scrollCueVisible = computed(() => this.studioReady() && this.activeChapter() < 5 &&
    !this.indexOpen() && this.indexPreview() === null && !this.detailProject() &&
    !this.detailAlbum() && !this.leavingAlbum() && !this.aboutOpen() && !this.aboutLeaving());

  private animationFrame = 0;
  private entranceFrame = 0;
  private entranceController?: AbortController;

  ngAfterViewInit(): void {
    window.addEventListener('scroll', this.requestUpdate, { passive: true });
    window.addEventListener('resize', this.requestUpdate, { passive: true });
    this.updateStory();
  }

  ngOnDestroy(): void {
    this.cancelEntranceWalk();
    this.aboutResizeObserver?.disconnect();
    cancelAnimationFrame(this.aboutPresentationFrame);
    clearTimeout(this.aboutRemovalTimer);
    clearTimeout(this.albumRemovalTimer);
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('scroll', this.requestUpdate);
    window.removeEventListener('resize', this.requestUpdate);
  }

  closeIndex(): void {
    if (!this.indexOpen()) return;
    this.indexPreview.set(null);
    this.indexOpen.set(false);
    this.changeDetector.detectChanges();
    requestAnimationFrame(() => {
      if (!this.indexOpen() && !this.detailProject() && !this.detailAlbum()) this.indexTriggerRef.nativeElement.focus({ preventScroll: true });
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') this.aboutTrigger?.classList.remove('pointer-focus-return');
    if (this.musicOpen() && event.key === 'Escape') {
      event.preventDefault();
      this.setMusicOpen(false);
      return;
    }
    const dialog = this.aboutOpen() ? this.aboutDialogElement : this.detailAlbum() ? this.albumDialogElement : this.detailProject() ? this.projectDialogElement : this.indexOpen() ? this.indexDialogElement : undefined;
    if (!dialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.aboutOpen()) this.closeAbout();
      else if (this.detailAlbum()) this.closeAlbum();
      else if (this.detailProject()) this.closeProject();
      else this.closeIndex();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), summary, [tabindex="0"]'))
      .filter(control => control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  toggleIndex(): void {
    this.cancelEntranceWalk();
    this.musicOpen.set(false);
    if (this.indexOpen()) this.closeIndex();
    else {
      this.indexOpen.set(true);
      this.changeDetector.detectChanges();
      requestAnimationFrame(() => {
        if (!this.indexOpen()) return;
        this.indexDialogElement?.querySelector<HTMLElement>('.index-scroll')?.scrollTo({ top: 0, behavior: 'instant' });
        this.indexDialogElement?.querySelector<HTMLButtonElement>('.index-close')?.focus({ preventScroll: true });
      });
    }
  }

  previewProject(chapter: number): void {
    if (this.indexOpen() && this.studioReady() && !this.studioUnavailable() && window.matchMedia('(min-width: 761px)').matches) {
      this.indexPreview.set(chapter);
    }
  }

  leaveProjectList(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.indexPreview.set(null);
  }

  openAbout(event: Event): void {
    clearTimeout(this.aboutRemovalTimer);
    this.aboutLeaving.set(false);
    this.cancelEntranceWalk();
    this.musicOpen.set(false);
    const story = this.storyRef.nativeElement;
    this.aboutScrollProgress = (window.scrollY - story.offsetTop) / Math.max(story.offsetHeight - window.innerHeight, 1);
    this.aboutTrigger = event.currentTarget as HTMLElement;
    this.aboutOpenedWithPointer = event instanceof MouseEvent && event.detail > 0;
    this.aboutTrigger.classList.remove('pointer-focus-return');
    this.aboutOpen.set(true);
    // A quick reopen can reuse the bubble while its previous exit is still visible.
    if (this.aboutDialogElement) {
      this.positionAboutBubble();
      this.aboutDialogElement.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
      this.presentAboutBubble();
    }
  }

  private presentAboutBubble(): void {
    cancelAnimationFrame(this.aboutPresentationFrame);
    this.aboutPresentationFrame = requestAnimationFrame(() => {
      if (!this.aboutOpen()) return;
      this.aboutPresented.set(true);
      if (!this.aboutDialogElement?.contains(document.activeElement))
        this.aboutDialogElement?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    });
  }

  private positionAboutBubble(): void {
    const bubble = this.aboutDialogElement;
    if (!bubble || !this.aboutOpen() || !this.aboutTrigger) return;
    const anchor = this.aboutTrigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const gutter = 16, gap = 20;
    const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high));
    bubble.style.maxHeight = `${Math.max(120, viewportHeight - gutter * 2)}px`;
    const width = bubble.offsetWidth, naturalHeight = bubble.offsetHeight;
    const centerX = anchor.left + anchor.width / 2, centerY = anchor.top + anchor.height / 2;
    const minimumRoom = Math.min(naturalHeight, 280);
    const belowRoom = viewportHeight - gutter - anchor.bottom - gap;
    const aboveRoom = anchor.top - gap - gutter;
    let placement = 'center';
    let left = (viewportWidth - width) / 2;
    let top = (viewportHeight - naturalHeight) / 2;
    if (anchor.left - gap - gutter >= width) {
      placement = 'left';
      left = anchor.left - gap - width;
      top = clamp(centerY - 72, gutter, viewportHeight - gutter - naturalHeight);
    } else if (viewportWidth - anchor.right - gap - gutter >= width) {
      placement = 'right';
      left = anchor.right + gap;
      top = clamp(centerY - 72, gutter, viewportHeight - gutter - naturalHeight);
    } else if (belowRoom >= minimumRoom || aboveRoom >= minimumRoom) {
      placement = belowRoom >= minimumRoom ? 'below' : 'above';
      left = clamp(centerX - width * .65, gutter, viewportWidth - gutter - width);
      const available = placement === 'below' ? belowRoom : aboveRoom;
      bubble.style.maxHeight = `${available}px`;
      top = placement === 'below' ? anchor.bottom + gap : anchor.top - gap - bubble.offsetHeight;
    }
    bubble.dataset['placement'] = placement;
    bubble.style.left = `${Math.round(left)}px`;
    bubble.style.top = `${Math.round(top)}px`;
    bubble.style.setProperty('--tail-x', `${clamp(centerX - left, 28, width - 28)}px`);
    bubble.style.setProperty('--tail-y', `${clamp(centerY - top, 28, bubble.offsetHeight - 28)}px`);

    // Use the settled layout, not the animated scale, so fading cannot flicker
    // as the bubble grows. Measure the title's text rather than its wide column.
    const bounds = { left: left - 8, top: top - 8, right: left + width + 8, bottom: top + bubble.offsetHeight + 8 };
    const overlaps = (rect: DOMRect): boolean => rect.width > 0 && rect.height > 0 &&
      rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom;
    const obscures = (selector: string): boolean => {
      const element = document.querySelector<HTMLElement>(selector);
      return !!element && overlaps(element.getBoundingClientRect());
    };
    const intro = this.chapterIsVisible(0) && this.atEntrance() &&
      Array.from(document.querySelectorAll<HTMLElement>('.story-panel--intro h1 span, .story-panel--intro > button')).some(element => {
        if (element.tagName !== 'SPAN') return overlaps(element.getBoundingClientRect());
        const text = document.createRange();
        text.selectNodeContents(element);
        return overlaps(text.getBoundingClientRect());
      });
    const next = { header: obscures('.world-tools'), intro, rail: obscures('.chapter-rail') };
    const previous = this.aboutOcclusion();
    if (next.header !== previous.header || next.intro !== previous.intro || next.rail !== previous.rail) this.aboutOcclusion.set(next);
  }

  closeAbout(restoreFocus = true): void {
    if (!this.aboutOpen()) return;
    const trigger = this.aboutTrigger;
    cancelAnimationFrame(this.aboutPresentationFrame);
    const animateExit = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.aboutLeaving.set(animateExit);
    this.aboutPresented.set(false);
    this.aboutOpen.set(false);
    this.aboutOcclusion.set({ header: false, intro: false, rail: false });
    if (animateExit) this.aboutRemovalTimer = setTimeout(() => this.aboutLeaving.set(false), 180);
    this.changeDetector.detectChanges();
    const story = this.storyRef.nativeElement;
    window.scrollTo({ top: story.offsetTop + this.aboutScrollProgress * Math.max(story.offsetHeight - window.innerHeight, 1), behavior: 'instant' });
    this.updateStory();
    requestAnimationFrame(() => {
      if (restoreFocus && !this.aboutOpen() && !this.indexOpen() && !this.detailProject() && !this.detailAlbum() && trigger?.isConnected) {
        // Escape changes Chrome's input modality. Keep the pointer-opened sign
        // focused for navigation without adding a box to the neon afterwards.
        trigger.classList.toggle('pointer-focus-return', this.aboutOpenedWithPointer);
        trigger.focus({ preventScroll: true });
      }
    });
  }

  enterFromAbout(): void {
    this.closeAbout(false);
    this.enterStudio();
    this.indexTriggerRef.nativeElement.focus({ preventScroll: true });
  }

  openProject(chapter: number, event: Event): void {
    this.cancelEntranceWalk();
    this.musicOpen.set(false);
    const project = PROJECT_DETAILS.find(item => item.chapter === chapter);
    if (!project) return;
    const story = this.storyRef.nativeElement;
    // A quick scroll can leave the camera behind the scroll target. Keep the project
    // the visitor actually selected as the return stop in that case.
    const top = this.activeChapter() === chapter ? window.scrollY : story.offsetTop + studioScrollFromProgress(STUDIO_STOPS[chapter]) * Math.max(story.offsetHeight - window.innerHeight, 1);
    window.scrollTo({ top, behavior: 'instant' });
    this.projectScrollProgress = (window.scrollY - story.offsetTop) / Math.max(story.offsetHeight - window.innerHeight, 1);
    this.projectTrigger = event.currentTarget as HTMLElement;
    this.detailProject.set(project);
  }

  closeProject(): void {
    if (!this.detailProject()) return;
    const trigger = this.projectTrigger;
    this.detailProject.set(null);
    this.changeDetector.detectChanges();
    const story = this.storyRef.nativeElement;
    window.scrollTo({ top: story.offsetTop + this.projectScrollProgress * Math.max(story.offsetHeight - window.innerHeight, 1), behavior: 'instant' });
    this.updateStory();
    this.changeDetector.detectChanges();
    // Restoring scroll after a resize can defer the browser's focus update until layout.
    requestAnimationFrame(() => {
      if (!this.detailProject() && !this.detailAlbum() && !this.indexOpen() && trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }

  readSection(id: string): void {
    const section = this.projectDialogElement?.querySelector<HTMLElement>(`#project-${id}`);
    section?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    section?.focus({ preventScroll: true });
  }

  openAlbum(request: { id: string; event: Event }): void {
    const album = STUDIO_ALL_ALBUMS.find(item => item.id === request.id);
    if (!album || this.detailProject() || this.indexOpen() || this.aboutOpen()) return;
    this.cancelEntranceWalk();
    this.musicOpen.set(false);
    clearTimeout(this.albumRemovalTimer);
    this.leavingAlbum.set(null);
    const story = this.storyRef.nativeElement;
    // Stop any in-flight smooth scroll before holding this spot in the collection.
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    this.albumScrollProgress = (window.scrollY - story.offsetTop) / Math.max(story.offsetHeight - innerHeight, 1);
    this.detailAlbum.set(album);
    // A rapid reopen can reuse the note while its previous exit is still mounted.
    if (this.albumDialogElement) {
      this.changeDetector.detectChanges();
      this.albumDialogElement.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
  }

  closeAlbum(): void {
    const album = this.detailAlbum();
    if (!album) return;
    const animateExit = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.leavingAlbum.set(animateExit ? album : null);
    this.detailAlbum.set(null);
    if (animateExit) this.albumRemovalTimer = setTimeout(() => this.leavingAlbum.set(null), 180);
    this.changeDetector.detectChanges();
    const story = this.storyRef.nativeElement;
    window.scrollTo({ top: story.offsetTop + this.albumScrollProgress * Math.max(story.offsetHeight - innerHeight, 1), behavior: 'instant' });
    this.updateStory();
  }

  enterStudio(): void {
    this.cancelEntranceWalk();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) { this.scrollToProgress(STUDIO_LOOK_AROUND.start); return; }
    this.closeIndex();
    const start = window.scrollY;
    const target = this.scrollTopFor(STUDIO_LOOK_AROUND.start);
    if (Math.abs(target - start) < 1) return;

    // The browser chooses its own smooth-scroll duration. Author this one walk
    // explicitly so the door, camera and room audio share a slower arrival.
    const story = this.storyRef.nativeElement;
    const startProgress = studioProgressFromScroll((start - story.offsetTop) / Math.max(story.offsetHeight - window.innerHeight, 1));
    const cityRemaining = 1 - Math.max(0, Math.min(1, (startProgress - STUDIO_CITY_APPROACH.start) / (STUDIO_CITY_APPROACH.end - STUDIO_CITY_APPROACH.start)));
    const duration = 4500 + 3000 * cityRemaining * cityRemaining * (3 - 2 * cityRemaining);
    const started = performance.now();
    const controller = new AbortController();
    this.entranceController = controller;
    const passive = { passive: true, signal: controller.signal };
    window.addEventListener('wheel', this.cancelEntranceWalk, passive);
    window.addEventListener('touchstart', this.cancelEntranceWalk, passive);
    window.addEventListener('resize', this.cancelEntranceWalk, passive);
    document.addEventListener('keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) this.cancelEntranceWalk();
    }, { signal: controller.signal });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.cancelEntranceWalk();
    }, { signal: controller.signal });

    window.scrollTo({ top: start, behavior: 'instant' });
    const step = (now: number): void => {
      if (controller.signal.aborted) return;
      const progress = motion.matches ? 1 : Math.min(1, (now - started) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      window.scrollTo({ top: start + (target - start) * eased, behavior: 'instant' });
      if (progress < 1) this.entranceFrame = requestAnimationFrame(step);
      else this.cancelEntranceWalk();
    };
    this.entranceFrame = requestAnimationFrame(step);
  }

  private readonly cancelEntranceWalk = (): void => {
    cancelAnimationFrame(this.entranceFrame);
    this.entranceFrame = 0;
    this.entranceController?.abort();
    this.entranceController = undefined;
  };

  chapterIsVisible(chapter: number): boolean {
    return (this.studioUnavailable() || !this.studioReady() ? this.activeChapter() : this.captionChapter()) === chapter;
  }

  scrollToChapter(index: number): void { this.scrollToProgress(STUDIO_STOPS[index]); }

  private scrollTopFor(progress: number): number {
    const story = this.storyRef.nativeElement;
    const range = Math.max(story.offsetHeight - window.innerHeight, 1);
    return story.offsetTop + range * studioScrollFromProgress(progress);
  }

  private scrollToProgress(progress: number): void {
    this.cancelEntranceWalk();
    window.scrollTo({ top: this.scrollTopFor(progress), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    this.closeIndex();
  }

  setMusicOpen(open: boolean): void {
    this.musicOpen.set(open);
    if (open) this.audio.resume();
    if (open) requestAnimationFrame(() => {
      if (this.musicOpen()) document.getElementById('studio-music-panel')?.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
    });
    else this.musicTriggerRef.nativeElement.focus({ preventScroll: true });
  }

  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:focusin', ['$event'])
  dismissMusic(event: Event): void {
    if (this.musicOpen() && !(event.target as Element | null)?.closest?.('[data-music-menu], [data-studio-audio-control]')) this.musicOpen.set(false);
  }

  private readonly requestUpdate = (): void => {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame(() => this.updateStory());
  };

  private updateStory(): void {
    if (this.aboutOpen()) { this.positionAboutBubble(); return; }
    if (this.detailProject() || this.detailAlbum()) return;
    if (this.indexPreview() !== null && window.innerWidth <= 760) this.indexPreview.set(null);
    const story = this.storyRef.nativeElement;
    const range = Math.max(story.offsetHeight - window.innerHeight, 1);
    const raw = (window.scrollY - story.offsetTop) / range;
    const progress = studioProgressFromScroll(raw);
    let chapter = 0;
    STUDIO_STOPS.forEach((stop, index) => { if (progress >= stop - 0.035) chapter = index; });
    this.activeChapter.set(chapter);
    this.atEntrance.set(progress < 0.10);

    if (this.studioUnavailable()) this.audio.setOpenness(Math.max(0, Math.min(1, (progress - .10) / .06)));
  }
}
