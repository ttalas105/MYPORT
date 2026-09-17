import * as THREE from 'three';
import { STUDIO_TV } from './studio-television';

type Point = [number, number];

function hull(points: Point[]): Point[] {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const lower: Point[] = [], upper: Point[] = [];
  for (const point of points) {
    while (lower.length > 1 && turn(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];
    while (upper.length > 1 && turn(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

/** Project fixed furniture onto the TV plane, revealing the WebGL objects in front. */
export class StudioTvForeground {
  private readonly worldToScreen: THREE.Matrix4;
  private readonly parts: THREE.Vector3[][];
  private readonly eye = new THREE.Vector3();

  constructor(screen: THREE.Mesh, silhouettes: THREE.Vector3[][]) {
    screen.updateWorldMatrix(true, false);
    this.worldToScreen = screen.matrixWorld.clone().invert();
    this.parts = silhouettes.map(part => part.map(point => point.clone().applyMatrix4(this.worldToScreen)));
  }

  mask(camera: THREE.Camera): string {
    this.eye.copy(camera.position).applyMatrix4(this.worldToScreen);
    const eye = this.eye;
    if (eye.z <= .01) return 'none';
    const polygons: string[] = [];
    for (const part of this.parts) {
      const projected: Point[] = [];
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const point of part) {
        // Geometry behind the TV or behind the viewer cannot cover the video.
        if (point.z <= 0 || point.z >= eye.z - .01) continue;
        const t = eye.z / (eye.z - point.z);
        const x = ((eye.x + (point.x - eye.x) * t) / STUDIO_TV.width + .5) * 960;
        const y = (.5 - (eye.y + (point.y - eye.y) * t) / STUDIO_TV.height) * 540;
        projected.push([x, y]);
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (projected.length < 3 || right < 0 || left > 960 || bottom < 0 || top > 540) continue;
      polygons.push(`<polygon points="${hull(projected).map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}"/>`);
    }
    if (!polygons.length) return 'none';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><defs><mask id="foreground"><rect width="960" height="540" fill="white"/><g fill="black">${polygons.join('')}</g></mask></defs><rect width="960" height="540" fill="white" mask="url(#foreground)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
}
