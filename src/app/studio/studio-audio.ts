export type StudioAudioState = 'waiting' | 'loading' | 'playing' | 'off' | 'unavailable';

// Raise the previous output level by 10 dB (about -12 dB relative to the source).
export const STUDIO_MUSIC_OUTPUT_GAIN = .08 * 10 ** (10 / 20);
export const STUDIO_MUSIC_DEFAULT_VOLUME = 50;

function unit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function volumePercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : STUDIO_MUSIC_DEFAULT_VOLUME;
}

function smooth(value: number): number {
  const t = unit(value);
  return t * t * (3 - 2 * t);
}

/** The doorway gradually opens the sound as the camera enters the room. */
export function studioOpenness(cameraZ: number): number {
  return smooth((5.4 - cameraZ) / (5.4 - 3.85));
}

export function studioAcoustics(openness: number): { cutoffHz: number; gain: number; dryMix: number } {
  const amount = unit(openness);
  return {
    cutoffHz: 320 * Math.pow(18000 / 320, Math.pow(amount, 1.25)),
    gain: .8 + .2 * smooth(amount),
    dryMix: smooth((amount - .9) / .1),
  };
}

/** One media element and one audio graph; the caller owns the supplied file URL. */
export class StudioAudio {
  private readonly media: HTMLAudioElement | null;
  private context: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private wet: GainNode | null = null;
  private dry: GainNode | null = null;
  private master: GainNode | null = null;
  private state: StudioAudioState | null = null;
  private enabled = true;
  private hidden = false;
  private unavailable: 'source' | 'media' | 'graph' | null = null;
  private disposed = false;
  private mediaPlaying = false;
  private playPending = false;
  private openness = 0;
  private volume = STUDIO_MUSIC_DEFAULT_VOLUME;
  private readonly initialOffsetSeconds: number;
  private initialPositionApplied = false;
  private attempt = 0;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(source: string, private readonly onState: (state: StudioAudioState) => void, initialEnabled = true, initialVolume = STUDIO_MUSIC_DEFAULT_VOLUME, startAtSeconds = 0, preloadedMedia?: HTMLAudioElement) {
    this.enabled = initialEnabled;
    this.volume = volumePercent(initialVolume);
    this.initialOffsetSeconds = Number.isFinite(startAtSeconds) ? Math.max(0, startAtSeconds) : 0;
    if (!source.trim() || typeof Audio === 'undefined' || typeof AudioContext === 'undefined') {
      this.media = null;
      this.unavailable = 'source';
      this.refreshState();
      return;
    }

    this.media = preloadedMedia ?? new Audio();
    this.media.crossOrigin = 'anonymous';
    this.media.loop = true;
    this.media.preload = 'auto';
    this.media.addEventListener('loadedmetadata', this.handleMetadata);
    this.media.addEventListener('playing', this.handlePlaying);
    this.media.addEventListener('pause', this.handlePause);
    this.media.addEventListener('waiting', this.handleWaiting);
    this.media.addEventListener('error', this.handleError);
    // Reuse the parser-started request instead of restarting the same download.
    if (this.media.getAttribute('src') !== source.trim()) this.media.src = source.trim();
    // The preloaded element can have metadata before these listeners exist.
    if (this.media.readyState >= 1) this.handleMetadata();
    this.setEnabled(initialEnabled);
  }

  setEnabled(enabled: boolean): void {
    if (this.disposed) return;
    const retryMedia = enabled && !this.enabled && this.unavailable === 'media';
    this.enabled = enabled;
    if (retryMedia && this.media) {
      this.unavailable = null;
      this.mediaPlaying = false;
      this.playPending = false;
      this.media.load();
    }
    if (this.shouldPlay()) this.start();
    else this.stop(this.hidden);
  }

  /** Call directly in a pointer/key event, before any awaited work. */
  unlock(): void {
    if (this.shouldPlay()) this.start();
  }

  setOpenness(openness: number): void {
    if (this.disposed) return;
    const next = unit(openness);
    if (next === this.openness) return;
    this.openness = next;
    this.applyAcoustics();
  }

  setVolume(volume: number): void {
    if (this.disposed) return;
    const next = volumePercent(volume);
    if (next === this.volume) return;
    this.volume = next;
    this.applyAcoustics();
  }

