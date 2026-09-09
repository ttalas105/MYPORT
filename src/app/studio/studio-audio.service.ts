import { DOCUMENT } from '@angular/common';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { StudioAudio, STUDIO_MUSIC_DEFAULT_VOLUME, type StudioAudioState } from './studio-audio';
import { STUDIO_SOUNDTRACK } from './studio-soundtrack';

/** Page-scoped playback, preferences and browser lifecycle; no view or camera ownership. */
@Injectable()
export class StudioAudioService implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly enabledState = signal(this.readEnabled());
  private readonly volumeState = signal(this.readVolume());
  private readonly playbackState = signal<StudioAudioState>('loading');
  private readonly opennessState = signal(0);
  private readonly engine: StudioAudio;

  readonly enabled = this.enabledState.asReadonly();
  readonly volume = this.volumeState.asReadonly();
  readonly state = this.playbackState.asReadonly();
  readonly openness = this.opennessState.asReadonly();

  constructor() {
    this.engine = new StudioAudio(
      STUDIO_SOUNDTRACK.file,
      state => this.playbackState.set(state),
      this.enabled(),
      this.volume(),
      STUDIO_SOUNDTRACK.startAtSeconds,
      this.document.querySelector<HTMLAudioElement>('#studio-soundtrack-media') ?? undefined,
    );
    this.engine.setHidden(this.document.hidden);
    this.document.addEventListener('pointerdown', this.onInteraction, true);
    // Touch browsers may grant audio activation only after the tap completes.
    this.document.addEventListener('click', this.onInteraction, true);
    this.document.addEventListener('keydown', this.onInteraction, true);
    this.document.addEventListener('visibilitychange', this.onVisibility);
  }

  setEnabled(enabled: boolean): void {
    this.enabledState.set(enabled);
    this.save('studio-music-enabled', String(enabled));
    this.engine.setEnabled(enabled);
  }

  setVolume(value: number): void {
    const volume = Math.round(Math.max(0, Math.min(100, Number.isFinite(value) ? value : STUDIO_MUSIC_DEFAULT_VOLUME)));
    this.volumeState.set(volume);
    this.save('studio-music-volume', String(volume));
    this.engine.setVolume(volume);
  }

  setOpenness(openness: number): void {
    this.opennessState.set(openness);
    this.engine.setOpenness(openness);
  }

  resume(): void {
    if (this.enabled()) this.engine.unlock();
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('pointerdown', this.onInteraction, true);
    this.document.removeEventListener('click', this.onInteraction, true);
    this.document.removeEventListener('keydown', this.onInteraction, true);
    this.document.removeEventListener('visibilitychange', this.onVisibility);
    this.engine.dispose();
  }

  private readonly onInteraction = (event: Event): void => {
    if (event.isTrusted && !(event.target as Element | null)?.closest?.('[data-audio-control]')) this.resume();
  };

  private readonly onVisibility = (): void => this.engine.setHidden(this.document.hidden);

  private readEnabled(): boolean {
    try { return this.document.defaultView?.localStorage.getItem('studio-music-enabled') !== 'false'; }
    catch { return true; }
  }

  private readVolume(): number {
    try {
      const stored = this.document.defaultView?.localStorage.getItem('studio-music-volume');
      const volume = stored == null ? STUDIO_MUSIC_DEFAULT_VOLUME : Number(stored);
      return Number.isFinite(volume) ? Math.round(Math.max(0, Math.min(100, volume))) : STUDIO_MUSIC_DEFAULT_VOLUME;
    } catch { return STUDIO_MUSIC_DEFAULT_VOLUME; }
  }

  private save(key: string, value: string): void {
    try { this.document.defaultView?.localStorage.setItem(key, value); }
    catch { /* Preferences still apply for this visit when storage is unavailable. */ }
  }
}
