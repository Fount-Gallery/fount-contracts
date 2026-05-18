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
const SKY_TOP    = '#1d0a40';
const SKY_UPPER  = '#4a155a';
const SKY_MID    = '#b13a6c';
const SKY_LOW    = '#ff7a3a';
const SKY_GLOW   = '#ffd089';

const STAND_BASE = 0x0a0d22;

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = makeSkyGradient();
  scene.fog = new THREE.Fog('#73304a', 30, 110);

  addLights(scene);
  addPitch(scene);
  const goalGroup = addGoal(scene);
  addStadiumBackdrop(scene);
  addSideStands(scene);
  addHangingBanners(scene);
  addAdBoards(scene);
  addFloodlights(scene);
  addSunSpectacle(scene);
  addLightBeams(scene);

  return { scene, goalGroup };
}

function makeSkyGradient() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, SKY_TOP);
  grad.addColorStop(0.30, SKY_UPPER);
  grad.addColorStop(0.62, SKY_MID);
  grad.addColorStop(0.85, SKY_LOW);
  grad.addColorStop(1.00, SKY_GLOW);
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addLights(scene) {
  // Warm low sun, behind goal, backlighting subjects
  const sun = new THREE.DirectionalLight('#ffb888', 2.1);
  sun.position.set(2, 4, -18);
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

  // Hemisphere — warm sky / cool ground
  scene.add(new THREE.HemisphereLight('#ff9a82', '#1d203a', 0.55));

  // Cool fill from camera side to read silhouettes
  const fill = new THREE.DirectionalLight('#7fb9ff', 0.5);
  fill.position.set(-4, 6, 10);
  scene.add(fill);

  // Magenta rim from one side for color richness
  const rim = new THREE.DirectionalLight('#d460e0', 0.4);
  rim.position.set(-14, 7, -2);
  scene.add(rim);

  // Subtle top spot to light striker from above (like ref 2)
  const spot = new THREE.SpotLight('#ffffff', 1.6, 8, Math.PI / 5, 0.5, 1.2);
  spot.position.set(0, 7, 2.2);
  spot.target.position.set(-0.1, 0.4, 1.5);
  scene.add(spot);
  scene.add(spot.target);
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

  addRect(scene, lineMat, 0, lineY, -11, 40.32, 16.5);
  addRect(scene, lineMat, 0, lineY, -11, 18.32, 5.5);

  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), lineMat);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, lineY + 0.001, 0);
  scene.add(spot);

  const arc = new THREE.Mesh(
    new THREE.RingGeometry(9.05, 9.18, 64, 1, Math.PI + 0.6, Math.PI - 1.2),
    lineMat
  );
  arc.rotation.x = -Math.PI / 2;
  arc.position.set(0, lineY + 0.001, 0);
  scene.add(arc);
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
    opacity: 0.5,
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

// Single curved cylindrical "stadium wall" behind the goal,
// painted with a stylized crowd + banners texture.
function addStadiumBackdrop(scene) {
  const tex = makeCrowdTexture(2048, 1024);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0,
    side: THREE.BackSide,        // we look at the inside of the cylinder
    emissive: 0x0a1030,
    emissiveIntensity: 0.25,
    emissiveMap: tex,
  });

  // Cylinder swept around +z half (0..PI in three's CylinderGeometry theta)
  // covering 180° behind the goal, facing the camera.
  const radius = 26;
  const height = 11;
  const geom = new THREE.CylinderGeometry(
    radius, radius, height,
    64, 1, true,
    0, Math.PI            // +x → +z → -x
  );
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(0, height / 2 + 0.8, GOAL.z - 6);
  scene.add(mesh);

  // Dark base wall in front of the curve (suggests stand structure)
  const baseMat = new THREE.MeshStandardMaterial({ color: STAND_BASE, roughness: 0.9 });
  const baseGeom = new THREE.CylinderGeometry(
    radius + 0.2, radius + 0.2, 0.8,
    48, 1, true,
    0, Math.PI
  );
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.material.side = THREE.BackSide;
  base.position.set(0, 0.4, GOAL.z - 6);
  scene.add(base);

  // Bright lit rim at the top — like a stadium roof edge catching dusk light
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xffb070 });
  const rimGeom = new THREE.CylinderGeometry(
    radius + 0.15, radius + 0.15, 0.18,
    64, 1, true,
    0, Math.PI
  );
  const rim = new THREE.Mesh(rimGeom, rimMat);
  rim.material.side = THREE.BackSide;
  rim.position.set(0, height + 0.8 - 0.1, GOAL.z - 6);
  scene.add(rim);
}

