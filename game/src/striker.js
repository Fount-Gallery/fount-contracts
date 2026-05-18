import * as THREE from 'three';
import { toon, addOutline, getToonGradient } from './toonkit.js';

const SKIN_C = 0x945230;
const HAIR_C = 0x140802;
const SHIRT_C = 0xe63a3a;
const TRIM_C = 0xffc857;
const SHORTS_C = 0xb02a2a;
const SOCKS_C = 0x1a0808;
const BOOT_C = 0x080814;

export function createStriker(scene) {
  const group = new THREE.Group();

  const matSkin = toon(SKIN_C);
  const matHair = toon(HAIR_C);
  const matShirt = toon(SHIRT_C);
  const matTrim = toon(TRIM_C);
  const matShorts = toon(SHORTS_C);
  const matSocks = toon(SOCKS_C);
  const matBoot = toon(BOOT_C);

  // Torso — slight twist
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 6, 14), matShirt);
  torso.position.set(0, 1.05, 0);
  torso.rotation.y = -0.08;
  torso.castShadow = true;
  addOutline(torso, 0.06);
  group.add(torso);

  // Yellow shoulder stripes (visible from behind)
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.06), matTrim);
    stripe.position.set(side * 0.22, 1.18, 0.27);
    stripe.rotation.z = side * 0.08;
    group.add(stripe);
  }

  // Collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 20), matTrim);
  collar.position.set(0, 1.36, 0.05);
  collar.rotation.x = Math.PI / 2;
  group.add(collar);

  // "10" on back. group is rotated PI around Y, so local +z is toward camera.
  const numTex = makeNumberTexture('10', '#ffc857');
  const numMat = new THREE.MeshToonMaterial({
    map: numTex,
    transparent: true,
    gradientMap: getToonGradient(),
  });
  const numberPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), numMat);
  numberPlane.position.set(0, 1.1, 0.32);
  numberPlane.rotation.y = Math.PI;
  group.add(numberPlane);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), matSkin);
  head.position.set(0.02, 1.58, 0);
  head.castShadow = true;
  addOutline(head, 0.06);
  group.add(head);

  // Hair — bigger shape that reads from behind
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.195, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    matHair
  );
  hair.position.set(0.02, 1.58, 0);
  hair.rotation.x = -0.12;
  hair.rotation.z = 0.04;
  group.add(hair);

  // Arms — at sides, slight forward angle
  const armGeom = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
  const armL = new THREE.Mesh(armGeom, matShirt);
  const armR = new THREE.Mesh(armGeom, matShirt);
  armL.position.set(-0.35, 1.0, 0.06);
  armR.position.set(0.35, 1.0, 0.04);
  armL.rotation.set(0.1, 0, 0.06);
  armR.rotation.set(-0.05, 0, -0.06);
  armL.castShadow = armR.castShadow = true;
  addOutline(armL, 0.06);
  addOutline(armR, 0.06);
  group.add(armL, armR);

  // Hands
  const handGeom = new THREE.SphereGeometry(0.085, 12, 8);
  const handL = new THREE.Mesh(handGeom, matSkin);
  const handR = new THREE.Mesh(handGeom, matSkin);
  handL.position.set(-0.36, 0.7, 0.12);
  handR.position.set(0.36, 0.7, -0.02);
  addOutline(handL, 0.06);
  addOutline(handR, 0.06);
  group.add(handL, handR);

  // Staggered legs — left planted back, right stepping forward
  const thighGeom = new THREE.CapsuleGeometry(0.13, 0.34, 4, 8);
  const thighL = new THREE.Mesh(thighGeom, matShorts);
  const thighR = new THREE.Mesh(thighGeom, matShorts);
  thighL.position.set(-0.14, 0.6, -0.06);
  thighR.position.set(0.14, 0.6, 0.08);
  thighL.rotation.x = -0.04;
  thighR.rotation.x = 0.12;
  thighL.castShadow = thighR.castShadow = true;
  addOutline(thighL, 0.07);
  addOutline(thighR, 0.07);
  group.add(thighL, thighR);

  const sockGeom = new THREE.CapsuleGeometry(0.11, 0.34, 4, 8);
  const sockL = new THREE.Mesh(sockGeom, matSocks);
  const sockR = new THREE.Mesh(sockGeom, matSocks);
  sockL.position.set(-0.14, 0.22, -0.1);
  sockR.position.set(0.14, 0.22, 0.16);
  sockL.castShadow = sockR.castShadow = true;
  addOutline(sockL, 0.07);
  addOutline(sockR, 0.07);
  group.add(sockL, sockR);

  const bootGeom = new THREE.BoxGeometry(0.17, 0.08, 0.27);
  const bootL = new THREE.Mesh(bootGeom, matBoot);
  const bootR = new THREE.Mesh(bootGeom, matBoot);
  bootL.position.set(-0.14, 0.04, -0.08);
  bootR.position.set(0.14, 0.04, 0.22);
  addOutline(bootL, 0.07);
  addOutline(bootR, 0.07);
  group.add(bootL, bootR);

  group.position.set(-0.3, 0, 1.7);
  group.rotation.y = Math.PI - 0.06;
  group.scale.setScalar(0.92);
  scene.add(group);

  return { group, torso, head, armL, armR, thighL, thighR };
}

export function updateStriker(striker, time) {
  const t = time * 1.2;
  striker.torso.position.y = 1.05 + Math.sin(t) * 0.012;
  striker.head.position.y = 1.58 + Math.sin(t) * 0.012;
  striker.armL.rotation.z = 0.06 + Math.sin(t * 0.9) * 0.03;
  striker.armR.rotation.z = -0.06 - Math.sin(t * 0.9) * 0.03;
  striker.group.position.x = -0.3 + Math.sin(t * 0.4) * 0.012;
}

function makeNumberTexture(text, fillColor) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.font = 'bold 200px -apple-system, "SF Pro Display", Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // Thick dark outline behind number
  g.strokeStyle = '#1a0000';
  g.lineWidth = 16;
  g.lineJoin = 'round';
  g.strokeText(text, 128, 140);
  g.fillStyle = fillColor;
  g.fillText(text, 128, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
