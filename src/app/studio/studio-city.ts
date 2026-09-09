import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mapStudioSurfaces } from './studio-surfaces';
import type { StudioMaterials } from './studio-furniture';

interface CityBuilding {
  x: number; z: number; width: number; depth: number; height: number;
  yaw?: number; brick?: boolean; crown?: boolean; seed: number;
}

/** An inhabited night neighborhood around the studio, without occupying its approach. */
export function buildStudioCity(m: StudioMaterials): { group: THREE.Group; resources: THREE.Texture[] } {
  const group = new THREE.Group();
  group.name = 'Night neighborhood and layered city skyline';
  const architecture = new THREE.Group();
  architecture.name = 'City buildings outside the studio footprint';
  group.add(architecture);
  const resources: THREE.Texture[] = [];

  const hash = (a: number, b: number, seed: number) => {
    const value = Math.sin(a * 127.1 + b * 311.7 + seed * 53.3) * 43758.5453;
    return value - Math.floor(value);
  };
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 768;
  brickCanvas.height = 384;
  const brickContext = brickCanvas.getContext('2d');
  if (brickContext) {
    brickContext.fillStyle = '#1c2227';
    brickContext.fillRect(0, 0, 768, 384);
    const colors = ['#353235', '#3a3434', '#323137', '#39373a', '#302e33'];
    for (let row = 0; row < 8; row++) for (let column = -1; column < 7; column++) {
      brickContext.fillStyle = colors[(row * 3 + column + 7) % colors.length];
      brickContext.fillRect(column * 128 + (row % 2) * 64 + 2, row * 48 + 2, 124, 44);
    }
  }
  const brickMap = new THREE.CanvasTexture(brickCanvas);
  brickMap.colorSpace = THREE.SRGBColorSpace;
  brickMap.wrapS = brickMap.wrapT = THREE.RepeatWrapping;
  brickMap.repeat.set(1 / 1.56, 1 / .60);
  resources.push(brickMap);
  const brick = new THREE.MeshStandardMaterial({ map: brickMap, color: '#aab2ba', roughness: .96, emissive: '#152132', emissiveIntensity: .46 });
  const masonry = new THREE.MeshStandardMaterial({ color: '#56616d', vertexColors: true, roughness: .92, emissive: '#182b43', emissiveIntensity: .55 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#35404a', roughness: .88, emissive: '#111b28', emissiveIntensity: .45 });
  const roof = new THREE.MeshStandardMaterial({ color: '#18242f', roughness: .93, emissive: '#101b29', emissiveIntensity: .35 });
  // Compose the surround, glass, blinds and sash on one surface. Millimetre-spaced
  // overlapping quads lose their depth ordering at city distances as the camera moves.
  const windowMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true, fog: true, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  windowMaterial.onBeforeCompile = shader => {
    shader.uniforms['cityWindowFrame'] = { value: new THREE.Color('#0e1723') };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute vec4 windowShape;
      attribute vec3 roomColor;
      varying vec2 vWindowPosition;
      varying vec4 vWindowShape;
      varying vec3 vRoomColor;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vWindowPosition = uv;
      vWindowShape = windowShape;
      vRoomColor = roomColor;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform vec3 cityWindowFrame;
      varying vec2 vWindowPosition;
      varying vec4 vWindowShape;
      varying vec3 vRoomColor;
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      // Integrate each edge over its pixel footprint. A distant 32 mm sash fades
      // by coverage instead of becoming a flickering, full-contrast pixel stripe.
      vec2 pixelWidth = max(fwidth(vWindowPosition), vec2(0.00001));
      vec2 pixelLow = vWindowPosition - pixelWidth * 0.5;
      vec2 pixelHigh = vWindowPosition + pixelWidth * 0.5;
      vec2 paneCoverage = clamp(
        (min(pixelHigh, vWindowShape.xy) - max(pixelLow, -vWindowShape.xy)) / pixelWidth,
        vec2(0.0), vec2(1.0)
      );
      float roomCoverage = clamp((vWindowShape.z - pixelLow.y) / pixelWidth.y, 0.0, 1.0);
      float sashCoverage = clamp(
        (min(pixelHigh.x, 0.016) - max(pixelLow.x, -0.016)) / pixelWidth.x,
        0.0, 1.0
      ) * vWindowShape.w * roomCoverage;
      vec3 paneColor = mix(diffuseColor.rgb, vRoomColor, roomCoverage);
      paneColor = mix(paneColor, cityWindowFrame, sashCoverage);
      diffuseColor.rgb = mix(cityWindowFrame, paneColor, paneCoverage.x * paneCoverage.y);
    `);
  };
  windowMaterial.customProgramCacheKey = () => 'city-window-coverage-v1';

  const box = (parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, tint?: THREE.Color) => {
    const geometry = new THREE.BoxGeometry(...size);
    if (tint) {
      const normals = geometry.getAttribute('normal');
      const colors = new Float32Array(normals.count * 3);
      for (let vertex = 0; vertex < normals.count; vertex++) {
        const brightness = normals.getZ(vertex) > .5 ? 1 : normals.getX(vertex) < -.5 ? .83 : normals.getY(vertex) > .5 ? .64 : .73;
        colors.set([tint.r * brightness, tint.g * brightness, tint.b * brightness], vertex * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(position);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rod = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material = m.metal) => {
    const direction = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const windows = { positions: [] as number[], colors: [] as number[], uvs: [] as number[], shapes: [] as number[], roomColors: [] as number[] };
  const windowQuad = (center: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, width: number, height: number, transform: THREE.Matrix4, glassColor: THREE.Color, roomColor: THREE.Color, blind: number, occupied: boolean) => {
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
      const localX = x * (width + .095) / 2;
      const localY = y * (height + .10) / 2;
      const point = center.clone().addScaledVector(u, localX).addScaledVector(v, localY).applyMatrix4(transform);
      windows.positions.push(point.x, point.y, point.z);
      windows.colors.push(glassColor.r, glassColor.g, glassColor.b);
      windows.uvs.push(localX, localY);
      windows.shapes.push(width / 2, height / 2, height * (.5 - blind), occupied ? 1 : 0);
      windows.roomColors.push(roomColor.r, roomColor.g, roomColor.b);
    }
  };
  const faceWindows = (building: THREE.Group, spec: CityBuilding, center: THREE.Vector3, u: THREE.Vector3, width: number, side: number) => {
    const v = new THREE.Vector3(0, 1, 0);
    const normal = u.clone().cross(v);
    const near = spec.brick;
    const floorHeight = near ? 2.25 : 2.45;
    const floors = Math.max(2, Math.floor((spec.height - .65) / floorHeight));
    const columns = Math.max(2, Math.floor(width / (near ? 1.04 : 1.03)));
    const pitch = width / columns;
    const windowWidth = Math.min(near ? .64 : .70, pitch * .68);
    building.updateWorldMatrix(true, false);
    for (let floor = 0; floor < floors; floor++) for (let column = 0; column < columns; column++) {
      const seed = spec.seed + side * 23;
      const occupied = hash(column, floor, seed) > (near ? .48 : .61);
      const centerY = .92 + floor * floorHeight;
      const windowHeight = near ? 1.16 : 1.24 + .20 * (spec.seed % 2);
      const origin = center.clone().addScaledVector(u, (column + .5) * pitch - width / 2);
      origin.y = centerY;
      const blue = new THREE.Color(near ? '#253644' : '#2a3c4e').multiplyScalar(.62 + hash(column + 7, floor, seed) * .34);
      // The pane clears the opaque building face; depth bias also protects grazing views.
      const pane = origin.clone().addScaledVector(normal, .08);
      let light = blue;
      let blind = 0;
      if (occupied) {
        const cool = hash(column + 13, floor + 4, seed) > .79;
        light = new THREE.Color(cool ? '#a8bfce' : '#e2bc8a').multiplyScalar(.28 + .48 * hash(column + 29, floor + 11, seed));
        // Partial blinds, dark sashes and different room temperatures prevent a grid of identical lights.
        blind = hash(column + 3, floor + 17, seed) > .73 ? .34 : 0;
      }
      windowQuad(pane, u, v, windowWidth, windowHeight, building.matrixWorld, blue, light, blind, occupied);
      if (near && side === 0) {
        box(building, [windowWidth + .17, .065, .12], [origin.x, centerY - windowHeight / 2 - .043, origin.z + .055], concrete);
        if (floor > 0 && hash(column + 5, floor + 6, seed) > .88) {
          box(building, [.37, .27, .19], [origin.x, centerY - .44, origin.z + .106], concrete);
          for (let vent = 0; vent < 4; vent++) box(building, [.28, .018, .008], [origin.x, centerY - .51 + vent * .046, origin.z + .205], roof);
        }
      }
    }
  };

  const specs: CityBuilding[] = [
    { x: -9.15, z: -.9, width: 4.3, depth: 6.0, height: 9.2, brick: true, seed: 2 },
    { x: 9.35, z: -1.6, width: 4.2, depth: 6.6, height: 10.5, brick: true, seed: 7 },
    { x: -13.3, z: -9.8, width: 4.8, depth: 6.4, height: 13.2, brick: true, seed: 13 },
    { x: 13.6, z: -10.9, width: 5.0, depth: 7.0, height: 12.6, brick: true, seed: 17 },
    { x: -5.9, z: -19, width: 5.2, depth: 5.8, height: 11.4, yaw: .06, seed: 23 },
    { x: 4.6, z: -18.5, width: 5.0, depth: 6.6, height: 12.8, yaw: -.055, seed: 29 },
    { x: -19.9, z: -24, width: 5.4, depth: 7.1, height: 18.2, crown: true, seed: 31 },
    { x: 19.7, z: -24, width: 6.3, depth: 7.0, height: 17.8, seed: 37 },
    { x: -11.9, z: -30, width: 5.1, depth: 6.1, height: 24.5, crown: true, seed: 41 },
    { x: -.7, z: -30.5, width: 4.7, depth: 7.5, height: 20.3, seed: 43 },
    { x: 10.4, z: -32.4, width: 5.8, depth: 6.2, height: 26.4, crown: true, seed: 47 },
    { x: -29.5, z: -38, width: 7.0, depth: 8.4, height: 21.7, seed: 53 },
    { x: 29.3, z: -38, width: 6.8, depth: 8.0, height: 23.8, crown: true, seed: 59 },
    { x: -21.0, z: -44, width: 5.3, depth: 7.0, height: 28.0, crown: true, seed: 61 },
    { x: -5.9, z: -47, width: 5.2, depth: 6.3, height: 29.3, seed: 67 },
    { x: 5.9, z: -49, width: 5.7, depth: 8.0, height: 30.0, crown: true, seed: 71 },
    { x: 21.3, z: -47, width: 6.8, depth: 7.7, height: 25.0, seed: 73 },
    { x: -38.0, z: -56, width: 8.0, depth: 9.0, height: 23.0, crown: true, seed: 79 },
    { x: 38.0, z: -57, width: 8.2, depth: 8.8, height: 27.2, seed: 83 },
    { x: -13.9, z: -62, width: 7.2, depth: 8.7, height: 27.5, crown: true, seed: 89 },
    { x: 15.2, z: -65, width: 7.8, depth: 8.4, height: 28.1, seed: 97 },
    { x: -30.8, z: -72, width: 8.0, depth: 8.0, height: 25.0, seed: 101 },
    { x: -.8, z: -75, width: 7.7, depth: 8.7, height: 26.0, crown: true, seed: 103 },
    { x: 31.5, z: -74, width: 7.2, depth: 9.0, height: 24.0, seed: 107 },
  ];
  const nearBuildings: THREE.Group[] = [];
  for (const spec of specs) {
    const building = new THREE.Group();
    building.name = spec.brick ? 'Brick neighborhood midrise' : 'Distant city building';
    building.position.set(spec.x, -.01, spec.z);
    building.rotation.y = spec.yaw ?? 0;
    architecture.add(building);
    const tint = new THREE.Color(['#536575', '#475e70', '#65727a', '#4a5765'][spec.seed % 4]);
    const bodyMaterial = spec.brick ? brick : masonry;
    box(building, [spec.width, spec.height, spec.depth], [0, spec.height / 2, 0], bodyMaterial, spec.brick ? undefined : tint);
    box(building, [spec.width + .13, .20, spec.depth + .13], [0, spec.height + .03, 0], roof);
    box(building, [spec.width + .09, .15, spec.depth + .09], [0, .12, 0], concrete);
    if (spec.brick) {
      nearBuildings.push(building);
      for (let y = 2.17; y < spec.height - .2; y += 2.25) box(building, [spec.width + .045, .095, spec.depth + .045], [0, y, 0], concrete);
      for (const x of [-spec.width / 2 + .08, spec.width / 2 - .08]) box(building, [.10, spec.height, .06], [x, spec.height / 2, spec.depth / 2 + .026], concrete);
    } else {
      for (const x of [-spec.width / 2 + .10, spec.width / 2 - .10]) box(building, [.12, spec.height + .1, .10], [x, spec.height / 2, spec.depth / 2 + .025], concrete);
    }
    faceWindows(building, spec, new THREE.Vector3(0, 0, spec.depth / 2), new THREE.Vector3(1, 0, 0), spec.width, 0);
    faceWindows(building, spec, new THREE.Vector3(-spec.width / 2, 0, 0), new THREE.Vector3(0, 0, 1), spec.depth, 1);
    faceWindows(building, spec, new THREE.Vector3(spec.width / 2, 0, 0), new THREE.Vector3(0, 0, -1), spec.depth, 2);

    const plantX = (spec.seed % 2 ? 1 : -1) * spec.width * .16;
    box(building, [spec.width * .37, .80, spec.depth * .31], [plantX, spec.height + .51, -.35], concrete);
    box(building, [spec.width * .39, .10, spec.depth * .33], [plantX, spec.height + .96, -.35], roof);
    for (let vent = 0; vent < 3; vent++) box(building, [.07, .46, .035], [plantX - spec.width * .11 + vent * spec.width * .11, spec.height + .53, spec.depth * .155 - .329], roof);
    if (spec.crown) {
      const crownHeight = 1.6 + (spec.seed % 3) * .55;
      box(building, [spec.width * .61, crownHeight, spec.depth * .58], [0, spec.height + crownHeight / 2, -.24], masonry, tint.clone().multiplyScalar(.82));
      box(building, [spec.width * .64, .15, spec.depth * .61], [0, spec.height + crownHeight + .045, -.24], roof);
      rod(building, new THREE.Vector3(-.3, spec.height + crownHeight, -.25), new THREE.Vector3(-.3, spec.height + crownHeight + 1.3, -.25), .025, roof);
    }
  }

  // A fire escape and a roof tank give the close brick block an inhabited silhouette.
  const fireEscape = nearBuildings[0];
  for (let floor = 0; floor < 3; floor++) {
    const y = 2.22 + floor * 2.25, front = 3.0;
    box(fireEscape, [1.48, .06, .64], [.15, y, front + .30], m.metal);
    for (const x of [-.56, .86]) {
      rod(fireEscape, new THREE.Vector3(x, y, front + .59), new THREE.Vector3(x, y + .83, front + .59), .022);
      rod(fireEscape, new THREE.Vector3(x, y - .43, front + .018), new THREE.Vector3(x, y, front + .52), .022);
    }
    rod(fireEscape, new THREE.Vector3(-.56, y + .83, front + .59), new THREE.Vector3(.86, y + .83, front + .59), .024);
    for (let picket = 1; picket < 7; picket++) rod(fireEscape, new THREE.Vector3(-.56 + picket * .203, y + .04, front + .59), new THREE.Vector3(-.56 + picket * .203, y + .83, front + .59), .013);
    if (floor < 2) {
      const a = new THREE.Vector3(-.49, y + .035, front + .20), b = new THREE.Vector3(.79, y + 2.25, front + .20);
      for (let step = 0; step < 10; step++) {
        const point = a.clone().lerp(b, step / 9);
        box(fireEscape, [.20, .035, .38], point.toArray() as [number, number, number], m.metal);
      }
      rod(fireEscape, a.clone().add(new THREE.Vector3(0, 0, -.16)), b.clone().add(new THREE.Vector3(0, 0, -.16)), .025);
      rod(fireEscape, a.clone().add(new THREE.Vector3(0, .72, .20)), b.clone().add(new THREE.Vector3(0, .72, .20)), .023);
    }
  }
  const tankBuilding = nearBuildings[2];
  const tankHeight = specs[2].height;
  for (const x of [-.56, .56]) for (const z of [-.56, .56]) rod(tankBuilding, new THREE.Vector3(x - .7, tankHeight + .1, z), new THREE.Vector3(x * .85 - .7, tankHeight + 1.22, z * .85), .045);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(.79, .79, 1.43, 24), concrete);
  tank.position.set(-.7, tankHeight + 1.77, 0);
  tankBuilding.add(tank);
  const tankLid = new THREE.Mesh(new THREE.ConeGeometry(.85, .40, 24), roof);
  tankLid.position.set(-.7, tankHeight + 2.675, 0);
  tankBuilding.add(tankLid);
  for (const y of [tankHeight + 1.2, tankHeight + 2.26]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.797, .028, 5, 28), m.metal);
    band.rotation.x = Math.PI / 2;
    band.position.set(-.7, y, 0);
    tankBuilding.add(band);
  }
  box(nearBuildings[1], [3.16, .15, .86], [0, 2.12, 3.55], roof);
  for (const x of [-1.35, 1.35]) rod(nearBuildings[1], new THREE.Vector3(x, 2.12, 3.82), new THREE.Vector3(x, 2.70, 3.34), .027);

  // One batch per material; every facade window shares a single colored mesh.
  mapStudioSurfaces(architecture, new Map([[brick, { metres: 1 }]]));
  architecture.updateWorldMatrix(true, true);
  const batches = new Map<THREE.Material, { parts: THREE.BufferGeometry[]; originals: THREE.Mesh[] }>();
  architecture.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    let batch = batches.get(object.material);
    if (!batch) { batch = { parts: [], originals: [] }; batches.set(object.material, batch); }
    const part = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    part.applyMatrix4(object.matrixWorld);
    part.clearGroups();
    batch.parts.push(part);
    batch.originals.push(object);
  });
  for (const [material, batch] of batches) {
    const geometry = mergeGeometries(batch.parts, false);
    batch.parts.forEach(part => part.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    architecture.add(mesh);
    const originals = new Set(batch.originals.map(object => object.geometry));
    batch.originals.forEach(object => object.removeFromParent());
    originals.forEach(geometry => geometry.dispose());
  }
  const windowGeometry = new THREE.BufferGeometry();
  windowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(windows.positions, 3));
  windowGeometry.setAttribute('color', new THREE.Float32BufferAttribute(windows.colors, 3));
  windowGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(windows.uvs, 2));
  windowGeometry.setAttribute('windowShape', new THREE.Float32BufferAttribute(windows.shapes, 4));
  windowGeometry.setAttribute('roomColor', new THREE.Float32BufferAttribute(windows.roomColors, 3));
  const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
  windowMesh.name = 'City windows with integrated surrounds, glass and occupied rooms';
  architecture.add(windowMesh);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      zenith: { value: new THREE.Color('#071221') },
      horizon: { value: new THREE.Color('#354656') },
      lowerSky: { value: new THREE.Color('#131e2b') },
      cityGlow: { value: new THREE.Color('#7b7060') },
    },
    vertexShader: 'varying vec3 worldPosition; void main(){ vec4 world = modelMatrix * vec4(position,1.0); worldPosition = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }',
    fragmentShader: `
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 lowerSky; uniform vec3 cityGlow;
      varying vec3 worldPosition;
      void main(){
        vec3 direction = normalize(worldPosition - cameraPosition);
        float altitude = max(direction.y, 0.0);
        vec3 color = mix(horizon, zenith, smoothstep(0.0, .72, altitude));
        color = mix(lowerSky, color, smoothstep(-.22, .01, direction.y));
        float glow = pow(max(dot(direction, normalize(vec3(.12,.025,-1.0))),0.0),18.0);
        color += cityGlow * glow * .075 * (1.0 - smoothstep(.08,.35,altitude));
        gl_FragColor = vec4(color,1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sky.name = 'Deep navy sky with distant city radiance';
  sky.renderOrder = -1000;
  group.add(sky);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.05, 40), new THREE.MeshBasicMaterial({ color: '#c7c9bf', transparent: true, opacity: .72, depthWrite: false, fog: false, toneMapped: false }));
  moon.name = 'Quiet distant moon';
  moon.position.set(10, 58, -101);
  moon.lookAt(0, 4.2, 29);
  group.add(moon);
  const starDirections = [
    [-90, 80, -112], [-65, 55, -140], [-23, 68, -151], [15, 44, -160],
    [50, 71, -142], [82, 41, -129], [-115, 41, -112], [111, 78, -105],
    [-5, 107, -123], [60, 116, -95], [-67, 120, -75], [-142, 96, -47],
  ];
  const stars = new THREE.Points(new THREE.BufferGeometry().setFromPoints(starDirections.map(point => new THREE.Vector3(...point as [number, number, number]).normalize().multiplyScalar(165))), new THREE.PointsMaterial({ color: '#9eafbf', size: 1.15, sizeAttenuation: false, transparent: true, opacity: .47, depthWrite: false, fog: false, toneMapped: false }));
  stars.name = 'Sparse fixed night stars';
  group.add(stars);
  return { group, resources };
}
