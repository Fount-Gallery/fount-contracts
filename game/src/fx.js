import * as THREE from 'three';

// Particle bursts + ball trail + screen shake + flash.

export function createTrail(scene) {
  const MAX = 60;
  const positions = new Float32Array(MAX * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geom, mat);
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);

  let head = 0;
  let count = 0;
  return {
    line,
    push(p) {
      head = (head + 1) % MAX;
      positions[head * 3] = p.x;
      positions[head * 3 + 1] = p.y;
      positions[head * 3 + 2] = p.z;
      count = Math.min(MAX, count + 1);

      // Re-pack into a contiguous strip starting from the oldest point
      const ordered = new Float32Array(MAX * 3);
      for (let i = 0; i < count; i++) {
        const idx = (head - (count - 1) + i + MAX) % MAX;
        ordered[i * 3] = positions[idx * 3];
        ordered[i * 3 + 1] = positions[idx * 3 + 1];
        ordered[i * 3 + 2] = positions[idx * 3 + 2];
      }
      geom.setAttribute('position', new THREE.BufferAttribute(ordered, 3));
      geom.setDrawRange(0, count);
      geom.attributes.position.needsUpdate = true;
      line.visible = count > 2;
    },
    reset() {
      head = 0;
      count = 0;
      line.visible = false;
    },
  };
}

// Simple particle burst (e.g. grass on kick, dust on goal).
export function burst(scene, position, opts = {}) {
  const {
    count = 30,
    color = 0xffffff,
    speed = 4,
    size = 0.08,
    gravity = 9,
    life = 0.7,
    spread = Math.PI,
  } = opts;

  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * spread;
    const s = speed * (0.5 + Math.random() * 0.8);
    velocities.push(
      new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * s,
        Math.cos(phi) * s,
        Math.sin(phi) * Math.sin(theta) * s
      )
    );
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geom, mat);
  scene.add(points);

  let t = 0;
  return {
    update(dt) {
      t += dt;
      const pos = geom.attributes.position.array;
      for (let i = 0; i < count; i++) {
        velocities[i].y -= gravity * dt;
        pos[i * 3] += velocities[i].x * dt;
        pos[i * 3 + 1] += velocities[i].y * dt;
        pos[i * 3 + 2] += velocities[i].z * dt;
      }
      geom.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - t / life);
      if (t >= life) {
        scene.remove(points);
        geom.dispose();
        mat.dispose();
        return true;
      }
      return false;
    },
  };
}

// Camera shake — call once with intensity, then update each frame.
export function createShaker(camera) {
  const home = camera.position.clone();
  const lookHome = new THREE.Vector3(0, 1.4, -11);
  let trauma = 0;
  return {
    add(amount) { trauma = Math.min(1, trauma + amount); },
    update(dt, basePos, baseLook) {
      trauma = Math.max(0, trauma - dt * 1.4);
      const t2 = trauma * trauma;
      const ox = (Math.random() - 0.5) * t2 * 0.25;
      const oy = (Math.random() - 0.5) * t2 * 0.2;
      const oz = (Math.random() - 0.5) * t2 * 0.15;
      camera.position.copy(basePos || home);
      camera.position.x += ox;
      camera.position.y += oy;
      camera.position.z += oz;
      camera.lookAt(baseLook || lookHome);
    },
  };
}

// Net ripple — gently displace net mesh vertices near the impact point.
export function rippleNet(goalGroup, impact, intensity = 1) {
  goalGroup.traverse((obj) => {
    if (!obj.isMesh || !obj.userData.isNet) return;
    const geom = obj.geometry;
    if (!geom.attributes?.position) return;
    const pos = geom.attributes.position;
    const orig = geom.userData.orig || pos.array.slice();
    geom.userData.orig = orig;

    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    const startTime = performance.now();
    function animate() {
      const t = (performance.now() - startTime) / 1000;
      if (t > 1.0) {
        for (let i = 0; i < pos.array.length; i++) pos.array[i] = orig[i];
        pos.needsUpdate = true;
        return;
      }
      for (let i = 0; i < pos.count; i++) {
        v.fromArray(orig, i * 3);
        obj.localToWorld(w.copy(v));
        const dx = w.x - impact.x;
        const dy = w.y - impact.y;
        const dist = Math.hypot(dx, dy);
        const wave = Math.sin(t * 14 - dist * 2.5) * Math.exp(-t * 4) * Math.exp(-dist * 0.7);
        v.z -= wave * 0.35 * intensity;
        pos.array[i * 3] = v.x;
        pos.array[i * 3 + 1] = v.y;
        pos.array[i * 3 + 2] = v.z;
      }
      pos.needsUpdate = true;
      requestAnimationFrame(animate);
    }
    animate();
  });
}

export function flash() {
  const el = document.getElementById('flash');
  if (!el) return;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 60);
}

export function toast(text, kind = 'goal', duration = 1200) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, duration);
}
