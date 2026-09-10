import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, QueryList, ViewChild, ViewChildren, isDevMode } from '@angular/core';
import * as THREE from 'three';
import { buildStudioFurniture, StudioMaterials, StudioProjectTarget } from './studio/studio-furniture';
import { buildStudioRoom } from './studio/studio-room';
import { buildStudioWorkDetails } from './studio/studio-work-details';
import { buildStudioMusicCorner } from './studio/studio-music-corner';
import { buildStudioGamingDetails } from './studio/studio-gaming-details';
import { buildStudioCity } from './studio/studio-city';
import { buildStudioStreet } from './studio/studio-street';
import { STUDIO_CITY_APPROACH, STUDIO_LOOK_AROUND, STUDIO_STOPS, studioCaptionAt, studioProgressFromScroll } from './studio/studio-route';
import { studioOpenness } from './studio/studio-audio';
import { studioReaderLayout } from './studio/studio-reader-layout';
import { mapStudioSurfaces } from './studio/studio-surfaces';
import { STUDIO_ALL_ALBUMS } from './studio/studio-albums';
import { studioAlbumView, StudioAlbumView } from './studio/studio-album-views';
import { StudioAlbumOcclusion } from './studio/studio-album-occlusion';
import { addStudioContactShadows, addStudioLighting } from './studio/studio-lighting';
import { StudioRendering } from './studio/studio-rendering';
import { StudioPerformance } from './studio/studio-performance';
import { batchStaticStudio, freezeStudioTransforms } from './studio/studio-batching';
import { StudioFrameBudget } from './studio/studio-quality';
import { PROJECT_DETAILS } from './project-details';
interface CameraKey {
    t: number;
    position: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
}
/** A real-scale studio: geometry, PBR materials, practical lighting and one scroll path. */
@Component({
    selector: 'app-system-scene',
    standalone: true,
    template: `<canvas #canvas aria-hidden="true"></canvas>
      <button #aboutTrigger class="scene-about-trigger" type="button" hidden
        aria-label="CLICK ME — About Thomas" aria-haspopup="dialog" aria-controls="studio-about"
        (click)="activateAbout($event)"></button>
      @for (album of albums; track album.id) {
        <button #albumTrigger class="scene-object-trigger scene-album-trigger" type="button" hidden disabled
          [attr.data-album-id]="album.id" [attr.aria-label]="'Explore ' + album.title + ' by ' + album.artist"
          aria-haspopup="dialog" aria-controls="studio-album" (click)="activateAlbum(album.id, $event)"
          (keydown)="clearObjectPointerFocus($event)">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon vector-effect="non-scaling-stroke" /></svg>
        </button>
      }
      @for (project of projectObjects; track project.id) {
        <button #projectTrigger class="scene-object-trigger scene-project-trigger" type="button" hidden disabled
          [attr.data-project-id]="project.id" [attr.aria-label]="'Explore ' + project.title + ' — ' + project.object"
          aria-haspopup="dialog" aria-controls="project-reader" (click)="activateProject(project.id, project.chapter, $event)"
          (keydown)="clearObjectPointerFocus($event)">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon vector-effect="non-scaling-stroke" /></svg>
        </button>
      }`,
    styles: [`:host{position:absolute;inset:0;display:block;overflow:hidden;background:#171512}
      canvas{display:block;width:100%;height:100%;touch-action:pan-y}
      .scene-about-trigger{position:absolute;min-width:44px;min-height:44px;touch-action:pan-y;border-radius:4px}
      .scene-about-trigger:focus-visible{outline:2px solid #ffe5d8;outline-offset:6px}
      .scene-object-trigger{position:absolute;z-index:2;padding:0;border:0;background:transparent;box-shadow:none;cursor:pointer;touch-action:pan-y;border-radius:2px}
      .scene-object-trigger[hidden]{display:none}
      .scene-object-trigger svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;opacity:0;transition:opacity 160ms ease;pointer-events:none}
      .scene-object-trigger polygon{fill:rgba(255,229,205,.025);stroke:#ffe5d8;stroke-width:2}
      .scene-object-trigger:hover svg,.scene-object-trigger:focus-visible svg{opacity:1}
      .scene-object-trigger:focus-visible{outline:none}
      .scene-object-trigger:focus-visible polygon{stroke-width:4}
      .scene-object-trigger.pointer-focus-return:focus-visible:not(:hover) svg{opacity:0}
      @media(prefers-reduced-motion:reduce){.scene-object-trigger svg{transition:none}}`],
})
export class SystemSceneComponent implements AfterViewInit, OnDestroy {
    @ViewChild('canvas', { static: true })
    private readonly canvasRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('aboutTrigger', { static: true })
    private readonly aboutTriggerRef!: ElementRef<HTMLButtonElement>;
    @ViewChildren('albumTrigger')
    private readonly albumTriggerRefs!: QueryList<ElementRef<HTMLButtonElement>>;
    @ViewChildren('projectTrigger')
    private readonly projectTriggerRefs!: QueryList<ElementRef<HTMLButtonElement>>;
    readonly albums = STUDIO_ALL_ALBUMS;
    readonly projectObjects = PROJECT_DETAILS.flatMap(project => [
        { id: `project-${project.chapter}`, chapter: project.chapter, title: project.title, object: project.chapter === 2 ? 'server rack' : project.chapter === 4 ? 'laptop' : 'monitor' },
        ...(project.chapter === 4 ? [{ id: 'project-4-evidence', chapter: 4, title: project.title, object: 'sources monitor' }] : []),
    ]);
    private projectTargets: Record<string, StudioProjectTarget> = {};
    private projectReturnId: string | null = null;
    private projectRestorePending = false;
    private projectPointerActivation = false;
    @Output()
    readonly projectRequested = new EventEmitter<{ chapter: number; event: Event }>();
    @Output()
    readonly aboutRequested = new EventEmitter<Event>();
    @Output()
    readonly sceneReady = new EventEmitter<void>();
    @Output()
    readonly sceneUnavailable = new EventEmitter<void>();
    @Output()
    readonly captionChanged = new EventEmitter<number | null>();
    @Output()
    readonly acousticsChanged = new EventEmitter<number>();
    @Output()
    readonly readerPositionsChanged = new EventEmitter<Record<number, number>>();
    @Output()
    readonly albumRequested = new EventEmitter<{ id: string; event: Event }>();
    @Output()
    readonly albumReaderLeftChanged = new EventEmitter<number>();
    @Input() set selectedAlbumId(id: string | null) {
        const next = id && this.albums.some(album => album.id === id) ? id : null;
        if (next === this.selectedAlbum) return;
        const previous = this.selectedAlbum;
        this.selectedAlbum = next;
        this.albumFocusTarget = next ? 1 : 0;
        if (next) this.directViewPending = true;
        if (next) {
            if (!previous) {
                this.albumRouteProgress ??= this.progress;
                this.albumReturnId ??= next;
            }
            this.albumRestorePending = false;
            this.albumViewId = next;
            this.refreshAlbumViews();
            const view = this.albumViews[next];
            if (view && (!previous || this.motion.matches)) {
                this.albumPosition.copy(view.position);
                this.albumTarget.copy(view.target);
                this.albumFov = view.fov;
            }
        } else if (previous) this.albumRestorePending = !this.albumBlocked;
        this.zone.runOutsideAngular(() => this.requestFrame());
    }
    @Input() set albumInteractionsBlocked(blocked: boolean) {
        this.albumBlocked = blocked;
        if (blocked) this.albumRestorePending = false;
        this.zone.runOutsideAngular(() => this.requestFrame());
    }
    private albumArt: Record<string, THREE.Mesh> = {};
    private albumViews: Record<string, StudioAlbumView> = {};
    private selectedAlbum: string | null = null;
    private albumViewId: string | null = null;
    private albumFocusTarget = 0;
    private albumFocusAmount = 0;
    private readonly albumPosition = new THREE.Vector3();
    private readonly albumTarget = new THREE.Vector3();
    private albumFov = 40;
    private albumRouteProgress: number | null = null;
    private albumBlocked = false;
    private albumReturnId: string | null = null;
    private albumPointerActivation = false;
    private albumRestorePending = false;
    private lastAlbumReaderLeft = -1;
    private albumVisibility?: StudioAlbumOcclusion;
    private readonly albumRayDirection = new THREE.Vector3();
    private readonly albumCorners = Array.from({ length: 4 }, () => new THREE.Vector3());
    private readonly albumOcclusion = new Map<string, boolean>();
    private albumOcclusionTime = -Infinity;
    private albumOcclusionDirty = true;
    private albumPoseValid = false;
    private readonly albumCameraPosition = new THREE.Vector3();
    private readonly albumCameraRotation = new THREE.Quaternion();
    private readonly albumCameraProjection = new THREE.Matrix4();
    private readonly objectButtons = new Map<string, HTMLButtonElement>();
    private lastOpenness = -1;
    private lastCaption: number | null = -1;
    @Input() set focusChapter(chapter: number | null) {
        if (chapter === null && this.focusTarget && this.projectReturnId) this.projectRestorePending = true;
        this.focusTarget = chapter === null ? 0 : 1;
        if (chapter !== null) {
            this.detailChapter = chapter;
            if (this.focusAmount < .001 || this.motion.matches) {
                const detail = this.detailViews[chapter];
                this.detailPosition.copy(detail.position);
                this.detailTarget.copy(detail.target);
                this.detailFov = detail.fov;
            }
        }
        this.zone.runOutsideAngular(() => this.requestFrame());
    }
    private detailChapter = 1;
    @Input() set readerChapter(chapter: number | null) {
        if (chapter !== null) this.directViewPending = true;
        this.readerFramingTarget = chapter === null ? 0 : 1;
        this.readerOffsetTarget = chapter === 1 ? -.24 : .24;
        if (this.focusAmount < .001 || this.motion.matches) {
            this.readerOffset = this.readerOffsetTarget;
            this.readerFraming = this.readerFramingTarget;
        }
        this.zone.runOutsideAngular(() => this.requestFrame());
    }
    private readerOffsetTarget = .24;
    private readerOffset = .24;
    private readerFramingTarget = 0;
    private readerFraming = 0;
    private readerAnchors: Record<number, THREE.Vector3[]> = {};
    private readerLayouts: Record<number, { left: number; fov: number }> = {};
    private lastReaderPositions: Record<number, number> = {};
    private directViewPending = false;
    private focusTarget = 0;
    private focusAmount = 0;
    private rendering?: StudioRendering;
    private readonly performanceLog = isDevMode() && new URLSearchParams(location.search).has('studioProfile') ? new StudioPerformance() : undefined;
    private readonly benchmark = isDevMode() && new URLSearchParams(location.search).has('studioBenchmark');
    private readonly frameBudget = new StudioFrameBudget();
    private movingLastFrame = false;
    // Borrowed from StudioRendering; that owner releases all render targets and the renderer.
    private renderer?: THREE.WebGLRenderer;
    private scene?: THREE.Scene;
    private exterior?: THREE.Group;
    private readonly roomFogColor = new THREE.Color(0x171512);
    private readonly cityFogColor = new THREE.Color(0x10182a);
    private camera?: THREE.PerspectiveCamera;
    private door?: THREE.Group;
    private aboutSign?: THREE.Object3D;
    private animateAbout?: (progress: number) => void;
    private aboutAnimationProgress = 1;
    private aboutAnimationStarted = 0;
    private readonly aboutBounds = new THREE.Box3();
    private readonly aboutCorners = Array.from({ length: 4 }, () => new THREE.Vector3());
    private record?: THREE.Group;
    private meters: THREE.Mesh[] = [];
    private video?: HTMLVideoElement;
    private videoTexture?: THREE.VideoTexture;
    private reflectiveMaterials: THREE.MeshStandardMaterial[] = [];
    private resources: THREE.Texture[] = [];
    private frame = 0;
    private previousTime = 0;
    private elapsed = 0;
    private targetProgress = 0;
    private progress = 0;
    private disposed = false;
    private hidden = false;
    private smallScreen = false;
    private motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    private resizeObserver?: ResizeObserver;
    // Each approach ends at a physical object; projection leaves space for the reader.
    private readonly detailViews: Record<number, Omit<CameraKey, 't'>> = {
        1: { position: new THREE.Vector3(-2.3, 1.4, -.96), target: new THREE.Vector3(-2.51, 1.282, -2.894), fov: 47 },
        2: { position: new THREE.Vector3(.80, 1.12, -1.10), target: new THREE.Vector3(1.025, .90, -2.53), fov: 43 },
        3: { position: new THREE.Vector3(-.75, 1.4, -1), target: new THREE.Vector3(-1.05, 1.282, -2.894), fov: 47 },
        4: { position: new THREE.Vector3(2.24, 1.55, .75), target: new THREE.Vector3(2.77, 1.17, -.94), fov: 49 },
    };
    private readonly detailPosition = this.detailViews[1].position.clone();
    private readonly detailTarget = this.detailViews[1].target.clone();
    private detailFov = this.detailViews[1].fov;
    private readonly cameraKeys: CameraKey[] = [
        { t: 0, position: new THREE.Vector3(0, 4.2, 29), target: new THREE.Vector3(.4, 5.3, -14), fov: 53 },
        { t: STUDIO_CITY_APPROACH.end, position: new THREE.Vector3(0, 1.65, 8.9), target: new THREE.Vector3(.3, 1.45, 2.6), fov: 47 },
        { t: .10, position: new THREE.Vector3(0, 1.65, 5.15), target: new THREE.Vector3(-.2, 1.4, -1.7), fov: 51 },
        { t: .16, position: new THREE.Vector3(.05, 1.65, 2.9), target: new THREE.Vector3(-.7, 1.22, -2.65), fov: 58 },
        // Look around from just inside the door, then turn toward the first project.
        { t: .195, position: new THREE.Vector3(.05, 1.65, 2.65), target: new THREE.Vector3(-3.2, 1.4, -.2), fov: 60 },
        { t: .235, position: new THREE.Vector3(-.05, 1.65, 2.55), target: new THREE.Vector3(3.15, 1.45, -1.05), fov: 60 },
        { t: .265, position: new THREE.Vector3(-.20, 1.62, 1.55), target: new THREE.Vector3(-1.92, 1.25, -2.8), fov: 56 },
        { t: .30, position: new THREE.Vector3(-.65, 1.50, -.10), target: new THREE.Vector3(-1.92, 1.18, -2.8), fov: 49 },
        { t: .35, position: new THREE.Vector3(-.65, 1.50, -.10), target: new THREE.Vector3(-1.92, 1.18, -2.8), fov: 49 },
        { t: .45, position: new THREE.Vector3(.62, 1.30, -.65), target: new THREE.Vector3(1.05, .70, -2.53), fov: 44 },
        { t: .48, position: new THREE.Vector3(.62, 1.30, -.65), target: new THREE.Vector3(1.05, .70, -2.53), fov: 44 },
        { t: .56, position: new THREE.Vector3(.62, 1.30, -.65), target: new THREE.Vector3(1.05, .70, -2.53), fov: 44 },
        { t: .64, position: new THREE.Vector3(.1, 1.44, -.28), target: new THREE.Vector3(-.62, 1.15, -2.83), fov: 44 },
        { t: .70, position: new THREE.Vector3(.1, 1.44, -.28), target: new THREE.Vector3(-.62, 1.15, -2.83), fov: 44 },
        { t: .80, position: new THREE.Vector3(1.15, 1.58, 1.20), target: new THREE.Vector3(2.40, 1.04, -.88), fov: 49 },
        { t: .87, position: new THREE.Vector3(1.15, 1.58, 1.20), target: new THREE.Vector3(2.40, 1.04, -.88), fov: 49 },
        { t: 1, position: new THREE.Vector3(.1, 1.73, 2.85), target: new THREE.Vector3(-.6, 1.24, -1.6), fov: 61 },
    ];
    constructor(private readonly zone: NgZone) { }
    activateProject(id: string, chapter: number, event: Event): void {
        const button = this.objectButtons.get(id);
        if (this.albumBlocked || this.focusTarget || this.selectedAlbum || !button || button.hidden || button.disabled) return;
        this.projectReturnId = id;
        this.projectRestorePending = false;
        this.projectPointerActivation = event instanceof MouseEvent && event.detail > 0;
        this.projectRequested.emit({ chapter, event });
    }
    activateAlbum(id: string, event: Event): void {
        if (this.albumBlocked || this.focusTarget || this.selectedAlbum || !this.albumArt[id]) return;
        this.albumReturnId = id;
        this.albumPointerActivation = event instanceof MouseEvent && event.detail > 0;
        this.albumRestorePending = false;
        this.albumRequested.emit({ id, event });
    }
    clearObjectPointerFocus(event: Event): void {
        (event.currentTarget as HTMLElement).classList.remove('pointer-focus-return');
    }
    activateAbout(event: Event): void {
        // Start the physical response in the same input event as the welcome panel.
        // No delayed callbacks can reopen it after Escape or a second interaction.
        this.aboutAnimationProgress = this.motion.matches ? 1 : 0;
        this.aboutAnimationStarted = performance.now();
        this.animateAbout?.(this.aboutAnimationProgress);
        this.zone.runOutsideAngular(() => this.requestFrame());
        this.aboutRequested.emit(event);
    }
    ngAfterViewInit(): void { this.zone.runOutsideAngular(() => this.initialize()); }
    private initialize(): void {
        this.albumTriggerRefs.forEach(ref => {
            const id = ref.nativeElement.dataset['albumId'];
            if (id) this.objectButtons.set(id, ref.nativeElement);
        });
        this.projectTriggerRefs.forEach(ref => {
            const id = ref.nativeElement.dataset['projectId'];
            if (id) this.objectButtons.set(id, ref.nativeElement);
        });
        try {
            this.rendering = new StudioRendering(this.canvasRef.nativeElement);
            this.renderer = this.rendering.renderer;
        }
        catch {
            this.zone.run(() => this.sceneUnavailable.emit());
            return;
        }
        const renderer = this.renderer;
        if (this.performanceLog) renderer.info.autoReset = false;
        this.smallScreen = window.innerWidth < 761;
        this.scene = new THREE.Scene();
        this.scene.background = this.cityFogColor.clone();
        this.scene.fog = new THREE.Fog(this.cityFogColor, 32, 130);
        this.camera = new THREE.PerspectiveCamera(50, 1, .045, 260);
        const manager = new THREE.LoadingManager();
        manager.onLoad = () => { if (!this.disposed) {
            renderer.shadowMap.needsUpdate = true;
            this.rendering?.captureRoomReflections(this.scene!, this.reflectiveMaterials, this.smallScreen);
            this.requestFrame();
            this.zone.run(() => this.sceneReady.emit());
        } };
        // A failed optional map retains its material and never strands the entrance loader.
        manager.onError = () => { if (!this.disposed)
            this.zone.run(() => this.sceneReady.emit()); };
        const loader = new THREE.TextureLoader(manager);
        const texture = (path: string) => {
            const tex = loader.load(path);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
            this.resources.push(tex);
            return tex;
        };
        const tile = (path: string, repeats: number, color = false) => {
            const tex = texture(`/studio-assets/${path}`);
            tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(repeats, repeats);
            return tex;
        };
        const woodMap = tile('wood_floor_diff_1k.jpg', 1, true);
        const woodNormal = tile('wood_floor_nor_gl_1k.jpg', 1);
        const woodRough = tile('wood_floor_rough_1k.jpg', 1);
        const fabricNormal = tile('bi_stretch_nor_gl_1k.jpg', 1);
        const fabricRough = tile('bi_stretch_rough_1k.jpg', 1);
        const walnutMap = tile('wood-veneer/black_walnut_veneer_02_diff_2k.jpg', 1, true);
        const walnutNormal = tile('wood-veneer/black_walnut_veneer_02_nor_gl_1k.jpg', 1);
        const walnutRough = tile('wood-veneer/black_walnut_veneer_02_rough_1k.jpg', 1);
        const floorMaterial = new THREE.MeshPhysicalMaterial({ color: 0xb4a08d, map: woodMap, normalMap: woodNormal, normalScale: new THREE.Vector2(.15, .15), roughnessMap: woodRough, roughness: .88, clearcoat: .12, clearcoatRoughness: .45 });
        const materials: StudioMaterials = {
            wood: new THREE.MeshPhysicalMaterial({ color: 0xd5c3ad, map: walnutMap, normalMap: walnutNormal, normalScale: new THREE.Vector2(.14, .14), roughnessMap: walnutRough, roughness: .82, clearcoat: .24, clearcoatRoughness: .32 }),
            walnut: new THREE.MeshPhysicalMaterial({ color: 0xb9a28b, map: walnutMap, normalMap: walnutNormal, normalScale: new THREE.Vector2(.12, .12), roughnessMap: walnutRough, roughness: .92, clearcoat: .16, clearcoatRoughness: .4 }),
            fabric: new THREE.MeshPhysicalMaterial({ color: 0x303130, normalMap: fabricNormal, normalScale: new THREE.Vector2(.12, .12), roughnessMap: fabricRough, roughness: 1, sheen: .35, sheenColor: 0xb4ada0, sheenRoughness: .85 }),
            metal: new THREE.MeshStandardMaterial({ color: 0x303234, metalness: .65, roughness: .35 }),
            rubber: new THREE.MeshStandardMaterial({ color: 0x151719, metalness: 0, roughness: .86 }),
            brass: new THREE.MeshStandardMaterial({ color: 0xba9364, metalness: .78, roughness: .3 }),
            paper: new THREE.MeshStandardMaterial({ color: 0xd6d0c4, roughness: .95 }),
        };
        const plaster = new THREE.MeshStandardMaterial({ color: 0x887f73, map: tile('plastered_wall_02_diff_1k.jpg', 1, true), normalMap: tile('plastered_wall_02_nor_gl_1k.jpg', 1), normalScale: new THREE.Vector2(.1, .1), roughnessMap: tile('plastered_wall_02_rough_1k.jpg', 1), roughness: 1 });
        const room = buildStudioRoom(materials, plaster, texture);
        const furniture = buildStudioFurniture(materials, texture);
        const workDetails = buildStudioWorkDetails(materials);
        const musicCorner = buildStudioMusicCorner(materials);
        const gamingDetails = buildStudioGamingDetails(materials);
        const city = buildStudioCity(materials);
        const street = buildStudioStreet(materials);
        this.exterior = new THREE.Group();
        this.exterior.name = 'Exterior city approach';
        this.exterior.add(city.group, street.group);
        const detailResources = [...workDetails.resources, ...musicCorner.resources, ...gamingDetails.resources, ...city.resources, ...street.resources];
        this.readerAnchors = furniture.readerAnchors;
        this.projectTargets = furniture.projectTargets;
        this.albumArt = { ...room.albumArt, ...furniture.albumArt };
        this.scene.add(room.group, furniture.group, workDetails.group, musicCorner.group, gamingDetails.group, this.exterior);
        const floor = room.group.getObjectByName('Studio floor');
        if (floor instanceof THREE.Mesh) floor.material = floorMaterial;
        else floorMaterial.dispose();
        mapStudioSurfaces(this.scene, new Map([
            [floorMaterial, { metres: 1.7 }],
            [materials.wood, { metres: 1, grain: true }],
            [materials.walnut, { metres: 1, grain: true }],
            [materials.fabric, { metres: .265 }],
            [plaster, { metres: 2.23 }],
        ]));
        const movingRoots = new Set<THREE.Object3D>([room.door, furniture.record, room.aboutSign.parent!]);
        const keep = new Set<THREE.Object3D>([
            ...movingRoots, ...furniture.meters, furniture.portalScreen, furniture.stanleyScreen, ...Object.values(this.albumArt), ...Object.values(this.projectTargets).map(target => target.probe),
        ]);
        batchStaticStudio(room.group, keep);
        batchStaticStudio(furniture.group, keep);
        this.reflectiveMaterials = [materials.wood, materials.walnut, materials.metal, materials.brass];
        if (floor instanceof THREE.Mesh) this.reflectiveMaterials.push(floorMaterial);
        this.scene.traverse(object => {
            if (!(object instanceof THREE.Mesh)) return;
            const list = Array.isArray(object.material) ? object.material : [object.material];
            list.forEach(material => {
                if (material instanceof THREE.MeshStandardMaterial &&
                    (material.metalness > .5 || (material.transparent && material.roughness < .2)) &&
                    !this.reflectiveMaterials.includes(material)) this.reflectiveMaterials.push(material);
            });
        });
        this.door = room.door;
        this.aboutSign = room.aboutSign;
        this.animateAbout = room.animateActivation;
        this.record = furniture.record;
        this.albumVisibility = new StudioAlbumOcclusion(
            [room.group, furniture.group, workDetails.group, musicCorner.group, gamingDetails.group],
            [room.door, furniture.record],
        );
        this.meters = furniture.meters;
        this.resources.push(...room.resources, ...furniture.resources, ...detailResources);
        for (const map of [...room.resources, ...furniture.resources, ...detailResources]) map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        addStudioLighting(this.scene, this.smallScreen);
        this.resources.push(addStudioContactShadows(this.scene));
        this.rendering.loadEnvironment(this.scene, manager);
        const video = document.createElement('video');
        video.src = '/tapmango-dashboard.mp4';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'metadata';
        this.video = video;
        this.videoTexture = new THREE.VideoTexture(video);
        this.videoTexture.colorSpace = THREE.SRGBColorSpace;
        const portalMaterial = furniture.portalScreen.material as THREE.MeshBasicMaterial;
        portalMaterial.map = texture('/tapmango-dashboard-poster.jpg');
        portalMaterial.needsUpdate = true;
        video.addEventListener('loadedmetadata', () => { if (video.duration > 1.5)
            video.currentTime = 1.5; }, { once: true });
        const showVideo = () => {
            const portalActive = this.focusTarget ? this.detailChapter === 3 : this.progress > .54 && this.progress < .76;
            if (this.disposed || video.currentTime < .7 || !portalActive)
                return;
            portalMaterial.map = this.videoTexture!;
            portalMaterial.needsUpdate = true;
            video.removeEventListener('timeupdate', showVideo);
        };
        video.addEventListener('timeupdate', showVideo);
        // Only the relevant station plays; reduced motion retains a still frame.
        this.updateVideo();
        this.rendering.configurePostprocessing(this.scene, this.camera, this.smallScreen);
        freezeStudioTransforms(this.scene, movingRoots);
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(this.canvasRef.nativeElement);
        window.addEventListener('scroll', this.onScroll, { passive: true });
        document.addEventListener('visibilitychange', this.onVisibility);
        this.motion.addEventListener('change', this.onMotionChange);
        this.canvasRef.nativeElement.addEventListener('webglcontextlost', this.onContextLost);
        this.resize();
        this.onScroll();
        this.progress = this.targetProgress;
        this.previousTime = performance.now();
        this.requestFrame();
    }
    private readonly resize = (): void => {
        if (!this.renderer || !this.camera)
            return;
        const width = Math.max(this.canvasRef.nativeElement.clientWidth, 1), height = Math.max(this.canvasRef.nativeElement.clientHeight, 1);
        this.smallScreen = width < 761;
        // Project each station's actual housing bounds into its reading view.
        // Only resize recomputes these anchors; opening a reader cannot clear the canvas.
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        this.refreshAlbumViews();
        const positions: Record<number, number> = {};
        for (const [chapterKey, anchors] of Object.entries(this.readerAnchors)) {
            const chapter = Number(chapterKey);
            const layout = studioReaderLayout(this.detailViews[chapter], anchors, width, height, innerWidth, rem, chapter === 1);
            this.readerLayouts[chapter] = layout;
            positions[chapter] = layout.left;
        }
        if (Object.keys(positions).some(chapter => Math.abs(positions[Number(chapter)] - (this.lastReaderPositions[Number(chapter)] ?? -1)) > .5)) {
            this.lastReaderPositions = positions;
            queueMicrotask(() => {
                if (!this.disposed && this.lastReaderPositions === positions)
                    this.zone.run(() => this.readerPositionsChanged.emit(positions));
            });
        }
        this.rendering?.resize(width, height, this.smallScreen, this.camera);
        this.onScroll();
        this.requestFrame();
    };
    private readonly onScroll = (): void => {
        const story = document.querySelector<HTMLElement>('.world-story');
        if (!story)
            return;
        this.targetProgress = studioProgressFromScroll((window.scrollY - story.offsetTop) / Math.max(story.offsetHeight - innerHeight, 1));
        this.requestFrame();
    };
    private readonly onVisibility = (): void => {
        this.hidden = document.hidden;
        if (this.hidden) {
            cancelAnimationFrame(this.frame);
            this.frame = 0;
            this.video?.pause();
            this.aboutAnimationProgress = 1;
            this.animateAbout?.(1);
        }
        else {
            this.previousTime = performance.now();
            this.updateVideo();
            this.requestFrame();
        }
    };
    private readonly onMotionChange = (): void => { this.updateVideo(); this.requestFrame(); };
    private readonly onContextLost = (event: Event): void => {
        event.preventDefault();
        cancelAnimationFrame(this.frame);
        this.video?.pause();
        this.aboutTriggerRef.nativeElement.hidden = true;
        this.hideObjectTriggers();
        this.zone.run(() => this.sceneUnavailable.emit());
    };
    /** A native button follows the sign's projection for mouse, touch and keyboard. */
    private updateAboutTrigger(): void {
        const button = this.aboutTriggerRef.nativeElement;
        if (!this.camera || !this.aboutSign || this.progress >= .07 || this.targetProgress >= .10 || this.focusTarget > 0 || this.albumFocusAmount > .001) {
            button.hidden = true;
            return;
        }
        this.camera.updateMatrixWorld();
        this.aboutBounds.setFromObject(this.aboutSign);
        const { min, max } = this.aboutBounds;
        this.aboutCorners[0].set(min.x, min.y, max.z);
        this.aboutCorners[1].set(min.x, max.y, max.z);
        this.aboutCorners[2].set(max.x, min.y, max.z);
        this.aboutCorners[3].set(max.x, max.y, max.z);
        this.aboutCorners.forEach(point => point.project(this.camera!));
        const width = this.canvasRef.nativeElement.clientWidth;
        const height = this.canvasRef.nativeElement.clientHeight;
        const left = (Math.min(...this.aboutCorners.map(point => point.x)) + 1) * width / 2;
        const right = (Math.max(...this.aboutCorners.map(point => point.x)) + 1) * width / 2;
        const top = (1 - Math.max(...this.aboutCorners.map(point => point.y))) * height / 2;
        const bottom = (1 - Math.min(...this.aboutCorners.map(point => point.y))) * height / 2;
        button.hidden = right < 0 || left > width || bottom < 0 || top > height || this.aboutCorners.some(point => point.z > 1 || point.z < -1);
        if (button.hidden) return;
        const hitWidth = Math.max(right - left, 44), hitHeight = Math.max(bottom - top, 44);
        button.style.left = `${(left + right - hitWidth) / 2}px`;
        button.style.top = `${(top + bottom - hitHeight) / 2}px`;
        button.style.width = `${hitWidth}px`;
        button.style.height = `${hitHeight}px`;
    }
    private refreshAlbumViews(): void {
        if (!this.camera) return;
        const width = Math.max(this.canvasRef.nativeElement.clientWidth, 1);
        const height = Math.max(this.canvasRef.nativeElement.clientHeight, 1);
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const initialView = this.selectedAlbum ? this.albumViews[this.selectedAlbum] : undefined;
        for (const [id, art] of Object.entries(this.albumArt)) {
            art.geometry.computeBoundingBox();
            const artWidth = art.geometry.boundingBox!.max.x - art.geometry.boundingBox!.min.x;
            this.albumViews[id] = studioAlbumView(art, artWidth > .4 ? .61 : .345, width, height, innerWidth, rem);
        }
        this.albumOcclusion.clear();
        this.albumPoseValid = false;
        this.albumOcclusionDirty = true;
        const id = this.selectedAlbum;
        const view = id ? this.albumViews[id] : undefined;
        if (view && !initialView) {
            this.albumPosition.copy(view.position);
            this.albumTarget.copy(view.target);
            this.albumFov = view.fov;
        }
        if (view && Math.abs(view.readerLeft - this.lastAlbumReaderLeft) > .5) {
            this.lastAlbumReaderLeft = view.readerLeft;
            queueMicrotask(() => {
                if (!this.disposed && this.selectedAlbum === id)
                    this.zone.run(() => this.albumReaderLeftChanged.emit(view.readerLeft));
            });
        }
    }
    private hideObjectTriggers(): void {
        this.objectButtons.forEach(button => { if (!button.hidden) button.hidden = true; if (!button.disabled) button.disabled = true; });
        this.albumPoseValid = false;
    }
    /** Native hit targets follow the projected frames, never empty screen rectangles. */
    private updateObjectTriggers(now: number): void {
        if (!this.camera || this.albumBlocked || this.selectedAlbum || this.albumFocusAmount > .012 ||
            this.focusTarget || this.focusAmount > .012 || this.progress < .15 || this.camera.position.z > 4.1 ||
            this.canvasRef.nativeElement.closest('[inert]')) {
            this.hideObjectTriggers();
            return;
        }
        const poseChanged = !this.albumPoseValid || this.camera.position.distanceToSquared(this.albumCameraPosition) > 1e-8 ||
            1 - Math.abs(this.camera.quaternion.dot(this.albumCameraRotation)) > 1e-10 ||
            !this.camera.projectionMatrix.equals(this.albumCameraProjection);
        this.albumOcclusionDirty ||= poseChanged;
        const refreshOcclusion = this.albumOcclusionDirty && now - this.albumOcclusionTime >= 100;
        // Project faces and record sleeves are static. A settled viewpoint needs no repeated
        // raycasts or DOM writes; a pending visibility refresh still gets its turn.
        if (!poseChanged && !refreshOcclusion && !this.albumRestorePending && !this.projectRestorePending) return;
        const width = this.canvasRef.nativeElement.clientWidth, height = this.canvasRef.nativeElement.clientHeight;
        if (refreshOcclusion) {
            this.albumOcclusionTime = now;
            this.albumOcclusionDirty = false;
            this.albumVisibility?.refreshMovingBounds();
        }
        this.camera.updateMatrixWorld();
        for (const [id, button] of this.objectButtons) {
            const project = this.projectTargets[id];
            const art = project?.probe ?? this.albumArt[id], view = project ?? this.albumViews[id];
            let visible = !!art && !!view;
            for (let parent: THREE.Object3D | null = art ?? null; parent; parent = parent.parent) visible &&= parent.visible;
            if (!visible || !view) { button.hidden = true; button.disabled = true; continue; }
            this.albumRayDirection.subVectors(this.camera.position, view.target).normalize();
            if (view.normal.dot(this.albumRayDirection) < .18) { button.hidden = true; button.disabled = true; continue; }
            view.anchors.forEach((point, index) => this.albumCorners[index].copy(point).project(this.camera!));
            const left = (Math.min(...this.albumCorners.map(point => point.x)) + 1) * width / 2;
            const right = (Math.max(...this.albumCorners.map(point => point.x)) + 1) * width / 2;
            const top = (1 - Math.max(...this.albumCorners.map(point => point.y))) * height / 2;
            const bottom = (1 - Math.min(...this.albumCorners.map(point => point.y))) * height / 2;
            // A partially visible sleeve is still a useful target on a phone.
            // The host clips the projected polygon at the viewport edge.
            const visibleWidth = Math.min(right, width - 4) - Math.max(left, 4);
            const visibleHeight = Math.min(bottom, height - 4) - Math.max(top, 4);
            visible = this.albumCorners.every(point => point.z > -1 && point.z < 1) && Math.min(visibleWidth, visibleHeight) >= 24;
            if (visible) {
                if (refreshOcclusion || !this.albumOcclusion.has(id)) this.albumOcclusion.set(id, this.albumVisibility?.isUnoccluded(art, view.target, this.camera.position) ?? false);
                visible = this.albumOcclusion.get(id) === true;
            }
            button.hidden = !visible;
            button.disabled = !visible;
            if (!visible) continue;
            button.style.left = `${left}px`;
            button.style.top = `${top}px`;
            button.style.width = `${right - left}px`;
            button.style.height = `${bottom - top}px`;
            const polygon = [0, 2, 3, 1].map(index => {
                const point = this.albumCorners[index];
                return [(((point.x + 1) * width / 2) - left) / (right - left) * 100,
                    (((1 - point.y) * height / 2) - top) / (bottom - top) * 100];
            });
            button.style.clipPath = `polygon(${polygon.map(([x, y]) => `${x}% ${y}%`).join(',')})`;
            button.querySelector('polygon')?.setAttribute('points', polygon.map(point => point.join(',')).join(' '));
        }
        this.albumCameraPosition.copy(this.camera.position);
        this.albumCameraRotation.copy(this.camera.quaternion);
        this.albumCameraProjection.copy(this.camera.projectionMatrix);
        this.albumPoseValid = true;
        if (this.projectRestorePending && this.focusAmount < .001 && this.projectReturnId) {
            const original = this.objectButtons.get(this.projectReturnId);
            this.projectRestorePending = false;
            this.projectReturnId = null;
            const active = document.activeElement;
            if (!active || active === document.body || active.closest('.project-explorer, .scene-project-trigger')) {
                if (original && !original.hidden) {
                    original.classList.toggle('pointer-focus-return', this.projectPointerActivation);
                    original.addEventListener('blur', () => original.classList.remove('pointer-focus-return'), { once: true });
                    original.focus({ preventScroll: true });
                } else this.canvasRef.nativeElement.closest('.world-story')?.querySelector<HTMLButtonElement>('.chapter-rail button[aria-current="step"]')?.focus({ preventScroll: true });
            }
        }
        if (this.albumRestorePending && this.albumFocusAmount < .001 && this.albumReturnId) {
            const original = this.objectButtons.get(this.albumReturnId);
            const button = original && !original.hidden ? original : [...this.objectButtons.values()].find(item => !item.hidden && !item.dataset['projectId']);
            this.albumRestorePending = false;
            this.albumReturnId = null;
            // A resize can put the original sleeve outside the view. Restore to a
            // visible target once, rather than stealing focus on a later scroll.
            const active = document.activeElement;
            if (active && active !== document.body && !active.closest('.album-explorer, .scene-album-trigger')) return;
            if (button) {
                button.classList.toggle('pointer-focus-return', this.albumPointerActivation);
                button.addEventListener('blur', () => button.classList.remove('pointer-focus-return'), { once: true });
                button.focus({ preventScroll: true });
            } else this.canvasRef.nativeElement.closest('.world-story')?.querySelector<HTMLButtonElement>('.chapter-rail button[aria-current="step"]')?.focus({ preventScroll: true });
        }
    }
    private updateVideo(): void {
        if (!this.video)
            return;
        const portalActive = this.focusTarget ? this.detailChapter === 3 : this.progress > .54 && this.progress < .76;
        if (!this.motion.matches && !this.hidden && !this.albumFocusTarget && portalActive) {
            if (this.video.paused)
                void this.video.play().catch(() => undefined);
        }
        else
            this.video.pause();
    }
    private requestFrame(): void {
        if (!this.frame && !this.disposed && !this.hidden)
            this.frame = requestAnimationFrame(this.animate);
    }
    private readonly animate = (now: number): void => {
        this.frame = 0;
        if (!this.renderer || !this.scene || !this.camera || this.disposed || this.hidden)
            return;
        const detail = this.detailViews[this.detailChapter];
        const album = this.selectedAlbum ? this.albumViews[this.selectedAlbum] : undefined;
        // Apply after all Angular inputs arrive: a selected object opens at its
        // final framing on the next frame, without traversing the scroll route.
        if (this.directViewPending) {
            this.directViewPending = false;
            this.focusAmount = this.focusTarget;
            this.detailPosition.copy(detail.position);
            this.detailTarget.copy(detail.target);
            this.detailFov = detail.fov;
            this.readerOffset = this.readerOffsetTarget;
            this.readerFraming = this.readerFramingTarget;
            this.albumFocusAmount = this.albumFocusTarget;
            if (album) {
                this.albumPosition.copy(album.position);
                this.albumTarget.copy(album.target);
                this.albumFov = album.fov;
            }
        }
        const moving = Math.abs(this.progress - this.targetProgress) > .00001 && this.albumRouteProgress === null ||
            Math.abs(this.focusAmount - this.focusTarget) > .0001 ||
            Math.abs(this.albumFocusAmount - this.albumFocusTarget) > .0001 || this.aboutAnimationProgress < 1 ||
            this.focusTarget > 0 && (this.detailPosition.distanceToSquared(detail.position) > 1e-8 ||
                this.detailTarget.distanceToSquared(detail.target) > 1e-8 ||
                Math.abs(this.readerOffset - this.readerOffsetTarget) > .0001 || Math.abs(this.readerFraming - this.readerFramingTarget) > .0001) ||
            !!album && this.albumPosition.distanceToSquared(album.position) > 1e-8;
        if (!this.benchmark && !this.motion.matches && !this.frameBudget.shouldRender(now, moving)) { this.requestFrame(); return; }
        const frameStarted = this.performanceLog ? performance.now() : 0;
        if (this.performanceLog) this.renderer.info.reset();
        if (!this.benchmark) this.rendering?.adapt(now - this.previousTime, moving && this.movingLastFrame, now, this.camera);
        this.movingLastFrame = moving;
        const dt = Math.min((now - this.previousTime) / 1000, .05);
        this.previousTime = now;
        if (!this.motion.matches)
            this.elapsed += dt;
        if (this.aboutAnimationProgress < 1) {
            this.aboutAnimationProgress = this.motion.matches ? 1 : THREE.MathUtils.clamp((now - this.aboutAnimationStarted) / 950, 0, 1);
            this.animateAbout?.(this.aboutAnimationProgress);
        }
        if (this.albumRouteProgress !== null) {
            this.progress = this.albumRouteProgress;
        } else if (this.motion.matches) {
            let stop: number = 0;
            STUDIO_STOPS.forEach(value => { if (this.targetProgress >= value - .035)
                stop = value; });
            // Keep the listening wall reachable without animated camera travel.
            this.progress = this.targetProgress >= STUDIO_CITY_APPROACH.end && this.targetProgress < .10
                ? STUDIO_CITY_APPROACH.end
                : this.targetProgress >= .10 && this.targetProgress < STUDIO_LOOK_AROUND.end
                ? this.targetProgress < .18 ? STUDIO_LOOK_AROUND.start : this.targetProgress < .215 ? .195 : .235
                : stop;
        }
        else
            this.progress = THREE.MathUtils.damp(this.progress, this.targetProgress, 7.5, dt);
        const p = this.progress;
        const caption = studioCaptionAt(p);
        if (!this.focusTarget && !this.albumFocusTarget && caption !== this.lastCaption) {
            this.lastCaption = caption;
            this.zone.run(() => this.captionChanged.emit(caption));
        }
        let i = 0;
        while (i < this.cameraKeys.length - 2 && p > this.cameraKeys[i + 1].t)
            i++;
        const a = this.cameraKeys[i], b = this.cameraKeys[i + 1];
        const local = THREE.MathUtils.clamp((p - a.t) / (b.t - a.t), 0, 1);
        // Smooth step eases each approach; a small hold lets the visitor read the object.
        const s = THREE.MathUtils.smootherstep(local, .08, .90);
        const position = a.position.clone().lerp(b.position, s);
        const target = a.target.clone().lerp(b.target, s);
        const entranceFraming = THREE.MathUtils.smoothstep(p, 0, STUDIO_CITY_APPROACH.end) * (1 - THREE.MathUtils.smoothstep(p, STUDIO_CITY_APPROACH.end, .10));
        // Keep the exterior sign inside the right edge on compact desktop windows.
        if (!this.smallScreen) {
            const compactEntrance = (1 - THREE.MathUtils.smoothstep(this.camera.aspect, 1.15, 1.6)) * entranceFraming;
            target.x += .4 * compactEntrance;
        }
        if (this.smallScreen) {
            position.y += .14;
            position.x += entranceFraming;
            position.z += .6 * entranceFraming;
            target.x += 1.1 * entranceFraming;
            const lookAroundFraming = THREE.MathUtils.smoothstep(p, .16, .19) * (1 - THREE.MathUtils.smoothstep(p, .265, .30));
            const rackFraming = THREE.MathUtils.smoothstep(p, .35, .45) * (1 - THREE.MathUtils.smoothstep(p, .56, .64));
            const tapiFraming = THREE.MathUtils.smoothstep(p, .70, .80) * (1 - THREE.MathUtils.smoothstep(p, .87, 1));
            target.x += .37 * tapiFraming;
            target.y += .32 * (1 - lookAroundFraming) - .52 * rackFraming - .22 * tapiFraming - .4 * entranceFraming;
        }
        this.focusAmount = this.motion.matches ? this.focusTarget : THREE.MathUtils.damp(this.focusAmount, this.focusTarget, 5.5, dt);
        // Reader placement is separate from the Index's always-right drawer.
        // Keep the current side while closing so the return never swings across.
        if (this.focusTarget) {
            this.readerOffset = this.motion.matches ? this.readerOffsetTarget : THREE.MathUtils.damp(this.readerOffset, this.readerOffsetTarget, 5.5, dt);
            this.readerFraming = this.motion.matches ? this.readerFramingTarget : THREE.MathUtils.damp(this.readerFraming, this.readerFramingTarget, 5.5, dt);
        }
        // Keep a continuous camera pose when moving directly between Index previews.
        const detailBlend = this.motion.matches ? 1 : 1 - Math.exp(-5.5 * dt);
        this.detailPosition.lerp(detail.position, detailBlend);
        this.detailTarget.lerp(detail.target, detailBlend);
        this.detailFov = THREE.MathUtils.lerp(this.detailFov, detail.fov, detailBlend);
        position.lerp(this.detailPosition, this.focusAmount);
        target.lerp(this.detailTarget, this.focusAmount);
        this.albumFocusAmount = this.motion.matches ? this.albumFocusTarget : THREE.MathUtils.damp(this.albumFocusAmount, this.albumFocusTarget, 5.5, dt);
        const albumView = this.albumViewId ? this.albumViews[this.albumViewId] : undefined;
        if (albumView) {
            this.albumPosition.lerp(albumView.position, detailBlend);
            this.albumTarget.lerp(albumView.target, detailBlend);
            this.albumFov = THREE.MathUtils.lerp(this.albumFov, albumView.fov, detailBlend);
            position.lerp(this.albumPosition, this.albumFocusAmount);
            target.lerp(this.albumTarget, this.albumFocusAmount);
        }
        this.camera.position.copy(position);
        // Distant buildings stay legible outside; the room keeps its original warmth.
        const outside = THREE.MathUtils.smoothstep(position.z, 3.5, 8.9);
        const fog = this.scene.fog as THREE.Fog;
        fog.color.copy(this.roomFogColor).lerp(this.cityFogColor, outside);
        fog.near = THREE.MathUtils.lerp(13, 32, outside);
        fog.far = THREE.MathUtils.lerp(28, 130, outside);
        (this.scene.background as THREE.Color).copy(fog.color);
        // The closed room occludes the neighborhood, so skip its draw calls inside.
        if (this.exterior) this.exterior.visible = position.z > 3.5;
        const openness = studioOpenness(position.z);
        if (Math.abs(openness - this.lastOpenness) > .015 || ((openness === 0 || openness === 1) && openness !== this.lastOpenness)) {
            this.lastOpenness = openness;
            this.zone.run(() => this.acousticsChanged.emit(openness));
        }
        this.camera.lookAt(target);
        const overviewFov = THREE.MathUtils.lerp(a.fov, b.fov, s) + (this.smallScreen ? 16 : 0);
        const fittedFov = this.readerLayouts[this.detailChapter]?.fov ?? this.detailFov;
        const readerFov = THREE.MathUtils.lerp(this.detailFov, Math.max(this.detailFov, fittedFov), this.smallScreen ? 0 : this.readerFraming);
        this.camera.fov = THREE.MathUtils.lerp(overviewFov, readerFov + (this.smallScreen ? 24 : 0), this.focusAmount);
        if (albumView) this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.albumFov, this.albumFocusAmount);
        if (this.focusAmount > .001 || this.albumFocusAmount > .001) {
            const width = this.canvasRef.nativeElement.clientWidth, height = this.canvasRef.nativeElement.clientHeight;
            const offsetX = THREE.MathUtils.lerp(this.smallScreen ? 0 : width * this.readerOffset * this.focusAmount,
                width * (albumView?.offsetX ?? 0), this.albumFocusAmount);
            const offsetY = THREE.MathUtils.lerp(this.smallScreen ? height * .29 * this.focusAmount : 0,
                height * (albumView?.offsetY ?? 0), this.albumFocusAmount);
            this.camera.setViewOffset(width, height, offsetX, offsetY, width, height);
        } else this.camera.clearViewOffset();
        this.camera.updateProjectionMatrix();
        const opening = THREE.MathUtils.smootherstep(p, .06, .16);
        this.updateAboutTrigger();
        if (this.door && this.door.rotation.y !== opening * 1.51) {
            this.door.rotation.y = opening * 1.51;
            this.renderer.shadowMap.needsUpdate = true;
        }
        this.updateObjectTriggers(now);
        if (!this.albumFocusTarget && this.albumFocusAmount < .001) this.albumRouteProgress = null;
        if (this.record)
            this.record.rotation.y = this.elapsed * .68;
        this.meters.forEach((meter, index) => {
            const material = meter.material as THREE.MeshStandardMaterial;
            if ('emissiveIntensity' in material)
                material.emissiveIntensity = .28 + (!this.motion.matches ? Math.max(0, Math.sin(this.elapsed * 1.4 + index * 1.8)) * .2 : 0);
        });
        this.updateVideo();
        this.rendering?.render(this.scene, this.camera, this.smallScreen, dt);
        this.performanceLog?.record(now, performance.now() - frameStarted, this.renderer, this.progress, this.rendering!.quality.level);
        // Exterior has no perpetual animation. Inside, the platter and meters run at 30 fps when settled.
        if (!this.motion.matches && (this.benchmark || moving || p > .14))
            this.requestFrame();
        else if (!this.motion.matches) this.performanceLog?.idle();
    };
    ngOnDestroy(): void {
        this.disposed = true;
        cancelAnimationFrame(this.frame);
        this.resizeObserver?.disconnect();
        window.removeEventListener('scroll', this.onScroll);
        document.removeEventListener('visibilitychange', this.onVisibility);
        this.motion.removeEventListener('change', this.onMotionChange);
        this.canvasRef.nativeElement.removeEventListener('webglcontextlost', this.onContextLost);
        this.objectButtons.clear();
        this.albumOcclusion.clear();
        this.albumVisibility = undefined;
        this.video?.pause();
        this.video?.removeAttribute('src');
        this.video?.load();
        this.videoTexture?.dispose();
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
        this.scene?.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
            geometries.add(obj.geometry);
            (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => materials.add(m));
        } });
        geometries.forEach(g => g.dispose());
        materials.forEach(m => m.dispose());
        this.resources.forEach(t => t.dispose());
        this.rendering?.dispose();
    }
}
