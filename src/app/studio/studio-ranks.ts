import * as THREE from 'three';

export const STUDIO_RANKS_TITLE = 'Current Ranks (washed)';
export const STUDIO_RANKS = [
  { game: 'Brawlhalla', rank: '2100 elo', icon: '/room/ranks/brawlhalla.png', rankIcon: null },
  { game: 'Valorant', rank: 'Diamond', icon: '/room/ranks/valorant.png', rankIcon: '/room/ranks/valorant-diamond.png' },
  { game: 'Rainbow Six', rank: 'Plat', icon: '/room/ranks/rainbow-six.png', rankIcon: '/room/ranks/siege-platinum.webp' },
] as const;

/** An inset rank panel reuses the music corner's existing walnut wall frame. */
export function buildStudioRanks(
  texture: (path: string) => THREE.Texture,
  invalidate: () => void,
): { group: THREE.Group; resources: THREE.Texture[] } {
  const group = new THREE.Group();
  group.name = STUDIO_RANKS_TITLE;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1188;
  const context = canvas.getContext('2d')!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  let disposed = false;
  map.addEventListener('dispose', () => { disposed = true; });
  const centers = [360, 1024, 1688];
  const paint = (): void => {
    context.fillStyle = '#242522';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#f0e8dc';
    context.font = '600 110px Funnel, sans-serif';
    context.fillText(STUDIO_RANKS_TITLE, 1024, 185, 1850);
    STUDIO_RANKS.forEach((entry, index) => {
      context.fillStyle = '#c7bbab';
      context.font = '500 62px Atkinson, sans-serif';
      context.fillText(entry.game, centers[index], 770, 590);
      context.fillStyle = '#f0e8dc';
      context.font = '700 104px Atkinson, sans-serif';
      if (!entry.rankIcon) context.fillText(entry.rank, centers[index], 940, 590);
    });
    map.needsUpdate = true;
  };
  paint();
  // Canvas text does not automatically repaint when the site's fonts finish loading.
  void Promise.all([
    document.fonts.load('600 110px Funnel'),
    document.fonts.load('500 62px Atkinson'),
    document.fonts.load('700 104px Atkinson'),
  ]).then(() => { if (!disposed) { paint(); invalidate(); } }).catch(() => undefined);

  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.50, .87), new THREE.MeshStandardMaterial({
    map, roughness: .9, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .22,
  }));
  face.name = 'Current ranks printed sign';
  face.position.z = .003;
  group.add(face);

  const addIcon = (file: string, name: string, x: number, y: number, size: number): void => {
    const iconMap = texture(file);
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({
      map: iconMap, transparent: true, alphaTest: .02, roughness: .9,
      emissiveMap: iconMap, emissive: '#ffffff', emissiveIntensity: .22,
    }));
    icon.name = name;
    icon.position.set(x, (.5 - y / 1188) * .87, .005);
    group.add(icon);
  };
  STUDIO_RANKS.forEach((entry, index) => {
    const center = (centers[index] / 2048 - .5) * 1.50;
    addIcon(entry.icon, `${entry.game} — ${entry.rank}`, center, 510, .22);
    if (entry.rankIcon) addIcon(entry.rankIcon, `${entry.game} ${entry.rank} rank badge`, center, 940, .16);
  });

  return { group, resources: [map] };
}