function makeCrowdTexture(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  // Base — deep blue
  g.fillStyle = '#0a1235';
  g.fillRect(0, 0, W, H);

  // Tier bands (from bottom: lower, mid, upper)
  // Lower tier — densest, brightest crowd
  paintCrowdBand(g, 0, H * 0.62, H * 0.95, 1.0);
  // Gantry separator
  g.fillStyle = '#04081a';
  g.fillRect(0, H * 0.60, W, H * 0.025);
  // Mid tier
  paintCrowdBand(g, 0, H * 0.32, H * 0.58, 0.95);
  // Gantry separator
  g.fillStyle = '#04081a';
  g.fillRect(0, H * 0.30, W, H * 0.022);
  // Upper tier — sparser, hint of sky/structure above
  paintCrowdBand(g, 0, H * 0.05, H * 0.28, 0.75);

  // Big banner blocks draped from upper tier into mid
  const bannerColors = ['#1a3a9c', '#ffffff', '#3a78d8', '#1a3a9c', '#ffffff', '#0a2058', '#3a78d8'];
  const bannerCount = 9;
  for (let i = 0; i < bannerCount; i++) {
    const x = (W / bannerCount) * i + (W / bannerCount) * 0.15 + (Math.random() - 0.5) * 40;
    const w = 110 + Math.random() * 70;
    const h = 230 + Math.random() * 80;
    const y = H * 0.12 + Math.random() * 40;
    const color = bannerColors[i % bannerColors.length];
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
    // Contrast stripe
    g.fillStyle = color === '#ffffff' ? '#1a3a9c' : '#ffffff';
    g.fillRect(x + 10, y + h * 0.42, w - 20, 18);
    // Tiny crest mark
    g.fillStyle = color === '#ffd24a' ? '#1a3a9c' : '#ffd24a';
    g.beginPath();
    g.arc(x + w / 2, y + h * 0.18, 12, 0, Math.PI * 2);
    g.fill();
  }

  // Atmospheric haze patches (pink/orange flares)
  for (let i = 0; i < 18; i++) {
    const rx = Math.random() * W;
    const ry = H * 0.05 + Math.random() * H * 0.5;
    const rad = 140 + Math.random() * 180;
    const grad = g.createRadialGradient(rx, ry, 0, rx, ry, rad);
    const hue = Math.random() < 0.5 ? '255,120,160' : '255,180,90';
    grad.addColorStop(0, `rgba(${hue},0.35)`);
    grad.addColorStop(1, `rgba(${hue},0)`);
    g.fillStyle = grad;
    g.beginPath(); g.arc(rx, ry, rad, 0, Math.PI * 2); g.fill();
  }

  // Scattered tiny "phone lights" — bright specks
  g.fillStyle = '#fff7d0';
  for (let i = 0; i < 220; i++) {
    const sx = Math.random() * W;
    const sy = H * 0.08 + Math.random() * H * 0.85;
    const r = Math.random() < 0.85 ? 1.2 : 2.4;
    g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function paintCrowdBand(g, x0, y0, y1, density) {
  // Layered fill: section blocks of color, then small "people" cells on top.
  const W = g.canvas.width;
  // 1) Background section blocks — wide bands of varied tint
  for (let x = 0; x < W; x += 18 + Math.random() * 26) {
    const w = 40 + Math.random() * 130;
    const tint = Math.random();
    if (tint < 0.5) g.fillStyle = `hsl(${220 + Math.random() * 20}, 70%, ${22 + Math.random() * 14}%)`;
    else if (tint < 0.78) g.fillStyle = `hsl(${212 + Math.random() * 12}, 50%, ${42 + Math.random() * 14}%)`;
    else if (tint < 0.92) g.fillStyle = `hsl(0, 0%, ${78 + Math.random() * 14}%)`;
    else g.fillStyle = `hsl(45, 80%, 55%)`;
    g.fillRect(x, y0, w, y1 - y0);
  }

  // 2) Pixel-grid of "people" — 4×5 cells with brightness variation
  const cw = 4, ch = 5;
  for (let y = y0; y < y1; y += ch) {
    for (let x = 0; x < W; x += cw) {
      if (Math.random() > density) continue;
      const r = Math.random();
      let color;
      if (r < 0.6) color = `hsla(${220 + Math.random() * 18}, 70%, ${30 + Math.random() * 28}%, 0.85)`;
      else if (r < 0.85) color = `hsla(${210 + Math.random() * 12}, 55%, ${55 + Math.random() * 20}%, 0.85)`;
      else if (r < 0.97) color = `hsla(0, 0%, ${85 + Math.random() * 12}%, 0.85)`;
      else color = `hsla(45, 80%, 60%, 0.9)`;
      g.fillStyle = color;
      g.fillRect(x, y, cw - 0.5, ch - 0.5);
    }
  }

  // 3) Vertical aisle gaps every so often
  g.fillStyle = '#06091e';
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * W;
    g.fillRect(x, y0, 4, y1 - y0);
  }
}

function addSideStands(scene) {
  // Short, lit side stands — flat boxes with a darker crowd texture
  const tex = makeCrowdTexture(1024, 384);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.92,
    emissive: 0x0a1030,
    emissiveIntensity: 0.2,
    emissiveMap: tex,
  });

  for (const side of [-1, 1]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 46), mat.clone());
    stand.position.set(side * 21, 3.5, -7);
    // Mirror texture on far side so banners don't repeat identically
    if (side > 0) stand.material.map.repeat.x = -1;
    scene.add(stand);

    // Lit top rim
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 46),
      new THREE.MeshBasicMaterial({ color: 0xffb070 })
    );
    rim.position.set(side * 21, 7.1, -7);
    scene.add(rim);

    // Dark base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 1.2, 46),
      new THREE.MeshStandardMaterial({ color: STAND_BASE, roughness: 0.9 })
    );
    base.position.set(side * 21, 0.6, -7);
    scene.add(base);
  }
}

