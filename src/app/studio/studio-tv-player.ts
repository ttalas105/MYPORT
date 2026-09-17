import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { StudioAlbumOcclusion } from './studio-album-occlusion';
import { STUDIO_TV } from './studio-television';
import { StudioTvForeground } from './studio-tv-foreground';

interface YouTubePlayer {
  mute(): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}
interface YouTubeAPI {
  Player: new (element: HTMLElement, options: {
    width: number; height: number; videoId: string; host: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady(event: { target: YouTubePlayer }): void;
      onStateChange(event: { data: number }): void;
      onError(): void;
    };
  }) => YouTubePlayer;
}
type YouTubeWindow = Window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YouTubeAPI> | undefined;

function loadYouTube(): Promise<YouTubeAPI> {
  const host = window as YouTubeWindow;
  if (host.YT?.Player) return Promise.resolve(host.YT);
  return apiPromise ??= new Promise((resolve, reject) => {
    const previous = host.onYouTubeIframeAPIReady;
    host.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (host.YT) resolve(host.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('YouTube is unavailable'));
    document.head.append(script);
  });
}

/** The official player follows the actual TV screen in perspective, without copying video assets. */
export class StudioTvPlayer {
  private readonly renderer = new CSS3DRenderer();
  private readonly scene = new THREE.Scene();
  private readonly element = document.createElement('div');
  private readonly fallback = document.createElement('a');
  private readonly surface: CSS3DObject;
  private readonly foreground: StudioTvForeground;
  private readonly center = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly corners: THREE.Vector3[];
  private readonly projected = Array.from({ length: 4 }, () => new THREE.Vector3());
  private readonly lastCamera = new THREE.Matrix4();
  private readonly lastProjection = new THREE.Matrix4();
  private player?: YouTubePlayer;
  private ready = false;
  private disposed = false;
  private visible = false;
  private suspended = false;
  private unoccluded = false;
  private visibilityDirty = true;
  private lastVisibilityCheck = -Infinity;
  private width = 1;
  private height = 1;

