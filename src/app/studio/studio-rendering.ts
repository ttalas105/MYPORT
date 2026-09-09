import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Owns GPU rendering resources; the scene host owns geometry, camera motion and input. */
export class StudioRendering {
    readonly renderer: THREE.WebGLRenderer;
    private composer?: EffectComposer;
    private environment?: THREE.WebGLRenderTarget;
    private environmentGenerator?: THREE.PMREMGenerator;
    private roomReflections?: THREE.WebGLRenderTarget;
    private disposed = false;

    constructor(canvas: HTMLCanvasElement) {
        const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
    }

    loadEnvironment(scene: THREE.Scene, manager: THREE.LoadingManager): void {
        // Reflection lighting only: the visible room and city remain modeled geometry.
        const generator = this.environmentGenerator = new THREE.PMREMGenerator(this.renderer);
        const fallback = new RoomEnvironment();
        this.environment = generator.fromScene(fallback, .02);
        scene.environment = this.environment.texture;
        scene.environmentIntensity = .36;
        fallback.dispose();
        new RGBELoader(manager).load('/studio-assets/studio_small_01_1k.hdr', hdr => {
            if (this.disposed) {
                hdr.dispose();
                this.releaseEnvironmentGenerator(generator);
                return;
            }
            this.environment?.dispose();
            this.environment = generator.fromEquirectangular(hdr);
            scene.environment = this.environment.texture;
            scene.environmentIntensity = .32;
            hdr.dispose();
            this.releaseEnvironmentGenerator(generator);
        }, undefined, () => this.releaseEnvironmentGenerator(generator));
    }

    private releaseEnvironmentGenerator(generator: THREE.PMREMGenerator): void {
        if (this.environmentGenerator !== generator) return;
        this.environmentGenerator = undefined;
        generator.dispose();
    }

    configurePostprocessing(scene: THREE.Scene, camera: THREE.PerspectiveCamera, smallScreen: boolean): void {
        // Mobile retains canvas MSAA and modeled contact shadows rather than
        // allocating the desktop's full-screen occlusion/postprocessing targets.
        if (smallScreen || (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 2) return;
        const composer = this.composer = new EffectComposer(this.renderer);
        composer.addPass(new RenderPass(scene, camera));
        const ao = new GTAOPass(scene, camera, 1, 1);
        ao.output = GTAOPass.OUTPUT.Default;
        ao.blendIntensity = .6;
        ao.updateGtaoMaterial({ radius: .22, thickness: .5, distanceFallOff: 1, scale: 1, samples: 16 });
        ao.updatePdMaterial({ radius: 6, rings: 2, samples: 16 });
        composer.addPass(ao);
        // Canvas MSAA does not cover offscreen rendering. Smooth geometry and
        // AO edges in linear color before the final tone-mapping output pass.
        composer.addPass(new SMAAPass());
        composer.addPass(new OutputPass());
    }

    /** Capture the furnished room once; no reflection capture runs in the frame loop. */
    captureRoomReflections(scene: THREE.Scene, materials: readonly THREE.MeshStandardMaterial[], smallScreen: boolean): void {
        if (this.disposed || this.roomReflections || smallScreen) return;
        const renderer = this.renderer;
        if (!renderer.extensions.has('EXT_color_buffer_float')) return;
        const previousTarget = renderer.getRenderTarget();
        const previousFace = renderer.getActiveCubeFace();
        const previousMip = renderer.getActiveMipmapLevel();
        const previousXr = renderer.xr.enabled;
        const target = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
        const probe = new THREE.CubeCamera(.08, 18, target);
        const generator = new THREE.PMREMGenerator(renderer);
        try {
            probe.position.set(-.25, 1.45, .3);
            scene.updateMatrixWorld(true);
            probe.update(renderer, scene);
            this.roomReflections = generator.fromCubemap(target.texture);
            materials.forEach(material => {
                material.envMap = this.roomReflections!.texture;
                material.envMapIntensity = .75;
                material.needsUpdate = true;
            });
        } catch {
            // Optional local reflections retain HDR lighting on constrained drivers.
            this.roomReflections?.dispose();
            this.roomReflections = undefined;
        } finally {
            renderer.setRenderTarget(previousTarget, previousFace, previousMip);
            renderer.xr.enabled = previousXr;
            target.dispose();
            generator.dispose();
        }
    }

    resize(width: number, height: number, smallScreen: boolean, camera: THREE.PerspectiveCamera): void {
        // Retain desktop supersampling, the mobile budget and the native 1x floor.
        const preferredRatio = Math.min(2, Math.max(devicePixelRatio, smallScreen ? 1 : 1.5));
        const pixelBudget = smallScreen ? 2_000_000 : 5_000_000;
        const pixelRatio = Math.min(preferredRatio, Math.max(1, Math.sqrt(pixelBudget / (width * height))));
        const previousSize = this.renderer.getSize(new THREE.Vector2());
        const sizeChanged = previousSize.x !== width || previousSize.y !== height;
        const ratioChanged = this.renderer.getPixelRatio() !== pixelRatio;
        // Unchanged dimensions must not clear the drawing buffer when panels
        // open or focus notifications trigger another layout measurement.
        if (ratioChanged) this.renderer.setPixelRatio(pixelRatio);
        if (sizeChanged) this.renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (ratioChanged) this.composer?.setPixelRatio(pixelRatio);
        if (sizeChanged) this.composer?.setSize(width, height);
        this.renderer.shadowMap.needsUpdate = true;
    }

    render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, smallScreen: boolean, dt: number): void {
        if (this.composer && !smallScreen) this.composer.render(dt);
        else this.renderer.render(scene, camera);
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        if (this.environmentGenerator) this.releaseEnvironmentGenerator(this.environmentGenerator);
        this.environment?.dispose();
        this.roomReflections?.dispose();
        this.composer?.passes.forEach(pass => pass.dispose());
        this.composer?.dispose();
        this.renderer.dispose();
    }
}
