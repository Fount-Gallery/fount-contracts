import * as THREE from 'three';

// Shared 4-step toon gradient — gives crisp banded shading on characters.
let _gradient = null;
export function getToonGradient() {
  if (_gradient) return _gradient;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 1;
  const g = c.getContext('2d');
  g.fillStyle = '#404040'; g.fillRect(0, 0, 1, 1);
  g.fillStyle = '#808080'; g.fillRect(1, 0, 1, 1);
  g.fillStyle = '#c0c0c0'; g.fillRect(2, 0, 1, 1);
  g.fillStyle = '#ffffff'; g.fillRect(3, 0, 1, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  _gradient = tex;
  return tex;
}

export function toon(colorHex) {
  return new THREE.MeshToonMaterial({
    color: colorHex,
    gradientMap: getToonGradient(),
  });
}

const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: 0x07050d,
  side: THREE.BackSide,
});

// Inverted-hull outline. Attached as a child of `mesh`, so any
// transform applied to the mesh (incl. animation) propagates to the outline.
export function addOutline(mesh, thickness = 0.06) {
  const outline = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  outline.scale.setScalar(1 + thickness);
  outline.castShadow = false;
  outline.receiveShadow = false;
  mesh.add(outline);
  return outline;
}
