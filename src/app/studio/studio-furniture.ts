import * as THREE from 'three';
import { RoundedBoxGeometry } from './studio-geometry';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STUDIO_TABLE_ALBUMS } from './studio-albums';

export interface StudioMaterials {
  wood: THREE.MeshStandardMaterial;
  walnut: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
}

/** Human-scale furniture: edges catch light, surfaces support their objects, and cables go somewhere. */
export function buildStudioFurniture(
  materials: StudioMaterials,
  texture: (path: string) => THREE.Texture,
): {
  group: THREE.Group;
  record: THREE.Group;
  meters: THREE.Mesh[];
  portalScreen: THREE.Mesh;
  stanleyScreen: THREE.Mesh;
  readerAnchors: Record<number, THREE.Vector3[]>;
  albumArt: Record<string, THREE.Mesh>;
  resources: THREE.Texture[];
} {
  const group = new THREE.Group();
  const resources: THREE.Texture[] = [];
  const meters: THREE.Mesh[] = [];
  const readerAnchors: Record<number, THREE.Vector3[]> = {};
  const albumArt: Record<string, THREE.Mesh> = {};
  const { wood, walnut, fabric, metal, rubber, brass, paper } = materials;
  const charcoal = new THREE.MeshStandardMaterial({ color: '#242528', roughness: 0.67, metalness: 0.12 });
  const keyMaterial = new THREE.MeshStandardMaterial({ color: '#a9a497', roughness: 0.78 });
  const darkKey = new THREE.MeshStandardMaterial({ color: '#444747', roughness: 0.8 });
  const leather = new THREE.MeshPhysicalMaterial({ color: '#715344', roughness: 0.73, sheen: 0.16, sheenRoughness: 0.8, sheenColor: '#967864' });
  const paleMetal = new THREE.MeshStandardMaterial({ color: '#929598', roughness: 0.36, metalness: 0.86 });
  const ceramic = new THREE.MeshStandardMaterial({ color: '#d1c4a8', roughness: 0.38 });
  const coffee = new THREE.MeshStandardMaterial({ color: '#20130c', roughness: 0.13 });
  const amber = new THREE.MeshStandardMaterial({ color: '#ebac5d', emissive: '#d69b52', emissiveIntensity: 0.4, roughness: 0.4 });
  const cone = new THREE.MeshStandardMaterial({ color: '#242629', roughness: 0.85 });
  const upholsterySeam = new THREE.MeshStandardMaterial({ color: '#846351', roughness: 0.9 });
  const fabricSeam = new THREE.MeshStandardMaterial({ color: '#484743', roughness: 0.94 });

  function worldBoxCorners(object: THREE.Object3D, bounds: THREE.Box3): THREE.Vector3[] {
    object.updateWorldMatrix(true, false);
    const corners: THREE.Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corners.push(new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld));
        }
      }
    }
    return corners;
  }

  function housingCorners(mesh: THREE.Mesh): THREE.Vector3[] {
    mesh.geometry.computeBoundingBox();
    return worldBoxCorners(mesh, mesh.geometry.boundingBox!);
  }

  function box(parent: THREE.Object3D, width: number, height: number, depth: number,
    x: number, y: number, z: number, material: THREE.Material, radius = 0.012): THREE.Mesh {
    const geometry = radius > 0
      ? new RoundedBoxGeometry(width, height, depth, 2, Math.min(radius, width / 3, height / 3, depth / 3))
      : new THREE.BoxGeometry(width, height, depth);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function cylinder(parent: THREE.Object3D, radius: number, height: number,
    x: number, y: number, z: number, material: THREE.Material, segments = 24, topRadius = radius): THREE.Mesh {
    const object = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, radius, height, segments), material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function torus(parent: THREE.Object3D, radius: number, tube: number,
    x: number, y: number, z: number, material: THREE.Material): THREE.Mesh {
    const object = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 7, 40), material);
    object.position.set(x, y, z);
    object.castShadow = true;
    parent.add(object);
    return object;
  }

  function line(parent: THREE.Object3D, points: number[][], material: THREE.Material, radius = 0.006): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point as [number, number, number])));
    const object = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(10, points.length * 6), radius, 7, false), material);
    object.castShadow = true;
    parent.add(object);
    return object;
  }

  // Crown the broad faces while retaining the cushion's authored outer dimensions.
  function cushion(parent: THREE.Object3D, width: number, height: number, depth: number,
    x: number, y: number, z: number, material: THREE.Material, radius: number,
    crown = .016, axis: 'y' | 'z' = 'y', taper = 0, piped = true): THREE.Mesh {
    const base = new RoundedBoxGeometry(width, height - (axis === 'y' ? crown * 2 : 0), depth - (axis === 'z' ? crown * 2 : 0), 4, radius);
    const roundedRadius = base.radius;
    // Only the two broad faces gain an interior grid. Keep their original perimeter
    // vertices so the crown cannot open cracks along neighboring rounded edges.
    const sourcePositions = base.attributes['position'], sourceNormals = base.attributes['normal'], sourceUvs = base.attributes['uv'];
    const positionData: number[] = [], normalData: number[] = [], uvData: number[] = [];
    const faces = new Map<number, number[]>();
    const component = axis === 'y' ? 1 : 2, vertical = axis === 'y' ? 2 : 1;
    for (let index = 0; index < sourcePositions.count; index += 3) {
      const direction = sourceNormals.getComponent(index, component);
      const flat = Math.abs(direction) > .99999 && [1, 2].every(offset => Math.abs(sourceNormals.getComponent(index + offset, component) - direction) < .00001);
      if (flat) {
        const sign = Math.sign(direction);
        faces.set(sign, [...(faces.get(sign) ?? []), index, index + 1, index + 2]);
      } else for (let vertex = index; vertex < index + 3; vertex++) {
        positionData.push(sourcePositions.getX(vertex), sourcePositions.getY(vertex), sourcePositions.getZ(vertex));
        normalData.push(sourceNormals.getX(vertex), sourceNormals.getY(vertex), sourceNormals.getZ(vertex));
        uvData.push(sourceUvs.getX(vertex), sourceUvs.getY(vertex));
      }
    }
    for (const [sign, face] of faces) {
      const lowX = Math.min(...face.map(index => sourcePositions.getX(index))), highX = Math.max(...face.map(index => sourcePositions.getX(index)));
      const lowV = Math.min(...face.map(index => sourcePositions.getComponent(index, vertical))), highV = Math.max(...face.map(index => sourcePositions.getComponent(index, vertical)));
      const corners = [[lowX, lowV], [highX, lowV], [highX, highV], [lowX, highV]].map(([px, pv]) => face.reduce((closest, index) => {
        const distance = (sample: number) => Math.abs(sourcePositions.getX(sample) - px) + Math.abs(sourcePositions.getComponent(sample, vertical) - pv);
        return distance(index) < distance(closest) ? index : closest;
      }, face[0]));
      const samples = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (const v of [.25, .5, .75]) for (const u of [.25, .5, .75]) samples.push([u, v]);
      const emit = (a: number, b: number, c: number) => {
        const order = (axis === 'y' ? sign > 0 : sign < 0) ? [a, c, b] : [a, b, c];
        for (const index of order) {
          const [u, v] = samples[index], weights = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v];
          for (let channel = 0; channel < 3; channel++) {
            positionData.push(corners.reduce((sum, corner, i) => sum + sourcePositions.getComponent(corner, channel) * weights[i], 0));
            normalData.push(channel === component ? sign : 0);
          }
          for (let channel = 0; channel < 2; channel++) uvData.push(corners.reduce((sum, corner, i) => sum + sourceUvs.getComponent(corner, channel) * weights[i], 0));
        }
      };
      for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
        const a = 4 + row * 3 + column;
        emit(a, a + 1, a + 4); emit(a, a + 4, a + 3);
      }
      for (const [a, b, p, middle, q] of [[0, 1, 4, 5, 6], [1, 2, 6, 9, 12], [2, 3, 12, 11, 10], [3, 0, 10, 7, 4]]) {
        emit(a, b, middle); emit(b, q, middle); emit(a, middle, p);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionData, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalData, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvData, 2));
    geometry.userData['studioUvMetres'] = 1;
    base.dispose();
    const vertices = geometry.attributes['position'];
    const deform = (point: THREE.Vector3) => {
      const nx = point.x / (width / 2), ny = point.y / (height / 2);
      const flatX = point.x / Math.max(width / 2 - roundedRadius, .001);
      const flatV = (axis === 'y' ? point.z : point.y) / Math.max((axis === 'y' ? depth : height) / 2 - roundedRadius, .001);
      const lift = crown * Math.max(0, 1 - flatX * flatX) ** 2 * Math.max(0, 1 - flatV * flatV) ** 2;
      if (axis === 'y') point.y += Math.sign(point.y) * lift;
      else {
        point.z += Math.sign(point.z) * lift;
        point.x *= 1 - taper * (1 - ny) / 2;
        point.z -= taper * .17 * nx * nx;
      }
      return point;
    };
    const point = new THREE.Vector3();
    for (let index = 0; index < vertices.count; index++) {
      deform(point.fromBufferAttribute(vertices, index));
      vertices.setXYZ(index, point.x, point.y, point.z);
    }
    geometry.computeVertexNormals();
    // RoundedBoxGeometry has split face vertices; average coincident normals after deformation.
    const normals = geometry.attributes['normal'];
    const smoothNormals = new Map<string, THREE.Vector3>();
    const vertexKey = (index: number) => `${Math.round(vertices.getX(index) * 1e5)}:${Math.round(vertices.getY(index) * 1e5)}:${Math.round(vertices.getZ(index) * 1e5)}`;
    for (let index = 0; index < vertices.count; index++) {
      const key = vertexKey(index), normal = new THREE.Vector3().fromBufferAttribute(normals, index);
      const previous = smoothNormals.get(key);
      if (previous) previous.add(normal); else smoothNormals.set(key, normal);
    }
    smoothNormals.forEach(normal => normal.normalize());
    for (let index = 0; index < vertices.count; index++) {
      const normal = smoothNormals.get(vertexKey(index))!;
      normals.setXYZ(index, normal.x, normal.y, normal.z);
    }
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    if (!piped) return object;

    // The welt follows the cushion's side seam, including the backrest taper.
    const halfWidth = width / 2 - .0015, halfLength = (axis === 'y' ? depth : height) / 2 - .0015;
    const corner = Math.min(Math.max(roundedRadius - .0015, .0001), halfWidth, halfLength);
    const outline = new THREE.Path();
    outline.moveTo(halfWidth, halfLength - corner);
    outline.absarc(halfWidth - corner, halfLength - corner, corner, 0, Math.PI / 2, false);
    outline.lineTo(-halfWidth + corner, halfLength);
    outline.absarc(-halfWidth + corner, halfLength - corner, corner, Math.PI / 2, Math.PI, false);
    outline.lineTo(-halfWidth, -halfLength + corner);
    outline.absarc(-halfWidth + corner, -halfLength + corner, corner, Math.PI, Math.PI * 1.5, false);
    outline.lineTo(halfWidth - corner, -halfLength);
    outline.absarc(halfWidth - corner, -halfLength + corner, corner, Math.PI * 1.5, Math.PI * 2, false);
    outline.closePath();
    const path = new class extends THREE.Curve<THREE.Vector3> {
      constructor() { super(); }
      override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
        const point = outline.getPoint(t);
        return deform(axis === 'y' ? target.set(point.x, 0, point.y) : target.set(point.x, point.y, 0));
      }
    }();
    let weltPath: THREE.Curve<THREE.Vector3> = path;
    if (taper > .08) {
      const surface = new THREE.Mesh(geometry, material), ray = new THREE.Raycaster();
      const attached = Array.from({ length: 96 }, (_, index) => {
        const point = path.getPoint(index / 96), direction = point.clone().normalize();
        ray.set(direction.clone().multiplyScalar(Math.max(width, height, depth) * 2), direction.clone().negate());
        const hit = ray.intersectObject(surface, false)[0];
        return hit ? hit.point.clone().addScaledVector(direction, -.001) : point;
      });
      weltPath = new THREE.CatmullRomCurve3(attached, true, 'centripetal');
    }
    const welt = new THREE.Mesh(new THREE.TubeGeometry(weltPath, 96, .0018, 4, true), material === leather ? upholsterySeam : fabricSeam);
    welt.receiveShadow = true;
    object.add(welt);
    return object;
  }

  function dial(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, angle = 0): void {
    cylinder(parent, radius, .018, x, y, z, paleMetal, 32).rotation.x = Math.PI / 2;
    cylinder(parent, radius * .83, .0015, x, y, z + .0097, metal, 32).rotation.x = Math.PI / 2;
    for (let rib = 0; rib < 16; rib++) {
      const a = rib / 16 * Math.PI * 2;
      cylinder(parent, .00075, .012, x + Math.sin(a) * radius, y + Math.cos(a) * radius, z, charcoal, 5).rotation.x = Math.PI / 2;
    }
    const mark = box(parent, .0018, radius * .5, .0015, x + Math.sin(angle) * radius * .45, y + Math.cos(angle) * radius * .45, z + .011, paper, 0);
    mark.rotation.z = -angle;
  }

  // Fixed assemblies share draws by material; animated meters remain individual meshes.
  function batchAssembly(parent: THREE.Object3D, keep: ReadonlySet<THREE.Object3D> = new Set()): void {
    parent.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert();
    const batches = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; geometries: THREE.BufferGeometry[] }>();
    const originals: THREE.Mesh[] = [];
    parent.traverse(object => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || keep.has(object) || Array.isArray(object.material)) return;
      const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { material: object.material, cast: object.castShadow, receive: object.receiveShadow, geometries: [] };
        batches.set(key, batch);
      }
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      geometry.clearGroups();
      batch.geometries.push(geometry);
      originals.push(object);
    });
    for (const batch of batches.values()) {
      const geometry = mergeGeometries(batch.geometries, false);
      batch.geometries.forEach(part => part.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.castShadow = batch.cast;
      mesh.receiveShadow = batch.receive;
      parent.add(mesh);
    }
    const geometries = new Set(originals.map(object => object.geometry));
    originals.forEach(object => object.removeFromParent());
    geometries.forEach(geometry => geometry.dispose());
  }

  function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context) paint(context);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    resources.push(map);
    return map;
  }

  function label(parent: THREE.Object3D, text: string, width: number, height: number,
    x: number, y: number, z: number, foreground = '#e1d7c3', background = '#242426'): THREE.Mesh {
    const map = canvasTexture(768, 192, context => {
      context.fillStyle = background;
      context.fillRect(0, 0, 768, 192);
      context.fillStyle = foreground;
      context.font = '500 64px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 384, 100, 700);
    });
    const object = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, roughness: 0.65 }));
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  // A broad solid-wood workstation with steel trestles and a hidden cable tray.
  const desk = new THREE.Group();
  desk.position.set(-1.75, 0, -2.8);
  group.add(desk);
  box(desk, 3.6, 0.065, 0.88, 0, 0.78, 0, wood, 0.025);
  box(desk, 3.38, 0.022, 0.73, 0, 0.734, 0, walnut, 0.008);
  for (const x of [-1.56, 1.56]) {
    box(desk, 0.055, 0.705, 0.055, x, 0.373, -0.28, metal);
    box(desk, 0.055, 0.705, 0.055, x, 0.373, 0.29, metal);
    box(desk, 0.065, 0.045, 0.77, x, 0.048, 0.015, metal);
    box(desk, 0.06, 0.055, 0.77, x, 0.708, 0.015, metal);
    for (const z of [-0.31, 0.35]) box(desk, 0.085, 0.016, 0.1, x, 0.016, z, rubber);
  }
  box(desk, 2.92, 0.058, 0.048, 0, 0.38, -0.29, metal);
  box(desk, 2.55, 0.07, 0.2, 0, 0.66, -0.24, charcoal);
  // Small drawer below the right side; its recessed pull is physical hardware.
  box(desk, 0.43, 0.15, 0.53, 1.11, 0.648, 0.08, walnut);
  box(desk, 0.44, 0.14, 0.022, 1.11, 0.645, 0.358, wood);
  box(desk, 0.13, 0.014, 0.025, 1.11, 0.672, 0.38, brass, 0.005);

  const stanleyMap = canvasTexture(1536, 864, context => {
    context.fillStyle = '#151318';
    context.fillRect(0, 0, 1536, 864);
    context.fillStyle = '#232026';
    context.fillRect(0, 0, 1536, 64);
    for (let i = 0; i < 3; i++) {
      context.fillStyle = ['#ad7770', '#b49965', '#789180'][i];
      context.beginPath(); context.arc(32 + i * 28, 32, 7, 0, Math.PI * 2); context.fill();
    }
    context.fillStyle = '#777179';
    context.font = '20px Arial';
    context.fillText('Independent project · Interface study', 145, 40);
    context.fillStyle = '#242028';
    context.fillRect(0, 64, 260, 800);
    context.fillStyle = '#e5dccd';
    context.font = '600 33px Arial';
    context.fillText('Workspace', 36, 132);
    context.font = '24px Arial';
    ['Overview', 'Video ideas', 'Research', 'Saved'].forEach((item, index) => {
      context.fillStyle = index === 1 ? '#d1b79b' : '#9a949e';
      if (index === 1) { context.fillStyle = '#38313d'; context.fillRect(20, 180 + index * 73, 220, 58); context.fillStyle = '#d1b79b'; }
      context.fillText(item, 40, 218 + index * 73);
    });
    context.fillStyle = '#f0e9dd';
    context.font = '600 56px Arial';
    context.fillText('Stanley for YouTube', 320, 168);
    context.fillStyle = '#aaa1ae';
    context.font = '26px Arial';
    context.fillText('A little more room for your next idea.', 320, 220);
    context.strokeStyle = '#3b353f'; context.lineWidth = 2;
    context.strokeRect(320, 268, 1130, 80);
    context.fillStyle = '#908693'; context.font = '25px Arial';
    context.fillText('Explore a topic or start with a question…', 350, 318);
    context.fillStyle = '#d3c8d7'; context.font = '500 28px Arial';
    context.fillText('Video ideas', 320, 417);
    const rows = [['Find the story', 'Shape a starting point into a video concept.'], ['Keep the useful bits', 'Research and references, together.'], ['Make something yours', 'A workspace for a creator’s next draft.']];
    rows.forEach((row, index) => {
      const y = 451 + index * 113;
      context.fillStyle = index % 2 ? '#201d24' : '#242027'; context.fillRect(320, y, 1130, 94);
      context.fillStyle = '#dcd3df'; context.font = '500 27px Arial'; context.fillText(row[0], 346, y + 35);
      context.fillStyle = '#96909c'; context.font = '22px Arial'; context.fillText(row[1], 346, y + 70);
      context.strokeStyle = '#716374'; context.strokeRect(1385, y + 32, 22, 22);
    });
    context.fillStyle = '#8c858f'; context.font = '20px Arial';
    context.fillText('Built independently to get the company’s attention.', 320, 833);
  });

  function monitor(x: number, map: THREE.Texture, yaw: number, chapter: number): THREE.Mesh {
    const assembly = new THREE.Group();
    assembly.position.set(x, 0.813, -0.13);
    assembly.rotation.y = yaw;
    desk.add(assembly);
    box(assembly, 0.31, 0.019, 0.205, 0, 0.013, 0.01, metal, 0.012);
    box(assembly, 0.066, 0.28, 0.045, 0, 0.14, -0.035, metal);
    const back = box(assembly, 1.28, 0.744, 0.059, 0, 0.462, 0.005, charcoal, 0.018);
    back.castShadow = true;
    readerAnchors[chapter] = housingCorners(back);
    box(assembly, 0.42, 0.22, 0.053, 0, 0.43, -0.04, charcoal, 0.025);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.232, 0.693), new THREE.MeshBasicMaterial({ map, toneMapped: false }));
    screen.position.set(0, 0.469, 0.0355);
    assembly.add(screen);
    cylinder(assembly, 0.0028, 0.002, 0.588, 0.103, 0.036, amber, 8).rotation.x = Math.PI / 2;
    line(assembly, [[0, 0.32, -0.073], [0.03, 0.12, -0.14], [0.13, -0.045, -0.22], [0.12, -0.16, -0.21]], rubber, 0.005);
    return screen;
  }

  const stanleyScreen = monitor(-0.76, stanleyMap, 0.07, 1);
  const portalScreen = monitor(0.70, texture('/tapmango-dashboard-poster.jpg'), -0.07, 3);

  function speaker(x: number, yaw: number): void {
    const object = new THREE.Group();
    object.name = 'Nearfield studio monitor';
    object.position.set(x, 0.83, -0.14);
    object.rotation.y = yaw;
    desk.add(object);
    box(object, 0.27, 0.405, 0.26, 0, 0.202, 0, charcoal, 0.025);
    box(object, 0.28, 0.027, 0.25, 0, 0.004, 0, rubber);
    box(object, .253, .384, .012, 0, .202, .127, metal, .017);
    const driver = (profile: number[][], y: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([radius, depth]) => new THREE.Vector2(radius, depth)).reverse(), 48), material);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = y;
      mesh.castShadow = mesh.receiveShadow = true;
      object.add(mesh);
    };
    // A pressed cone sits behind its rolled rubber surround and mounting flange.
    driver([[.026, .137], [.035, .136], [.051, .140], [.068, .149], [.074, .154]], .157, cone);
    driver([[.073, .154], [.077, .159], [.082, .160], [.087, .155], [.091, .142], [.098, .137]], .157, rubber);
    const flange = new THREE.Mesh(new THREE.RingGeometry(.026, .102, 48), charcoal);
    flange.position.set(0, .157, .134);
    flange.receiveShadow = true;
    object.add(flange);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.029, 24, 12), cone);
    cap.scale.z = .38;
    cap.position.set(0, .157, .141);
    object.add(cap);
    // The tweeter dome is nested in a shallow, smoothly flared waveguide.
    driver([[.010, .137], [.016, .138], [.024, .143], [.033, .149], [.039, .145], [.041, .135]], .323, charcoal);
    const tweeter = new THREE.Mesh(new THREE.SphereGeometry(.012, 20, 10), rubber);
    tweeter.scale.z = .5;
    tweeter.position.set(0, .323, .143);
    object.add(tweeter);
    box(object, .104, .015, .004, 0, .039, .137, rubber, .006);
    box(object, .089, .002, .002, 0, .032, .140, charcoal, 0);
    for (const sx of [-0.101, 0.101]) for (const sy of [0.043, 0.36]) {
      cylinder(object, 0.0035, 0.003, sx, sy, 0.132, paleMetal, 7).rotation.x = Math.PI / 2;
    }
    line(object, [[0, .086, -.134], [0, .040, -.19], [.018, -.013, -.29], [.018, -.068, -.32]], rubber, .0035);
    batchAssembly(object);
  }
  speaker(-1.54, 0.13);
  speaker(1.52, -0.13);

  // The desk mat and individual keycaps read as a working keyboard at close camera distances.
  box(desk, 1.18, 0.004, 0.30, 0.35, 0.817, 0.25, rubber, 0.014);
  const keyboard = new THREE.Group();
  keyboard.position.set(0.14, 0.826, 0.26);
  keyboard.rotation.y = -0.035;
  desk.add(keyboard);
  box(keyboard, 0.487, 0.023, 0.162, 0, 0, 0, paleMetal, 0.008);
  box(keyboard, 0.477, 0.012, 0.155, 0, 0.012, 0, charcoal, 0.005);
  const keyGeometry = new RoundedBoxGeometry(0.027, 0.012, 0.025, 1, 0.003);
  const keycaps = new THREE.InstancedMesh(keyGeometry, keyMaterial, 54);
  const darkCaps = new THREE.InstancedMesh(keyGeometry, darkKey, 11);
  const transform = new THREE.Object3D();
  let keyIndex = 0;
  let darkIndex = 0;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 14; column++) {
      transform.position.set(-0.218 + column * 0.0332, 0.024, -0.057 + row * 0.031);
      transform.updateMatrix();
      if (column === 0 || column === 13) darkCaps.setMatrixAt(darkIndex++, transform.matrix);
      else keycaps.setMatrixAt(keyIndex++, transform.matrix);
    }
  }
  for (let column = 0; column < 3; column++) {
    transform.position.set(-0.218 + column * 0.0332, 0.024, 0.067); transform.updateMatrix();
    darkCaps.setMatrixAt(darkIndex++, transform.matrix);
  }
  for (let column = 8; column < 14; column++) {
    transform.position.set(-0.218 + column * 0.0332, 0.024, 0.067); transform.updateMatrix();
    keycaps.setMatrixAt(keyIndex++, transform.matrix);
  }
  keycaps.castShadow = true; darkCaps.castShadow = true; keyboard.add(keycaps, darkCaps);
  box(keyboard, 0.153, 0.012, 0.025, -0.032, 0.024, 0.067, keyMaterial, 0.003);
  line(desk, [[0.14, 0.84, 0.17], [0.11, 0.819, 0.06], [0.22, 0.819, -0.13]], rubber, 0.0025);
  const mouse = box(desk, 0.065, 0.032, 0.105, 0.69, 0.834, 0.26, charcoal, 0.025);
  mouse.rotation.y = -0.12;
  box(desk, 0.005, 0.008, 0.014, 0.694, 0.851, 0.24, paleMetal, 0.002);

  // Audio interface on the left: physical inputs and knobs, no invented signal dashboard.
  const audioInterface = new THREE.Group();
  audioInterface.position.set(-0.73, 0.848, 0.27);
  desk.add(audioInterface);
  box(audioInterface, 0.36, 0.07, 0.15, 0, 0, 0, paleMetal, 0.009);
  box(audioInterface, 0.355, 0.058, 0.008, 0, 0, 0.079, charcoal, 0.004);
  for (const x of [-0.139, -0.087]) {
    cylinder(audioInterface, 0.019, 0.008, x, 0, 0.087, metal, 18).rotation.x = Math.PI / 2;
    cylinder(audioInterface, 0.010, 0.01, x, 0, 0.092, rubber, 16).rotation.x = Math.PI / 2;
  }
  for (const x of [-0.015, 0.041, 0.132]) {
    const radius = x > 0.1 ? 0.024 : 0.014;
    dial(audioInterface, x, 0, .092, radius, x > .1 ? -.42 : .3);
  }
  cylinder(audioInterface, 0.0025, 0.004, 0.085, 0.013, 0.085, amber, 8).rotation.x = Math.PI / 2;
  // A plugged lead turns down over the front of the desktop; rear outputs join its cable tray.
  cylinder(audioInterface, .008, .029, -.139, 0, .105, charcoal, 16).rotation.x = Math.PI / 2;
  line(audioInterface, [[-.139, 0, .120], [-.140, -.008, .16], [-.15, -.075, .175], [-.14, -.19, .13], [-.10, -.21, -.47]], rubber, .0034);
  for (const x of [-.094, .094]) line(audioInterface, [[x, -.007, -.076], [x, -.026, -.135], [x + .014, -.032, -.68], [x + .014, -.105, -.72], [x + .03, -.19, -.48]], rubber, .0028);
  batchAssembly(audioInterface);

  // Ceramic mug with an open rim, dark coffee and a rounded handle.
  const mug = new THREE.Group();
  mug.position.set(1.14, 0.82, 0.22);
  desk.add(mug);
  cylinder(mug, 0.035, 0.079, 0, 0.04, 0, ceramic, 28, 0.041);
  cylinder(mug, 0.035, 0.001, 0, 0.0795, 0, coffee, 28);
  torus(mug, 0.038, 0.004, 0, 0.0805, 0, ceramic).rotation.x = Math.PI / 2;
  const handle = torus(mug, 0.024, 0.007, 0.046, 0.043, 0, ceramic);
  handle.scale.x = 0.74;

  // A sculpted task chair: curved shell, tailored pads and a five-star rolling base.
  const chair = new THREE.Group();
  chair.name = 'Ergonomic task chair';
  chair.position.set(-1.03, 0, -1.50);
  chair.rotation.y = -0.30;
  group.add(chair);
  cylinder(chair, 0.031, 0.29, 0, 0.275, 0, paleMetal);
  cylinder(chair, 0.046, 0.13, 0, 0.185, 0, charcoal);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    line(chair, [[0, .128, 0], [Math.sin(angle) * .12, .128, Math.cos(angle) * .12], [Math.sin(angle) * .27, .101, Math.cos(angle) * .27]], charcoal, .022);
    const x = Math.sin(angle) * 0.288;
    const z = Math.cos(angle) * 0.288;
    const caster = new THREE.Group();
    caster.position.set(x, 0, z);
    caster.rotation.y = angle;
    chair.add(caster);
    for (const side of [-1, 1]) {
      cylinder(caster, .032, .014, side * .017, .032, 0, rubber, 20).rotation.z = Math.PI / 2;
      cylinder(caster, .012, .001, side * .025, .032, 0, charcoal, 16).rotation.z = Math.PI / 2;
    }
    box(caster, .029, .033, .034, 0, .060, 0, charcoal, .009);
    cylinder(caster, .012, .040, 0, .086, 0, metal, 16);
  }
  cushion(chair, .50, .064, .47, 0, .45, 0, charcoal, .025, .010, 'y', 0, false);
  cushion(chair, .51, .082, .46, 0, .484, .018, fabric, .030, .016);
  const backFrame = cushion(chair, .474, .56, .07, 0, .797, .233, charcoal, .027, .009, 'z', .12, false);
  backFrame.rotation.x = -0.10;
  const backPad = cushion(chair, .422, .49, .062, 0, .807, .188, fabric, .026, .012, 'z', .10);
  backPad.rotation.x = -0.10;
  cushion(chair, .34, .10, .07, 0, .618, .16, fabric, .021, .012, 'z', .06);
  for (const x of [-.13, .13]) line(backFrame, [[x * .72, -.23, .025], [x, -.05, .030], [x * .9, .20, .026]], charcoal, .0065);
  line(chair, [[0, .42, .15], [0, .52, .255], [0, .72, .275]], charcoal, .025);
  cylinder(chair, .039, .071, .12, .408, .04, charcoal, 24).rotation.z = Math.PI / 2;
  line(chair, [[.10, .423, -.03], [.19, .426, -.07], [.235, .437, -.07]], metal, .006);
  box(chair, .056, .018, .023, .235, .438, -.07, rubber, .006);
  for (const x of [-0.293, 0.293]) {
    line(chair, [[x * 0.72, 0.43, 0.12], [x, 0.48, 0.13], [x, 0.655, 0.10]], charcoal, 0.019);
    cushion(chair, .065, .04, .25, x, .665, .016, rubber, .015, .006, 'y', 0, false);
  }
  batchAssembly(chair);

  // OKRA equipment rack, with believable rack ears, vents and controls.
  const rack = new THREE.Group();
  rack.position.set(1.05, 0, -2.8);
  rack.rotation.y = -0.10;
  group.add(rack);
  for (const x of [-0.306, 0.306]) box(rack, 0.048, 1.21, 0.59, x, 0.635, 0, walnut);
  box(rack, 0.66, 0.05, 0.62, 0, 1.265, 0, wood);
  box(rack, 0.66, 0.055, 0.62, 0, 0.057, 0, walnut);
  box(rack, 0.575, 1.16, 0.03, 0, 0.645, -0.279, charcoal);
  for (const x of [-0.26, 0.26]) box(rack, 0.017, 1.125, 0.04, x, 0.65, 0.268, metal, 0.003);
  for (let unit = 0; unit < 5; unit++) {
    const y = 1.103 - unit * 0.216;
    box(rack, 0.55, 0.204, 0.47, 0, y, 0.009, charcoal, 0.009);
    box(rack, 0.554, 0.198, 0.012, 0, y, 0.251, unit === 0 ? metal : charcoal, 0.003);
    for (const x of [-0.265, 0.265]) {
      cylinder(rack, 0.005, 0.004, x, y + 0.071, 0.261, paleMetal, 8).rotation.x = Math.PI / 2;
      cylinder(rack, 0.005, 0.004, x, y - 0.071, 0.261, paleMetal, 8).rotation.x = Math.PI / 2;
    }
    if (unit === 0) {
      label(rack, 'OKRA', 0.225, 0.056, -0.10, y + 0.028, 0.261, '#e0d4ba', '#1f2425');
      label(rack, 'Scheduled · traceable', 0.225, 0.035, -0.10, y - 0.038, 0.261, '#939d93', '#1f2425');
      dial(rack, .174, y, .274, .032, -.55);
    } else {
      box(rack, 0.185, 0.063, 0.006, -0.119, y + 0.026, 0.262, rubber, 0.003);
      for (let tick = 0; tick < 7; tick++) {
        const material = new THREE.MeshStandardMaterial({ color: tick > 4 ? '#b0945c' : '#739181', emissive: tick > 4 ? '#b0945c' : '#739181', emissiveIntensity: 0.20, roughness: 0.65 });
        const light = box(rack, 0.009, 0.010, 0.003, -0.189 + tick * 0.023, y + 0.026, 0.267, material, 0.001);
        light.castShadow = false;
        meters.push(light);
      }
      for (const x of [0.040, 0.115, 0.19]) {
        cylinder(rack, 0.018, 0.022, x, y + 0.014, 0.274, paleMetal, 18).rotation.x = Math.PI / 2;
        box(rack, 0.002, 0.008, 0.002, x, y + 0.024, 0.286, rubber, 0);
      }
      for (let vent = 0; vent < 7; vent++) box(rack, 0.027, 0.003, 0.002, -0.181 + vent * 0.058, y - 0.061, 0.260, rubber, 0);
    }
  }
  for (const x of [-0.24, 0.24]) for (const z of [-0.23, 0.23]) cylinder(rack, 0.03, 0.04, x, 0.018, z, rubber, 12);
  // Keep the rack's oriented outline before its individual meshes are batched.
  rack.updateWorldMatrix(true, true);
  const rackBounds = new THREE.Box3();
  const rackInverse = rack.matrixWorld.clone().invert();
  rack.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    const toRack = new THREE.Matrix4().multiplyMatrices(rackInverse, object.matrixWorld);
    rackBounds.union(object.geometry.boundingBox!.clone().applyMatrix4(toRack));
  });
  readerAnchors[2] = worldBoxCorners(rack, rackBounds);
  batchAssembly(rack, new Set(meters));

  // Vinyl console. The turntable's rotating group contains only the platter and record.
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(-3.45, 0, 0.2);
  consoleGroup.rotation.y = Math.PI / 2;
  group.add(consoleGroup);
  box(consoleGroup, 1.5, 0.055, 0.52, 0, 0.75, 0, wood, 0.015);
  box(consoleGroup, 1.5, 0.055, 0.52, 0, 0.21, 0, walnut);
  box(consoleGroup, 1.45, 0.485, 0.026, 0, 0.479, -0.246, walnut);
  for (const x of [-0.723, 0, 0.723]) box(consoleGroup, 0.04, 0.495, 0.51, x, 0.479, 0, walnut);
  for (const x of [-0.65, 0.65]) for (const z of [-0.18, 0.18]) {
    cylinder(consoleGroup, 0.021, 0.2, x, 0.105, z, brass, 14, 0.028);
  }
  const vinylColors = ['#d9cfb5', '#252529', '#825345', '#8c8c76', '#c1a77a', '#e1dcc9', '#3a4847'];
  const spineGeometry = new THREE.BoxGeometry(0.013, 0.326, 0.328);
  const spineMaterials = vinylColors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
  for (let i = 0; i < 24; i++) {
    const sleeve = new THREE.Mesh(spineGeometry, spineMaterials[i % spineMaterials.length]);
    sleeve.position.set(-0.66 + i * 0.016, 0.398, 0.015);
    sleeve.rotation.z = -0.06;
    sleeve.castShadow = true;
    consoleGroup.add(sleeve);
  }
  // Two sleeves face out from the lower cubbies; the third rests beside the turntable.
  // Their shallow supports sit on the shelves, clear of the stored spines and platter.
  const tableAlbumPositions = [
    { x: -0.433, y: 0.411, z: 0.209, baseY: 0.2385 },
    { x: 0.385, y: 0.411, z: 0.209, baseY: 0.2385 },
    { x: 0.385, y: 0.957, z: -0.143, baseY: 0.782 },
  ];
  STUDIO_TABLE_ALBUMS.forEach((album, index) => {
    const position = tableAlbumPositions[index];
    const sleeve = new THREE.Group();
    sleeve.name = `${album.title} — ${album.artist}`;
    sleeve.position.set(position.x, position.y, position.z);
    sleeve.rotation.x = index === 2 ? -0.07 : -0.03;
    consoleGroup.add(sleeve);
    box(sleeve, 0.345, 0.345, 0.009, 0, 0, 0, paper, 0.001);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.343, 0.343), new THREE.MeshStandardMaterial({ map: texture(album.file), roughness: 0.75 }));
    art.position.z = 0.0053;
    sleeve.add(art);
    albumArt[album.id] = art;
    box(consoleGroup, 0.359, index === 2 ? 0.008 : 0.004, 0.058,
      position.x, position.baseY, position.z + 0.007, walnut, 0.002);
    box(consoleGroup, 0.35, 0.012, 0.008,
      position.x, position.baseY + 0.008, position.z + 0.030, brass, 0.002);
    if (index === 2) {
      for (const x of [position.x - 0.095, position.x + 0.095]) {
        line(consoleGroup, [[x, 0.785, -0.167], [x, 0.929, -0.164], [x, 0.957, -0.150]], metal, 0.0025);
      }
    }
  });
  const turntable = new THREE.Group();
  turntable.position.set(-0.36, 0.78, 0.017);
  consoleGroup.add(turntable);
  box(turntable, 0.60, 0.067, 0.39, 0, 0.037, 0, walnut, 0.012);
  box(turntable, 0.565, 0.009, 0.357, 0, 0.075, 0, metal, 0.004);
  for (const x of [-0.23, 0.23]) for (const z of [-0.14, 0.14]) cylinder(turntable, 0.027, 0.018, x, 0.003, z, rubber, 16);
  const record = new THREE.Group();
  record.position.set(-0.07, 0.084, 0);
  turntable.add(record);
  cylinder(record, 0.158, 0.019, 0, 0, 0, paleMetal, 64);
  cylinder(record, 0.152, 0.005, 0, 0.013, 0, rubber, 64);
  const grooveMaterial = new THREE.MeshStandardMaterial({ color: '#191919', roughness: 0.32, metalness: 0.15 });
  for (let i = 0; i < 15; i++) torus(record, 0.051 + i * 0.0065, 0.00055, 0, 0.016, 0, grooveMaterial).rotation.x = Math.PI / 2;
  cylinder(record, 0.047, 0.001, 0, 0.017, 0, ceramic, 40);
  const recordLabel = canvasTexture(256, 256, context => {
    context.fillStyle = '#b9996e'; context.fillRect(0, 0, 256, 256);
    context.fillStyle = '#392d26'; context.textAlign = 'center';
    context.font = '500 25px Arial'; context.fillText('THOMAS TALAS', 128, 89);
    context.font = '19px Arial'; context.fillText('SIDE A', 128, 174);
    context.lineWidth = 2; context.strokeStyle = '#5a4734';
    context.beginPath(); context.arc(128, 128, 109, 0, Math.PI * 2); context.stroke();
  });
  const centerLabel = new THREE.Mesh(new THREE.CircleGeometry(0.045, 32), new THREE.MeshStandardMaterial({ map: recordLabel, roughness: 0.65 }));
  centerLabel.rotation.x = -Math.PI / 2; centerLabel.position.y = 0.0177; record.add(centerLabel);
  cylinder(record, 0.003, 0.021, 0, 0.025, 0, paleMetal, 10);
  cylinder(turntable, 0.026, 0.057, 0.201, 0.1, -0.112, paleMetal, 24);
  cylinder(turntable, 0.033, 0.035, 0.214, 0.132, -0.137, charcoal, 24).rotation.x = Math.PI / 2;
  line(turntable, [[0.201, 0.141, -0.123], [0.189, 0.14, -0.070], [0.16, 0.127, 0.059], [0.131, 0.124, 0.090], [0.085, 0.121, 0.096]], paleMetal, 0.006);
  const cartridge = box(turntable, 0.040, 0.019, 0.019, 0.074, 0.117, 0.096, charcoal, 0.004);
  cartridge.rotation.y = -0.24;
  box(turntable, 0.008, 0.013, 0.009, 0.064, 0.103, 0.102, brass, 0.002);
  cylinder(turntable, 0.020, 0.012, -0.245, 0.088, 0.123, paleMetal, 20);
  box(turntable, 0.024, 0.007, 0.024, 0.23, 0.082, 0.126, charcoal, 0.002);

  // Headphones hung from the console side, including ear pads and a soft cable.
  const headphones = new THREE.Group();
  headphones.position.set(0.74, 0.64, 0.18);
  headphones.rotation.y = -Math.PI / 2;
  consoleGroup.add(headphones);
  const headbandCurve = new THREE.EllipseCurve(0, 0, 0.084, 0.107, 0, Math.PI, false, 0);
  const headbandPoints = headbandCurve.getPoints(28).map(point => new THREE.Vector3(point.x, point.y, 0));
  headphones.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(headbandPoints), 32, 0.011, 8, false), charcoal));
  for (const x of [-0.082, 0.082]) {
    box(headphones, 0.044, 0.087, 0.058, x, -0.021, 0, charcoal, 0.021);
    box(headphones, 0.018, 0.075, 0.052, x + (x > 0 ? -0.024 : 0.024), -0.021, 0, rubber, 0.012);
  }
  line(consoleGroup, [[0.74, 0.63, 0.23], [0.75, 0.30, 0.20], [0.70, 0.20, 0.19], [0.67, 0.31, 0.16]], rubber, 0.003);

  // Tapi occupies a working research corner: conversation on the laptop, sources beside it.
  const tapiStation = new THREE.Group();
  tapiStation.name = 'Tapi research workstation';
  tapiStation.position.set(2.75, 0, -0.75);
  tapiStation.rotation.y = -0.25;
  group.add(tapiStation);
  box(tapiStation, 1.40, 0.052, 0.82, 0, 0.80, 0, wood, 0.018);
  box(tapiStation, 1.28, 0.022, 0.72, 0, 0.763, 0, walnut, 0.008);
  for (const x of [-0.59, 0.59]) {
    for (const z of [-0.30, 0.30]) {
      box(tapiStation, 0.042, 0.735, 0.042, x, 0.386, z, metal, 0.006);
      box(tapiStation, 0.050, 0.020, 0.060, x, 0.012, z, rubber, 0.005);
    }
    box(tapiStation, 0.044, 0.036, 0.64, x, 0.245, 0, metal, 0.004);
  }
  box(tapiStation, 1.18, 0.035, 0.04, 0, 0.245, -0.30, walnut, 0.004);
  box(tapiStation, 0.86, 0.075, 0.16, 0.03, 0.699, -0.265, charcoal, 0.006);
  box(tapiStation, 0.90, 0.003, 0.38, -0.035, 0.828, 0.13, rubber, 0.015);

  // The folded aluminium riser supports the laptop and leaves the front of the desk usable.
  box(tapiStation, 0.31, 0.010, 0.23, -0.205, 0.836, -0.07, paleMetal, 0.005);
  for (const x of [-0.315, -0.095]) {
    const support = box(tapiStation, 0.025, 0.128, 0.035, x, 0.897, -0.095, paleMetal, 0.004);
    support.rotation.x = -0.20;
  }
  box(tapiStation, 0.36, 0.009, 0.235, -0.205, 0.958, -0.065, paleMetal, 0.004);
  for (const x of [-0.35, -0.06]) box(tapiStation, 0.028, 0.004, 0.19, x, 0.964, -0.065, rubber, 0.002);

  const tapiLaptop = new THREE.Group();
  tapiLaptop.position.set(-0.205, 0.967, -0.065);
  tapiStation.add(tapiLaptop);
  box(tapiLaptop, 0.47, 0.017, 0.285, 0, 0.0085, 0, paleMetal, 0.007);
  box(tapiLaptop, 0.399, 0.002, 0.107, 0, 0.018, -0.046, charcoal, 0.005);
  box(tapiLaptop, 0.141, 0.001, 0.070, 0, 0.018, 0.079, metal, 0.004);
  for (const x of [-0.226, 0.226]) {
    box(tapiLaptop, 0.002, 0.004, 0.017, x, 0.009, 0.046, rubber, 0.001);
    box(tapiLaptop, 0.002, 0.004, 0.023, x, 0.009, -0.011, rubber, 0.001);
  }
  const tapiLid = new THREE.Group();
  tapiLid.position.set(0, 0.018, -0.133);
  tapiLid.rotation.x = -0.14;
  tapiLaptop.add(tapiLid);
  const tapiLidHousing = box(tapiLid, 0.47, 0.301, 0.012, 0, 0.15, 0, charcoal, 0.008);
  cylinder(tapiLid, 0.0018, 0.002, 0, 0.293, 0.0075, rubber, 8).rotation.x = Math.PI / 2;
  const tapiConversation = canvasTexture(1440, 900, context => {
    context.fillStyle = '#eeece4'; context.fillRect(0, 0, 1440, 900);
    context.fillStyle = '#272a28'; context.font = '600 74px Arial'; context.fillText('Tapi', 76, 112);
    context.fillStyle = '#575e56'; context.font = '28px Arial'; context.fillText('TapMango AI', 232, 106);
    context.font = '26px Arial'; context.textAlign = 'right'; context.fillText('Illustrative conversation', 1364, 103); context.textAlign = 'left';
    context.strokeStyle = '#cacdc2'; context.lineWidth = 2; context.beginPath(); context.moveTo(76, 151); context.lineTo(1364, 151); context.stroke();
    context.fillStyle = '#dedfd5'; context.fillRect(430, 204, 934, 160);
    context.fillStyle = '#30382f'; context.font = '500 44px Arial';
    context.fillText('How do loyalty', 467, 269); context.fillText('rewards work?', 467, 327);
    context.fillStyle = '#67725d'; context.font = '28px Arial'; context.fillText('Loyalty guides reviewed', 76, 434);
    context.fillStyle = '#30382f'; context.font = '500 43px Arial'; context.fillText('Give customers a reason to return.', 76, 505);
    context.fillStyle = '#575e56'; context.font = '33px Arial';
    context.fillText('Keep the offer clear and check eligibility', 76, 565);
    context.fillText('before turning the idea into a campaign.', 76, 614);
    context.font = '27px Arial'; context.fillText('Sources: loyalty guide · reward setup', 76, 688);
    context.fillStyle = '#e2e3da'; context.fillRect(76, 756, 1288, 83);
    context.fillStyle = '#656d60'; context.font = '30px Arial'; context.fillText('Ask a follow-up…', 104, 810);
  });
  const tapiLaptopDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.445, 0.278), new THREE.MeshBasicMaterial({ map: tapiConversation, toneMapped: false }));
  tapiLaptopDisplay.position.set(0, 0.15, 0.0067);
  tapiLid.add(tapiLaptopDisplay);

  // A portrait display gives the corner a different silhouette and keeps evidence adjacent.
  const evidenceMonitor = new THREE.Group();
  evidenceMonitor.position.set(0.395, 0.826, -0.225);
  evidenceMonitor.rotation.y = -0.10;
  tapiStation.add(evidenceMonitor);
  box(evidenceMonitor, 0.235, 0.014, 0.195, 0, 0.008, 0.033, paleMetal, 0.008);
  box(evidenceMonitor, 0.037, 0.249, 0.041, 0, 0.136, -0.038, paleMetal, 0.007);
  cylinder(evidenceMonitor, 0.035, 0.028, 0, 0.28, -0.023, metal, 20).rotation.x = Math.PI / 2;
  const evidenceHousing = box(evidenceMonitor, 0.355, 0.568, 0.032, 0, 0.410, 0, charcoal, 0.010);
  readerAnchors[4] = [...housingCorners(tapiLidHousing), ...housingCorners(evidenceHousing)];
  for (let vent = 0; vent < 8; vent++) box(evidenceMonitor, 0.017, 0.003, 0.001, -0.125 + vent * 0.035, 0.149, -0.0165, rubber, 0);
  cylinder(evidenceMonitor, 0.0016, 0.002, 0.142, 0.135, 0.017, amber, 8).rotation.x = Math.PI / 2;
  const tapiEvidence = canvasTexture(900, 1440, context => {
    context.fillStyle = '#252c29'; context.fillRect(0, 0, 900, 1440);
    context.fillStyle = '#e7e5d7'; context.font = '600 65px Arial'; context.fillText('Sources', 70, 124);
    context.fillStyle = '#bdc6b6'; context.font = '30px Arial'; context.fillText('Illustrative source view', 70, 184);
    context.strokeStyle = '#576257'; context.lineWidth = 2; context.beginPath(); context.moveTo(70, 239); context.lineTo(830, 239); context.stroke();
    context.fillStyle = '#c2cbb9'; context.font = '32px Arial'; context.fillText('Tool context', 70, 313);
    context.fillStyle = '#f0ecde'; context.font = '43px Arial'; context.fillText('Loyalty + repeat visits', 70, 383);
    context.fillStyle = '#c2cbb9'; context.font = '30px Arial'; context.fillText('Find guidance for the question.', 70, 442);
    context.strokeStyle = '#576257'; context.beginPath(); context.moveTo(70, 519); context.lineTo(830, 519); context.stroke();
    context.fillStyle = '#c2cbb9'; context.font = '32px Arial'; context.fillText('Guides + report context', 70, 603);
    context.fillStyle = '#f0ecde'; context.font = '42px Arial'; context.fillText('Loyalty guide', 70, 694);
    context.fillStyle = '#bdc6b6'; context.font = '30px Arial'; context.fillText('Product guide', 70, 748);
    context.fillStyle = '#f0ecde'; context.font = '42px Arial'; context.fillText('Report history', 70, 866);
    context.fillStyle = '#bdc6b6'; context.font = '30px Arial'; context.fillText('Completed report runs', 70, 920);
    context.strokeStyle = '#576257'; context.beginPath(); context.moveTo(70, 1036); context.lineTo(830, 1036); context.stroke();
    context.fillStyle = '#d0d7c6'; context.font = '33px Arial'; context.fillText('Sources inform the answer.', 70, 1140);
    context.fillText('New reports need approval.', 70, 1192);
    context.fillStyle = '#bdc6b6'; context.font = '28px Arial'; context.fillText('Tapi / TapMango AI', 70, 1353);
  });
  const evidenceDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.329, 0.526), new THREE.MeshBasicMaterial({ map: tapiEvidence, toneMapped: false }));
  evidenceDisplay.position.set(0, 0.414, 0.0167);
  evidenceMonitor.add(evidenceDisplay);

  // Compact external keyboard, a wired dock, and supported cables complete the working setup.
  const tapiKeyboard = new THREE.Group();
  tapiKeyboard.position.set(-0.215, 0.841, 0.216);
  tapiStation.add(tapiKeyboard);
  box(tapiKeyboard, 0.411, 0.018, 0.128, 0, 0, 0, paleMetal, 0.006);
  box(tapiKeyboard, 0.397, 0.004, 0.119, 0, 0.010, 0, charcoal, 0.004);
  const researchKeyGeometry = new RoundedBoxGeometry(0.024, 0.006, 0.019, 1, 0.002);
  const researchKeys = new THREE.InstancedMesh(researchKeyGeometry, keyMaterial, 39);
  const researchKeyTransform = new THREE.Object3D();
  for (let row = 0; row < 3; row++) for (let column = 0; column < 13; column++) {
    researchKeyTransform.position.set(-0.178 + column * 0.0297, 0.015, -0.040 + row * 0.025);
    researchKeyTransform.updateMatrix();
    researchKeys.setMatrixAt(row * 13 + column, researchKeyTransform.matrix);
  }
  researchKeys.castShadow = true;
  tapiKeyboard.add(researchKeys);
  box(tapiKeyboard, 0.151, 0.006, 0.019, -0.012, 0.015, 0.039, keyMaterial, 0.002);
  for (const x of [-0.166, -0.126, 0.115, 0.154, 0.183]) box(tapiKeyboard, 0.023, 0.006, 0.019, x, 0.015, 0.039, darkKey, 0.002);
  const tapiMouse = box(tapiStation, 0.060, 0.030, 0.098, 0.099, 0.847, 0.204, charcoal, 0.024);
  tapiMouse.rotation.y = -0.14;
  box(tapiStation, 0.004, 0.008, 0.015, 0.102, 0.862, 0.181, paleMetal, 0.002);
  box(tapiStation, 0.165, 0.030, 0.063, 0.066, 0.844, -0.203, paleMetal, 0.005);
  for (const x of [0.015, 0.048, 0.087]) box(tapiStation, 0.014, 0.006, 0.002, x, 0.844, -0.170, rubber, 0.001);
  line(tapiStation, [[0.031, 0.976, -0.020], [0.092, 0.959, -0.038], [0.122, 0.852, -0.151], [0.13, 0.844, -0.185]], rubber, 0.0025);
  line(tapiStation, [[0.392, 1.099, -0.262], [0.393, 0.904, -0.264], [0.268, 0.831, -0.270], [0.093, 0.850, -0.224]], rubber, 0.003);
  line(tapiStation, [[-0.215, 0.85, 0.151], [-0.138, 0.832, 0.123], [0.015, 0.832, -0.10], [0.015, 0.844, -0.170]], rubber, 0.002);
  line(tapiStation, [[0.139, 0.844, -0.231], [0.175, 0.828, -0.358], [0.21, 0.78, -0.418], [0.22, 0.70, -0.30]], rubber, 0.003);

  const researchNotebook = new THREE.Group();
  researchNotebook.position.set(0.398, 0.832, 0.185);
  researchNotebook.rotation.y = -0.08;
  tapiStation.add(researchNotebook);
  box(researchNotebook, 0.198, 0.018, 0.265, 0, 0.006, 0, charcoal, 0.003);
  box(researchNotebook, 0.188, 0.012, 0.253, 0.001, 0.012, 0, paper, 0.001);
  const researchNotes = canvasTexture(620, 840, context => {
    context.fillStyle = '#dcd7c5'; context.fillRect(0, 0, 620, 840);
    context.fillStyle = '#384137'; context.font = '500 41px Arial'; context.fillText('Tapi / notes', 48, 97);
    context.font = '30px Arial'; context.fillText('An answer needs context.', 48, 177);
    context.font = '28px Arial';
    ['Merchant question', 'Relevant guidance', 'A useful next step'].forEach((text, index) => {
      const y = 278 + index * 119;
      context.fillText(text, 48, y);
      context.strokeStyle = '#aaa996'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(48, y + 35); context.lineTo(565, y + 35); context.stroke();
    });
    context.fillStyle = '#64705e'; context.font = '24px Arial'; context.fillText('Illustrative working notes', 48, 756);
  });
  const notesPage = new THREE.Mesh(new THREE.PlaneGeometry(0.184, 0.249), new THREE.MeshStandardMaterial({ map: researchNotes, roughness: 0.94 }));
  notesPage.rotation.x = -Math.PI / 2;
  notesPage.position.set(0.001, 0.0185, 0);
  notesPage.receiveShadow = true;
  researchNotebook.add(notesPage);
  const researchPen = cylinder(tapiStation, 0.0035, 0.154, 0.546, 0.835, 0.17, brass, 12);
  researchPen.rotation.set(Math.PI / 2, 0, -0.09);

  // A small articulated task lamp lights the paper and stand, with its cable tucked behind the desk.
  const taskLamp = new THREE.Group();
  taskLamp.position.set(-0.569, 0.826, -0.246);
  tapiStation.add(taskLamp);
  cylinder(taskLamp, 0.081, 0.014, 0, 0.009, 0, charcoal, 28);
  cylinder(taskLamp, 0.045, 0.007, 0, 0.020, 0, metal, 24);
  line(taskLamp, [[0, 0.024, 0], [-0.020, 0.221, -0.020], [0.062, 0.408, 0.057]], brass, 0.008);
  for (const joint of [[-0.020, 0.221, -0.020], [0.062, 0.408, 0.057]]) {
    cylinder(taskLamp, 0.015, 0.024, joint[0], joint[1], joint[2], paleMetal, 18).rotation.z = Math.PI / 2;
  }
  const lampHead = new THREE.Group();
  lampHead.position.set(0.062, 0.414, 0.059);
  lampHead.rotation.x = -0.24;
  taskLamp.add(lampHead);
  const taskShade = new THREE.MeshStandardMaterial({ color: '#484e43', roughness: 0.61, metalness: 0.24, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.074, 0.078, 32, 1, true), taskShade);
  shade.position.y = -0.026;
  shade.castShadow = true;
  lampHead.add(shade);
  cylinder(lampHead, 0.034, 0.006, 0, 0.016, 0, taskShade, 28);
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: '#ffe8c3', emissive: '#ffd2a0', emissiveIntensity: 1.4, roughness: 0.4 });
  cylinder(lampHead, 0.045, 0.005, 0, -0.054, 0, bulbMaterial, 28);
  const taskLight = new THREE.SpotLight(0xffcf94, 2.5, 1.8, 0.78, 0.65, 2);
  taskLight.position.set(-0.507, 1.177, -0.166);
  taskLight.target.position.set(-0.19, 0.832, 0.16);
  tapiStation.add(taskLight, taskLight.target);
  line(tapiStation, [[-0.581, 0.83, -0.304], [-0.591, 0.827, -0.374], [-0.596, 0.77, -0.414], [-0.535, 0.699, -0.29], [-0.25, 0.699, -0.29]], rubber, 0.0025);

  // Tailored leather lounge seating, with crowned cushions and a separate supporting shell.
  const lounge = new THREE.Group();
  lounge.name = 'Leather lounge chair';
  lounge.position.set(2.9, 0, 2.05);
  lounge.rotation.y = -2.40;
  group.add(lounge);
  for (const x of [-0.33, 0.33]) for (const z of [-0.29, 0.29]) {
    const leg = cylinder(lounge, 0.020, 0.23, x, 0.1166, z, walnut, 16, 0.030);
    leg.rotation.z = x > 0 ? -0.12 : 0.12;
  }
  cushion(lounge, .83, .17, .77, 0, .30, 0, leather, .060, .016);
  cushion(lounge, .65, .15, .60, 0, .415, .035, leather, .050, .022);
  for (const x of [-0.377, 0.377]) {
    cushion(lounge, .155, .29, .72, x, .48, .015, leather, .062, .022);
  }
  const loungeBack = cushion(lounge, .76, .54, .15, 0, .60, -.306, leather, .055, .020, 'z');
  loungeBack.rotation.x = -0.12;
  const loungePad = cushion(lounge, .59, .41, .13, 0, .62, -.223, leather, .043, .022, 'z');
  loungePad.rotation.x = -0.16;
  // Two quiet stitch channels follow the crown, staying on the leather as it reclines.
  const stitchSurface = new THREE.Mesh(loungePad.geometry, leather);
  const stitchRay = new THREE.Raycaster();
  for (const x of [-.14, .14]) {
    const stitches: number[][] = [];
    for (let step = 0; step <= 8; step++) {
      const y = -.125 + step * .03125;
      stitchRay.set(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
      const surface = stitchRay.intersectObject(stitchSurface, false)[0];
      if (surface) stitches.push([x, y, surface.point.z + .0003]);
    }
    line(loungePad, stitches, upholsterySeam, .0011).castShadow = false;
  }
  const throwCushion = cushion(lounge, .31, .29, .12, .165, .62, -.069, fabric, .033, .024, 'z', .04);
  throwCushion.rotation.set(-0.20, 0.10, -0.13);
  batchAssembly(lounge);

  return { group, record, meters, portalScreen, stanleyScreen, readerAnchors, albumArt, resources };
}
