import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createScene, GOAL, BALL_START, BALL_RADIUS } from './scene.js';
import { createBall } from './ball.js';
import { createKeeper, dive, updateKeeper, keeperHitbox } from './keeper.js';
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

// Camera — behind the striker, framing ball + goal
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
const CAM_HOME = new THREE.Vector3(0.15, 1.75, 3.2);
const CAM_LOOK = new THREE.Vector3(0, 1.25, GOAL.z);
camera.position.copy(CAM_HOME);
camera.lookAt(CAM_LOOK);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.7, 0.85);
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

// Entities
const ball = createBall(scene);
const keeper = createKeeper(scene);
const striker = createStriker(scene);
const trail = createTrail(scene);
const shaker = createShaker(camera);

// Active particle systems
const particles = [];

// Game state
let state = 'menu'; // 'menu' | 'aim' | 'flying' | 'resolved'
let shot = null;
let prevBallPos = new THREE.Vector3();
let slowmo = 1;
let run = null;
let progress = loadProgress();
let activeChallenge = null;
let runEnding = false;

const overlay = setupOverlay({
  progress,
  onStart: (challenge) => beginChallenge(challenge),
});
overlay.show();

attachSwipe(canvas, ({ aimX, aimY, power, curve }) => {
  if (state !== 'aim') return;
  takeShot({ aimX, aimY, power, curve });
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
}

function resetBall() {
  ball.mesh.position.copy(BALL_START);
  ball.mesh.rotation.set(0, 0, 0);
  ball.shadow.position.set(0, 0.005, 0);
  ball.shadow.material.opacity = 0.45;
  trail.reset();
  slowmo = 1;
  shot = null;
  // Reset keeper to home pose (state machine handles smoothing)
  keeper.diving = false;
  keeper.group.rotation.z = 0;
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

  // Grass kick puff
  particles.push(burst(scene, new THREE.Vector3(0, 0.05, 0), {
    count: 24,
    color: 0xb7d96e,
    speed: 3,
    size: 0.1,
    life: 0.5,
    spread: Math.PI / 2,
  }));
  shaker.add(0.18);

  // Schedule keeper dive based on challenge AI
  scheduleKeeperDive(aimX, aimY, finalPower, curve);
}

function scheduleKeeperDive(aimX, aimY, power, curve) {
  const { reaction, anticipation } = activeChallenge.keeper;
  // anticipation: 0 = guess random, 1 = perfect read
  const guessNoise = (1 - anticipation) * (Math.random() - 0.5) * 1.6;
  const guessedAimX = aimX + guessNoise;
  // High shots are tougher for keeper — reduce read on Y
  const guessedAimY = aimY * (0.6 + anticipation * 0.4);

  // The dive target in world units
  const targetX = THREE.MathUtils.clamp(guessedAimX * (GOAL.width * 0.65), -GOAL.width / 2 - 0.4, GOAL.width / 2 + 0.4);
  const targetY = THREE.MathUtils.clamp(guessedAimY * GOAL.height, 0.1, GOAL.height - 0.1);

  setTimeout(() => {
    if (state !== 'flying') return;
    dive(keeper, targetX, targetY, performance.now() / 1000, activeChallenge.keeper.dive);
  }, reaction * 1000);
}

const clock = new THREE.Clock();
let outcomeTime = 0;

function loop() {
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const dt = rawDt * slowmo;
  const t = performance.now() / 1000;

  updateKeeper(keeper, t, rawDt);
  updateStriker(striker, t);

  if (state === 'flying' && shot) {
    prevBallPos.copy(ball.mesh.position);
    stepBall(ball.mesh, shot, dt);

    // Trail
    trail.push(ball.mesh.position);

    // Ground shadow follows ball, fades with altitude
    ball.shadow.position.x = ball.mesh.position.x;
    ball.shadow.position.z = ball.mesh.position.z;
    ball.shadow.material.opacity = Math.max(0.05, 0.45 - ball.mesh.position.y * 0.12);

    // Trigger slow-mo as ball approaches goal
    if (ball.mesh.position.z < GOAL.z + 4 && ball.mesh.position.z > GOAL.z) {
      slowmo = Math.max(0.45, slowmo - rawDt * 1.2);
    }

    // Camera: slight track of the ball
    const camBase = CAM_HOME.clone();
    camBase.x += ball.mesh.position.x * 0.05;
    camBase.y += Math.max(0, ball.mesh.position.y - 0.5) * 0.04;
    shaker.update(rawDt, camBase, CAM_LOOK);

    const result = checkOutcome(ball.mesh, prevBallPos, keeperHitbox(keeper));
    if (result) {
      resolveOutcome(result);
    }
  } else {
    shaker.update(rawDt, CAM_HOME, CAM_LOOK);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].update(rawDt)) particles.splice(i, 1);
  }

  // After resolution, ease slow-mo back and reset shot
  if (state === 'resolved') {
    if (performance.now() / 1000 - outcomeTime > 1.6 && !runEnding) {
      slowmo = 1;
      nextShot();
    } else {
      slowmo = Math.min(1, slowmo + rawDt * 0.6);
    }
  }

  composer.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function resolveOutcome(result) {
  state = 'resolved';
  outcomeTime = performance.now() / 1000;

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

  // Update run state
  const r = applyShotResult(run, {
    outcome: result.outcome,
    power: shot.meta.power,
    curve: shot.meta.curve,
    aimY: shot.meta.aimY,
  });
  setScore(run.scored, run.shotsTaken, run.challenge.shots);

  if (r.done) {
    runEnding = true;
    setTimeout(() => endChallenge(r.won), 1700);
  }
}

function nextShot() {
  resetBall();
  state = 'aim';
  setHint('Swipe up to shoot');
}

function endChallenge(won) {
  state = 'menu';
  if (won) {
    progress.completed[activeChallenge.id] = true;
    saveProgress(progress);
    // Unlock next? Just by virtue of completed[prev] being true.
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
