// Swipe input — captures a path, computes start/end/curvature.
// Aim is derived from final swipe direction (relative to canvas center),
// power from swipe length, and curve from the lateral deviation of the
// midpoint vs. the straight line from start to end.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Compute shot params from a path. Returns null if the path doesn't
// (yet) look like a shot — too short, not predominantly upward, etc.
// `committed` = true means we're done; we apply slightly stricter thresholds
// when reading live previews so transient noise doesn't flash a preview line.
function computeShot(points, canvas, committed) {
  if (points.length < 2) return null;
  const a = points[0];
  const b = points[points.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);

  const minLen = committed ? 60 : 30;
  const minUp = committed ? -40 : -15;
  if (dy > minUp || len < minLen) return null;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const aimX = clamp(dx / (w * 0.32), -1, 1);
  const aimY = clamp((-dy / h) * 1.6, 0.1, 1);

  const dt = Math.max(80, b.t - a.t);
  const speed = len / dt;
  const power = clamp(speed * 0.9, 0.45, 1);

  let curveSum = 0;
  let count = 0;
  const skip = committed ? 2 : 1;
  for (let i = skip; i < points.length - skip; i++) {
    const p = points[i];
    const cross = (b.x - a.x) * (a.y - p.y) - (b.y - a.y) * (a.x - p.x);
    curveSum += cross;
    count++;
  }
  const avg = count ? curveSum / count : 0;
  const curve = clamp((avg / Math.max(len * len, 1)) * 14, -1, 1);

  return { aimX, aimY, power, curve };
}

export function attachSwipe(canvas, { onShoot, onAim, onAimEnd }) {
  let active = false;
  let points = [];

  function down(x, y) {
    active = true;
    points = [{ x, y, t: performance.now() }];
  }

  function move(x, y) {
    if (!active) return;
    points.push({ x, y, t: performance.now() });
    if (points.length > 200) points.shift();
    if (onAim) {
      const p = computeShot(points, canvas, false);
      if (p) onAim(p);
      else onAim(null);
    }
  }

  function up() {
    if (!active) return;
    active = false;
    if (onAimEnd) onAimEnd();
    const params = computeShot(points, canvas, true);
    if (params) onShoot(params);
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    down(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', () => up());
  canvas.addEventListener('pointercancel', () => {
    active = false;
    if (onAimEnd) onAimEnd();
  });
}
