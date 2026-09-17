import * as THREE from 'three';
import type { StudioMaterials, StudioProjectTarget } from './studio-furniture';

/** A walnut studio clock on the left wall; its face opens the Automations project. */
export function buildStudioClock(materials: StudioMaterials, repaint: () => void): {
  group: THREE.Group;
  movingRoots: THREE.Group[];
  projectTarget: StudioProjectTarget;
  readerAnchors: THREE.Vector3[];
  resources: THREE.Texture[];
  update(time: number): void;
} {
  const group = new THREE.Group();
  group.name = 'Automations — left wall clock';
  group.position.set(-4.31, 2.25, -2.25);
  group.rotation.y = Math.PI / 2;

  const cylinder = (radius: number, depth: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 64), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = z;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const clockCase = cylinder(.47, .10, 0, materials.walnut);
  clockCase.name = 'Walnut clock case';
  cylinder(.434, .012, .055, materials.metal);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(.443, .012, 10, 80), materials.brass);
  bezel.position.z = .069;
  bezel.name = 'Brass clock bezel';
  group.add(bezel);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  let disposed = false;
  map.addEventListener('dispose', () => { disposed = true; });
  const paint = () => {
    ctx.fillStyle = '#ece4d4';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.save();
    ctx.translate(512, 512);
    for (let tick = 0; tick < 60; tick++) {
      ctx.save();
      ctx.rotate(tick * Math.PI / 30);
      ctx.fillStyle = tick % 5 === 0 ? '#34312d' : '#9b9080';
      const width = tick % 5 === 0 ? 9 : 3;
      ctx.fillRect(-width / 2, -462, width, tick % 5 === 0 ? 36 : 17);
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = '#34312d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 80px Funnel, sans-serif';
    for (const [label, x, y] of [['12', 512, 160], ['3', 866, 515], ['6', 512, 866], ['9', 158, 515]] as const)
      ctx.fillText(label, x, y);
    ctx.font = '500 37px Funnel, sans-serif';
    ctx.fillText('AUTOMATIONS', 512, 335);
    ctx.fillStyle = '#756957';
    ctx.font = '24px Atkinson, sans-serif';
    ctx.fillText('NORTH GROUP', 512, 706);
    map.needsUpdate = true;
  };
  paint();
  void document.fonts.ready.then(() => { if (!disposed) { paint(); repaint(); } });
  const face = new THREE.Mesh(new THREE.CircleGeometry(.426, 80), new THREE.MeshStandardMaterial({
    map, roughness: .88, emissive: '#e8dbc6', emissiveIntensity: .045,
  }));
  face.name = 'Automations clock dial';
  face.position.z = .067;
  group.add(face);

  const ink = new THREE.MeshStandardMaterial({ color: '#292a28', roughness: .58, metalness: .15 });
  const secondMaterial = new THREE.MeshStandardMaterial({ color: '#98563d', roughness: .5, metalness: .3 });
  const hand = (name: string, length: number, width: number, z: number, material: THREE.Material) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.z = z;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, .007), material);
    mesh.position.y = length / 2 - .052;
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  };
  const hours = hand('Clock hour hand', .26, .024, .081, ink);
  const minutes = hand('Clock minute hand', .37, .014, .091, ink);
  const seconds = hand('Clock second hand', .425, .005, .101, secondMaterial);
  cylinder(.023, .017, .11, materials.brass).name = 'Clock hand pin';

  // A circular hit surface ahead of the hands lets the existing visibility pass
  // test the whole clock without its own hands blocking the center ray.
  const probe = new THREE.Mesh(new THREE.CircleGeometry(.47, 64), new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false,
  }));
  probe.name = 'Automations clock interaction surface';
  probe.position.z = .13;
  group.add(probe);
  group.updateWorldMatrix(true, true);
  // Project the visible case rim, not the forward visibility probe. Sharing the
  // probe's depth makes the highlight float off the clock at oblique angles.
  const rimRadius = clockCase.geometry.parameters.radiusTop;
  const rimDepth = clockCase.position.z + clockCase.geometry.parameters.height / 2;
  const outline = Array.from({ length: 32 }, (_, i) => {
    const angle = i / 32 * Math.PI * 2;
    return group.localToWorld(new THREE.Vector3(Math.cos(angle) * rimRadius, Math.sin(angle) * rimRadius, rimDepth));
  });
  const readerAnchors = [-.47, .47].flatMap(x => [-.47, .47].flatMap(y =>
    [-.05, .13].map(z => group.localToWorld(new THREE.Vector3(x, y, z)))));
  const update = (time: number) => {
    const date = new Date(time);
    const second = date.getSeconds() + date.getMilliseconds() / 1000;
    const minute = date.getMinutes() + second / 60;
    hours.rotation.z = -(date.getHours() % 12 + minute / 60) * Math.PI / 6;
    minutes.rotation.z = -minute * Math.PI / 30;
    seconds.rotation.z = -second * Math.PI / 30;
  };
  update(Date.now());
  return {
    group, movingRoots: [hours, minutes, seconds], readerAnchors, resources: [map], update,
    projectTarget: { probe, anchors: outline, target: probe.getWorldPosition(new THREE.Vector3()), normal: new THREE.Vector3(1, 0, 0) },
  };
}
