import * as THREE from 'three';

const files: Record<string, string> = {
  earth: 'earth.png', mars: 'mars.jpg', mercury: 'mercury.jpg', venus: 'venus.jpg',
  jupiter: 'jupiter.jpg', europa: 'europa.jpg', saturn: 'saturn.jpg', titan: 'titan.jpg',
};

/** Local presentation textures; the maps are not used as scientific observations. */
export function loadPlanetTexture(id: string): THREE.Texture | null {
  const file = files[id];
  if (!file) return null;
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/${file}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
