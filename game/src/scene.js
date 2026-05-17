import * as THREE from 'three';

// World layout (meters, approximate FIFA)
//   Penalty spot at z=0, goal at z=-11. +X right, +Y up.
export const GOAL = {
  z: -11,
  width: 7.32,
  height: 2.44,
  postRadius: 0.06,
  netDepth: 1.6,
};

export const BALL_RADIUS = 0.11;
export const BALL_START = new THREE.Vector3(0, BALL_RADIUS, 0);

// Dusk palette
const SKY_TOP    = '#2a1640';
const SKY_UPPER  = '#5b2563';
const SKY_MID    = '#c84872';
const SKY_LOW    = '#ff8a4a';
const SKY_GLOW   = '#ffd089';

const STAND_DARK = 0x14182d;
const STAND_MID  = 0x1f2547;
const STAND_RIM  = 0x383f6e;

const AWAY_BLUE   = 0x2a5cff;
const AWAY_LIGHT  = 0x9bd1ff;
const AWAY_WHITE  = 0xffffff;

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog('#7a3a55', 32, 95);

  addLights(scene);
  addPitch(scene);
  const goalGroup = addGoal(scene);
  addStands(scene);
  addAdBoards(scene);
  addBanners(scene);
  addFloodlights(scene);
  addSunGlow(scene);

  return { scene, goalGroup };
}

function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, SKY_TOP);
  grad.addColorStop(0.25, SKY_UPPER);
  grad.addColorStop(0.55, SKY_MID);
  grad.addColorStop(0.82, SKY_LOW);
  grad.addColorStop(1.00, SKY_GLOW);
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addLights(scene) {
  // Warm low sun, positioned behind the goal so subjects backlight & rim
  const sun = new THREE.DirectionalLight('#ffb47a', 2.8);
  sun.position.set(3, 5, -18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 55;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // Hemisphere: warm pink sky, cool ground
  scene.add(new THREE.HemisphereLight('#ff9a7a', '#1d203a', 0.6));

  // Cool rim from camera side to read silhouettes
  const rim = new THREE.DirectionalLight('#7fb9ff', 0.55);
  rim.position.set(-4, 4, 10);
  scene.add(rim);

  // Magenta side accent
  const accent = new THREE.DirectionalLight('#c060c0', 0.25);
  accent.position.set(-14, 5, -6);
  scene.add(accent);
}

function addPitch(scene) {
  const tex = makeGrassTexture();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 8;

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 })
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const lineY = 0.01;

  // Penalty box
  addRect(scene, lineMat, 0, lineY, -11, 40.32, 16.5);
  // 6-yard box
  addRect(scene, lineMat, 0, lineY, -11, 18.32, 5.5);

  // Penalty spot
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), lineMat);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, lineY + 0.001, 0);
  scene.add(spot);

  // Penalty arc (top of D)
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(9.05, 9.18, 64, 1, Math.PI + 0.6, Math.PI - 1.2),
    lineMat
  );
  arc.rotation.x = -Math.PI / 2;
  arc.position.set(0, lineY + 0.001, 0);
  scene.add(arc);

  // Halfway line and centre circle (distant, just for depth)
  const halfway = new THREE.Mesh(new THREE.PlaneGeometry(70, 0.14), lineMat);
  halfway.rotation.x = -Math.PI / 2;
  halfway.position.set(0, lineY + 0.001, 22);
  scene.add(halfway);
}

function addRect(scene, mat, cx, y, cz, w, d) {
  const t = 0.13;
  const strips = [
    [cx, y, cz + d / 2, w, t],
    [cx, y, cz - d / 2, w, t],
    [cx - w / 2, y, cz, t, d],
    [cx + w / 2, y, cz, t, d],
  ];
  for (const [x, yy, z, sw, sd] of strips) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sd), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, yy + 0.001, z);
    scene.add(m);
  }
}

