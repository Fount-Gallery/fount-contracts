import * as THREE from 'three';
import { GOAL } from './scene.js';
import { toon, addOutline } from './toonkit.js';

const SKIN_C = 0xf1c79a;
const SHIRT_C = 0x2a5cff;
const TRIM_C = 0x9bd1ff;
const SHORTS_C = 0xf4f7ff;
const SOCKS_C = 0x0a1330;
const GLOVE_C = 0xffd24a;
const HAIR_C = 0x1a0e08;
const BOOT_C = 0x080814;

export function createKeeper(scene) {
  const group = new THREE.Group();

  const matSkin = toon(SKIN_C);
  const matShirt = toon(SHIRT_C);
  const matTrim = toon(TRIM_C);
  const matShorts = toon(SHORTS_C);
  const matSocks = toon(SOCKS_C);
  const matGlove = toon(GLOVE_C);
  const matHair = toon(HAIR_C);
  const matBoot = toon(BOOT_C);

  // Torso — slight forward lean
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.48, 6, 14), matShirt);
  torso.position.set(0, 1.0, 0.05);
  torso.rotation.x = 0.12;
  torso.castShadow = true;
  addOutline(torso, 0.07);
  group.add(torso);

  // Collar trim
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 20, Math.PI * 1.2), matTrim);
  collar.position.set(0, 1.3, 0.07);
  collar.rotation.x = Math.PI / 2 + 0.1;
  collar.rotation.z = -Math.PI / 2;
  group.add(collar);

  // Head + hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), matSkin);
  head.position.set(0, 1.48, 0.08);
  head.castShadow = true;
  addOutline(head, 0.07);
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.185, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    matHair
  );
  hair.position.set(0, 1.48, 0.08);
  hair.rotation.x = -0.1;
  group.add(hair);

  // Arms — ready stance, hands forward at shoulder height
  const armGeom = new THREE.CapsuleGeometry(0.07, 0.42, 4, 8);
  const armL = new THREE.Mesh(armGeom, matShirt);
  const armR = new THREE.Mesh(armGeom, matShirt);
  armL.position.set(-0.3, 1.0, 0.22);
  armR.position.set(0.3, 1.0, 0.22);
  armL.rotation.set(-0.55, 0, -0.2);
  armR.rotation.set(-0.55, 0, 0.2);
  armL.castShadow = armR.castShadow = true;
  addOutline(armL, 0.08);
  addOutline(armR, 0.08);
  group.add(armL, armR);

  // Gloves — out front, palms forward (ready to react)
  const gloveGeom = new THREE.SphereGeometry(0.12, 14, 10);
  const gloveL = new THREE.Mesh(gloveGeom, matGlove);
  const gloveR = new THREE.Mesh(gloveGeom, matGlove);
  gloveL.position.set(-0.4, 0.78, 0.48);
  gloveR.position.set(0.4, 0.78, 0.48);
  addOutline(gloveL, 0.08);
  addOutline(gloveR, 0.08);
  group.add(gloveL, gloveR);

  // Thighs — bent knees, slight outward angle
  const thighGeom = new THREE.CapsuleGeometry(0.12, 0.28, 4, 8);
  const thighL = new THREE.Mesh(thighGeom, matShorts);
  const thighR = new THREE.Mesh(thighGeom, matShorts);
  thighL.position.set(-0.17, 0.6, 0.04);
  thighR.position.set(0.17, 0.6, 0.04);
  thighL.rotation.set(0.18, 0, 0.08);
  thighR.rotation.set(0.18, 0, -0.08);
  thighL.castShadow = thighR.castShadow = true;
  addOutline(thighL, 0.08);
  addOutline(thighR, 0.08);
  group.add(thighL, thighR);

  // Shins (socks) — straight down from bent knees
  const shinGeom = new THREE.CapsuleGeometry(0.1, 0.28, 4, 8);
  const shinL = new THREE.Mesh(shinGeom, matSocks);
  const shinR = new THREE.Mesh(shinGeom, matSocks);
  shinL.position.set(-0.22, 0.25, 0.14);
  shinR.position.set(0.22, 0.25, 0.14);
  shinL.castShadow = shinR.castShadow = true;
  addOutline(shinL, 0.08);
  addOutline(shinR, 0.08);
  group.add(shinL, shinR);

  // Boots
  const bootGeom = new THREE.BoxGeometry(0.2, 0.09, 0.3);
  const bootL = new THREE.Mesh(bootGeom, matBoot);
  const bootR = new THREE.Mesh(bootGeom, matBoot);
  bootL.position.set(-0.22, 0.05, 0.22);
  bootR.position.set(0.22, 0.05, 0.22);
  addOutline(bootL, 0.08);
  addOutline(bootR, 0.08);
  group.add(bootL, bootR);

  group.position.set(0, 0, GOAL.z + 0.4);
  scene.add(group);

  const state = {
    group,
    torso, head, armL, armR, gloveL, gloveR, thighL, thighR,
    targetX: 0,
    targetY: 0,
    diving: false,
    diveStart: 0,
    diveFrom: new THREE.Vector3(),
    diveTo: new THREE.Vector3(),
    diveDuration: 0.45,
    leanAxis: 0,
    telegraphDir: 0,
    telegraphStrength: 0,
  };
  return state;
}

