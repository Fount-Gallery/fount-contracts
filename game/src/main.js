import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createScene, GOAL, BALL_START, BALL_RADIUS } from './scene.js';
import { createBall } from './ball.js';
import { createKeeper, dive, updateKeeper, keeperHitbox, telegraph, clearTelegraph } from './keeper.js';
import { createStriker, updateStriker } from './striker.js';
import { createShot, stepBall, checkOutcome } from './physics.js';
import { attachSwipe } from './input.js';
import { createTrail, burst, createShaker, rippleNet, flash, toast } from './fx.js';
import { sfxKick, sfxNet, sfxPost, sfxSave, sfxCrowd } from './audio.js';
import { setupOverlay, setChallengeTitle, setScore, setHint } from './ui.js';
import { loadProgress, saveProgress, startRun, applyShotResult, CHALLENGES } from './progression.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const { scene, goalGroup } = createScene();

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 140);
const CAM_HOME = new THREE.Vector3(0.35, 1.95, 3.4);
const CAM_LOOK = new THREE.Vector3(0.05, 1.1, GOAL.z);
camera.position.copy(CAM_HOME);
camera.lookAt(CAM_LOOK);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.7, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  bloom.setSize(w, h);
}
resize();
window.addEventListener('resize', resize);

const ball = createBall(scene);
const keeper = createKeeper(scene);
const striker = createStriker(scene);
const trail = createTrail(scene);
const shaker = createShaker(camera);

const particles = [];

let state = 'menu';
let shot = null;
let prevBallPos = new THREE.Vector3();
let slowmo = 1;
let run = null;
let progress = loadProgress();
let activeChallenge = null;
let runEnding = false;
let pendingGuess = { x: 0, y: 0.3 };  // keeper's committed guess for the next shot
let resolvePoint = new THREE.Vector3();