function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1f6b2c';
  g.fillRect(0, 0, 256, 256);

  // Mowing stripes — warmer at dusk
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = (y / 32) % 2 === 0 ? '#1d6029' : '#256f31';
    g.fillRect(0, y, 256, 32);
  }
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addGoal(scene) {
  const group = new THREE.Group();
  const { width, height, postRadius, netDepth, z } = GOAL;

  const postMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.25,
    emissive: 0x332622,
  });

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(postRadius, postRadius, height, 18),
      postMat
    );
    post.position.set(side * width / 2, height / 2, z);
    post.castShadow = true;
    group.add(post);
  }

  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, width, 18),
    postMat
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, height, z);
  bar.castShadow = true;
  group.add(bar);

  const netMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    map: makeNetTexture(),
    alphaTest: 0.3,
    depthWrite: false,
  });

  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), netMat);
  back.position.set(0, height / 2, z - netDepth);
  group.add(back);
  back.userData.isNet = true;

  for (const side of [-1, 1]) {
    const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(netDepth, height), netMat.clone());
    sideNet.rotation.y = Math.PI / 2;
    sideNet.position.set(side * width / 2, height / 2, z - netDepth / 2);
    group.add(sideNet);
  }

  const topLen = Math.hypot(netDepth, 0.3);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(width, topLen), netMat.clone());
  top.position.set(0, height - 0.05, z - netDepth / 2);
  top.rotation.x = -Math.PI / 2 + Math.atan2(0.3, netDepth);
  group.add(top);

  scene.add(group);
  return group;
}

function makeNetTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 1.2;
  const step = 10;
  for (let x = 0; x <= 128; x += step) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke();
  }
  for (let y = 0; y <= 128; y += step) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  return tex;
}

function addStands(scene) {
  const matDark = new THREE.MeshStandardMaterial({ color: STAND_DARK, roughness: 0.95 });
  const matMid  = new THREE.MeshStandardMaterial({ color: STAND_MID,  roughness: 0.9 });
  const matRim  = new THREE.MeshStandardMaterial({ color: STAND_RIM,  roughness: 0.85, emissive: 0x0a0d1c });

  // Behind-goal stand — three rising tiers
  const farTiers = [
    { y: 1.5, h: 3,  d: 4,  w: 70, z: GOAL.z - 5,  mat: matDark },
    { y: 4.5, h: 5,  d: 5,  w: 82, z: GOAL.z - 8,  mat: matMid  },
    { y: 9,   h: 7,  d: 5,  w: 92, z: GOAL.z - 12, mat: matDark },
  ];
  for (const t of farTiers) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), t.mat);
    m.position.set(0, t.y, t.z);
    scene.add(m);
  }

  // Thin rim strips along the front of each tier (catches light)
  for (const t of farTiers) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.18, 0.18), matRim);
    rim.position.set(0, t.y + t.h / 2 + 0.05, t.z + t.d / 2 + 0.05);
    scene.add(rim);
  }

  // Side stands — two tiers each
  for (const side of [-1, 1]) {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(4, 4.5, 44), matDark);
    lower.position.set(side * 25, 2.25, -6);
    scene.add(lower);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 54), matMid);
    upper.position.set(side * 29, 6.5, -6);
    scene.add(upper);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 44), matRim);
    rim.position.set(side * (25 - 2 + 0.05), 4.6, -6);
    scene.add(rim);
  }

  addCrowd(scene, farTiers);
}

function addCrowd(scene, farTiers) {
  const positions = [];
  const colors = [];
  const tmp = new THREE.Color();

  function pushPoint(x, y, z) {
    positions.push(x, y, z);
    const r = Math.random();
    if (r < 0.55) tmp.setHSL(0.62, 0.75, 0.40 + Math.random() * 0.18);       // deep blue
    else if (r < 0.82) tmp.setHSL(0.58, 0.55, 0.62 + Math.random() * 0.18);  // light blue
    else if (r < 0.95) tmp.setHSL(0,    0,    0.88 + Math.random() * 0.12);  // white
    else tmp.setHSL(0.07, 0.85, 0.55);                                       // rare orange (away ultras)
    colors.push(tmp.r, tmp.g, tmp.b);
  }

  // Crowd on each behind-goal tier front face
  for (const t of farTiers) {
    const front = t.z + t.d / 2;
    const top   = t.y + t.h / 2;
    const bot   = t.y - t.h / 2 + 0.4;
    const count = Math.floor(t.w * t.h * 14);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * (t.w - 1);
      const y = bot + Math.random() * (top - bot);
      const z = front + 0.05 + Math.random() * 0.4;
      pushPoint(x, y, z);
    }
  }

  // Crowd on side stands (facing the pitch)
  for (const side of [-1, 1]) {
    const xFace = side * 22.7;
    const zStart = -28, zEnd = 16;
    const count = 1800;
    for (let i = 0; i < count; i++) {
      const z = zStart + Math.random() * (zEnd - zStart);
      const y = 0.8 + Math.random() * 9;
      const x = xFace + (Math.random() - 0.5) * 0.6;
      pushPoint(x, y, z);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.22,
    vertexColors: true,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(geom, mat));
}

