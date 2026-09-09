import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from './studio-geometry';
import type { StudioMaterials } from './studio-furniture';

/** Small, wall-mounted objects introduce the room's coding and listening habits. */
export function buildStudioExterior(m: StudioMaterials): { group: THREE.Group; resources: THREE.Texture[] } {
  const group = new THREE.Group();
  group.name = 'Exterior keyboard and listening objects';
  const resources: THREE.Texture[] = [];
  const cream = new THREE.MeshStandardMaterial({ color: '#ded5bf', roughness: .57 });
  const keyPlastic = new THREE.MeshStandardMaterial({ color: '#eee5d0', roughness: .49 });
  const modifier = new THREE.MeshStandardMaterial({ color: '#aaa99d', roughness: .6 });
  const terracotta = new THREE.MeshStandardMaterial({ color: '#996b55', roughness: .62 });
  const pcb = new THREE.MeshStandardMaterial({ color: '#314b40', roughness: .65, metalness: .1 });
  const vinyl = new THREE.MeshPhysicalMaterial({ color: '#111415', roughness: .52, metalness: 0, specularIntensity: .25, clearcoat: .08, clearcoatRoughness: .5 });
  const recordLabel = new THREE.MeshStandardMaterial({ color: '#b9ac85', roughness: .95 });
  const padding = new THREE.MeshPhysicalMaterial({ color: '#242627', roughness: .8, sheen: .18, sheenRoughness: .85 });

  const box = (parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, radius = .005) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 1, radius), material);
    mesh.position.fromArray(position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (parent: THREE.Object3D, radius: number, depth: number, position: [number, number, number], material: THREE.Material, segments = 20) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
    mesh.position.fromArray(position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const frontDisc = (parent: THREE.Object3D, radius: number, depth: number, position: [number, number, number], material: THREE.Material, segments = 32) => {
    const mesh = cylinder(parent, radius, depth, position, material, segments);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };
  const tube = (parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 32) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 6, false), material);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // The frame sits against the plaster; four brass spacers support the exposed board.
  const keyboardDisplay = new THREE.Group();
  keyboardDisplay.name = 'Framed mechanical keyboard';
  keyboardDisplay.position.set(-1.65, 1.98, 4.34);
  group.add(keyboardDisplay);
  box(keyboardDisplay, [1.10, .89, .03], [0, 0, -.03], m.walnut, .009);
  box(keyboardDisplay, [1.012, .802, .012], [0, 0, -.006], m.fabric, .004);
  for (const x of [-.528, .528]) box(keyboardDisplay, [.044, .89, .086], [x, 0, .022], m.walnut, .007);
  for (const y of [-.423, .423]) box(keyboardDisplay, [1.012, .044, .086], [0, y, .022], m.walnut, .007);

  const keyboard = new THREE.Group();
  keyboard.name = 'Cream keyboard with exposed circuit board';
  keyboard.position.y = -.045;
  keyboard.rotation.z = -.032;
  keyboardDisplay.add(keyboard);
  for (const x of [-.452, .452]) for (const y of [-.196, .196]) {
    frontDisc(keyboard, .014, .08, [x, y, .038], m.brass, 12);
  }
  box(keyboard, [.986, .458, .014], [0, 0, .083], pcb, .008);
  box(keyboard, [.946, .423, .043], [0, 0, .110], cream, .014);
  box(keyboard, [.899, .370, .006], [0, 0, .133], m.rubber, .008);
  for (const x of [-.48, .48]) for (const y of [-.216, .216]) {
    frontDisc(keyboard, .007, .004, [x, y, .092], m.brass, 12);
    box(keyboard, [.008, .0018, .001], [x, y, .0945], m.metal, .0005);
  }
  // Traces remain on the uncovered PCB margin instead of floating over the keys.
  for (let i = 0; i < 9; i++) {
    const x = -.37 + i * .09;
    tube(keyboard, [new THREE.Vector3(x, -.213, .0905), new THREE.Vector3(x, -.22, .0905), new THREE.Vector3(x + .034, -.22, .0905)], .0007, m.brass, 5);
    frontDisc(keyboard, .0023, .001, [x + .034, -.22, .091], m.brass, 8);
  }

  type Key = { label: string; units: number; material?: THREE.Material };
  const letters = (text: string): Key[] => Array.from(text, label => ({ label, units: 1 }));
  const rows: Key[][] = [
    [{ label: 'ESC', units: 1, material: terracotta }, ...letters('1234567890'), { label: '{}', units: 1, material: modifier }],
    [{ label: 'TAB', units: 1.25, material: modifier }, ...letters('QWERTYUIOP'), { label: '[]', units: .75 }],
    [{ label: 'CTRL', units: 1.5, material: modifier }, ...letters('ASDFGHJKL'), { label: 'ENTER', units: 1.5, material: modifier }],
    [{ label: 'SHIFT', units: 1.75, material: modifier }, ...letters('ZXCVBNM,.'), { label: 'SHIFT', units: 1.25, material: modifier }],
    [{ label: 'CTRL', units: 1.5, material: modifier }, { label: 'ALT', units: 1.25, material: modifier }, { label: '', units: 6.5 }, { label: '{}', units: 1.25, material: terracotta }, { label: 'ALT', units: 1.5, material: modifier }],
  ];
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 768;
  const ink = canvas.getContext('2d');
  const printWidth = .9, printHeight = .38;
  if (ink) {
    ink.clearRect(0, 0, canvas.width, canvas.height);
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.fillStyle = '#333b37';
  }
  rows.forEach((row, rowIndex) => {
    let left = -.432;
    const y = .145 - rowIndex * .0725;
    for (const key of row) {
      const width = key.units * .072;
      const x = left + width / 2;
      box(keyboard, [width - .009, .062, .032], [x, y, .152], key.material ?? keyPlastic, .007);
      if (ink && key.label) {
        ink.font = `600 ${key.label.length > 2 ? 18 : 27}px Consolas, monospace`;
        ink.fillText(key.label, (x / printWidth + .5) * canvas.width, (.5 - y / printHeight) * canvas.height);
      }
      left += width;
    }
  });
  const legends = new THREE.CanvasTexture(canvas);
  legends.colorSpace = THREE.SRGBColorSpace;
  resources.push(legends);
  const print = new THREE.Mesh(new THREE.PlaneGeometry(printWidth, printHeight), new THREE.MeshStandardMaterial({ map: legends, transparent: true, depthWrite: false, roughness: .68 }));
  print.position.z = .1685;
  keyboard.add(print);
  box(keyboard, [.052, .017, .022], [.31, .22, .090], m.metal, .004);
  tube(keyboard, [new THREE.Vector3(.31, .232, .09), new THREE.Vector3(.32, .27, .077), new THREE.Vector3(.40, .288, .037), new THREE.Vector3(.425, .345, .004)], .004, m.rubber, 18);

  // A shallow picture ledge supports a twelve-inch record; the headphones
  // hang from a separate wall hook, with their cable falling in front of the ledge.
  const music = new THREE.Group();
  music.name = 'Vinyl and headphones picture ledge';
  music.position.set(1.78, .94, 4.34);
  group.add(music);
  // A framed felt backing gives the right-hand collection the same physical
  // weight as the keyboard display, while leaving clear wall below the neon.
  box(music, [1.22, .72, .014], [0, .055, -.032], m.fabric, .008);
  for (const x of [-.608, .608]) box(music, [.028, .748, .052], [x, .055, -.012], m.walnut, .004);
  for (const y of [-.305, .415]) box(music, [1.19, .028, .052], [0, y, -.012], m.walnut, .004);
  const cassette = new THREE.Group();
  cassette.name = 'Wall-mounted studio cassette';
  cassette.position.set(-.34, .285, .014);
  cassette.rotation.z = -.055;
  music.add(cassette);
  box(cassette, [.166, .105, .014], [0, 0, 0], cream, .007);
  box(cassette, [.144, .068, .001], [0, .009, .0075], terracotta, .004);
  box(cassette, [.111, .037, .002], [0, -.009, .009], m.rubber, .012);
  for (const x of [-.035, .035]) {
    frontDisc(cassette, .014, .003, [x, -.009, .011], recordLabel, 20);
    frontDisc(cassette, .006, .004, [x, -.009, .013], m.rubber, 12);
  }
  box(cassette, [.106, .017, .002], [0, .030, .009], keyPlastic, .002);
  for (const x of [-.064, .064]) for (const y of [-.038, .038]) frontDisc(cassette, .002, .002, [x, y, .009], m.metal, 8);
  box(music, [.036, .010, .023], [-.34, .229, .015], m.brass, .003);
  box(music, [1.12, .068, .26], [0, -.235, .09], m.walnut, .009);
  box(music, [1.12, .029, .016], [0, -.206, .214], m.wood, .004);
  box(music, [1.12, .075, .027], [0, -.204, -.0315], m.walnut, .005);
  for (const x of [-.43, .43]) {
    box(music, [.023, .108, .028], [x, -.299, -.028], m.metal, .004);
    frontDisc(music, .006, .003, [x, -.326, -.012], m.brass, 10);
  }

  const single = new THREE.Group();
  single.name = 'Twelve-inch vinyl record';
  single.position.set(-.355, -.042, .122);
  single.rotation.x = -.08;
  music.add(single);
  frontDisc(single, .1524, .003, [0, 0, 0], vinyl, 64);
  for (let groove = 0; groove < 10; groove++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.061 + groove * .009, .00028, 3, 64), vinyl);
    ring.position.z = .0017;
    single.add(ring);
  }
  frontDisc(single, .049, .0008, [0, 0, .0022], recordLabel, 32);
  frontDisc(single, .005, .001, [0, 0, .003], m.rubber, 16);
  box(music, [.122, .007, .038], [-.355, -.1975, .13], m.brass, .003);
  tube(music, [new THREE.Vector3(-.355, -.197, .115), new THREE.Vector3(-.355, -.14, .098), new THREE.Vector3(-.355, -.07, .102)], .0024, m.metal, 12);

  const headphones = new THREE.Group();
  headphones.name = 'Hanging studio headphones';
  headphones.position.set(.245, 0, .004);
  music.add(headphones);
  frontDisc(headphones, .027, .012, [0, .269, -.043], m.metal, 24);
  frontDisc(headphones, .006, .003, [0, .269, -.0355], m.brass, 12);
  tube(headphones, [new THREE.Vector3(0, .265, -.039), new THREE.Vector3(0, .265, .113), new THREE.Vector3(0, .279, .126)], .008, m.brass, 14);
  const band = Array.from({ length: 25 }, (_, i) => {
    const a = Math.PI * i / 24;
    return new THREE.Vector3(Math.cos(a) * .137, .031 + Math.sin(a) * .257, .124);
  });
  tube(headphones, band, .012, padding, 36);
  const bandTrim = band.map(point => point.clone().add(new THREE.Vector3(0, 0, -.012)));
  tube(headphones, bandTrim, .0034, m.metal, 36);
  for (const side of [-1, 1]) {
    tube(headphones, [new THREE.Vector3(side * .137, .053, .119), new THREE.Vector3(side * .16, .025, .117), new THREE.Vector3(side * .138, -.009, .117)], .0045, m.metal, 12);
    box(headphones, [.079, .145, .071], [side * .13, .017, .115], m.rubber, .020);
    const cushion = new THREE.Mesh(new THREE.TorusGeometry(.036, .012, 7, 28), padding);
    cushion.scale.set(.79, 1.50, 1);
    cushion.position.set(side * .13, .017, .153);
    cushion.castShadow = cushion.receiveShadow = true;
    headphones.add(cushion);
    box(headphones, [.040, .075, .008], [side * .13, .017, .153], m.fabric, .014);
  }

  const cablePoints = [new THREE.Vector3(.11, -.045, .135), new THREE.Vector3(.04, -.08, .196), new THREE.Vector3(.08, -.02, .231)];
  for (let i = 0; i <= 96; i++) {
    const angle = Math.PI / 2 + i / 96 * Math.PI * 6;
    cablePoints.push(new THREE.Vector3(.082 + Math.cos(angle) * (.074 + i * .00009), -.119 + Math.sin(angle) * .097, .23 + Math.sin(i * .17) * .003));
  }
  cablePoints.push(new THREE.Vector3(.188, -.09, .228), new THREE.Vector3(.221, -.238, .232), new THREE.Vector3(.223, -.323, .231));
  tube(music, cablePoints, .0026, m.rubber, 152);
  cylinder(music, .008, .030, [.223, -.335, .231], m.rubber, 16);
  cylinder(music, .0032, .025, [.223, -.3625, .231], m.brass, 12);
  for (const y of [-.357, -.367]) cylinder(music, .0035, .0015, [.223, y, .231], m.rubber, 10);

  // Keep textured wood/felt boxes intact for the room's material mapping pass.
  // Everything else is fixed and can share a draw by material and shadow state.
  const unbatched = new Set<THREE.Material>([m.wood, m.walnut, m.fabric]);
  for (const assembly of [keyboardDisplay, music]) {
    assembly.updateWorldMatrix(true, true);
    const inverse = assembly.matrixWorld.clone().invert();
    const batches = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; originals: THREE.Mesh[]; parts: THREE.BufferGeometry[] }>();
    assembly.traverse(object => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || unbatched.has(object.material)) return;
      const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { material: object.material, cast: object.castShadow, receive: object.receiveShadow, originals: [], parts: [] };
        batches.set(key, batch);
      }
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      geometry.clearGroups();
      batch.parts.push(geometry);
      batch.originals.push(object);
    });
    for (const batch of batches.values()) {
      const geometry = mergeGeometries(batch.parts, false);
      batch.parts.forEach(part => part.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.castShadow = batch.cast;
      mesh.receiveShadow = batch.receive;
      assembly.add(mesh);
      const originals = new Set(batch.originals.map(object => object.geometry));
      batch.originals.forEach(object => object.removeFromParent());
      originals.forEach(original => original.dispose());
    }
  }
  return { group, resources };
}
