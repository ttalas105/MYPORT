import * as THREE from 'three';

export interface StudioAlbumView {
  position: THREE.Vector3;
  target: THREE.Vector3;
  normal: THREE.Vector3;
  anchors: THREE.Vector3[];
  fov: number;
  readerLeft: number;
  offsetX: number;
  offsetY: number;
}

/** Frame a cover with its compact note, independently of project readers. */
export function studioAlbumView(
  art: THREE.Mesh, frameSize: number, width: number, height: number,
  _viewportWidth: number, rem: number,
): StudioAlbumView {
  art.updateWorldMatrix(true, false);
  const target = art.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(art.matrixWorld));
  const anchors = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y]) =>
    new THREE.Vector3(x * frameSize / 2, y * frameSize / 2, 0).applyMatrix4(art.matrixWorld));
  const physicalSize = Math.max(anchors[0].distanceTo(anchors[1]), anchors[0].distanceTo(anchors[2]));
  const mobile = width < 761;
  const baseFov = 40;
  const gap = 24;
  const inset = Math.max(24, rem * 1.5);
  const noteWidth = 18 * rem;
  // Reserve the note's usual height and the larger phone safe-area inset.
  const mobileNoteTop = height - 220 - Math.max(2 * rem, (height - 36 * rem) / 2, rem + 34);
  const mobileTop = Math.max(72, rem * 4.5);
  const coverPixels = Math.max(24, mobile
    ? Math.min(height * .40, width * .80, mobileNoteTop - gap - mobileTop)
    : Math.min(height * .62, width - 2 * inset - noteWidth - gap));
  const fraction = coverPixels / height;
  const distance = physicalSize / (2 * Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) * fraction);
  const position = target.clone().addScaledVector(normal, distance);
  // The seven records face into the room. These bounds also keep a narrow
  // viewport from placing a future close-up outside the architecture.
  position.clamp(new THREE.Vector3(-4.15, .18, -3.85), new THREE.Vector3(4.15, 3.18, 3.85));
  const camera = new THREE.PerspectiveCamera(baseFov, width / height, .045, 45);
  camera.position.copy(position);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const projected = anchors.map(point => point.clone().project(camera));
  const actualPixels = Math.max(
    (Math.max(...projected.map(point => point.x)) - Math.min(...projected.map(point => point.x))) * width / 2,
    (Math.max(...projected.map(point => point.y)) - Math.min(...projected.map(point => point.y))) * height / 2,
  );
  // If room bounds shorten the approach, widen the lens instead of clipping art.
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) * actualPixels / coverPixels));
  const centerY = mobile ? THREE.MathUtils.clamp(height * .34,
    mobileTop + coverPixels / 2, mobileNoteTop - gap - coverPixels / 2) : height / 2;
  const offsetX = mobile ? 0 : (noteWidth + gap) / (2 * width);
  const offsetY = mobile ? .5 - centerY / height : 0;
  camera.fov = fov;
  camera.setViewOffset(width, height, width * offsetX, height * offsetY, width, height);
  camera.updateProjectionMatrix();
  const right = (Math.max(...anchors.map(point => point.clone().project(camera).x)) + 1) * width / 2;
  const readerLeft = mobile ? (width - Math.min(noteWidth, width - 32)) / 2 : right + gap;
  return { position, target, normal, anchors, fov, readerLeft, offsetX, offsetY };
}
