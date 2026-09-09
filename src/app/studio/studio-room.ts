/**
 * THESIS: A real-scale studio entered through its door.
 * WORLD: Walnut, woven acoustic panels, warm practical lamps and a violet wall wash.
 * STORY: Native scroll carries the visitor from the threshold to the work and music.
 * FIRST FRAME: The studio sits in a night city; the approach ends at its fitted walnut door.
 * MOTION: One continuous camera route, an opening door, a record and working screens.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from './studio-geometry';
import type { StudioMaterials } from './studio-furniture';
import { STUDIO_WALL_ALBUMS } from './studio-albums';
import { buildAboutNeon } from './studio-neon';
import { buildStudioExterior } from './studio-exterior';
export interface StudioArchitecture {
    group: THREE.Group;
    door: THREE.Group;
    aboutSign: THREE.Object3D;
    animateActivation(progress: number): void;
    albumArt: Record<string, THREE.Mesh>;
    resources: THREE.Texture[];
}
export function buildStudioRoom(m: StudioMaterials, plaster: THREE.Material, texture: (path: string) => THREE.Texture): StudioArchitecture {
    const group = new THREE.Group();
    const resources: THREE.Texture[] = [];
    const albumArt: Record<string, THREE.Mesh> = {};
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, radius = .012, parent: THREE.Group = group) => {
        const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    const ceiling = new THREE.MeshStandardMaterial({ color: 0x292827, roughness: .95 });
    const ink = new THREE.MeshStandardMaterial({ color: 0x18191a, roughness: .78 });
    // Continuous floor and true wall thickness; no photographic back wall.
    box(9, .14, 8.64, m.wood, 0, -.075, 0).name = 'Studio floor';
    box(8.9, 3.35, .18, plaster, 0, 1.675, -4.18);
    box(.18, 3.35, 8.5, plaster, -4.48, 1.675, .02);
    box(.18, 3.35, 8.5, plaster, 4.48, 1.675, .02);
    box(9, .16, 8.6, ceiling, 0, 3.43, .04);
    box(3.64, 3.35, .19, plaster, -2.63, 1.675, 4.2);
    box(3.64, 3.35, .19, plaster, 2.63, 1.675, 4.2);
    box(1.62, .75, .19, plaster, 0, 3, 4.2);
    [-4.32, 4.32].forEach(x => box(.08, .13, 8.2, m.walnut, x, .085, 0));
    box(8.7, .13, .08, m.walnut, 0, .085, -4.04);
    box(8.7, .08, .1, m.walnut, 0, 3.22, -4.04);
    // Oak battens over acoustic backing give the desk wall depth and soft shadow.
    box(5.3, 2.2, .09, ink, -1.35, 1.95, -4.04);
    for (let i = 0; i < 42; i++)
        box(.055, 2.18, .09, m.walnut, -3.9 + i * .125, 1.95, -3.955, .004);
    for (let i = 0; i < 3; i++) {
        box(.72, 1.38, .14, m.fabric, -2.92 + i * 1.14, 2.11, -3.82, .035);
    }
    // Ceiling cloud is a physical upholstered object, not a glowing rectangle.
    box(3.7, .11, 1.8, m.fabric, -1.25, 3.13, -1.6, .045);
    [-2.65, .15].forEach(x => [-2.25, -.95].forEach(z => box(.008, .23, .008, m.metal, x, 3.29, z, .001)));
    // The original opening remains intact; depth comes from the reveal, glass and distant facades.
    const nightCanvas = document.createElement('canvas');
    nightCanvas.width = 256;
    nightCanvas.height = 512;
    const nightContext = nightCanvas.getContext('2d')!;
    const nightGradient = nightContext.createLinearGradient(0, 0, 0, 512);
    nightGradient.addColorStop(0, '#0b1019');
    nightGradient.addColorStop(.64, '#202a35');
    nightGradient.addColorStop(1, '#37363b');
    nightContext.fillStyle = nightGradient;
    nightContext.fillRect(0, 0, 256, 512);
    const nightTexture = new THREE.CanvasTexture(nightCanvas);
    nightTexture.colorSpace = THREE.SRGBColorSpace;
    resources.push(nightTexture);
    box(.055, 1.85, 2.45, m.walnut, 4.34, 2.06, -1.3, .012);
    const nightView = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.64), new THREE.MeshBasicMaterial({ map: nightTexture }));
    nightView.name = 'Night window sky';
    nightView.rotation.y = -Math.PI / 2;
    nightView.position.set(4.286, 2.06, -1.3);
    group.add(nightView);

    // Each lit aperture belongs to a floor and facade; there are no detached light particles.
    const facades: number[] = [], facadeColors: number[] = [], apertures: number[] = [], apertureColors: number[] = [];
    const windowRect = (positions: number[], colors: number[], x: number, bottom: number, top: number, left: number, right: number, color: number) => {
        positions.push(x, bottom, left, x, top, left, x, top, right, x, bottom, left, x, top, right, x, bottom, right);
        const tint = new THREE.Color(color);
        for (let i = 0; i < 6; i++) colors.push(tint.r, tint.g, tint.b);
    };
    const skyline = [
        [-2.425, .28, 2.03], [-2.13, .35, 2.34], [-1.765, .25, 2.18],
        [-1.5, .31, 2.49], [-1.175, .38, 2.22], [-.78, .29, 2.38], [-.475, .30, 2.09],
    ];
    skyline.forEach(([left, width, top], building) => {
        windowRect(facades, facadeColors, 4.279, 1.24, top, left, left + width, building % 2 ? 0x151c24 : 0x111820);
        windowRect(facades, facadeColors, 4.278, top, top + .016, left + .015, left + width - .015, 0x1c2229);
        const columns = Math.floor(width / .052);
        const floors = Math.floor((top - 1.31) / .067);
        for (let floor = 0; floor < floors; floor++) {
            for (let column = 0; column < columns; column++) {
                const occupancy = (building * 13 + floor * 7 + column * 11) % 19;
                if (occupancy > 4) continue;
                const z = left + .023 + column * .052;
                const y = 1.285 + floor * .067;
                windowRect(apertures, apertureColors, 4.277, y, y + .024, z, z + .018,
                    occupancy === 0 ? 0x9c8967 : occupancy < 3 ? 0x665c4b : 0x3b4448);
            }
        }
    });
    // A pair of nearer, unlit rooflines interrupts the regular distant grid.
    windowRect(facades, facadeColors, 4.268, 1.24, 1.63, -2.425, -1.82, 0x0b1017);
    windowRect(facades, facadeColors, 4.267, 1.63, 1.648, -2.425, -1.82, 0x1c2227);
    windowRect(facades, facadeColors, 4.268, 1.24, 1.49, -1.025, -.175, 0x0b1017);
    windowRect(facades, facadeColors, 4.267, 1.49, 1.51, -1.025, -.175, 0x1c2227);
    const addWindowLayer = (positions: number[], colors: number[], name: string) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
        mesh.name = name;
        group.add(mesh);
    };
    addWindowLayer(facades, facadeColors, 'Night window building silhouettes');
    addWindowLayer(apertures, apertureColors, 'Night window facade apertures');
    const glazing = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.64), new THREE.MeshPhysicalMaterial({
        color: 0x819091, metalness: .12, roughness: .13, transparent: true, opacity: .105,
        clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .75, depthWrite: false,
    }));
    glazing.name = 'Night window reflective glazing';
    glazing.rotation.y = -Math.PI / 2;
    glazing.position.set(4.253, 2.06, -1.3);
    group.add(glazing);
    const reveal = (w: number, h: number, d: number, x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ink);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        group.add(mesh);
    };
    for (const y of [1.234, 2.886]) reveal(.083, .016, 2.282, 4.255, y, -1.3);
    for (const z of [-2.431, -.169]) reveal(.083, 1.668, .016, 4.255, 2.06, z);
    box(.12, 1.85, .045, ink, 4.22, 2.06, -1.3);
    box(.12, .04, 2.42, ink, 4.22, 2.14, -1.3);
    box(.36, .08, 2.7, m.walnut, 4.18, 1.1, -1.3);

    const curtain = new THREE.MeshPhysicalMaterial({
        color: 0x665e53, roughness: .97, sheen: .65, sheenColor: new THREE.Color(0x9a8974),
        sheenRoughness: .9, normalMap: m.fabric.normalMap, normalScale: new THREE.Vector2(.12, .12),
        side: THREE.DoubleSide,
    });
    const hem = new THREE.MeshStandardMaterial({ color: 0x746a5c, roughness: 1, side: THREE.DoubleSide });
    const clothPoint = (u: number, v: number, z: number, offset = 0) => new THREE.Vector3(
        4.075 + (.050 + .011 * (1 - v)) * Math.cos(u * Math.PI * 10) + .003 * Math.sin(v * 8 + u * 5) * (1 - v) + offset,
        .33 + v * 2.38 + .004 * (1 - v) * (1 + Math.cos(u * Math.PI * 10)) / 2,
        z - .047 + u * .422,
    );
    const clothPatch = (z: number, u0: number, u1: number, v0: number, v1: number, segmentsU: number, segmentsV: number, material: THREE.Material, offset = 0) => {
        const geometry = new THREE.PlaneGeometry(1, 1, segmentsU, segmentsV);
        const positions = geometry.getAttribute('position');
        const uv = geometry.getAttribute('uv');
        for (let i = 0; i < positions.count; i++) {
            const u = u0 + uv.getX(i) * (u1 - u0);
            const v = v0 + uv.getY(i) * (v1 - v0);
            const point = clothPoint(u, v, z, offset);
            positions.setXYZ(i, point.x, point.y, point.z);
            uv.setXY(i, u * .6, v * 2.6);
        }
        geometry.computeVertexNormals();
        const cloth = new THREE.Mesh(geometry, material);
        cloth.castShadow = true;
        cloth.receiveShadow = true;
        group.add(cloth);
        return cloth;
    };
    [-2.77, .17].forEach((z, side) => {
        clothPatch(z, 0, 1, 0, 1, 48, 12, curtain).name = `Continuous linen curtain ${side + 1}`;
        clothPatch(z, 0, 1, .004, .017, 48, 1, hem, -.0015);
        clothPatch(z, 0, 1, .974, .998, 48, 1, hem, -.0015);
        clothPatch(z, .002, .012, 0, 1, 1, 12, hem, -.0015);
        clothPatch(z, .988, .998, 0, 1, 1, 12, hem, -.0015);
        for (let i = 0; i <= 5; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(.019, .0025, 4, 12), m.brass);
            ring.position.set(4.125, 2.75, z - .047 + i * .422 / 5);
            group.add(ring);
            const tab = new THREE.Mesh(new THREE.BoxGeometry(.006, .032, .011), hem);
            tab.position.set(4.125, 2.718, ring.position.z);
            group.add(tab);
        }
    });
    const curtainRod = new THREE.Mesh(new THREE.CylinderGeometry(.010, .010, 3.40, 20), m.brass);
    curtainRod.name = 'Curtain rod';
    curtainRod.rotation.x = Math.PI / 2;
    curtainRod.position.set(4.125, 2.75, -1.136);
    group.add(curtainRod);
    for (const z of [-2.80, .529]) {
        const bracket = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .245, 12), m.brass);
        bracket.rotation.z = Math.PI / 2;
        bracket.position.set(4.245, 2.75, z);
        group.add(bracket);
    }
    // Real framed album artwork above the listening station.
    STUDIO_WALL_ALBUMS.forEach((album, i) => {
        const frame = new THREE.Group();
        frame.name = `${album.title} — ${album.artist}`;
        box(.61, .61, .05, m.walnut, 0, 0, 0, .01, frame);
        const art = new THREE.Mesh(new THREE.PlaneGeometry(.54, .54), new THREE.MeshStandardMaterial({ map: texture(album.file), roughness: .8 }));
        art.position.z = .027;
        frame.add(art);
        albumArt[album.id] = art;
        frame.position.set(-4.30, 1.95, -.97 + i * .78);
        frame.rotation.y = Math.PI / 2;
        group.add(frame);
    });
    const rug = new THREE.MeshStandardMaterial({ color: 0x433a34, roughness: 1, normalMap: m.fabric.normalMap, normalScale: new THREE.Vector2(.2, .2) });
    box(4.8, .014, 3.65, rug, -.3, .012, .9, .004);
    // A woven rug edge rather than a decorative route drawn on the floor.
    const edge = new THREE.MeshStandardMaterial({ color: 0x75675a, roughness: 1 });
    [-1, 1].forEach(side => box(4.64, .016, .026, edge, -.3, .017, .9 + side * 1.72, .003));
    // A solid acoustic door fits the 1.48 m clear opening beneath the 2.62 m frame head.
    box(.12, 2.7, .27, m.walnut, -.80, 1.35, 4.2);
    box(.12, 2.7, .27, m.walnut, .80, 1.35, 4.2);
    box(1.72, .12, .27, m.walnut, 0, 2.68, 4.2);
    const threshold = box(1.52, .034, .30, m.brass, 0, .012, 4.2, .002);
    threshold.name = 'Studio door threshold';
    // Exterior stops overlap the leaf's small fitting clearances. Rubber meets the closed face.
    for (const side of [-1, 1]) {
        const stop = box(.036, 2.594, .036, m.walnut, side * .722, 1.326, 4.27, .002);
        stop.name = side < 0 ? 'Studio door left stop' : 'Studio door right stop';
        const seal = box(.026, 2.582, .012, m.rubber, side * .730, 1.320, 4.249, .003);
        seal.name = side < 0 ? 'Studio door left seal' : 'Studio door right seal';
    }
    box(1.48, .036, .036, m.walnut, 0, 2.604, 4.27, .002).name = 'Studio door head stop';
    box(1.48, .020, .012, m.rubber, 0, 2.612, 4.249, .003).name = 'Studio door head seal';
    const door = new THREE.Group();
    door.name = 'Fitted walnut studio door';
    door.position.set(-.72, 0, 4.17);
    group.add(door);
    // Closed bounds: x [-.733,.733], y [.033,2.613], z [4.175,4.249].
    // The hinge is at the rear edge: an inward swing clears both jambs without moving its pivot.
    const slab = box(1.466, 2.58, .074, m.walnut, .72, 1.323, .042, .002, door);
    slab.name = 'Studio door solid slab';
    box(1.456, .012, .025, m.rubber, .72, .033, .039, .002, door).name = 'Studio door bottom sweep';

    // Shallow framed panels add joinery detail over an uninterrupted full-thickness slab.
    const insetPanel = (height: number, y: number) => {
        box(1.108, height, .004, ink, .72, y, .080, .001, door);
        box(1.078, height - .030, .006, m.wood, .72, y, .083, .002, door);
        for (const x of [.156, 1.284]) box(.028, height + .028, .014, m.walnut, x, y, .086, .003, door);
        for (const edgeY of [y - height / 2, y + height / 2]) box(1.10, .028, .014, m.walnut, .72, edgeY, .086, .003, door);
    };
    insetPanel(1.69, 1.555);
    insetPanel(.34, .428);
    box(1.20, .115, .005, m.brass, .72, .132, .082, .004, door);

    // Three hinge barrels share the preserved swing axis. Their leaves bridge the jamb and slab.
    for (const y of [.285, 1.315, 2.345]) {
        box(.058, .125, .006, m.brass, -.748, y, 4.167, .002);
        box(.065, .125, .006, m.brass, .026, y, .007, .002, door);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .137, 18), m.brass);
        barrel.position.set(0, y, 0);
        barrel.castShadow = true;
        door.add(barrel);
    }
    // Lever hardware on both faces remains attached when the door swings into the room.
    for (const side of [-1, 1]) {
        const face = side > 0 ? .084 : 0;
        box(.055, .23, .014, m.brass, 1.337, 1.025, face, .009, door);
        box(.028, .028, .051, m.brass, 1.337, 1.054, face + side * .029, .006, door);
        box(.17, .025, .028, m.brass, 1.267, 1.054, face + side * .061, .008, door);
    }
    box(.016, .092, .04, m.brass, .747, 1.055, 4.219, .003);

    // The printed lettering is mounted on a physical nameplate rather than floating over glass.
    const nameplate = new THREE.MeshStandardMaterial({ color: 0x24201c, roughness: .9, metalness: .15 });
    box(.91, .30, .008, nameplate, .72, 1.78, .091, .006, door);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 160;
    const c = signCanvas.getContext('2d')!;
    c.fillStyle = '#d8c6a5';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '500 28px Arial';
    c.fillText('THOMAS TALAS', 256, 80);
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    resources.push(signTex);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(.85, .266), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false }));
    sign.position.set(.72, 1.78, .0965);
    door.add(sign);
    const aboutNeon = buildAboutNeon(m);
    group.add(aboutNeon.group);
    const exterior = buildStudioExterior(m);
    group.add(exterior.group);
    resources.push(...exterior.resources);
    // Warm lamps are the visible sources of the light, with shades and hardware.
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd3a2 });
    const shadeLinen = new THREE.MeshPhysicalMaterial({
        color: 0xc7b694, roughness: .94, sheen: .35, sheenColor: new THREE.Color(0xe5cfa8),
        normalMap: m.fabric.normalMap, normalScale: new THREE.Vector2(.065, .065), side: THREE.DoubleSide,
    });
    const shadeLining = new THREE.MeshStandardMaterial({ color: 0xe1ccaa, roughness: .92, emissive: 0xb88850, emissiveIntensity: .08, side: THREE.BackSide });
    const shadeBinding = new THREE.MeshStandardMaterial({ color: 0x8e7c61, roughness: .75 });
    const lamp = (x: number, z: number, height: number) => {
        const fixture = new THREE.Group();
        fixture.name = `Linen floor lamp ${x < 0 ? 'desk' : 'window'}`;
        fixture.position.set(x, 0, z);
        group.add(fixture);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.18, .20, .04, 40), m.metal);
        base.position.y = .035;
        base.castShadow = base.receiveShadow = true;
        fixture.add(base);
        const baseCap = new THREE.Mesh(new THREE.CylinderGeometry(.13, .174, .023, 32), m.metal);
        baseCap.position.y = .064;
        fixture.add(baseCap);
        const stemHeight = height - .18;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(.008, .01, stemHeight, 20), m.brass);
        stem.position.y = .065 + stemHeight / 2;
        stem.castShadow = true;
        fixture.add(stem);
        const profile = [[.318, -.16], [.316, -.15], [.279, -.075], [.239, .005], [.194, .105], [.17, .16]];
        const shade = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 48), shadeLinen);
        shade.position.y = height;
        shade.castShadow = true;
        shade.receiveShadow = true;
        fixture.add(shade);
        const lining = new THREE.Mesh(new THREE.CylinderGeometry(.166, .313, .308, 40, 1, true), shadeLining);
        lining.position.y = height;
        fixture.add(lining);
        for (const [radius, y] of [[.315, -.158], [.168, .157]]) {
            const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, .0025, 6, 40), shadeBinding);
            rim.rotation.x = Math.PI / 2;
            rim.position.y = height + y;
            fixture.add(rim);
        }
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(.020, .024, .05, 20), m.brass);
        socket.position.y = height - .108;
        fixture.add(socket);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), glow);
        bulb.position.y = height - .06;
        fixture.add(bulb);
        // The harp physically joins the top ring to the socket within the original shade envelope.
        const harpCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-.020, height - .11, 0), new THREE.Vector3(-.075, height + .015, 0),
            new THREE.Vector3(0, height + .15, 0), new THREE.Vector3(.075, height + .015, 0),
            new THREE.Vector3(.020, height - .11, 0),
        ]);
        fixture.add(new THREE.Mesh(new THREE.TubeGeometry(harpCurve, 24, .0025, 5, false), m.brass));
        const light = new THREE.PointLight(0xffbf83, 3.8, 5.5, 2);
        light.position.set(x, height - .16, z);
        group.add(light);
    };
    lamp(3.58, 1.8, 1.78);
    lamp(-3.92, -3.4, 1.95);
    // One restrained wall wash, tucked behind the workstation.
    box(4.9, .012, .013, new THREE.MeshBasicMaterial({ color: 0x9c83c3 }), -1.25, 1.12, -3.9, .002);
    // Trailing plant: a ceramic pot, stems and leaves with physical silhouettes.
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.19, .14, .30, 40), new THREE.MeshStandardMaterial({ color: 0x8c715c, roughness: .84 }));
    pot.position.set(3.78, .18, -3.42);
    pot.castShadow = true;
    group.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x354a31, roughness: .8, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
        const a = i * 2.4;
        const pts = [new THREE.Vector3(3.78, .3, -3.42), new THREE.Vector3(3.78 + Math.cos(a) * .16, .5 + (i % 4) * .12, -3.42 + Math.sin(a) * .14), new THREE.Vector3(3.78 + Math.cos(a) * .34, .65 + (i % 4) * .12, -3.42 + Math.sin(a) * .32)];
        const stem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, .004, 5, false), leafMat);
        group.add(stem);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), leafMat);
        leaf.scale.set(.12, .025, .23);
        leaf.position.copy(pts[2]);
        leaf.rotation.set(.25, a, .25);
        leaf.castShadow = true;
        group.add(leaf);
    }
    return { group, door, aboutSign: aboutNeon.aboutSign, animateActivation: aboutNeon.animateActivation, albumArt, resources };
}
