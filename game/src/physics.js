import * as THREE from 'three';
import { GOAL, BALL_RADIUS } from './scene.js';

// Lightweight, arcade-y ball trajectory. Not a true physics sim — we want
// curves and arcs to *feel* great, not be Newtonian. Gravity is reduced and
// the Magnus "curve" force is just a sideways acceleration that fades as
// the ball nears the goal.

const GRAVITY = 9.0;        // softened for floatier arcs
const DRAG = 0.04;          // per-second velocity decay
const CURVE_DURATION = 0.5; // seconds the curve force lasts after kick

export function createShot({ power, aimX, aimY, curve }) {
  // power: 0..1, aim normalized to a target point on goal plane
  // curve: -1 (left) .. +1 (right) — bends the ball mid-flight

  // Target point on goal plane (in world units, slight overshoot allowed)
  const targetX = aimX * (GOAL.width * 0.7);          // can shoot wide
  const targetY = THREE.MathUtils.clamp(aimY, 0, 1) * (GOAL.height * 1.15);
  const targetZ = GOAL.z;

  const dz = targetZ; // negative
  // Choose a flight time proportional to power; faster shots = lower travel time
  const minT = 0.55, maxT = 1.05;
  const flightTime = THREE.MathUtils.lerp(maxT, minT, power);

  // Solve initial velocity for a parabola: x(t)=vx*t, y(t)=vy*t-0.5*g*t^2
  const vx = targetX / flightTime;
  const vz = dz / flightTime;
  const vy = (targetY - BALL_RADIUS) / flightTime + 0.5 * GRAVITY * flightTime;

  const velocity = new THREE.Vector3(vx, vy, vz);
  const curveForce = curve * 18; // sideways accel magnitude
  const spin = new THREE.Vector3(-vy * 0.4, curve * 6, vx * 0.4); // visual spin

  return {
    velocity,
    curveForce,
    curveTimeLeft: CURVE_DURATION,
    spin,
    flightTime,
    elapsed: 0,
    targetX,
    targetY,
  };
}

export function stepBall(ballMesh, shot, dt) {
  shot.elapsed += dt;

  // Apply curve as a sideways acceleration that decays
  if (shot.curveTimeLeft > 0) {
    const f = shot.curveTimeLeft / CURVE_DURATION; // 1 -> 0
    shot.velocity.x += shot.curveForce * f * dt;
    shot.curveTimeLeft -= dt;
  }

  // Gravity
  shot.velocity.y -= GRAVITY * dt;

  // Drag
  const d = Math.max(0, 1 - DRAG * dt);
  shot.velocity.multiplyScalar(d);

  // Integrate
  ballMesh.position.addScaledVector(shot.velocity, dt);

  // Visual roll
  ballMesh.rotation.x += shot.spin.x * dt;
  ballMesh.rotation.y += shot.spin.y * dt;
  ballMesh.rotation.z += shot.spin.z * dt;

  // Ground bounce (light, only if ball lands short)
  if (ballMesh.position.y < BALL_RADIUS && shot.velocity.y < 0) {
    ballMesh.position.y = BALL_RADIUS;
    shot.velocity.y = -shot.velocity.y * 0.45;
    shot.velocity.x *= 0.7;
    shot.velocity.z *= 0.85;
  }
}

// Returns { outcome, point } once an outcome is decided
//   outcome: 'goal' | 'save' | 'miss' | 'post'
export function checkOutcome(ballMesh, prevPos, keeperHit) {
  // 1. Goal-plane crossing
  if (prevPos.z > GOAL.z && ballMesh.position.z <= GOAL.z) {
    // Interpolate the crossing point
    const t = (prevPos.z - GOAL.z) / (prevPos.z - ballMesh.position.z);
    const px = THREE.MathUtils.lerp(prevPos.x, ballMesh.position.x, t);
    const py = THREE.MathUtils.lerp(prevPos.y, ballMesh.position.y, t);
    const point = new THREE.Vector3(px, py, GOAL.z);

    const inGoalX = Math.abs(px) <= GOAL.width / 2 - BALL_RADIUS;
    const inGoalY = py >= BALL_RADIUS && py <= GOAL.height - BALL_RADIUS;
    const onPost =
      (Math.abs(Math.abs(px) - GOAL.width / 2) < BALL_RADIUS + 0.08 &&
        py < GOAL.height) ||
      (Math.abs(py - GOAL.height) < BALL_RADIUS + 0.08 &&
        Math.abs(px) < GOAL.width / 2);

    if (onPost) return { outcome: 'post', point };
    if (inGoalX && inGoalY) return { outcome: 'goal', point };
    return { outcome: 'miss', point };
  }

  // 2. Keeper save (before reaching goal)
  if (keeperHit && ballMesh.position.z > GOAL.z) {
    const dx = ballMesh.position.x - keeperHit.cx;
    const dy = ballMesh.position.y - keeperHit.cy;
    const close = Math.abs(ballMesh.position.z - (GOAL.z + 0.4)) < 0.6;
    if (
      close &&
      Math.abs(dx) < keeperHit.radius &&
      Math.abs(dy) < keeperHit.halfH
    ) {
      return { outcome: 'save', point: ballMesh.position.clone() };
    }
  }

  // 3. Too far gone
  if (ballMesh.position.z < GOAL.z - 4) {
    return { outcome: 'miss', point: ballMesh.position.clone() };
  }

  return null;
}
