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

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0e1a');
  scene.fog = new THREE.Fog('#0a0e1a', 18, 60);

  addLights(scene);
  addPitch(scene);
  const goalGroup = addGoal(scene);
  const stands = addStands(scene);

  return { scene, goalGroup, stands };
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#9bd1ff', '#1a2030', 0.55));

  const key = new THREE.DirectionalLight('#fff5d6', 2.2);
  key.position.set(-8, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -14;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const rim = new THREE.DirectionalLight('#7cc4ff', 0.6);
  rim.position.set(10, 8, -14);
  scene.add(rim);

  const fill = new THREE.DirectionalLight('#ffb37a', 0.25);
  fill.position.set(6, 4, 10);
  scene.add(fill);
}

function addPitch(scene) {
  // Grass — two-tone stripes via shader-ish vertex color is overkill; use
  // a procedural canvas texture for striped mowing pattern.
  const tex = makeGrassTexture();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 8;

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  // White lines: penalty box, goal area, spot, arc
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const lineY = 0.01;

  // Penalty box (16.5m deep, 40.32m wide), goal at z=-11 so box near edge at z=-11+16.5=5.5
  addRect(scene, lineMat, 0, lineY, -11, 40.32, 16.5, true); // box outline
  addRect(scene, lineMat, 0, lineY, -11, 18.32, 5.5, true);  // 6-yard box

  // Penalty spot
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), lineMat);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, lineY + 0.001, 0);
  scene.add(spot);

  // Penalty arc (top of D)
  const arcGeom = new THREE.RingGeometry(9.05, 9.15, 64, 1, Math.PI + 0.6, Math.PI - 1.2);
  const arc = new THREE.Mesh(arcGeom, lineMat);
  arc.rotation.x = -Math.PI / 2;
  arc.position.set(0, lineY + 0.001, 0);
  scene.add(arc);
}

function addRect(scene, mat, cx, y, cz, w, d, hollow) {
  // Outline using thin strips
  const t = 0.12;
  const strips = [
    [cx, y, cz + d / 2, w, t], // back
    [cx, y, cz - d / 2, w, t], // front
    [cx - w / 2, y, cz, t, d], // left
    [cx + w / 2, y, cz, t, d], // right
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

  // Subtle horizontal mowing stripes
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = (y / 32) % 2 === 0 ? '#1f6b2c' : '#256f31';
    g.fillRect(0, y, 256, 32);
  }
  // Noise specks
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
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
    roughness: 0.35,
    metalness: 0.2,
    emissive: 0x222222,
  });

  // Posts
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(postRadius, postRadius, height, 18),
      postMat
    );
    post.position.set(side * width / 2, height / 2, z);
    post.castShadow = true;
    group.add(post);
  }

  // Crossbar
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, width, 18),
    postMat
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, height, z);
  bar.castShadow = true;
  group.add(bar);

  // Back / side net (semi-transparent grid material)
  const netMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    map: makeNetTexture(),
    alphaTest: 0.3,
    depthWrite: false,
  });

  // Back net
  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), netMat);
  back.position.set(0, height / 2, z - netDepth);
  group.add(back);
  back.userData.isNet = true;

  // Side nets (angled from top of post to ground behind goal)
  for (const side of [-1, 1]) {
    const sideNet = new THREE.Mesh(
      new THREE.PlaneGeometry(netDepth, height),
      netMat.clone()
    );
    sideNet.rotation.y = Math.PI / 2;
    sideNet.position.set(side * width / 2, height / 2, z - netDepth / 2);
    group.add(sideNet);
  }

  // Top net (slanted from crossbar back to ground)
  const topLen = Math.hypot(netDepth, 0.3);
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(width, topLen),
    netMat.clone()
  );
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
  // Suggest distant stands as a curved low-poly block, just for silhouette
  const group = new THREE.Group();
  const standMat = new THREE.MeshStandardMaterial({ color: 0x1a2238, roughness: 0.9 });

  // Far stand behind goal
  const far = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 6), standMat);
  far.position.set(0, 7, GOAL.z - 8);
  scene.add(far);

  // Specks of color = crowd
  const crowdMat = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    sizeAttenuation: true,
  });
  const positions = [];
  const colors = [];
  const tmp = new THREE.Color();
  for (let i = 0; i < 1500; i++) {
    const x = (Math.random() - 0.5) * 58;
    const y = 2 + Math.random() * 10;
    const z = GOAL.z - 5 - Math.random() * 3;
    positions.push(x, y, z);
    tmp.setHSL(Math.random(), 0.6, 0.55);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const crowd = new THREE.Points(geom, crowdMat);
  scene.add(crowd);

  // Side stands
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 50), standMat);
    s.position.set(side * 30, 6, -8);
    scene.add(s);
  }

  return group;
}
