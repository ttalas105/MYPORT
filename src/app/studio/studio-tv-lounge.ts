import * as THREE from 'three';
import { RoundedBoxGeometry } from './studio-geometry';
import { batchStaticStudio } from './studio-batching';
import type { StudioMaterials } from './studio-furniture';

type Point = [number, number, number];

/** A quiet, occupied viewing corner. Local +Z faces the television. */
export function buildStudioTvLounge(m: StudioMaterials): {
  group: THREE.Group; resources: THREE.Texture[]; silhouettes: THREE.Vector3[][];
} {
  const group = new THREE.Group();
  group.name = 'TV couch and hooded viewer';
  group.position.set(2.78, 0, 2.10);
  group.rotation.y = Math.PI / 2;
  const resources: THREE.Texture[] = [];
  const foreground: THREE.Mesh[] = [];
  const upholstery = m.fabric.clone(); upholstery.color.set('#555950');
  const hoodie = new THREE.MeshPhysicalMaterial({ color: '#080a0d', roughness: .98,
    normalMap: m.fabric.normalMap, normalScale: m.fabric.normalScale.clone(), roughnessMap: m.fabric.roughnessMap,
    sheen: .12, sheenColor: '#282d35', sheenRoughness: .95, envMapIntensity: .55 });
  const rib = new THREE.MeshStandardMaterial({ color: '#171b20', roughness: 1,
    normalMap: m.fabric.normalMap, normalScale: m.fabric.normalScale.clone(), envMapIntensity: .55 });
  const trousers = m.fabric.clone(); trousers.color.set('#292c30');
  const seam = new THREE.MeshStandardMaterial({ color: '#393d36', roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: '#b98c70', roughness: .88 });

  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    at: Point, silhouette = true): THREE.Mesh {
    const result = new THREE.Mesh(geometry, material);
    result.position.set(...at);
    result.castShadow = result.receiveShadow = true;
    parent.add(result);
    if (silhouette) foreground.push(result);
    return result;
  }
  function box(parent: THREE.Object3D, size: Point, at: Point, material: THREE.Material, radius = .025): THREE.Mesh {
    return mesh(parent, new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(v => v / 3))), material, at);
  }
  function oval(parent: THREE.Object3D, size: Point, at: Point, material: THREE.Material): THREE.Mesh {
    const result = mesh(parent, new THREE.SphereGeometry(1, 20, 14), material, at);
    result.scale.set(...size);
    return result;
  }
  function cord(parent: THREE.Object3D, points: Point[], material: THREE.Material, radius = .003): void {
    const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    mesh(parent, new THREE.TubeGeometry(path, Math.max(12, points.length * 5), radius, 5, false), material, [0, 0, 0], false);
  }
  function limb(parent: THREE.Object3D, from: Point, to: Point, radius: number, material: THREE.Material): THREE.Mesh {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const length = a.distanceTo(b);
    const result = mesh(parent, new THREE.CapsuleGeometry(radius, Math.max(.005, length - radius * 2), 5, 12), material,
      a.clone().add(b).multiplyScalar(.5).toArray() as Point);
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return result;
  }

  const couch = new THREE.Group(); couch.name = 'Two-seat couch facing the TV'; group.add(couch);
  couch.scale.x = .90;
  for (const x of [-.85, .85]) for (const z of [-.31, .30]) {
    const foot = box(couch, [.075, .15, .075], [x, .10, z], m.walnut, .009);
    foot.rotation.z = x > 0 ? -.05 : .05;
  }
  box(couch, [1.98, .22, .82], [0, .26, 0], upholstery, .065);
  box(couch, [1.95, .058, .73], [0, .17, -.02], m.walnut, .014);
  const back = box(couch, [1.98, .64, .22], [0, .66, -.36], upholstery, .072);
  back.rotation.x = -.08;
  for (const x of [-.48, .48]) {
    const seat = box(couch, [.87, .17, .65], [x, .445, .055], upholstery, .067);
    seat.rotation.x = -.025;
    const pad = box(couch, [.87, .45, .16], [x, .746, -.245], upholstery, .065);
    pad.rotation.x = -.12;
    cord(couch, [[x - .36, .468, -.21], [x - .407, .468, -.15], [x - .407, .468, .31],
      [x - .36, .468, .355], [x + .36, .468, .355], [x + .407, .468, .31],
      [x + .407, .468, -.15], [x + .36, .468, -.21]], seam, .002);
  }
  for (const x of [-.99, .99]) {
    box(couch, [.19, .43, .89], [x, .475, -.005], upholstery, .065);
    cord(couch, [[x, .692, -.33], [x, .700, -.20], [x, .700, .27], [x, .672, .37]], seam, .0025);
  }
  // Long upholstery seams give the back visible structure from the entrance.
  for (const x of [-.87, 0, .87]) cord(couch, [[x, .43, -.489], [x, .66, -.472], [x, .89, -.452]], seam, .002);

  const person = new THREE.Group(); person.name = 'Seated man with hood up';
  person.position.set(.27, 0, .015); person.rotation.y = -.14; group.add(person);
  box(person, [.37, .16, .30], [0, .565, .03], trousers, .065);
  for (const side of [-1, 1]) {
    const hip: Point = [side * .115, .56, .08];
    const knee: Point = [side * .205, .49, .49];
    const ankle: Point = [side * .235, .155, .59];
    limb(person, hip, knee, .108, trousers);
    limb(person, knee, ankle, .082, trousers);
    box(person, [.135, .073, .13], [side * .235, .16, .594], trousers, .022);
    const shoe = new THREE.Group(); shoe.position.set(side * .235, 0, .665);
    shoe.rotation.y = side * .07; person.add(shoe);
    box(shoe, [.156, .039, .315], [0, .06, .016], m.paper, .015);
    oval(shoe, [.077, .069, .149], [0, .104, .015], m.rubber);
    box(shoe, [.074, .018, .11], [0, .166, -.022], trousers, .006);
    for (let i = 0; i < 4; i++) cord(shoe, [[-.033, .164 - i * .005, -.056 + i * .025],
      [0, .172 - i * .005, -.05 + i * .025], [.033, .164 - i * .005, -.044 + i * .025]], m.paper, .002);
  }
  // A continuous, shaped cloth torso avoids joints between primitive body parts.
  const rings = [
    [.60, .185, .125, .015], [.65, .205, .143, .005], [.76, .221, .155, -.017],
    [.90, .244, .151, -.045], [1.04, .257, .135, -.073], [1.115, .222, .116, -.075],
    [1.155, .116, .093, -.066],
  ];
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const segments = 24;
  rings.forEach(([y, width, depth, z], row) => {
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2;
      const fold = Math.sin(a * 5 + row * .7) * .004 + Math.cos(a * 3 - row) * .002;
      positions.push(Math.sin(a) * (width + fold), y, z + Math.cos(a) * (depth + fold));
      uvs.push(i / segments * 2, row / (rings.length - 1) * 2);
      if (row && i) {
        const b = row * (segments + 1) + i;
        indices.push(b, b - 1, b - segments - 2, b, b - segments - 2, b - segments - 1);
      }
    }
  });
  const torso = new THREE.BufferGeometry();
  torso.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  torso.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  torso.setIndex(indices); torso.computeVertexNormals();
  mesh(person, torso, hoodie, [0, 0, 0]);
  cord(person, [[-.18, 1.037, -.187], [-.075, 1.064, -.205], [.035, 1.045, -.211], [.155, 1.062, -.190]], rib, .0025);
  cord(person, [[-.127, .990, -.215], [-.037, 1.005, -.218], [.102, .987, -.215]], rib, .002);
  box(person, [.385, .064, .269], [0, .612, .015], rib, .024);
  for (const side of [-1, 1]) {
    if (side === -1) {
      // This sleeve follows the backrest, with the cuff and hand resting on top.
      const restingArm = new THREE.Group(); restingArm.name = 'Arm resting along couch back'; person.add(restingArm);
      const sleevePath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.205, 1.064, -.065), new THREE.Vector3(-.33, 1.058, -.225),
        new THREE.Vector3(-.455, 1.052, -.365), new THREE.Vector3(-.555, 1.045, -.318),
        new THREE.Vector3(-.705, 1.033, -.200),
      ], false, 'catmullrom', .25);
      const sleeveGeometry = new THREE.TubeGeometry(sleevePath, 36, 1, 14, false);
      const sleeveVertices = sleeveGeometry.getAttribute('position');
      const vertex = new THREE.Vector3();
      for (let ring = 0; ring <= 36; ring++) {
        const t = ring / 36, center = sleevePath.getPointAt(t);
        const radius = .094 - .036 * t + .006 * Math.exp(-Math.pow((t - .53) / .15, 2)) + .0015 * Math.sin(t * Math.PI * 12);
        for (let side = 0; side <= 14; side++) {
          const index = ring * 15 + side;
          vertex.fromBufferAttribute(sleeveVertices, index).sub(center).multiplyScalar(radius).add(center);
          sleeveVertices.setXYZ(index, vertex.x, vertex.y, vertex.z);
        }
      }
      sleeveGeometry.computeVertexNormals();
      mesh(restingArm, sleeveGeometry, hoodie, [0, 0, 0]);
      const cuff = box(restingArm, [.065, .106, .112], [-.701, 1.033, -.205], rib, .022);
      cuff.rotation.y = .60;
      const hand = new THREE.Group(); hand.position.set(-.767, 1.015, -.155); hand.rotation.y = .60; restingArm.add(hand);
      oval(hand, [.074, .026, .045], [0, 0, 0], skin);
      oval(hand, [.035, .024, .021], [.010, -.017, .042], skin);
      for (let finger = 0; finger < 4; finger++) {
        const z = -.035 + finger * .023;
        limb(hand, [-.043, -.011, z], [-.088 + Math.abs(1.5 - finger) * .008, -.035, z - .003], .010, skin);
      }
      cord(restingArm, [[-.24, 1.15, -.10], [-.35, 1.14, -.248], [-.455, 1.13, -.36], [-.56, 1.113, -.31], [-.66, 1.10, -.236]], rib, .0015);
      continue;
    }
    limb(person, [side * .223, 1.052, -.064], [side * .306, .797, .145], .096, hoodie);
    limb(person, [side * .306, .797, .145], [side * .225, .654, .38], .079, hoodie);
    limb(person, [side * .231, .668, .354], [side * .216, .632, .40], .063, rib);
    const hand = oval(person, [.045, .026, .081], [side * .208, .610, .449], skin);
    hand.rotation.x = -.12; hand.rotation.y = side * -.12;
    oval(person, [.020, .025, .042], [side * .164, .611, .425], skin);
    for (let finger = 0; finger < 3; finger++) cord(person,
      [[side * (.185 + finger * .013), .634, .452], [side * (.185 + finger * .013), .625, .50]], rib, .0007);
    cord(person, [[side * .204, 1.103, -.099], [side * .269, 1.026, .005], [side * .30, .86, .11]], rib, .0018);
  }
  // The hood has an open face, a darker inner lining and a raised sewn rim.
  const head = new THREE.Group(); head.position.set(0, 1.31, -.060); head.rotation.x = -.10; person.add(head);
  const hoodGeometry = new THREE.SphereGeometry(1, 24, 18, 0, Math.PI * 2, .72, Math.PI - .72);
  hoodGeometry.rotateX(Math.PI / 2);
  const drape = (x: number, y: number, z: number): Point => {
    const hem = Math.max(0, -y - .35);
    const fold = z < 0 ? .035 * Math.sin(Math.atan2(x, -z) * 6 + y * 2) * (1 - y * y) : 0;
    return [x * (1 + hem * .55) + fold, Math.max(y, -.84), z - hem * .18 - (z < 0 ? .045 * Math.exp(-x * x * 18) * (1 - y * y) : 0)];
  };
  const hoodPoints = hoodGeometry.getAttribute('position');
  for (let i = 0; i < hoodPoints.count; i++) hoodPoints.setXYZ(i, ...drape(hoodPoints.getX(i), hoodPoints.getY(i), hoodPoints.getZ(i)));
  hoodGeometry.computeVertexNormals();
  const hood = mesh(head, hoodGeometry, hoodie, [0, 0, 0]); hood.scale.set(.166, .19, .169);
  const lining = mesh(head, hoodGeometry.clone(), rib, [0, 0, .001]); lining.scale.set(.157, .180, .158);
  lining.material = rib.clone(); (lining.material as THREE.Material).side = THREE.BackSide;
  oval(head, [.108, .144, .104], [0, -.008, .055], skin);
  oval(head, [.029, .035, .039], [0, -.019, .151], skin);
  const rim: Point[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = i / 32 * Math.PI * 2;
    rim.push([Math.sin(a) * .166 * Math.sin(.72), Math.cos(a) * .19 * Math.sin(.72), .169 * Math.cos(.72)]);
  }
  cord(head, rim, rib, .007);
  const hoodSeam: Point[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = -.88 + i / 16 * 2.65;
    const [x, y, z] = drape(0, Math.sin(a), -Math.cos(a));
    hoodSeam.push([x * .166, y * .19 * 1.008, z * .169 * 1.008]);
  }
  cord(head, hoodSeam, rib, .0025);
  // The fabric drops into the shoulders instead of forming a separate neck ring.
  oval(person, [.152, .045, .105], [0, 1.146, -.088], hoodie);
  for (const side of [-1, 1]) cord(person, [[side * .075, 1.179, .071], [side * .078, 1.092, .088],
    [side * .061, 1.00, .099]], rib, .0028);

  // Cache actual convex part silhouettes before merging fixed meshes for rendering.
  group.updateWorldMatrix(true, true);
  const silhouettes = foreground.map(part => {
    const vertices = part.geometry.getAttribute('position');
    const unique = new Map<string, THREE.Vector3>();
    for (let i = 0; i < vertices.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(part.matrixWorld);
      unique.set(`${point.x.toFixed(4)},${point.y.toFixed(4)},${point.z.toFixed(4)}`, point);
    }
    return [...unique.values()];
  });
  batchStaticStudio(group, new Set());
  return { group, resources, silhouettes };
}