// Aim preview — dotted predicted trajectory shown while user is dragging.
const PREVIEW_SAMPLES = 18;
const previewDots = [];
{
  const dotGeom = new THREE.SphereGeometry(0.05, 8, 6);
  const dotMat = new THREE.MeshBasicMaterial({
    color: 0xffd24a,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  for (let i = 0; i < PREVIEW_SAMPLES; i++) {
    const d = new THREE.Mesh(dotGeom, dotMat);
    d.visible = false;
    scene.add(d);
    previewDots.push(d);
  }
}

const overlay = setupOverlay({
  progress,
  onStart: (challenge) => beginChallenge(challenge),
});
overlay.show();

attachSwipe(canvas, {
  onShoot: (params) => {
    if (state !== 'aim') return;
    hidePreview();
    takeShot(params);
  },
  onAim: (params) => {
    if (state !== 'aim') return;
    if (params) updatePreview(params);
    else hidePreview();
  },
  onAimEnd: () => hidePreview(),
});

function beginChallenge(challenge) {
  activeChallenge = challenge;
  run = startRun(challenge);
  runEnding = false;
  state = 'aim';
  resetBall();
  setChallengeTitle(challenge.name);
  setScore(0, 0, challenge.shots);
  setHint(challenge.goal + ' — swipe up to shoot');
  setUpKeeperGuess();
}

function resetBall() {
  ball.mesh.position.copy(BALL_START);
  ball.mesh.rotation.set(0, 0, 0);
  ball.shadow.position.set(0, 0.005, 0);
  ball.shadow.material.opacity = 0.45;
  trail.reset();
  slowmo = 1;
  shot = null;
  keeper.diving = false;
  keeper.group.rotation.z = 0;
}

// Generate a guess for the keeper and telegraph it via lean. The strength of
// the tell is inversely related to the keeper's `anticipation` — low-skill
// keepers commit early & visibly, high-skill keepers wait and barely tell.
function setUpKeeperGuess() {
  const { anticipation } = activeChallenge.keeper;
  // Random pre-commit guess in aim-space (-1..+1 x, 0..1 y)
  pendingGuess = {
    x: (Math.random() * 2 - 1) * 0.85,
    y: 0.25 + Math.random() * 0.55,
  };
  const tellStrength = THREE.MathUtils.clamp(1 - anticipation, 0.2, 1);
  telegraph(keeper, Math.sign(pendingGuess.x) || 0, tellStrength);
}

function updatePreview({ aimX, aimY, power, curve }) {
  let finalPower = power;
  if (activeChallenge?.maxPower) finalPower = Math.min(power, activeChallenge.maxPower);
  const tentative = createShot({ power: finalPower, aimX, aimY, curve });
  const dummy = {
    position: BALL_START.clone(),
    rotation: { x: 0, y: 0, z: 0 },
  };
  const totalTime = tentative.flightTime * 1.02;
  const sampleDt = totalTime / PREVIEW_SAMPLES;
  const subSteps = 4;
  const subDt = sampleDt / subSteps;
  for (let i = 0; i < PREVIEW_SAMPLES; i++) {
    for (let s = 0; s < subSteps; s++) stepBall(dummy, tentative, subDt);
    const d = previewDots[i];
    d.position.copy(dummy.position);
    d.visible = true;
    // Fade further dots toward the end of the path
    const tNorm = (i + 1) / PREVIEW_SAMPLES;
    d.material.opacity = 0.95 - tNorm * 0.35;
    d.scale.setScalar(1 - tNorm * 0.45);
  }
}

function hidePreview() {
  for (const d of previewDots) d.visible = false;
}

function takeShot({ aimX, aimY, power, curve }) {
  let finalPower = power;
  if (activeChallenge.maxPower) finalPower = Math.min(power, activeChallenge.maxPower);

  shot = createShot({ power: finalPower, aimX, aimY, curve });
  shot.meta = { power: finalPower, curve, aimY };
  state = 'flying';
  prevBallPos.copy(ball.mesh.position);
  setHint('', true);
  sfxKick();

  particles.push(burst(scene, new THREE.Vector3(0, 0.05, 0), {
    count: 24, color: 0xb7d96e, speed: 3, size: 0.1, life: 0.5, spread: Math.PI / 2,
  }));
  shaker.add(0.18);

  scheduleKeeperDive(aimX, aimY, finalPower, curve);
}

function scheduleKeeperDive(aimX, aimY, power, curve) {
  const { reaction, anticipation } = activeChallenge.keeper;
  // Blend the pre-committed guess with the actual aim, weighted by
  // anticipation. Smart keepers (high anticipation) read the player; dumb
  // keepers (low anticipation) stick with their early guess.
  const blend = anticipation;
  const guessedAimX = pendingGuess.x * (1 - blend) + aimX * blend;
  const guessedAimY = pendingGuess.y * (1 - blend) + aimY * blend;

  const targetX = THREE.MathUtils.clamp(
    guessedAimX * (GOAL.width * 0.65),
    -GOAL.width / 2 - 0.4,
    GOAL.width / 2 + 0.4,
  );
  const targetY = THREE.MathUtils.clamp(
    guessedAimY * GOAL.height,
    0.1,
    GOAL.height - 0.1,
  );

  setTimeout(() => {
    if (state !== 'flying') return;
    dive(keeper, targetX, targetY, performance.now() / 1000, activeChallenge.keeper.dive);
  }, reaction * 1000);
}

const clock = new THREE.Clock();
let outcomeTime = 0;
const RESOLVED_DURATION = 2.0;
const ORBIT_PEAK = 1.0;  // seconds where camera is fully orbited
const tmpCamPos = new THREE.Vector3();
const tmpCamLook = new THREE.Vector3();

function loop() {
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const dt = rawDt * slowmo;
  const t = performance.now() / 1000;

  updateKeeper(keeper, t, rawDt);
  updateStriker(striker, t);

  let camPos = CAM_HOME;
  let camLook = CAM_LOOK;

  if (state === 'flying' && shot) {
    prevBallPos.copy(ball.mesh.position);
    stepBall(ball.mesh, shot, dt);
    trail.push(ball.mesh.position);

    ball.shadow.position.x = ball.mesh.position.x;
    ball.shadow.position.z = ball.mesh.position.z;
    ball.shadow.material.opacity = Math.max(0.05, 0.45 - ball.mesh.position.y * 0.12);

    if (ball.mesh.position.z < GOAL.z + 4 && ball.mesh.position.z > GOAL.z) {
      slowmo = Math.max(0.45, slowmo - rawDt * 1.2);
    }

    tmpCamPos.copy(CAM_HOME);
    tmpCamPos.x += ball.mesh.position.x * 0.05;
    tmpCamPos.y += Math.max(0, ball.mesh.position.y - 0.5) * 0.04;
    camPos = tmpCamPos;

    const result = checkOutcome(ball.mesh, prevBallPos, keeperHitbox(keeper));
    if (result) resolveOutcome(result);
  } else if (state === 'resolved') {
    // Slow-mo replay: orbit camera to a side angle that frames the
    // outcome point, hold there, then ease back to home for the next shot.
    const elapsed = (performance.now() / 1000) - outcomeTime;
    const side = (resolvePoint.x >= 0) ? -1 : 1;
    const orbitPos = tmpCamPos.set(side * 7.5, 1.5, GOAL.z + 3.5);

    if (elapsed < ORBIT_PEAK) {
      const k = THREE.MathUtils.smoothstep(elapsed, 0, ORBIT_PEAK);
      tmpCamPos.copy(CAM_HOME).lerp(orbitPos, k);
      tmpCamLook.copy(CAM_LOOK).lerp(resolvePoint, k);
    } else if (elapsed < RESOLVED_DURATION) {
      const k = THREE.MathUtils.smoothstep(
        elapsed,
        ORBIT_PEAK,
        RESOLVED_DURATION,
      );
      tmpCamPos.copy(orbitPos).lerp(CAM_HOME, k);
      tmpCamLook.copy(resolvePoint).lerp(CAM_LOOK, k);
    } else {
      tmpCamPos.copy(CAM_HOME);
      tmpCamLook.copy(CAM_LOOK);
    }
    camPos = tmpCamPos;
    camLook = tmpCamLook;

    // Hold slow-mo while orbited, ease back as we return home
    if (elapsed < ORBIT_PEAK + 0.4) {
      slowmo = 0.4;
    } else {
      slowmo = Math.min(1, slowmo + rawDt * 0.7);
    }

    if (elapsed > RESOLVED_DURATION && !runEnding) {
      slowmo = 1;
      nextShot();
    }
  }

  shaker.update(rawDt, camPos, camLook);

  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].update(rawDt)) particles.splice(i, 1);
  }

  composer.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function resolveOutcome(result) {
  state = 'resolved';
  outcomeTime = performance.now() / 1000;
  resolvePoint.copy(result.point);

  if (result.outcome === 'goal') {
    sfxNet();
    sfxCrowd();
    rippleNet(goalGroup, result.point, 1);
    flash();
    shaker.add(0.45);
    toast('GOAL', 'goal');
    particles.push(burst(scene, result.point, {
      count: 60, color: 0xffffff, speed: 4, size: 0.07, life: 0.9,
    }));
    particles.push(burst(scene, result.point, {
      count: 30, color: 0xffd24a, speed: 6, size: 0.09, life: 1.0,
    }));
  } else if (result.outcome === 'save') {
    sfxSave();
    shaker.add(0.3);
    toast('SAVED', 'save');
    particles.push(burst(scene, result.point, {
      count: 20, color: 0x4af0c8, speed: 3.5, size: 0.07, life: 0.6,
    }));
  } else if (result.outcome === 'post') {
    sfxPost();
    shaker.add(0.55);
    toast('POST!', 'miss');
    particles.push(burst(scene, result.point, {
      count: 14, color: 0xffffff, speed: 4, size: 0.06, life: 0.5,
    }));
  } else {
    toast('MISS', 'miss');
    shaker.add(0.15);
  }

  const r = applyShotResult(run, {
    outcome: result.outcome,
    power: shot.meta.power,
    curve: shot.meta.curve,
    aimY: shot.meta.aimY,
  });
  setScore(run.scored, run.shotsTaken, run.challenge.shots);

  if (r.done) {
    runEnding = true;
    setTimeout(() => endChallenge(r.won), 2100);
  }
}

function nextShot() {
  resetBall();
  state = 'aim';
  setHint('Swipe up to shoot');
  setUpKeeperGuess();
}

function endChallenge(won) {
  state = 'menu';
  clearTelegraph(keeper);
  if (won) {
    progress.completed[activeChallenge.id] = true;
    saveProgress(progress);
    overlay.show({
      title: 'Challenge Complete',
      body: `${activeChallenge.name} — ${run.scored} scored, best streak ${run.bestStreak}. Next challenge unlocked.`,
      btnLabel: 'Continue',
    });
  } else {
    overlay.show({
      title: 'So close',
      body: `${run.scored} of ${activeChallenge.shots}. Try again or pick a different challenge.`,
      btnLabel: 'Retry',
    });
  }
}
