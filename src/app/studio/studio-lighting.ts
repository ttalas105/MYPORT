import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

/** Authored fixtures and fill, kept separate from camera and interaction state. */
export function addStudioLighting(scene: THREE.Scene, smallScreen: boolean): void {
    RectAreaLightUniformsLib.init();
    scene.add(new THREE.HemisphereLight(0xaab7d0, 0x8e7155, .42));
    scene.add(new THREE.AmbientLight(0xeed5b7, .12));
    // The main pool comes from the open bottom of the visible floor lamp.
    const lamp = new THREE.SpotLight(0xffcf9c, 38, 12, Math.PI * .43, 1, 2);
    lamp.position.set(-3.92, 1.76, -3.4);
    lamp.target.position.set(-1.25, .65, -1.9);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(smallScreen ? 1024 : 2048, smallScreen ? 1024 : 2048);
    lamp.shadow.bias = -.00015;
    lamp.shadow.normalBias = .008;
    lamp.shadow.radius = 3;
    scene.add(lamp, lamp.target);
    const right = new THREE.SpotLight(0xffca92, 24, 10, Math.PI * .43, 1, 2);
    right.position.set(3.58, 1.58, 1.8);
    right.target.position.set(2.55, .35, -.4);
    right.castShadow = !smallScreen;
    right.shadow.mapSize.set(1024, 1024);
    right.shadow.normalBias = .01;
    right.shadow.bias = -.0001;
    right.shadow.radius = 3;
    scene.add(right, right.target);
    const ceilingBounce = new THREE.RectAreaLight(0xffdfbc, .75, 4, 2.4);
    ceilingBounce.position.set(-1.25, 3.32, -.5);
    ceilingBounce.lookAt(-1.25, .6, -1.8);
    scene.add(ceilingBounce);
    const wash = new THREE.RectAreaLight(0x9986d2, 2.5, 4.4, 1.2);
    wash.position.set(-1.5, 1.3, -3.6);
    wash.lookAt(-1.5, 2, -4.15);
    scene.add(wash);
    const screen = new THREE.RectAreaLight(0xc6d4ed, .9, 2.5, .75);
    screen.position.set(-1.7, 1.25, -2.72);
    screen.lookAt(-1.7, 1.1, 0);
    scene.add(screen);
    const windowLight = new THREE.RectAreaLight(0x8092c0, 2.2, 2, 1.7);
    windowLight.position.set(4.12, 2, -1.3);
    windowLight.lookAt(0, 1.4, -1.3);
    scene.add(windowLight);
    // Broad fill keeps exterior objects readable without wall fixtures or pools.
    const exteriorFill = new THREE.RectAreaLight(0xc4c6cd, 1.0, 7, 4);
    exteriorFill.position.set(0, 3.3, 7);
    exteriorFill.lookAt(.2, 1.3, 4.2);
    scene.add(exteriorFill);
}

/** The caller owns the returned texture along with the scene's geometry/materials. */
export function addStudioContactShadows(scene: THREE.Scene): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0,0,0,.62)');
    gradient.addColorStop(.4, 'rgba(0,0,0,.38)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const map = new THREE.CanvasTexture(canvas);
    for (const [x, z, w, d] of [
        [-1.75, -2.8, 4.8, 2], [1.05, -2.8, 1.6, 1.3], [-3.45, .2, 1.5, 2.5],
        [2.75, -.75, 2.2, 1.8], [2.9, 2.05, 2.5, 2.2],
        [2.55, -3.60, 1.8, .90], [3.78, -.82, .54, .70], [-3.85, 1.60, .60, .80], [3.77, 2.98, .78, .72],
    ]) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: .75 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, .024, z);
        scene.add(mesh);
    }
    return map;
}