// Show the keeper telegraphing a guess by shifting weight + leaning.
// dir: -1 (will dive left from keeper POV / +x world), +1 (right / -x world).
// strength: 0..1 — how obvious the tell is.
export function telegraph(keeper, dir, strength) {
  keeper.telegraphDir = dir;
  keeper.telegraphStrength = strength;
}

export function clearTelegraph(keeper) {
  keeper.telegraphDir = 0;
  keeper.telegraphStrength = 0;
}

export function dive(keeper, x, y, time, duration = 0.45) {
  keeper.diving = true;
  keeper.diveStart = time;
  keeper.diveDuration = duration;
  keeper.diveFrom.copy(keeper.group.position);
  const clampX = Math.max(-GOAL.width / 2 - 0.3, Math.min(GOAL.width / 2 + 0.3, x));
  const clampY = Math.max(0, Math.min(GOAL.height - 0.1, y));
  keeper.diveTo.set(clampX, clampY, GOAL.z + 0.4);
  keeper.leanAxis = Math.sign(clampX) || 0;
  keeper.telegraphStrength = 0;
}

export function updateKeeper(keeper, time, dt) {
  if (!keeper.diving) {
    const t = time * 1.5;
    // Telegraph shifts the home position laterally and adds a lean
    const lean = keeper.telegraphDir * keeper.telegraphStrength;
    const targetX = lean * 1.1;
    keeper.group.position.x += (targetX - keeper.group.position.x) * Math.min(1, dt * 2.5);
    keeper.group.position.y += (0 - keeper.group.position.y) * Math.min(1, dt * 4);
    keeper.group.rotation.z = -lean * 0.18;

    // Idle bob — still happens even with telegraph
    keeper.torso.position.y = 1.0 + Math.sin(t) * 0.02;
    keeper.head.position.y = 1.48 + Math.sin(t) * 0.02;
    keeper.armL.rotation.x = -0.55 + Math.sin(t * 0.9) * 0.04;
    keeper.armR.rotation.x = -0.55 + Math.sin(t * 0.9) * 0.04;
    keeper.gloveL.position.set(-0.4, 0.78 + Math.sin(t) * 0.015, 0.48);
    keeper.gloveR.position.set(0.4, 0.78 + Math.sin(t) * 0.015, 0.48);
    return;
  }

  const p = Math.min(1, (time - keeper.diveStart) / keeper.diveDuration);
  const e = 1 - Math.pow(1 - p, 3);

  keeper.group.position.lerpVectors(keeper.diveFrom, keeper.diveTo, e);
  keeper.group.rotation.z = -keeper.leanAxis * e * 1.0;

  const stretch = e * 1.4;
  keeper.armL.position.x = -0.3 - keeper.leanAxis * stretch * 0.55;
  keeper.armR.position.x = 0.3 - keeper.leanAxis * stretch * 0.55;
  keeper.armL.position.y = 1.0 + keeper.leanAxis * stretch * 0.35;
  keeper.armR.position.y = 1.0 + keeper.leanAxis * stretch * 0.35;
  keeper.gloveL.position.set(
    keeper.armL.position.x - keeper.leanAxis * 0.22,
    keeper.armL.position.y - 0.25 + keeper.leanAxis * stretch * 0.22,
    0.48
  );
  keeper.gloveR.position.set(
    keeper.armR.position.x - keeper.leanAxis * 0.22,
    keeper.armR.position.y - 0.25 + keeper.leanAxis * stretch * 0.22,
    0.48
  );

  if (p >= 1) keeper.diving = false;
}

export function keeperHitbox(keeper) {
  const p = keeper.group.position;
  return {
    cx: p.x,
    cy: p.y + 1.0,
    halfH: 0.95,
    radius: 0.55 + (keeper.diving ? 0.35 : 0),
  };
}