  setHidden(hidden: boolean): void {
    if (this.disposed || this.hidden === hidden) return;
    this.hidden = hidden;
    if (this.shouldPlay()) this.start();
    else this.stop(true);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.attempt++;
    this.clearPause();
    if (this.media) {
      this.media.removeEventListener('loadedmetadata', this.handleMetadata);
      this.media.removeEventListener('playing', this.handlePlaying);
      this.media.removeEventListener('pause', this.handlePause);
      this.media.removeEventListener('waiting', this.handleWaiting);
      this.media.removeEventListener('error', this.handleError);
      this.media.pause();
      this.media.removeAttribute('src');
      this.media.load();
      // A media element cannot be attached to a second Web Audio source, even
      // after its old context closes. A remounted page must get a fresh element.
      this.media.remove();
    }
    this.sourceNode?.disconnect();
    this.filter?.disconnect();
    this.wet?.disconnect();
    this.dry?.disconnect();
    this.master?.disconnect();
    this.context?.removeEventListener('statechange', this.handleContextState);
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => undefined);
  }

  private shouldPlay(): boolean {
    return !this.disposed && !this.unavailable && this.enabled && !this.hidden;
  }

  private createGraph(): boolean {
    if (this.context) return true;
    if (!this.media) return false;
    try {
      const context = new AudioContext();
      this.context = context;
      this.sourceNode = context.createMediaElementSource(this.media);
      this.filter = context.createBiquadFilter();
      this.filter.type = 'lowpass';
      // Low-pass Q is expressed in dB; this keeps the cutoff free of a resonant boost.
      this.filter.Q.value = -3.01;
      this.wet = context.createGain();
      this.dry = context.createGain();
      this.master = context.createGain();
      this.master.gain.value = 0;
      this.sourceNode.connect(this.filter).connect(this.wet).connect(this.master);
      this.sourceNode.connect(this.dry).connect(this.master);
      this.master.connect(context.destination);
      context.addEventListener('statechange', this.handleContextState);
      const acoustics = studioAcoustics(this.openness);
      this.filter.frequency.value = Math.min(acoustics.cutoffHz, context.sampleRate / 2);
      this.wet.gain.value = 1 - acoustics.dryMix;
      this.dry.gain.value = acoustics.dryMix;
      return true;
    } catch {
      this.unavailable = 'graph';
      this.refreshState();
      return false;
    }
  }

  private start(): void {
    if (!this.shouldPlay() || !this.media || !this.createGraph() || !this.context) return;
    this.clearPause();
    const attempt = ++this.attempt;
    this.applyAcoustics();
    if (this.context.state === 'running' && !this.media.paused && this.mediaPlaying && this.media.readyState >= 2) {
      this.playPending = false;
      this.refreshState();
      return;
    }
    this.playPending = true;

    // Both calls happen in the original gesture stack. A suspended context can
    // require another gesture even when the media element has already started.
    let play: Promise<void>;
    let resume: Promise<void>;
    try { play = this.media.play(); } catch (error) { play = Promise.reject(error); }
    try {
      resume = this.context.state === 'running' ? Promise.resolve() : this.context.resume();
    } catch (error) { resume = Promise.reject(error); }
    this.refreshState();

    void play.then(() => {
      if (this.disposed || attempt !== this.attempt) return;
      this.playPending = false;
      this.refreshState();
    }, (error: unknown) => {
      if (this.disposed || attempt !== this.attempt) return;
      this.playPending = false;
      if (!this.unavailable && error instanceof DOMException && error.name === 'NotSupportedError') this.unavailable = 'media';
      this.refreshState();
    });
    void resume.then(() => {
      if (!this.disposed && attempt === this.attempt) this.refreshState();
    }, () => {
      if (!this.disposed && attempt === this.attempt) this.refreshState();
    });
  }

  private stop(immediate: boolean): void {
    const attempt = ++this.attempt;
    this.playPending = false;
    this.clearPause();
    if (this.master) this.ramp(this.master.gain, 0);
    this.refreshState();
    if (immediate) this.media?.pause();
    else {
      this.pauseTimer = setTimeout(() => {
        this.pauseTimer = null;
        if (!this.disposed && attempt === this.attempt) this.media?.pause();
      }, 85);
    }
  }

  private clearPause(): void {
    if (this.pauseTimer !== null) clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
  }

  private applyAcoustics(): void {
    if (!this.context || !this.filter || !this.wet || !this.dry || !this.master) return;
    const acoustics = studioAcoustics(this.openness);
    this.ramp(this.filter.frequency, Math.min(acoustics.cutoffHz, this.context.sampleRate / 2));
    // Linear complementary gains keep the two correlated paths from adding
    // extra volume. At full openness the filter path is completely silent.
    this.ramp(this.wet.gain, 1 - acoustics.dryMix);
    this.ramp(this.dry.gain, acoustics.dryMix);
    this.ramp(this.master.gain, this.shouldPlay() ? acoustics.gain * this.volume / 100 * STUDIO_MUSIC_OUTPUT_GAIN : 0);
  }

  private ramp(parameter: AudioParam, target: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    parameter.linearRampToValueAtTime(target, now + .08);
  }

  private refreshState(): void {
    if (this.disposed) return;
    let next: StudioAudioState;
    if (this.unavailable) next = 'unavailable';
    else if (!this.enabled || this.hidden) next = 'off';
    else if (this.context?.state === 'running' && this.media && !this.media.paused) {
      next = this.mediaPlaying && this.media.readyState >= 2 ? 'playing' : 'loading';
    } else next = this.playPending && this.context?.state === 'running' ? 'loading' : 'waiting';
    if (next === this.state) return;
    this.state = next;
    this.onState(next);
  }

  private readonly handlePlaying = (): void => {
    if (!this.shouldPlay()) {
      this.media?.pause();
      return;
    }
    this.mediaPlaying = true;
    this.refreshState();
  };

  private readonly handleMetadata = (): void => {
    if (!this.media || this.disposed || this.initialPositionApplied || !this.initialOffsetSeconds) return;
    const duration = this.media.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    try {
      // Only the first arrival skips the quiet intro. Menu changes, mute/unmute,
      // visibility changes and the normal track loop keep their playback position.
      this.media.currentTime = Math.min(this.initialOffsetSeconds, Math.max(0, duration - .25));
      this.initialPositionApplied = true;
    } catch { /* A failed optional seek must not prevent normal playback. */ }
  };

  private readonly handlePause = (): void => {
    this.mediaPlaying = false;
    this.refreshState();
  };

  private readonly handleWaiting = (): void => {
    this.mediaPlaying = false;
    this.refreshState();
  };

  private readonly handleError = (): void => {
    if (!this.unavailable) this.unavailable = 'media';
    this.stop(true);
  };

  private readonly handleContextState = (): void => {
    if (this.context?.state === 'closed') this.unavailable = 'graph';
    this.refreshState();
  };
}