  constructor(host: HTMLElement, private readonly screen: THREE.Mesh,
    private readonly occlusion: StudioAlbumOcclusion, private readonly repaint: () => void,
    private readonly foregroundRoot: THREE.Group, silhouettes: THREE.Vector3[][]) {
    this.foreground = new StudioTvForeground(screen, silhouettes);
    const layer = this.renderer.domElement;
    layer.className = 'studio-tv-layer';
    Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '1', display: 'none' });
    host.append(layer);
    Object.assign(this.element.style, { width: '960px', height: '540px', background: '#090c0f', backfaceVisibility: 'hidden', maskSize: '100% 100%' });
    this.element.className = 'studio-tv-screen';
    this.element.setAttribute('aria-label', 'Studio television');
    this.fallback.href = STUDIO_TV.url;
    this.fallback.target = '_blank';
    this.fallback.rel = 'noopener noreferrer';
    this.fallback.textContent = 'VINLAND SAGA · Thorfinn vs Snake — Watch on YouTube';
    Object.assign(this.fallback.style, { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center',
      padding: '48px', color: '#f0e8dc', background: '#090c0f', font: '28px Atkinson, sans-serif', textAlign: 'center', pointerEvents: 'auto' });
    this.element.append(this.fallback);
    this.surface = new CSS3DObject(this.element);
    this.element.style.pointerEvents = 'none';
    screen.updateWorldMatrix(true, false);
    screen.getWorldPosition(this.center);
    this.surface.position.copy(this.center);
    screen.getWorldQuaternion(this.surface.quaternion);
    this.surface.scale.setScalar(STUDIO_TV.width / 960);
    this.normal.set(0, 0, 1).applyQuaternion(this.surface.quaternion);
    this.corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) =>
      screen.localToWorld(new THREE.Vector3(x * STUDIO_TV.width / 2, y * STUDIO_TV.height / 2, 0)));
    this.scene.add(this.surface);
    // CSS3DRenderer attaches the surface on its first render. Mount it while hidden
    // so YouTube can initialize now, without moving/reloading the iframe on entry.
    this.renderer.setSize(1, 1);
    this.renderer.render(this.scene, new THREE.PerspectiveCamera());
    // Start loading alongside the room assets, before the visitor enters.
    void this.start();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.visibilityDirty = true;
  }

  update(camera: THREE.PerspectiveCamera, now: number, blocked: boolean): void {
    camera.updateMatrixWorld();
    const changed = !this.lastCamera.equals(camera.matrixWorld) || !this.lastProjection.equals(camera.projectionMatrix);
    this.visibilityDirty ||= changed;
    this.lastCamera.copy(camera.matrixWorld);
    this.lastProjection.copy(camera.projectionMatrix);
    this.direction.subVectors(camera.position, this.center).normalize();
    let visible = !blocked && this.normal.dot(this.direction) > .18;
    if (visible) {
      this.corners.forEach((point, index) => this.projected[index].copy(point).project(camera));
      const xs = this.projected.map(point => (point.x + 1) * this.width / 2);
      const ys = this.projected.map(point => (1 - point.y) * this.height / 2);
      visible = this.projected.every(point => point.z > -1 && point.z < 1) &&
        Math.min(Math.max(...xs), this.width) - Math.max(Math.min(...xs), 0) > 40 &&
        Math.min(Math.max(...ys), this.height) - Math.max(Math.min(...ys), 0) > 24;
      if (visible && this.visibilityDirty && now - this.lastVisibilityCheck >= 100) {
        this.unoccluded = this.occlusion.isUnoccluded(this.screen, this.center, camera.position, this.foregroundRoot);
        this.lastVisibilityCheck = now;
        this.visibilityDirty = false;
      }
      visible &&= this.unoccluded;
    }
    const playbackChanged = this.visible !== visible || this.suspended;
    if (visible && (changed || !this.visible)) this.element.style.maskImage = this.foreground.mask(camera);
    this.visible = visible;
    this.suspended = false;
    this.renderer.domElement.style.display = visible ? '' : 'none';
    if (visible) this.renderer.render(this.scene, camera);
    if (playbackChanged && this.ready) this.syncPlayback();
  }

  suspend(): void {
    this.suspended = true;
    this.visible = false;
    this.renderer.domElement.style.display = 'none';
    if (this.ready) this.player?.pauseVideo();
  }

  private syncPlayback(): void {
    if (!this.suspended && !document.hidden) this.player?.playVideo();
    else this.player?.pauseVideo();
  }

  private async start(): Promise<void> {
    try {
      const api = await loadYouTube();
      if (this.disposed) return;
      const mount = document.createElement('div');
      this.element.append(mount);
      this.player = new api.Player(mount, {
        width: 960, height: 540, videoId: STUDIO_TV.videoId, host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, controls: 0, disablekb: 1, fs: 0, rel: 0,
          loop: 1, playlist: STUDIO_TV.videoId, origin: location.origin },
        events: {
          onReady: event => {
            if (this.disposed) { event.target.destroy(); return; }
            this.ready = true;
            event.target.mute();
            const iframe = this.element.querySelector('iframe');
            if (iframe) {
              iframe.title = `${STUDIO_TV.title} — Crunchyroll`;
              iframe.style.border = '0';
              iframe.tabIndex = -1;
            }
            this.fallback.style.display = 'none';
            this.syncPlayback();
            this.repaint();
          },
          onStateChange: event => {
            if (event.data === 1) {
              if (this.suspended || document.hidden) this.player?.pauseVideo();
            }
          },
          onError: () => this.showFallback(),
        },
      });
    } catch { if (!this.disposed) this.showFallback(); }
  }

  private showFallback(): void {
    this.fallback.style.display = 'grid';
    const iframe = this.element.querySelector('iframe');
    if (iframe) iframe.style.display = 'none';
  }

  dispose(): void {
    this.disposed = true;
    this.player?.destroy();
    this.surface.removeFromParent();
    this.renderer.domElement.remove();
  }
}
