import * as THREE from 'three';

const SKIN     = 0x6e3e26;  // darker tone reads better in silhouette
const SHIRT    = 0xe63a3a;
const SHIRT_T  = 0xffc857;
const SHORTS   = 0xb02a2a;
const SOCKS    = 0x1a0808;
const HAIR     = 0x1a0e08;

export function createStriker(scene) {
  const group = new THREE.Group();

  const matSkin   = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.85 });
  const matShirt  = new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.6, emissive: 0x3a0808 });
  const matShorts = new THREE.MeshStandardMaterial({ color: SHORTS, roughness: 0.8 });
  const matSocks  = new THREE.MeshStandardMaterial({ color: SOCKS, roughness: 0.9 });
  const matHair   = new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.95 });
  const matTrim   = new THREE.MeshStandardMaterial({ color: SHIRT_T, roughness: 0.55 });

  // Torso — slightly taller for adult-striker proportions
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.6, 6, 14), matShirt);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  // Number "10" on the back — flat plane behind torso
  const numTex = makeNumberTexture('10');
  const numMat = new THREE.MeshStandardMaterial({
    map: numTex,
    transparent: true,
    roughness: 0.6,
    emissive: 0xffc857,
    emissiveMap: numTex,
    emissiveIntensity: 0.4,
  });
  const numberPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), numMat);
  numberPlane.position.set(0, 1.18, -0.31);
  numberPlane.rotation.y = Math.PI;
  group.add(numberPlane);

  // Shoulder trim — small gold strip on each shoulder
  for (const side of [-1, 1]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.3), matTrim);
    trim.position.set(side * 0.28, 1.35, 0);
    group.add(trim);
  }

  // Head + hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), matSkin);
  head.position.y = 1.65;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7), matHair);
  hair.position.y = 1.65;
  hair.rotation.x = -0.15;
  group.add(hair);

  // Arms at sides, very slightly forward (relaxed pose)
  const armGeom = new THREE.CapsuleGeometry(0.08, 0.55, 4, 8);
  const armL = new THREE.Mesh(armGeom, matShirt);
  const armR = new THREE.Mesh(armGeom, matShirt);
  armL.position.set(-0.36, 1.05, 0.03);
  armR.position.set(0.36, 1.05, 0.03);
  armL.rotation.z = 0.06;
  armR.rotation.z = -0.06;
  armL.castShadow = armR.castShadow = true;
  group.add(armL, armR);

  // Hands (darker than gloves — bare hands)
  const handGeom = new THREE.SphereGeometry(0.085, 12, 8);
  const handL = new THREE.Mesh(handGeom, matSkin);
  const handR = new THREE.Mesh(handGeom, matSkin);
  handL.position.set(-0.38, 0.74, 0.05);
  handR.position.set(0.38, 0.74, 0.05);
  group.add(handL, handR);

  // Legs: shorts (thigh) + socks
  const thighGeom = new THREE.CapsuleGeometry(0.13, 0.32, 4, 8);
  const thighL = new THREE.Mesh(thighGeom, matShorts);
  const thighR = new THREE.Mesh(thighGeom, matShorts);
  thighL.position.set(-0.15, 0.55, 0);
  thighR.position.set(0.15, 0.55, 0);
  thighL.castShadow = thighR.castShadow = true;
  group.add(thighL, thighR);

  const sockGeom = new THREE.CapsuleGeometry(0.11, 0.32, 4, 8);
  const sockL = new THREE.Mesh(sockGeom, matSocks);
  const sockR = new THREE.Mesh(sockGeom, matSocks);
  sockL.position.set(-0.15, 0.2, 0);
  sockR.position.set(0.15, 0.2, 0);
  sockL.castShadow = sockR.castShadow = true;
  group.add(sockL, sockR);

  // Position: slightly off-center, back to camera. The goal stays visible
  // over the striker's right shoulder. Scaled down a touch so they read
  // as a foreground element, not a wall.
  group.position.set(-0.25, 0, 1.7);
  group.rotation.y = Math.PI - 0.04;
  group.scale.setScalar(0.95);
  scene.add(group);

  return {
    group,
    torso, head, armL, armR, thighL, thighR,
  };
}

export function updateStriker(striker, time) {
  const t = time * 1.2;
  // Subtle breathing + sway
  striker.torso.position.y = 1.05 + Math.sin(t) * 0.012;
  striker.head.position.y = 1.65 + Math.sin(t) * 0.012;
  striker.armL.rotation.z = 0.06 + Math.sin(t * 0.9) * 0.04;
  striker.armR.rotation.z = -0.06 - Math.sin(t * 0.9) * 0.04;
  striker.group.position.x = -0.25 + Math.sin(t * 0.4) * 0.012;
}

function makeNumberTexture(text) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.font = 'bold 92px -apple-system, "SF Pro Display", Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffc857';
  g.fillText(text, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
