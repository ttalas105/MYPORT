import { RoundedBoxGeometry as ThreeRoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Rounded boxes with unit-cube normals, real dimensions, and stable metre UVs. */
export class RoundedBoxGeometry extends ThreeRoundedBoxGeometry {
  override readonly type = 'RoundedBoxGeometry';
  get radius(): number {
    return (this.parameters as typeof this.parameters & { radius: number }).radius;
  }

  constructor(width = 1, height = 1, depth = 1, segments = 2, radius = .1) {
    if (![width, height, depth].every(value => Number.isFinite(value) && value > 0)) {
      throw new RangeError('Rounded box dimensions must be finite and positive.');
    }
    const detail = Number.isFinite(segments) ? Math.max(0, Math.floor(segments)) : 2;
    const requestedRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0;
    const effectiveRadius = detail > 0 ? Math.min(requestedRadius, width / 2, height / 2, depth / 2) : 0;

    // The installed addon computes corner normals assuming a unit cube. Passing
    // non-unit dimensions into it bends the flat faces and collapses thin boxes.
    // Its unit geometry supplies the correct normals and original face groups.
    super(1, 1, 1, effectiveRadius > 0 ? detail : 0, .1);
    Object.assign(this.parameters, { width, height, depth, radius: effectiveRadius, segments: detail });

    const position = this.getAttribute('position');
    const normal = this.getAttribute('normal');
    const uv = this.getAttribute('uv');
    const coreX = width / 2 - effectiveRadius;
    const coreY = height / 2 - effectiveRadius;
    const coreZ = depth / 2 - effectiveRadius;
    for (let vertex = 0; vertex < position.count; vertex++) {
      position.setXYZ(vertex,
        coreX * Math.sign(position.getX(vertex)) + normal.getX(vertex) * effectiveRadius,
        coreY * Math.sign(position.getY(vertex)) + normal.getY(vertex) * effectiveRadius,
        coreZ * Math.sign(position.getZ(vertex)) + normal.getZ(vertex) * effectiveRadius);
    }

    // Each chart stays on its original face, including its curved edge strip.
    // One UV unit is one metre; mapStudioSurfaces can apply a material's tile
    // scale and grain orientation later. Batching can safely preserve these UVs.
    const axes: [number, number][] = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]];
    const coordinate = (vertex: number, axis: number): number =>
      axis === 0 ? position.getX(vertex) : axis === 1 ? position.getY(vertex) : position.getZ(vertex);
    const index = this.getIndex();
    const visited = new Uint8Array(position.count);
    this.groups.forEach((group, face) => {
      const [uAxis, vAxis] = axes[face];
      for (let offset = group.start; offset < group.start + group.count; offset++) {
        const vertex = index ? index.getX(offset) : offset;
        if (visited[vertex]) continue;
        uv.setXY(vertex, coordinate(vertex, uAxis), coordinate(vertex, vAxis));
        visited[vertex] = 1;
      }
    });
    position.needsUpdate = true;
    uv.needsUpdate = true;
    this.userData['studioUvMetres'] = 1;
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
}