function addAdBoards(scene) {
  // Lit pitchside ad boards in front of the stands
  const colors = [0x2a5cff, 0xffffff, 0x2a5cff, 0xffd24a, 0x2a5cff, 0xffffff, 0x111a3c];
  const boardH = 0.7;
  const boardW = 4.2;

  // Behind goal
  for (let i = 0; i < 17; i++) {
    const x = -34 + i * 4.3;
    const mat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      emissive: colors[i % colors.length],
      emissiveIntensity: 0.35,
      roughness: 0.7,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, 0.08), mat);
    m.position.set(x, boardH / 2, GOAL.z - 2.5);
    scene.add(m);
  }

  // Side strips
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const z = -22 + i * 3.7;
      const mat = new THREE.MeshStandardMaterial({
        color: colors[(i + (side > 0 ? 2 : 0)) % colors.length],
        emissive: colors[(i + (side > 0 ? 2 : 0)) % colors.length],
        emissiveIntensity: 0.3,
        roughness: 0.7,
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, boardH, 3.4), mat);
      m.position.set(side * 21, boardH / 2, z);
      scene.add(m);
    }
  }
}

function addBanners(scene) {
  // Hanging vertical banners draped along the top tier
  const palette = [AWAY_BLUE, AWAY_LIGHT, AWAY_WHITE, AWAY_BLUE, AWAY_WHITE];
  for (let i = 0; i < 22; i++) {
    const color = palette[i % palette.length];
    const w = 1.2 + Math.random() * 0.6;
    const h = 3 + Math.random() * 1.5;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.15,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(-40 + i * 3.7, 9 + Math.random() * 1.4, GOAL.z - 9.4);
    m.rotation.y = (Math.random() - 0.5) * 0.25;
    scene.add(m);
  }

  // Big team crest banner in centre
  const crestSize = 4;
  const crestTex = makeCrestTexture();
  const crest = new THREE.Mesh(
    new THREE.PlaneGeometry(crestSize, crestSize),
    new THREE.MeshStandardMaterial({
      map: crestTex,
      transparent: true,
      emissive: 0x2a5cff,
      emissiveIntensity: 0.4,
      emissiveMap: crestTex,
      roughness: 0.7,
      side: THREE.DoubleSide,
    })
  );
  crest.position.set(0, 11.5, GOAL.z - 9.35);
  scene.add(crest);
}

function makeCrestTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  // Shield
  g.fillStyle = '#1a3a9c';
  g.beginPath();
  g.moveTo(40, 30); g.lineTo(216, 30); g.lineTo(216, 140);
  g.quadraticCurveTo(128, 240, 40, 140); g.closePath();
  g.fill();
  // Inner stripes
  g.fillStyle = '#9bd1ff';
  g.fillRect(40, 70, 176, 14);
  g.fillRect(40, 100, 176, 14);
  // Crown / triangle on top
  g.fillStyle = '#ffd24a';
  g.beginPath();
  g.moveTo(128, 50); g.lineTo(160, 90); g.lineTo(96, 90); g.closePath();
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addFloodlights(scene) {
  // Four corner pylons — thin tower with bright glowing crown
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x0c0f20, roughness: 0.9 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe7b8 });

  const corners = [
    [-28, -22], [28, -22], [-28, 18], [28, 18],
  ];
  for (const [x, z] of corners) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 22, 8), towerMat);
    tower.position.set(x, 11, z);
    scene.add(tower);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.2), towerMat);
    crown.position.set(x, 21.8, z);
    scene.add(crown);

    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), bulbMat);
    bulb.position.set(x, 21.8, z + (z > 0 ? -0.65 : 0.65));
    bulb.lookAt(0, 6, 0);
    scene.add(bulb);
  }
}

function addSunGlow(scene) {
  // A soft glowing disc behind the goal where the sun "sits" — bloom catches this
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffd089,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), glowMat);
  glow.position.set(2.5, 5, GOAL.z - 14);
  scene.add(glow);

  // Outer halo
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 48),
    new THREE.MeshBasicMaterial({ color: 0xff9a5a, transparent: true, opacity: 0.35, depthWrite: false })
  );
  halo.position.set(2.5, 5, GOAL.z - 14.05);
  scene.add(halo);
}
