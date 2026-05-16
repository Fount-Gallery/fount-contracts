// Swipe input — captures a path, computes start/end/curvature.
// Aim is derived from final swipe direction (relative to canvas center),
// power from swipe length, and curve from the lateral deviation of the
// midpoint vs. the straight line from start to end.

export function attachSwipe(canvas, onShoot) {
  let active = false;
  let points = [];
  let startTime = 0;

  function down(x, y) {
    active = true;
    points = [{ x, y, t: performance.now() }];
    startTime = performance.now();
  }

  function move(x, y) {
    if (!active) return;
    points.push({ x, y, t: performance.now() });
    if (points.length > 200) points.shift();
  }

  function up() {
    if (!active) return;
    active = false;
    if (points.length < 4) return;

    const a = points[0];
    const b = points[points.length - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);

    // Must be primarily an upward swipe
    if (dy > -40 || len < 60) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Aim X: based on horizontal component of swipe vector (-1..1)
    // The maximum useful horizontal swing scales with screen width.
    const aimX = Math.max(-1, Math.min(1, dx / (w * 0.32)));

    // Aim Y: based on vertical component — longer/steeper swipe = higher.
    // Map |dy|/h * scale to 0..1.
    const aimY = Math.max(0.1, Math.min(1, (-dy / h) * 1.6));

    // Power from total swipe length & speed
    const dt = Math.max(80, b.t - a.t);
    const speed = len / dt; // px/ms
    const power = Math.max(0.45, Math.min(1, speed * 0.9));

    // Curve: signed perpendicular distance from path midpoint to the line a->b.
    // Average it across several points for stability.
    let curveSum = 0;
    let count = 0;
    for (let i = 2; i < points.length - 2; i++) {
      const p = points[i];
      // Perp distance with sign relative to swipe direction
      const cross = (b.x - a.x) * (a.y - p.y) - (b.y - a.y) * (a.x - p.x);
      curveSum += cross;
      count++;
    }
    const avg = count ? curveSum / count : 0;
    // Normalize by len^2 (cross magnitude grows with segment length)
    const curve = Math.max(-1, Math.min(1, (avg / (len * len)) * 14));

    onShoot({ aimX, aimY, power, curve });
  }

  // Pointer events cover both touch and mouse uniformly
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); down(e.clientX, e.clientY); });
  canvas.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', () => up());
  canvas.addEventListener('pointercancel', () => { active = false; });
}
