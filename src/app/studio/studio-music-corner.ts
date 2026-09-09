import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from './studio-geometry';
import { mapStudioSurfaces } from './studio-surfaces';
import type { StudioMaterials } from './studio-furniture';

/** A working instrument corner, grounded in the unused space behind the research desk. */
export function buildStudioMusicCorner(m: StudioMaterials): { group: THREE.Group; resources: THREE.Texture[] } {
  const group = new THREE.Group();
  group.name = 'Back-right music production corner';
  const resources: THREE.Texture[] = [];
  const ivory = new THREE.MeshStandardMaterial({ color: '#e4ddca', roughness: .45 });
  const graphite = new THREE.MeshStandardMaterial({ color: '#25292a', roughness: .58, metalness: .25 });
  const nickel = new THREE.MeshStandardMaterial({ color: '#a3a5a0', roughness: .38, metalness: .85 });
  const pad = new THREE.MeshStandardMaterial({ color: '#686f69', roughness: .88 });
  const warmPad = new THREE.MeshStandardMaterial({ color: '#a57c58', roughness: .83 });
  const leather = new THREE.MeshPhysicalMaterial({ color: '#38352f', roughness: .76, sheen: .2, sheenRoughness: .88 });

  const box = (parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, radius = .004) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 1, radius), material);
    mesh.position.fromArray(position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (parent: THREE.Object3D, radius: number, height: number, position: [number, number, number], material: THREE.Material, segments = 20) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.fromArray(position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rod = (parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) => {
    const direction = end.clone().sub(start);
    const mesh = cylinder(parent, radius, direction.length(), start.clone().add(end).multiplyScalar(.5).toArray() as [number, number, number], material, 12);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  };
  const cable = (parent: THREE.Object3D, points: [number, number, number][], radius = .003) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), 28, radius, 6, false), m.rubber);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const knob = (parent: THREE.Object3D, x: number, z: number, radius = .013, height = .026) => {
    cylinder(parent, radius + .003, .003, [x, .0015, z], nickel, 20);
    cylinder(parent, radius, height, [x, height / 2 + .003, z], m.rubber, 24);
    box(parent, [.0025, .0011, radius * .67], [x, height + .0035, z - radius * .34], ivory, .0004);
  };

  const workstation = new THREE.Group();
  workstation.name = 'Walnut synthesizer workstand';
  workstation.position.set(2.55, 0, -3.65);
  group.add(workstation);
  box(workstation, [1.45, .038, .52], [0, .741, 0], m.walnut, .010);
  for (const x of [-.63, .63]) {
    for (const z of [-.19, .19]) {
      box(workstation, [.062, .018, .075], [x, .004, z], m.rubber, .005);
      box(workstation, [.034, .709, .034], [x, .3675, z], m.metal, .005);
    }
    box(workstation, [.041, .030, .43], [x, .028, 0], m.metal, .004);
    box(workstation, [.038, .040, .46], [x, .701, 0], m.metal, .005);
  }
  box(workstation, [1.26, .029, .035], [0, .18, -.19], m.metal, .004);
  box(workstation, [1.28, .034, .032], [0, .698, -.19], m.metal, .004);
  box(workstation, [1.356, .064, .455], [0, .792, 0], graphite, .012);
  for (const x of [-.7025, .7025]) box(workstation, [.045, .089, .475], [x, .8045, 0], m.wood, .010);
  box(workstation, [1.285, .012, .204], [0, .824, .125], m.rubber, .002);

  // Thirty-six white keys and the five-per-octave black-key pattern form 61 keys.
  const pitch = .0355;
  for (let key = 0; key < 36; key++) {
    const x = (key - 17.5) * pitch;
    box(workstation, [pitch - .0012, .022, .197], [x, .841, .126], ivory, .0018);
    if (key < 35 && [0, 1, 3, 4, 5].includes(key % 7)) {
      box(workstation, [.019, .034, .121], [x + pitch / 2, .858, .085], m.rubber, .0025);
    }
  }
  box(workstation, [1.304, .010, .010], [0, .822, .232], graphite, .002);

  const controls = new THREE.Group();
  controls.name = 'Synthesizer knobs and faders';
  controls.position.set(0, .838, -.126);
  controls.rotation.x = .09;
  workstation.add(controls);
  box(controls, [1.29, .027, .17], [0, -.0135, 0], graphite, .004);
  for (let slider = 0; slider < 4; slider++) {
    const x = -.535 + slider * .073;
    box(controls, [.010, .0015, .105], [x, .001, -.005], m.rubber, .002);
    box(controls, [.027, .014, .020], [x, .0085, -.027 + (slider % 3) * .02], ivory, .003);
    for (const z of [-.047, -.018, .011, .04]) box(controls, [.004, .0008, .0014], [x + .011, .001, z], nickel, .0003);
  }
  for (const x of [-.12, -.035, .05, .135, .22]) for (const z of [-.036, .034]) knob(controls, x, z);
  for (let button = 0; button < 4; button++) box(controls, [.033, .009, .015], [.332 + button * .057, .005, .04], button === 0 ? warmPad : pad, .003);

  // The sampler is carried by a folded steel riser above the keyboard's rear panel.
  for (const x of [.335, .565]) {
    box(workstation, [.035, .012, .18], [x, .766, -.13], m.metal, .003);
    const upright = box(workstation, [.028, .257, .033], [x, .8925, -.183], m.metal, .004);
    upright.rotation.x = -.13;
  }
  const sampler = new THREE.Group();
  sampler.name = 'Sixteen-pad sampler on raised tray';
  sampler.position.set(.45, 1.018, -.108);
  sampler.rotation.x = .16;
  workstation.add(sampler);
  box(sampler, [.303, .011, .266], [0, -.006, 0], m.metal, .006);
  box(sampler, [.286, .040, .249], [0, .02, 0], graphite, .010);
  for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) {
    box(sampler, [.049, .009, .043], [(column - 1.5) * .059, .0445, -.060 + row * .049], row === 3 && column < 2 ? warmPad : pad, .004);
  }
  const samplerControls = new THREE.Group();
  samplerControls.position.y = .04;
  sampler.add(samplerControls);
  for (const x of [-.088, 0, .088]) knob(samplerControls, x, -.098, .008, .015);
  cable(workstation, [[.48, 1.025, -.24], [.52, .94, -.245], [.54, .765, -.235], [.47, .69, -.22], [.11, .68, -.217]]);
  cable(workstation, [[.19, .799, -.229], [.20, .738, -.255], [.16, .59, -.259], [.10, .49, -.22], [.10, .18, -.193]], .0035);

  const stool = new THREE.Group();
  stool.name = 'Tucked padded music stool';
  stool.position.set(2.46, 0, -3.43);
  group.add(stool);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    cylinder(stool, .022, .020, [x * .16, .005, z * .16], m.rubber, 16);
    rod(stool, new THREE.Vector3(x * .16, .015, z * .16), new THREE.Vector3(x * .092, .481, z * .092), .013, m.metal);
  }
  const footRing = new THREE.Mesh(new THREE.TorusGeometry(.181, .009, 7, 36), m.metal);
  footRing.rotation.x = Math.PI / 2;
  footRing.position.y = .21;
  footRing.castShadow = footRing.receiveShadow = true;
  stool.add(footRing);
  cylinder(stool, .133, .018, [0, .478, 0], graphite, 32);
  const seat = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, -.032), new THREE.Vector2(.172, -.032), new THREE.Vector2(.189, -.022),
    new THREE.Vector2(.195, -.004), new THREE.Vector2(.19, .015), new THREE.Vector2(.17, .031),
    new THREE.Vector2(.12, .035), new THREE.Vector2(0, .035),
  ], 40), leather);
  seat.position.y = .519;
  seat.castShadow = seat.receiveShadow = true;
  stool.add(seat);

  const acoustic = new THREE.Group();
  acoustic.name = 'Felt absorbers and walnut depth diffuser';
  acoustic.position.set(2.6, 2.15, -3.99);
  group.add(acoustic);
  for (const x of [-.64, .64]) for (const y of [-.35, .35]) box(acoustic, [.035, .045, .06], [x, y, -.07], m.metal, .003);
  box(acoustic, [1.60, .98, .03], [0, 0, -.025], m.walnut, .005);
  for (const x of [-.779, .779]) box(acoustic, [.042, .98, .05], [x, 0, -.005], m.wood, .006);
  for (const y of [-.469, .469]) box(acoustic, [1.516, .042, .05], [0, y, -.005], m.wood, .006);
  for (const x of [-.55, .55]) {
    box(acoustic, [.397, .833, .041], [x, 0, .0135], m.fabric, .018);
    for (const edge of [-1, 1]) box(acoustic, [.004, .792, .006], [x + edge * .177, 0, .035], m.rubber, .001);
  }
  for (let row = 0; row < 9; row++) for (let column = 0; column < 7; column++) {
    const depth = .024 + ((column * column + row * row + 3 * column) % 7) * .012;
    box(acoustic, [.071, .082, depth], [(column - 3) * .077, (row - 4) * .088, -.01 + depth / 2], (row + column) % 4 === 0 ? m.walnut : m.wood, .002);
  }

  // A single wall-hung instrument fills the narrow gap between the old battens
  // and the new acoustic frame; it remains behind, and above, the OKRA rack.
  const guitar = new THREE.Group();
  guitar.name = 'Wall-hung walnut electric guitar';
  guitar.position.set(1.51, 1.75, -4.045);
  group.add(guitar);
  const outline = new THREE.Shape();
  outline.moveTo(-.025, .252);
  outline.bezierCurveTo(-.042, .198, -.057, .145, -.080, .186);
  outline.bezierCurveTo(-.105, .243, -.170, .191, -.145, .122);
  outline.bezierCurveTo(-.09, .049, -.094, -.003, -.140, -.050);
  outline.bezierCurveTo(-.198, -.135, -.126, -.207, 0, -.207);
  outline.bezierCurveTo(.126, -.207, .198, -.135, .140, -.050);
  outline.bezierCurveTo(.10, -.010, .095, .026, .125, .080);
  outline.bezierCurveTo(.17, .147, .145, .216, .091, .174);
  outline.bezierCurveTo(.052, .145, .046, .252, .025, .252);
  outline.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: .044, bevelEnabled: true, bevelThickness: .004, bevelSize: .003, bevelSegments: 2, curveSegments: 12 }), m.wood);
  body.castShadow = body.receiveShadow = true;
  guitar.add(body);
  box(guitar, [.05, .415, .035], [0, .425, .027], m.walnut, .005);
  box(guitar, [.043, .408, .009], [0, .427, .048], m.rubber, .002);
  box(guitar, [.071, .135, .023], [0, .685, .022], m.wood, .007);
  for (let fret = 1; fret <= 20; fret++) {
    const y = .629 - .73 * (1 - 2 ** (-fret / 12));
    if (y > .225) box(guitar, [.043, .0013, .0025], [0, y, .053], nickel, .0004);
  }
  for (const y of [.10, -.010]) box(guitar, [.086, .023, .010], [0, y, .052], ivory, .002);
  box(guitar, [.092, .019, .015], [0, -.098, .054], nickel, .002);
  for (let string = 0; string < 6; string++) {
    cylinder(guitar, .00025, .74, [(string - 2.5) * .006, .265, .063], nickel, 5);
  }
  for (const side of [-1, 1]) for (const y of [.646, .685, .724]) {
    const peg = cylinder(guitar, .006, .022, [side * .043, y, .022], nickel, 12);
    peg.rotation.z = Math.PI / 2;
    box(guitar, [.014, .018, .010], [side * .055, y, .022], ivory, .004);
  }
  for (const point of [[.092, -.07], [.105, -.119]]) {
    const dial = cylinder(guitar, .009, .009, [point[0], point[1], .054], m.brass, 16);
    dial.rotation.x = Math.PI / 2;
  }
  box(guitar, [.083, .090, .042], [0, .618, -.024], m.metal, .008);
  rod(guitar, new THREE.Vector3(0, .608, -.003), new THREE.Vector3(0, .608, .007), .007, m.metal);
  for (const side of [-1, 1]) cable(guitar, [[0, .608, .007], [side * .041, .611, .008], [side * .041, .632, .026]], .006);

  // Apply the same physical material scales as the room while each box still
  // has its face charts, then merge static pieces without losing those UVs.
  mapStudioSurfaces(group, new Map<THREE.Material, { metres: number; grain?: boolean }>([
    [m.wood, { metres: 1, grain: true }], [m.walnut, { metres: 1, grain: true }], [m.fabric, { metres: .265 }],
  ]));
  for (const assembly of [workstation, stool, acoustic, guitar]) {
    assembly.updateWorldMatrix(true, true);
    const inverse = assembly.matrixWorld.clone().invert();
    const batches = new Map<THREE.Material, { parts: THREE.BufferGeometry[]; originals: THREE.Mesh[] }>();
    assembly.traverse(object => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      let batch = batches.get(object.material);
      if (!batch) { batch = { parts: [], originals: [] }; batches.set(object.material, batch); }
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      geometry.clearGroups();
      batch.parts.push(geometry);
      batch.originals.push(object);
    });
    for (const [material, batch] of batches) {
      const geometry = mergeGeometries(batch.parts, false);
      batch.parts.forEach(part => part.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      assembly.add(mesh);
      const originals = new Set(batch.originals.map(object => object.geometry));
      batch.originals.forEach(object => object.removeFromParent());
      originals.forEach(original => original.dispose());
    }
  }
  return { group, resources };
}
