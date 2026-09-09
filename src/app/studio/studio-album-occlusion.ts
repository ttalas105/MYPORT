import * as THREE from 'three';

interface Occluder {
  mesh: THREE.Mesh;
  bounds: THREE.Box3;
  dynamic: boolean;
}

/** Exact sleeve visibility with a cheap bounds pass over just the interior. */
export class StudioAlbumOcclusion {
  private readonly occluders: Occluder[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly direction = new THREE.Vector3();
  private readonly boundsHit = new THREE.Vector3();
  private readonly hits: THREE.Intersection[] = [];

  constructor(roots: THREE.Object3D[], private readonly movingRoots: THREE.Object3D[] = []) {
    const moving = new Set<THREE.Object3D>();
    movingRoots.forEach(root => root.traverse(object => moving.add(object)));
    roots.forEach(root => {
      root.updateWorldMatrix(true, true);
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some(material => this.blocks(material))) return;
        // Mesh.raycast uses this local box before testing triangles as well.
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const entry = { mesh: object, bounds: new THREE.Box3(), dynamic: moving.has(object) };
        this.updateBounds(entry);
        this.occluders.push(entry);
      });
    });
  }

  /** Only the door and platter move; static furniture never needs re-indexing. */
  refreshMovingBounds(): void {
    this.movingRoots.forEach(root => root.updateWorldMatrix(true, true));
    this.occluders.forEach(entry => { if (entry.dynamic) this.updateBounds(entry); });
  }

  isUnoccluded(art: THREE.Mesh, center: THREE.Vector3, cameraPosition: THREE.Vector3): boolean {
    if (!this.isVisible(art)) return false;
    const distance = this.direction.subVectors(center, cameraPosition).length();
    this.raycaster.set(cameraPosition, this.direction.normalize());
    this.raycaster.near = .02;
    this.raycaster.far = distance + .015;
    this.hits.length = 0;
    art.raycast(this.raycaster, this.hits);
    let artDistance = Infinity;
    for (const hit of this.hits) if (this.hitBlocks(hit)) artDistance = Math.min(artDistance, hit.distance);
    if (!Number.isFinite(artDistance)) return false;
    this.raycaster.far = artDistance;

    for (const entry of this.occluders) {
      const mesh = entry.mesh;
      if (mesh === art || !this.isVisible(mesh)) continue;
      // A ray starting inside a bounds box must still check its contents.
      if (!entry.bounds.containsPoint(cameraPosition)) {
        const point = this.raycaster.ray.intersectBox(entry.bounds, this.boundsHit);
        if (!point || cameraPosition.distanceToSquared(point) > artDistance * artDistance) continue;
      }
      this.hits.length = 0;
      mesh.raycast(this.raycaster, this.hits);
      if (this.hits.some(hit => hit.distance < artDistance - 1e-6 && this.hitBlocks(hit))) return false;
    }
    return true;
  }

  private updateBounds(entry: Occluder): void {
    const mesh = entry.mesh;
    // Instance transforms extend beyond the base geometry (e.g. keyboard keys).
    if (mesh instanceof THREE.InstancedMesh) {
      if (!mesh.boundingBox) mesh.computeBoundingBox();
      entry.bounds.copy(mesh.boundingBox!);
    } else entry.bounds.copy(mesh.geometry.boundingBox!);
    entry.bounds.applyMatrix4(mesh.matrixWorld);
  }

  private isVisible(mesh: THREE.Mesh): boolean {
    if (!mesh.layers.test(this.raycaster.layers)) return false;
    for (let object: THREE.Object3D | null = mesh; object; object = object.parent) if (!object.visible) return false;
    return true;
  }

  private hitBlocks(hit: THREE.Intersection): boolean {
    const mesh = hit.object as THREE.Mesh;
    const material = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material;
    return this.blocks(material);
  }

  private blocks(material: THREE.Material): boolean {
    return material.visible && !(material.transparent && material.opacity < .85) &&
      !(material instanceof THREE.MeshPhysicalMaterial && material.transmission > .2);
  }
}
