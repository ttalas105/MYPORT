import * as THREE from 'three';

/** Project each original box face in metres, keeping its bevels on one UV chart. */
export function mapStudioSurfaces(root: THREE.Object3D, surfaces: Map<THREE.Material, { metres: number; grain?: boolean }>): void {
  const mapped = new Set<THREE.BufferGeometry>();
  const worldScale = new THREE.Vector3();
  root.updateWorldMatrix(true, true);
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const surface = surfaces.get(object.material);
    if (!surface || !Number.isFinite(surface.metres) || surface.metres <= 0) return;
    const geometry = object.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    if (!position || !uv || mapped.has(geometry)) return;

    // RoundedBoxGeometry retains BoxGeometry's six original face groups.
    // Smoothed vertex normals cannot identify those source faces:
    // switching projection at a bevel stretches whole tiles across millimetres.
    const box = geometry.type === 'BoxGeometry' || geometry.type === 'RoundedBoxGeometry';
    if (!box || geometry.groups.length !== 6 ||
      !geometry.groups.every((group, face) => group.materialIndex === face)) return;

    // Merged furniture no longer carries the original face boundaries. Leave
    // its authored UVs intact; metre scaling must happen before that merge.
    geometry.computeBoundingBox();
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    object.getWorldScale(worldScale);
    size.multiply(worldScale.set(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z)));
    const axes: [number, number][] = [
      [2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1],
    ];
    const coordinate = (vertex: number, axis: number): number =>
      (axis === 0 ? position.getX(vertex) : axis === 1 ? position.getY(vertex) : position.getZ(vertex)) * worldScale.getComponent(axis);
    const index = geometry.getIndex();
    const visited = new Uint8Array(uv.count);
    geometry.groups.forEach((group, face) => {
      const [uAxis, vAxis] = axes[face];
      const rotate = surface.grain && size.getComponent(vAxis) > size.getComponent(uAxis);
      for (let offset = group.start; offset < group.start + group.count; offset++) {
        const vertex = index ? index.getX(offset) : offset;
        if (visited[vertex]) continue;
        const u = coordinate(vertex, uAxis), v = coordinate(vertex, vAxis);
        uv.setXY(vertex,
          (rotate ? v : u) / surface.metres,
          (rotate ? -u : v) / surface.metres);
        visited[vertex] = 1;
      }
    });
    uv.needsUpdate = true;
    mapped.add(geometry);
  });
}