function addHangingBanners(scene) {
  // Large hero banners draped from upper rim — float in front of backdrop
  const banners = [
    { x: -8,  w: 2.2, h: 4.5, color: 0xffffff, crest: 'A' },
    { x: -3,  w: 2.0, h: 4.2, color: 0x1a3a9c, crest: 'B' },
    { x:  3,  w: 2.0, h: 4.2, color: 0x1a3a9c, crest: 'B' },
    { x:  8,  w: 2.2, h: 4.5, color: 0xffffff, crest: 'A' },
  ];
  for (const b of banners) {
    const tex = makeBannerTexture(b.color, b.crest);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: b.color,
      emissiveIntensity: 0.25,
      emissiveMap: tex,
      roughness: 0.6,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), mat);
    m.position.set(b.x, 7.5, GOAL.z - 4);
    m.rotation.y = -b.x * 0.015;
    scene.add(m);
  }
}

function makeBannerTexture(colorHex, crestLabel) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  const color = '#' + colorHex.toString(16).padStart(6, '0');
  const contrast = colorHex === 0xffffff ? '#1a3a9c' : '#ffffff';

  g.fillStyle = color;
  g.fillRect(0, 0, 256, 512);
  // Horizontal stripe
  g.fillStyle = contrast;
  g.fillRect(0, 220, 256, 40);
  // Shield crest
  g.fillStyle = contrast;
  g.beginPath();
  g.moveTo(80, 60); g.lineTo(176, 60); g.lineTo(176, 140);
  g.quadraticCurveTo(128, 200, 80, 140); g.closePath();
  g.fill();
  // Tiny inner crest detail
  g.fillStyle = color;
  g.fillRect(96, 90, 64, 6);
  g.fillRect(96, 110, 64, 6);
  // Bottom logo letter
  g.fillStyle = contrast;
  g.font = 'bold 86px -apple-system, "SF Pro Display", Helvetica, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(crestLabel, 128, 380);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addAdBoards(scene) {
  const colors = [0x2a5cff, 0xffffff, 0x2a5cff, 0xffd24a, 0x2a5cff, 0xffffff, 0x111a3c];
  const boardH = 0.65;
  const boardW = 4.2;

  for (let i = 0; i < 17; i++) {
    const x = -34 + i * 4.3;
    const mat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      emissive: colors[i % colors.length],
      emissiveIntensity: 0.4,
      roughness: 0.7,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, 0.08), mat);
    m.position.set(x, boardH / 2, GOAL.z - 2.2);
    scene.add(m);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const z = -22 + i * 3.7;
      const mat = new THREE.MeshStandardMaterial({
        color: colors[(i + (side > 0 ? 2 : 0)) % colors.length],
        emissive: colors[(i + (side > 0 ? 2 : 0)) % colors.length],
        emissiveIntensity: 0.35,
        roughness: 0.7,
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, boardH, 3.4), mat);
      m.position.set(side * 19.4, boardH / 2, z);
      scene.add(m);
    }
  }
}

