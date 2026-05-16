import * as THREE from 'three';
import { GOAL } from './scene.js';

const SKIN = 0xffd2a8;
const SHIRT = 0x16d56b;
const SHORTS = 0x0b3320;
const GLOVE = 0xffeb55;

export function createKeeper(scene) {
  const group = new THREE.Group();

  const matSkin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.8 });
  const matShirt = new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.7, emissive: 0x062a14 });
  const matShorts = new THREE.MeshStandardMaterial({ color: SHORTS, roughness: 0.8 });
  const matGlove = new THREE.MeshStandardMaterial({ color: GLOVE, roughness: 0.6, emissive: 0x3a2a00 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 6, 12), matShirt);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), matSkin);
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  // Arms (will be re-oriented on dive)
  const armGeom = new THREE.CapsuleGeometry(0.07, 0.55, 4, 8);
  const armL = new THREE.Mesh(armGeom, matShirt);
  const armR = new THREE.Mesh(armGeom, matShirt);
  armL.position.set(-0.32, 1.05, 0);
  armR.position.set(0.32, 1.05, 0);
  armL.castShadow = armR.castShadow = true;
  group.add(armL, armR);

  // Gloves at end of arms
  const gloveGeom = new THREE.SphereGeometry(0.11, 14, 10);
  const gloveL = new THREE.Mesh(gloveGeom, matGlove);
  const gloveR = new THREE.Mesh(gloveGeom, matGlove);
  gloveL.position.set(-0.32, 0.75, 0);
  gloveR.position.set(0.32, 0.75, 0);
  group.add(gloveL, gloveR);

  // Legs
  const legGeom = new THREE.CapsuleGeometry(0.1, 0.55, 4, 8);
  const legL = new THREE.Mesh(legGeom, matShorts);
  const legR = new THREE.Mesh(legGeom, matShorts);
  legL.position.set(-0.14, 0.4, 0);
  legR.position.set(0.14, 0.4, 0);
  legL.castShadow = legR.castShadow = true;
  group.add(legL, legR);

  group.position.set(0, 0, GOAL.z + 0.4);
  scene.add(group);

  // Idle bob state
  const state = {
    group,
    body, head, armL, armR, gloveL, gloveR, legL, legR,
    homeY: 0,
    targetX: 0,
    targetY: 0,
    diving: false,
    diveStart: 0,
    diveFrom: new THREE.Vector3(),
    diveTo: new THREE.Vector3(),
    diveDuration: 0.45,
    leanAxis: 0, // -1 left, 1 right
  };
  return state;
}

// Trigger a dive towards (x, y). Direction inferred from sign of x.
export function dive(keeper, x, y, time, duration = 0.45) {
  keeper.diving = true;
  keeper.diveStart = time;
  keeper.diveDuration = duration;
  keeper.diveFrom.copy(keeper.group.position);
  // Clamp slightly so keeper can occasionally miss extreme corners
  const clampX = Math.max(-GOAL.width / 2 - 0.3, Math.min(GOAL.width / 2 + 0.3, x));
  const clampY = Math.max(0, Math.min(GOAL.height - 0.1, y));
  keeper.diveTo.set(clampX, clampY, GOAL.z + 0.4);
  keeper.leanAxis = Math.sign(clampX) || 0;
}

export function updateKeeper(keeper, time, dt) {
  if (!keeper.diving) {
    // Idle: subtle bob & sway
    const t = time * 1.5;
    keeper.group.position.x += (0 - keeper.group.position.x) * Math.min(1, dt * 4);
    keeper.group.position.y += (0 - keeper.group.position.y) * Math.min(1, dt * 4);
    keeper.body.position.y = 1.0 + Math.sin(t) * 0.025;
    keeper.head.position.y = 1.55 + Math.sin(t) * 0.025;
    keeper.armL.rotation.z = 0.1 + Math.sin(t * 0.9) * 0.08;
    keeper.armR.rotation.z = -0.1 - Math.sin(t * 0.9) * 0.08;
    keeper.gloveL.position.set(-0.32, 0.75 + Math.sin(t) * 0.02, 0);
    keeper.gloveR.position.set(0.32, 0.75 + Math.sin(t) * 0.02, 0);
    keeper.group.rotation.z = 0;
    return;
  }

  const p = Math.min(1, (time - keeper.diveStart) / keeper.diveDuration);
  // Ease out cubic with slight overshoot
  const e = 1 - Math.pow(1 - p, 3);

  keeper.group.position.lerpVectors(keeper.diveFrom, keeper.diveTo, e);

  // Lean / rotate around forward axis
  keeper.group.rotation.z = -keeper.leanAxis * e * 1.0;

  // Stretch arms to dive direction
  const stretch = e * 1.4;
  keeper.armL.position.x = -0.32 - keeper.leanAxis * stretch * 0.5;
  keeper.armR.position.x = 0.32 - keeper.leanAxis * stretch * 0.5;
  keeper.armL.position.y = 1.05 + keeper.leanAxis * stretch * 0.3;
  keeper.armR.position.y = 1.05 + keeper.leanAxis * stretch * 0.3;
  keeper.gloveL.position.set(keeper.armL.position.x - keeper.leanAxis * 0.2, keeper.armL.position.y - 0.25 + keeper.leanAxis * stretch * 0.2, 0);
  keeper.gloveR.position.set(keeper.armR.position.x - keeper.leanAxis * 0.2, keeper.armR.position.y - 0.25 + keeper.leanAxis * stretch * 0.2, 0);

  if (p >= 1) {
    keeper.diving = false;
    // hold pose briefly; will reset on next idle update over a few frames
  }
}

export function keeperHitbox(keeper) {
  // Approximate a vertical capsule + extended arm reach during dive.
  const p = keeper.group.position;
  return {
    cx: p.x,
    cy: p.y + 1.0,
    halfH: 0.95,
    radius: 0.55 + (keeper.diving ? 0.35 : 0),
  };
}
