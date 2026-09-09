import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from './studio-geometry';
import type { StudioMaterials } from './studio-furniture';

/** Quiet, real-scale gaming hardware shares the workroom without becoming another screen. */
export function buildStudioGamingDetails(m: StudioMaterials): { group: THREE.Group; resources: THREE.Texture[] } {
  const group = new THREE.Group();
  group.name = 'Gaming hardware and lounge shelf';
  const resources: THREE.Texture[] = [];
  const shell = new THREE.MeshStandardMaterial({ color: '#24272a', roughness: .62, metalness: .18 });
  const plastic = new THREE.MeshStandardMaterial({ color: '#393c3e', roughness: .72 });
  const silver = new THREE.MeshStandardMaterial({ color: '#929698', roughness: .36, metalness: .85 });
  const board = new THREE.MeshStandardMaterial({ color: '#303a34', roughness: .75, metalness: .1 });
  const ivory = new THREE.MeshStandardMaterial({ color: '#c3bfae', roughness: .69 });
  const clay = new THREE.MeshStandardMaterial({ color: '#916657', roughness: .79 });
  const sage = new THREE.MeshStandardMaterial({ color: '#6c776d', roughness: .84 });
  const violet = new THREE.MeshStandardMaterial({ color: '#a899bd', emissive: '#9a81b9', emissiveIntensity: .55, roughness: .45 });
  const darkGlass = new THREE.MeshPhysicalMaterial({ color: '#172024', roughness: .2, metalness: .05, clearcoat: .6, clearcoatRoughness: .14 });
  const sideGlass = new THREE.MeshPhysicalMaterial({ color: '#a4b1b3', roughness: .14, metalness: .05,
    transparent: true, opacity: .16, depthWrite: false, clearcoat: .65, clearcoatRoughness: .12, side: THREE.DoubleSide });

  const box = (parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, radius = .004) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 1, radius), material);
    mesh.position.fromArray(position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (parent: THREE.Object3D, radius: number, height: number, position: [number, number, number], material: THREE.Material, segments = 16) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.fromArray(position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const tube = (parent: THREE.Object3D, points: number[][], radius: number, material: THREE.Material, segments = 28) => {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3().fromArray(point)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), material);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const frontDisc = (parent: THREE.Object3D, radius: number, depth: number, position: [number, number, number], material: THREE.Material) => {
    const mesh = cylinder(parent, radius, depth, position, material, 24);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };

  // The inward-facing side is genuinely open behind its glass: motherboard,
  // CPU cooler, graphics card and fixed fan blades occupy the case interior.
  const tower = new THREE.Group();
  tower.name = 'Compact desktop PC with visible cooling hardware';
  tower.position.set(3.78, 0, -.82);
  group.add(tower);
  for (const x of [-.101, .101]) for (const z of [-.177, .177]) {
    cylinder(tower, .017, .025, [x, .0125, z], m.rubber);
  }
  for (const y of [.036, .561]) box(tower, [.278, .022, .468], [0, y, 0], shell, .006);
  box(tower, [.012, .514, .458], [.133, .2985, 0], shell);
  box(tower, [.256, .514, .012], [0, .2985, -.228], shell);
  for (const x of [-.132, .132]) box(tower, [.016, .514, .018], [x, .2985, .226], shell);
  for (const y of [.080, .521]) box(tower, [.25, .049, .022], [0, y, .224], shell);
  // Top exhaust slots and a recessed power button give the shell a usable scale.
  for (let i = 0; i < 11; i++) box(tower, [.15, .001, .006], [.01, .5725, -.13 + i * .020], m.rubber, .002);
  cylinder(tower, .009, .002, [-.080, .573, .172], silver);
  cylinder(tower, .004, .002, [-.080, .574, .172], violet);
  for (const x of [-.029, .018]) box(tower, [.026, .0012, .010], [x, .573, .173], m.rubber, .002);
  box(tower, [.19, .090, .431], [.016, .101, -.002], shell, .004);
  box(tower, [.008, .310, .352], [.114, .355, -.013], board, .002);
  for (let i = 0; i < 6; i++) box(tower, [.009, .026, .038], [.103, .243 + (i % 3) * .073, -.132 + Math.floor(i / 3) * .234], m.rubber, .001);
  for (const z of [.090, .109]) {
    box(tower, [.048, .132, .009], [.085, .410, z], plastic, .001);
    box(tower, [.002, .100, .0095], [.059, .414, z], silver, .001);
  }
  box(tower, [.088, .117, .121], [.054, .404, -.060], silver, .002);
  for (let i = 0; i < 10; i++) box(tower, [.091, .002, .122], [.054, .354 + i * .011, -.060], shell, .0005);
  box(tower, [.166, .044, .307], [.024, .216, -.023], shell, .003);
  box(tower, [.156, .005, .298], [.024, .241, -.023], silver, .001);
  for (let i = 0; i < 9; i++) box(tower, [.002, .031, .292], [-.039 + i * .015, .216, -.023], silver, .0005);
  box(tower, [.003, .003, .128], [-.060, .215, -.015], violet, .001);

  const fan = (parent: THREE.Object3D, radius: number, position: [number, number, number], sideFacing = false) => {
    const unit = new THREE.Group();
    unit.position.fromArray(position);
    if (sideFacing) unit.rotation.y = -Math.PI / 2;
    parent.add(unit);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * .96, .002, 5, 32), violet);
    ring.position.z = .012;
    unit.add(ring);
    const housing = new THREE.Mesh(new THREE.TorusGeometry(radius, .005, 6, 32), shell);
    housing.castShadow = housing.receiveShadow = true;
    unit.add(housing);
    for (let i = 0; i < 7; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(radius * .13, radius * .04);
      shape.bezierCurveTo(radius * .38, radius * .10, radius * .81, -radius * .10, radius * .86, -radius * .36);
      shape.bezierCurveTo(radius * .48, -radius * .53, radius * .24, -radius * .31, radius * .13, radius * .04);
      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .0018, bevelEnabled: false, curveSegments: 5 }), plastic);
      blade.rotation.z = i * Math.PI * 2 / 7;
      blade.castShadow = blade.receiveShadow = true;
      unit.add(blade);
    }
    frontDisc(unit, radius * .22, .016, [0, 0, .004], shell);
    frontDisc(unit, radius * .125, .001, [0, 0, .0125], silver);
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      box(unit, [.016, .016, .02], [x * radius * .88, y * radius * .88, 0], shell, .003);
      frontDisc(unit, .002, .001, [x * radius * .88, y * radius * .88, .011], silver);
    }
    return unit;
  };
  fan(tower, .067, [0, .222, .218]);
  fan(tower, .067, [0, .402, .218]);
  fan(tower, .056, [.004, .404, -.060], true);
  // Sparse rails protect the front intake without covering the fan geometry.
  for (const x of [-.093, -.047, 0, .047, .093]) box(tower, [.003, .385, .003], [x, .301, .244], shell, .001);
  for (const y of [.134, .309, .478]) box(tower, [.22, .003, .003], [0, y, .244], shell, .001);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.436, .490), sideGlass);
  glass.name = 'PC removable glass side';
  glass.rotation.y = -Math.PI / 2;
  glass.position.set(-.142, .300, -.003);
  tower.add(glass);
  for (const y of [.065, .535]) for (const z of [-.205, .199]) {
    const screw = cylinder(tower, .004, .004, [-.145, y, z], silver, 12);
    screw.rotation.z = Math.PI / 2;
  }
  tube(tower, [[.086, .437, .12], [.076, .337, .153], [.09, .265, .166], [.04, .236, .09]], .0034, m.rubber);
  tube(tower, [[.05, .147, -.236], [.08, .08, -.30], [.06, .014, -.35], [-.08, .008, -.39], [-.22, .008, -.40],
    [-.31, .016, -.40], [-.36, .10, -.32], [-.385, .35, -.12], [-.40, .65, -.10], [-.55, .700, -.08]], .0042, m.rubber, 48);
  tube(tower, [[.10, .391, -.236], [.13, .286, -.282], [.03, .068, -.31], [-.08, .012, -.31], [-.22, .009, -.30],
    [-.28, .017, -.30], [-.36, .12, -.23], [-.39, .39, -.115], [-.40, .67, -.10], [-.565, .708, -.12]], .0032, m.rubber, 48);
  box(tower, [.025, .038, .011], [.05, .147, -.239], m.rubber, .002);

  const controller = (parent: THREE.Object3D, position: [number, number, number], yaw = 0) => {
    const pad = new THREE.Group();
    pad.name = 'Dual-stick game controller';
    pad.position.fromArray(position);
    pad.rotation.y = yaw;
    parent.add(pad);
    const outline = new THREE.Shape();
    outline.moveTo(-.049, .041);
    outline.bezierCurveTo(-.067, .046, -.077, .027, -.078, .008);
    outline.bezierCurveTo(-.083, -.010, -.090, -.045, -.069, -.053);
    outline.bezierCurveTo(-.056, -.057, -.048, -.027, -.035, -.021);
    outline.quadraticCurveTo(0, -.029, .035, -.021);
    outline.bezierCurveTo(.048, -.027, .056, -.057, .069, -.053);
    outline.bezierCurveTo(.090, -.045, .083, -.010, .078, .008);
    outline.bezierCurveTo(.077, .027, .067, .046, .049, .041);
    outline.quadraticCurveTo(0, .050, -.049, .041);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: .024, bevelEnabled: true,
      bevelThickness: .004, bevelSize: .003, bevelSegments: 2, curveSegments: 8 }), plastic);
    body.rotation.x = -Math.PI / 2;
    body.castShadow = body.receiveShadow = true;
    pad.add(body);
    for (const [x, z] of [[-.045, -.010], [.023, .010]]) {
      cylinder(pad, .014, .003, [x, .029, z], m.rubber, 24);
      cylinder(pad, .006, .009, [x, .033, z], shell);
      cylinder(pad, .011, .004, [x, .039, z], m.rubber, 24);
    }
    box(pad, [.023, .006, .007], [-.025, .031, .018], shell, .001);
    box(pad, [.007, .006, .023], [-.025, .031, .018], shell, .001);
    for (const [x, z, material] of [[.052, -.027, sage], [.062, -.017, clay], [.052, -.007, ivory], [.042, -.017, silver]] as const) {
      cylinder(pad, .004, .006, [x, .032, z], material, 14);
    }
    box(pad, [.041, .002, .023], [0, .029, -.025], shell, .003);
    cylinder(pad, .0036, .002, [0, .030, .004], silver);
    for (const x of [-.047, .047]) box(pad, [.037, .012, .010], [x, .023, -.043], m.rubber, .004);
    return pad;
  };

  // This table is beyond the chair's rear corner, clear of the lamp's base and shade.
  const table = new THREE.Group();
  table.name = 'Walnut lounge controller table';
  table.position.set(3.77, 0, 2.98);
  group.add(table);
  box(table, [.55, .035, .46], [0, .5725, 0], m.walnut, .012);
  for (const x of [-.215, .215]) for (const z of [-.165, .165]) {
    box(table, [.028, .546, .028], [x, .28, z], m.walnut, .004);
    box(table, [.03, .014, .03], [x, .007, z], m.rubber, .004);
  }
  box(table, [.46, .024, .36], [0, .182, 0], m.walnut, .007);
  const travelCase = box(table, [.294, .059, .159], [-.035, .224, .005], m.fabric, .019);
  travelCase.rotation.y = .12;
  tube(travelCase, [[-.134, .003, -.078], [.134, .003, -.078], [.146, .003, -.066], [.146, .003, .066],
    [.134, .003, .078], [-.134, .003, .078], [-.146, .003, .066], [-.146, .003, -.066], [-.134, .003, -.078]], .0012, m.rubber, 48);
  tube(travelCase, [[-.037, 0, .081], [-.036, 0, .104], [.036, 0, .104], [.037, 0, .081]], .004, m.rubber, 16);
  controller(table, [.068, .594, .103], -.23);
  const handheld = new THREE.Group();
  handheld.name = 'Handheld console with sleeping display';
  handheld.position.set(-.018, .603, -.112);
  handheld.rotation.y = .08;
  table.add(handheld);
  box(handheld, [.245, .021, .102], [0, 0, 0], shell, .012);
  for (const x of [-.106, .106]) box(handheld, [.034, .024, .102], [x, 0, 0], plastic, .012);
  box(handheld, [.157, .0015, .085], [0, .0117, 0], darkGlass, .004);
  for (const [x, z] of [[-.103, -.023], [.103, .023]]) {
    cylinder(handheld, .0095, .004, [x, .013, z], m.rubber, 20);
    cylinder(handheld, .007, .003, [x, .017, z], plastic, 20);
  }
  box(handheld, [.019, .004, .006], [-.103, .014, .021], m.rubber, .001);
  box(handheld, [.006, .004, .019], [-.103, .014, .021], m.rubber, .001);
  for (const [x, z] of [[.103, -.036], [.113, -.026], [.103, -.016], [.093, -.026]]) cylinder(handheld, .003, .004, [x, .014, z], ivory, 12);
  for (const x of [-.078, .078]) {
    cylinder(handheld, .002, .001, [x, .013, -.038], silver, 10);
    for (let i = 0; i < 3; i++) box(handheld, [.007, .001, .0015], [x, .013, .023 + i * .005], m.rubber, .0005);
  }

  // Local shelf faces into the room (local +Z is world -X). The wall remains
  // visible between the books and their restrained metal bookends.
  const shelf = new THREE.Group();
  shelf.name = 'Right wall books and game cases';
  shelf.position.set(4.22, 2.05, 1.25);
  shelf.rotation.y = -Math.PI / 2;
  group.add(shelf);
  box(shelf, [.86, .034, .238], [0, 0, .079], m.walnut, .008);
  for (const x of [-.30, .30]) {
    box(shelf, [.019, .162, .021], [x, -.09, -.028], m.metal, .003);
    box(shelf, [.019, .018, .178], [x, -.035, .055], m.metal, .003);
    for (const y of [-.153, -.045]) frontDisc(shelf, .004, .002, [x, y, -.015], m.brass);
  }
  const books = [
    { width: .038, height: .258, depth: .17, material: sage },
    { width: .050, height: .236, depth: .165, material: clay },
    { width: .033, height: .278, depth: .178, material: ivory },
    { width: .025, height: .228, depth: .16, material: shell },
  ];
  let bookX = -.284;
  for (const book of books) {
    const center = bookX + book.width / 2;
    box(shelf, [book.width, book.height, book.depth], [center, .017 + book.height / 2, .08], book.material, .002);
    // Recessed page block and small unprinted spine bands distinguish bound books.
    box(shelf, [book.width - .007, book.height - .010, .001], [center, .017 + book.height / 2, .08 - book.depth / 2 - .0008], m.paper, .0005);
    for (const y of [.056, book.height - .027]) box(shelf, [book.width - .012, .002, .001], [center, y, .081 + book.depth / 2], m.brass, .0005);
    bookX += book.width + .004;
  }
  for (const x of [-.301, -.115]) {
    box(shelf, [.004, .127, .132], [x, .081, .08], m.metal, .001);
    box(shelf, [.032, .004, .132], [x + (x < -.2 ? .014 : -.014), .020, .08], m.metal, .001);
  }
  for (let i = 0; i < 3; i++) {
    const game = box(shelf, [.017, .172, .133], [-.033 + i * .022, .104, .086], i === 1 ? sage : shell, .002);
    box(game, [.012, .143, .001], [0, 0, .067], i === 1 ? ivory : clay, .0005);
    box(game, [.014, .012, .001], [0, .074, .067], silver, .0005);
  }
  const stand = new THREE.Group();
  stand.position.set(.257, .022, .105);
  shelf.add(stand);
  box(stand, [.18, .008, .116], [0, 0, 0], shell, .009);
  for (const x of [-.051, .051]) tube(stand, [[x, .004, -.028], [x, .068, -.028], [x, .071, .021], [x, .079, .036]], .006, m.metal, 16);
  const spare = controller(stand, [0, .078, .005], 0);
  spare.rotation.x = -.34;

  // Keep authored wood/fabric face charts for the global texture mapping pass.
  // Opaque hardware is fixed, so merge by material and shadow state per assembly.
  const unbatched = new Set<THREE.Material>([m.wood, m.walnut, m.fabric, sideGlass]);
  for (const assembly of [tower, table, shelf]) {
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
