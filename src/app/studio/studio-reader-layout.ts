import * as THREE from 'three';

interface ReaderView {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/** Keep a reader beside its physical object, regardless of the viewport's width. */
export function studioReaderLayout(
  view: ReaderView, anchors: THREE.Vector3[], width: number, height: number,
  viewportWidth: number, rem: number, onLeft: boolean,
): { left: number; fov: number } {
  const readerWidth = Math.min(35 * rem, Math.max(23 * rem, viewportWidth * .44));
  const inset = Math.min(5 * rem, Math.max(1.5 * rem, viewportWidth * .04));
  // The 18px speech pointer occupies part of this gap.
  const gap = 2 * rem;
  const offset = onLeft ? -.24 : .24;
  const center = width * (.5 - offset);
  const camera = new THREE.PerspectiveCamera(view.fov, width / height, .045, 45);
  camera.position.copy(view.position);
  camera.lookAt(view.target);
  camera.setViewOffset(width, height, width * offset, 0, width, height);
  camera.updateMatrixWorld();
  const edges = () => {
    const xs = anchors.map(point => (point.clone().project(camera).x + 1) * width / 2);
    return { left: Math.min(...xs), right: Math.max(...xs) };
  };
  const initial = edges();
  const availableLeft = onLeft ? inset + readerWidth + gap : inset;
  const availableRight = onLeft ? width - inset : width - inset - readerWidth - gap;
  const scale = Math.max(.01, Math.min(1,
    initial.left < center ? (center - availableLeft) / (center - initial.left) : 1,
    initial.right > center ? (availableRight - center) / (initial.right - center) : 1,
  ));
  camera.fov = Math.min(120, THREE.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(view.fov) / 2) / scale),
  ));
  camera.updateProjectionMatrix();
  const fitted = edges();
  const left = onLeft ? fitted.left - gap - readerWidth : fitted.right + gap;
  return {
    left: THREE.MathUtils.clamp(left, inset, width - readerWidth - inset),
    fov: camera.fov,
  };
}