function addFloodlights(scene) {
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x0c0f20, roughness: 0.9 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe7b8 });

  const corners = [
    [-22, GOAL.z - 8], [22, GOAL.z - 8],
    [-22, 14], [22, 14],
  ];
  for (const [x, z] of corners) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 18, 8), towerMat);
    tower.position.set(x, 9, z);
    scene.add(tower);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.2), towerMat);
    crown.position.set(x, 18.2, z);
    scene.add(crown);

    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), bulbMat);
    bulb.position.set(x, 18.2, z + (z > 0 ? -0.65 : 0.65));
    bulb.lookAt(0, 6, 0);
    scene.add(bulb);
  }
}

function addSunSpectacle(scene) {
  // Smaller, dimmer, and pushed off to the side so it doesn't sit behind
  // the keeper and blow out the goal.
  const sunX = 6.2;
  const sunY = 3.4;
  const sunZ = GOAL.z - 15;

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd89a, transparent: true, opacity: 0.85, depthWrite: false })
  );
  sun.position.set(sunX, sunY, sunZ);
  scene.add(sun);

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(4.0, 48),
    new THREE.MeshBasicMaterial({ color: 0xffae6e, transparent: true, opacity: 0.35, depthWrite: false })
  );
  inner.position.set(sunX, sunY, sunZ - 0.05);
  scene.add(inner);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 48),
    new THREE.MeshBasicMaterial({ color: 0xff7a4a, transparent: true, opacity: 0.13, depthWrite: false })
  );
  halo.position.set(sunX, sunY, sunZ - 0.1);
  scene.add(halo);
}

function addLightBeams(scene) {
  // Vertical god-rays from above — long thin transparent rectangles, additive blend
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd8a4,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beamPositions = [
    [-3, GOAL.z - 4, 6, 0.18],
    [ 0, GOAL.z - 6, 8, 0.22],
    [ 4, GOAL.z - 5, 7, 0.18],
    [-6, GOAL.z - 7, 5, 0.14],
    [ 7, GOAL.z - 8, 6, 0.15],
  ];
  for (const [x, z, h, op] of beamPositions) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.8, h * 2), mat.clone());
    beam.material.opacity = op;
    beam.position.set(x, h, z);
    beam.rotation.y = Math.atan2(0 - x, 3.2 - z); // face toward camera
    scene.add(beam);
  }

  // Smoke flares behind goal — a few colored haze planes
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xff80a4,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(2 + Math.random() * 1.5, 24),
      smokeMat.clone()
    );
    m.material.color.setHSL(0.92 + Math.random() * 0.08, 0.6, 0.6);
    m.material.opacity = 0.25 + Math.random() * 0.2;
    m.position.set(-8 + i * 4, 3 + Math.random() * 4, GOAL.z - 7);
    m.lookAt(0, 2, 3);
    scene.add(m);
  }
}
