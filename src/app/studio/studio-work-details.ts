import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from './studio-geometry';
import type { StudioMaterials } from './studio-furniture';
import { mapStudioSurfaces } from './studio-surfaces';

/** Recording tools and things left within reach, at their actual working scale. */
export function buildStudioWorkDetails(m: StudioMaterials): { group: THREE.Group; resources: THREE.Texture[] } {
  const group = new THREE.Group();
  group.name = 'Recording desk and listening room details';
  const resources: THREE.Texture[] = [];
  const graphite = new THREE.MeshStandardMaterial({ color: '#303236', metalness: .28, roughness: .57 });
  const silver = new THREE.MeshStandardMaterial({ color: '#a5aaa8', metalness: .8, roughness: .36 });
  const olive = new THREE.MeshStandardMaterial({ color: '#656c58', roughness: .9 });
  const terracotta = new THREE.MeshStandardMaterial({ color: '#95604b', roughness: .89 });
  const linen = new THREE.MeshStandardMaterial({ color: '#b8ac91', roughness: .96 });
  const grilleCloth = m.fabric.clone();
  grilleCloth.color.set('#a79c85');
  grilleCloth.normalScale.set(.07, .07);
  const box = (parent: THREE.Object3D, size: number[], at: number[], material: THREE.Material, radius = .004) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 1, radius), material);
    mesh.position.set(at[0], at[1], at[2]);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (parent: THREE.Object3D, radius: number, height: number, at: number[], material: THREE.Material, segments = 20) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.set(at[0], at[1], at[2]);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rod = (parent: THREE.Object3D, from: number[], to: number[], radius: number, material: THREE.Material) => {
    const a = new THREE.Vector3(...from as [number, number, number]), b = new THREE.Vector3(...to as [number, number, number]);
    const mesh = cylinder(parent, radius, a.distanceTo(b), a.clone().add(b).multiplyScalar(.5).toArray(), material, 12);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return mesh;
  };
  const cable = (parent: THREE.Object3D, points: number[][], radius = .0027, material: THREE.Material = m.rubber) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number]))), points.length * 8, radius, 6, false), material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // A clamped, counterbalanced arm folds alongside the left monitor, never across its display.
  const mic = new THREE.Group();
  mic.name = 'Broadcast microphone and articulated arm';
  mic.position.set(-3.43, .8125, -2.44);
  group.add(mic);
  box(mic, [.074, .017, .11], [0, .006, 0], graphite);
  box(mic, [.020, .085, .080], [-.027, -.034, .006], graphite);
  box(mic, [.068, .016, .080], [0, -.073, .006], graphite);
  cylinder(mic, .005, .085, [.014, -.080, .005], silver, 12);
  cylinder(mic, .027, .012, [.014, -.121, .005], graphite);
  cylinder(mic, .016, .16, [0, .086, 0], graphite);
  const joints = [[0, .16, 0], [-.05, .80, -.13], [.16, .95, .13]];
  for (let arm = 0; arm < 2; arm++) {
    for (const offset of [-.014, .014]) {
      const a = joints[arm], b = joints[arm + 1];
      rod(mic, [a[0] + offset, a[1], a[2]], [b[0] + offset, b[1], b[2]], .008, graphite);
    }
    const a = joints[arm], b = joints[arm + 1];
    rod(mic, [a[0], a[1] + .065, a[2]], [b[0], b[1] - .07, b[2]], .003, silver);
  }
  for (const point of joints) {
    const hinge = cylinder(mic, .025, .043, point, graphite);
    hinge.rotation.z = Math.PI / 2;
    const screw = cylinder(mic, .011, .046, point, silver, 12);
    screw.rotation.z = Math.PI / 2;
  }
  rod(mic, [.16, .95, .13], [.16, .83, .13], .010, graphite);
  const microphone = new THREE.Group();
  microphone.position.set(.16, .75, .13);
  microphone.rotation.x = -.22;
  mic.add(microphone);
  cylinder(microphone, .028, .12, [0, 0, 0], graphite, 32);
  const windscreen = new THREE.Mesh(new THREE.CapsuleGeometry(.034, .076, 6, 20), m.rubber);
  windscreen.position.y = -.085;
  windscreen.castShadow = true;
  microphone.add(windscreen);
  for (const y of [-.031, .025]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.041, .0025, 6, 28), silver);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    microphone.add(ring);
  }
  for (const x of [-.039, .039]) rod(microphone, [x, -.031, 0], [-x, .025, .016], .0013, m.rubber);
  cable(mic, [[.16, .84, .13], [.19, .91, .13], [-.048, .79, -.10], [.015, .17, .01], [.015, .03, .01], [.05, -.055, -.21], [.27, -.15, -.57]]);

  // An open notebook, pencil and page weight fit the unused front-left corner.
  const notebook = new THREE.Group();
  notebook.name = 'Open recording notebook';
  notebook.position.set(-3.005, .818, -2.445);
  notebook.rotation.y = .12;
  group.add(notebook);
  box(notebook, [.31, .010, .215], [0, 0, 0], olive);
  for (const x of [-.074, .074]) box(notebook, [.145, .007, .201], [x, .007, 0], m.paper, .002);
  box(notebook, [.002, .003, .199], [0, .011, 0], linen, .0005);
  const notesCanvas = document.createElement('canvas');
  notesCanvas.width = 768; notesCanvas.height = 512;
  const pen = notesCanvas.getContext('2d')!;
  pen.clearRect(0, 0, 768, 512);
  pen.fillStyle = '#5a5549'; pen.font = '22px Arial';
  pen.fillText('Session notes', 45, 56);
  pen.strokeStyle = '#777767'; pen.lineWidth = 2;
  for (let row = 0; row < 8; row++) {
    const y = 108 + row * 39;
    pen.beginPath(); pen.moveTo(48, y); pen.lineTo(280 - (row % 3) * 28, y); pen.stroke();
  }
  // A small patch-routing sketch belongs to the notebook, not the interface.
  for (let i = 0; i < 3; i++) {
    pen.strokeRect(448, 93 + i * 105, 92, 50);
    pen.beginPath(); pen.moveTo(540, 118 + i * 105); pen.lineTo(619, 118 + i * 105); pen.lineTo(619, 365); pen.stroke();
  }
  pen.strokeRect(582, 365, 101, 46);
  const notes = new THREE.CanvasTexture(notesCanvas);
  notes.colorSpace = THREE.SRGBColorSpace;
  resources.push(notes);
  const notesPage = new THREE.Mesh(new THREE.PlaneGeometry(.292, .198), new THREE.MeshStandardMaterial({map: notes, transparent: true, depthWrite: false, roughness: .92}));
  notesPage.rotation.x = -Math.PI / 2; notesPage.position.y = .011;
  notebook.add(notesPage);
  rod(notebook, [.085, .020, -.075], [.116, .020, .075], .0035, terracotta);
  rod(notebook, [.116, .020, .075], [.119, .020, .090], .002, graphite);

  // A shallow reference shelf occupies the strip above the desk's acoustic panels.
  const shelf = new THREE.Group();
  shelf.name = 'Reference books above the workstation';
  shelf.position.set(-1.15, 2.94, -3.81);
  group.add(shelf);
  box(shelf, [1.72, .035, .28], [0, 0, 0], m.walnut, .007);
  for (const x of [-.62, .62]) {
    box(shelf, [.023, .17, .026], [x, -.075, -.125], graphite);
    rod(shelf, [x, -.15, -.115], [x, -.015, .09], .009, graphite);
  }
  let bookX = -.65;
  for (let i = 0; i < 10; i++) {
    const width = .034 + (i % 3) * .012, height = .18 + (i % 4) * .020;
    const cover = [olive, terracotta, linen, graphite][i % 4];
    box(shelf, [width, height, .159], [bookX, .018 + height / 2, -.022], cover, .001);
    box(shelf, [width - .005, height - .012, .144], [bookX, .018 + height / 2, -.028], m.paper, .001);
    for (const y of [.057, .064]) box(shelf, [width * .62, .002, .001], [bookX, y, .059], linen, .0004);
    bookX += width + .006;
  }
  for (let i = 0; i < 3; i++) {
    box(shelf, [.25 - i * .013, .029, .185], [.31 + i * .015, .034 + i * .031, -.012], [terracotta, graphite, olive][i], .002);
    box(shelf, [.24 - i * .013, .021, .17], [.31 + i * .015, .034 + i * .031, -.009], m.paper, .001);
  }
  box(shelf, [.036, .138, .17], [-.715, .084, -.015], graphite);
  box(shelf, [.15, .012, .18], [-.66, .024, -.015], graphite);

  // Compact combo amp beside the record console: woven grille, piping and inset controls.
  const amp = new THREE.Group();
  amp.name = 'Fabric grille combo amplifier';
  amp.position.set(-3.85, 0, 1.60);
  amp.rotation.y = Math.PI / 2 - .08;
  group.add(amp);
  box(amp, [.54, .43, .265], [0, .259, 0], olive, .018);
  box(amp, [.482, .327, .012], [0, .233, .137], m.rubber, .008);
  box(amp, [.456, .302, .008], [0, .233, .145], grilleCloth, .005);
  for (const x of [-.237, .237]) rod(amp, [x, .071, .150], [x, .397, .150], .002, linen);
  for (const y of [.071, .397]) rod(amp, [-.237, y, .150], [.237, y, .150], .002, linen);
  // The mipmapped cloth supplies the fine weave without sub-pixel wire shimmer.
  box(amp, [.446, .051, .012], [0, .43, .127], graphite, .002);
  for (let i = 0; i < 5; i++) {
    cylinder(amp, .010, .015, [-.115 + i * .053, .43, .141], silver, 16).rotation.x = Math.PI / 2;
    box(amp, [.0017, .006, .002], [-.115 + i * .053, .434, .150], m.rubber, .0004);
  }
  cylinder(amp, .008, .004, [-.19, .43, .136], m.brass, 14).rotation.x = Math.PI / 2;
  for (const x of [-.208, .208]) for (const z of [-.085, .085]) cylinder(amp, .019, .043, [x, .026, z], m.rubber, 12);
  cable(amp, [[-.07, .476, 0], [-.062, .513, 0], [.062, .513, 0], [.07, .476, 0]], .010, m.rubber);
  for (const x of [-.080, .080]) box(amp, [.036, .006, .030], [x, .477, 0], silver, .003);
  cable(amp, [[.23, .13, -.135], [.26, .045, -.19], [.30, .017, -.25], [.16, .012, -.32], [-.13, .012, -.27], [-.20, .012, -.41]], .003);

  mapStudioSurfaces(group, new Map([
    [m.wood, { metres: 1, grain: true }], [m.walnut, { metres: 1, grain: true }], [m.fabric, { metres: .265 }], [grilleCloth, { metres: .265 }],
  ]));
  // Fixed pieces share material draws; transparent notebook ink keeps its own draw.
  group.updateWorldMatrix(true, true);
  const batches = new Map<THREE.Material, { parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || object.material.transparent) return;
    const batch = batches.get(object.material) ?? {parts: [], meshes: []};
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld); geometry.clearGroups();
    batch.parts.push(geometry); batch.meshes.push(object); batches.set(object.material, batch);
  });
  for (const [material, batch] of batches) {
    const geometry = mergeGeometries(batch.parts, false);
    batch.parts.forEach(part => part.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    const originals = new Set(batch.meshes.map(original => original.geometry));
    batch.meshes.forEach(original => original.removeFromParent());
    originals.forEach(original => original.dispose());
  }
  return { group, resources };
}
