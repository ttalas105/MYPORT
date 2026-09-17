import * as THREE from 'three';
import { RoundedBoxGeometry } from './studio-geometry';
import type { StudioMaterials } from './studio-furniture';

export const STUDIO_TV = {
  width: 2.2,
  height: 2.2 * 9 / 16,
  videoId: 'l3zQNgXdmj0',
  title: 'Thorfinn vs Snake | VINLAND SAGA SEASON 2',
  url: 'https://www.youtube.com/watch?v=l3zQNgXdmj0',
} as const;

/** A wall-mounted television in the former right-side lounge. */
export function buildStudioTelevision(materials: StudioMaterials): {
  group: THREE.Group;
  screen: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
} {
  const group = new THREE.Group();
  group.name = 'Right-wall Vinland Saga television';
  group.position.set(4.30, 1.78, 2.05);
  group.rotation.y = -Math.PI / 2;
  const shell = new THREE.MeshStandardMaterial({ color: '#1d2022', roughness: .43, metalness: .45 });
  const box = (width: number, height: number, depth: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, Math.min(.012, depth / 3)), material);
    mesh.position.z = z;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  box(.62, .32, .075, -.071, materials.metal).name = 'TV wall bracket';
  box(2.29, 1.33, .065, 0, shell).name = 'Television housing';
  box(2.235, 1.273, .018, .038, materials.rubber).name = 'Inset TV bezel';
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(STUDIO_TV.width, STUDIO_TV.height),
    new THREE.MeshBasicMaterial({ color: '#090c0f' }));
  screen.name = 'Vinland Saga television screen';
  screen.position.z = .049;
  group.add(screen);
  const indicator = new THREE.Mesh(new THREE.SphereGeometry(.0035, 8, 6), new THREE.MeshBasicMaterial({ color: '#c7d2c5' }));
  indicator.position.set(.99, -.645, .035);
  group.add(indicator);
  const light = new THREE.RectAreaLight(0xc6d4ed, .8, STUDIO_TV.width, STUDIO_TV.height);
  light.position.z = .12;
  light.rotation.y = Math.PI;
  group.add(light);
  group.updateWorldMatrix(true, true);
  return { group, screen };
}
