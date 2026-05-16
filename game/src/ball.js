import * as THREE from 'three';
import { BALL_RADIUS, BALL_START } from './scene.js';

export function createBall(scene) {
  const tex = makeBallTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.4,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 48, 32), mat);
  mesh.castShadow = true;
  mesh.position.copy(BALL_START);
  scene.add(mesh);

  // Soft contact shadow under ball for grounded feel even when shadow map misses
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_RADIUS * 1.2, 24), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.005, 0);
  scene.add(shadow);

  return { mesh, shadow };
}

function makeBallTexture() {
  // Classic black-and-white pentagon-ish soccer ball pattern via canvas.
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f6f6f6';
  g.fillRect(0, 0, 512, 256);

  g.fillStyle = '#15151a';
  // Pentagons arranged in a grid (visually plausible, not topologically perfect)
  const cols = 6, rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      const x = (cc + (r % 2) * 0.5) * (512 / cols);
      const y = r * (256 / rows) + 32;
      pentagon(g, x, y, 22 + Math.random() * 4);
    }
  }

  // Subtle dirt/scuff
  g.globalAlpha = 0.06;
  g.fillStyle = '#000';
  for (let i = 0; i < 200; i++) {
    g.beginPath();
    g.arc(Math.random() * 512, Math.random() * 256, Math.random() * 1.4, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function pentagon(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
}
