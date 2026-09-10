import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Combine nearby opaque parts without absorbing animated or interactive objects. */
export function batchStaticStudio(root: THREE.Group, keep: ReadonlySet<THREE.Object3D>): void {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>();
  const local = new THREE.Matrix4();
  const center = new THREE.Vector3();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh ||
        object.children.length || Array.isArray(object.material) || object.material.transparent || object.geometry.morphAttributes.position) return;
    for (let parent: THREE.Object3D | null = object; parent && parent !== root; parent = parent.parent) {
      if (keep.has(parent) || !parent.visible) return;
    }
    local.multiplyMatrices(inverse, object.matrixWorld);
    if (local.determinant() <= 0) return;
    center.setFromMatrixPosition(local);
    // Small spatial batches retain useful frustum and album-occlusion bounds.
    const cell = [center.x, center.y, center.z].map(value => Math.floor(value / 2)).join(',');
    const attributes = Object.keys(object.geometry.attributes).sort().map(name => {
      const value = object.geometry.getAttribute(name) as THREE.BufferAttribute;
      return `${name}:${value.itemSize}:${value.normalized}`;
    }).join(',');
    const key = `${cell}:${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}:${object.layers.mask}:${attributes}`;
    const batch = batches.get(key) ?? [];
    batch.push(object);
    batches.set(key, batch);
  });
  const retired = new Set<THREE.BufferGeometry>();
  for (const originals of batches.values()) {
    if (originals.length < 2) continue;
    const parts = originals.map(object => {
      const part = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      part.applyMatrix4(local.multiplyMatrices(inverse, object.matrixWorld));
      part.clearGroups();
      return part;
    });
    const geometry = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const first = originals[0];
    const mesh = new THREE.Mesh(geometry, first.material);
    mesh.name = 'Static studio batch';
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.renderOrder = first.renderOrder;
    mesh.layers.mask = first.layers.mask;
    root.add(mesh);
    originals.forEach(object => { retired.add(object.geometry); object.removeFromParent(); });
  }
  // Geometry can be shared with a retained interactive object or another assembly.
  let owner: THREE.Object3D = root;
  while (owner.parent) owner = owner.parent;
  owner.traverse(object => { if (object instanceof THREE.Mesh) retired.delete(object.geometry); });
  retired.forEach(geometry => geometry.dispose());
}

/** Static transforms are authored once; only the door, platter and neon update each frame. */
export function freezeStudioTransforms(scene: THREE.Scene, moving: ReadonlySet<THREE.Object3D>): void {
  scene.updateMatrixWorld(true);
  const freeze = (object: THREE.Object3D): void => {
    if (moving.has(object)) return;
    object.matrixAutoUpdate = false;
    object.children.forEach(freeze);
  };
  freeze(scene);
}
