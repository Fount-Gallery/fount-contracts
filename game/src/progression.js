// Challenges + persistent unlocks.

const STORAGE_KEY = 'penalty_progress_v1';

// Each challenge defines its own keeper behaviour and win condition. The
// kicker's perspective stays the same — only difficulty and goal change.
export const CHALLENGES = [
  {
    id: 'warmup',
    name: 'Warm-up',
    goal: 'Score 3',
    target: 3,
    shots: 5,
    keeper: { reaction: 0.55, dive: 0.55, anticipation: 0.0 },
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    goal: 'Score 4 of 5',
    target: 4,
    shots: 5,
    keeper: { reaction: 0.45, dive: 0.5, anticipation: 0.1 },
  },
  {
    id: 'curl-it',
    name: 'Curl It',
    goal: 'Score 3 with curve',
    target: 3,
    shots: 6,
    requireCurve: 0.25,
    keeper: { reaction: 0.4, dive: 0.5, anticipation: 0.2 },
  },
  {
    id: 'top-bins',
    name: 'Top Bins',
    goal: 'Score 3 in upper third',
    target: 3,
    shots: 6,
    requireHigh: true,
    keeper: { reaction: 0.4, dive: 0.5, anticipation: 0.15 },
  },
  {
    id: 'streak',
    name: 'Hot Streak',
    goal: 'Score 4 in a row',
    target: 4,
    shots: 8,
    streak: true,
    keeper: { reaction: 0.38, dive: 0.45, anticipation: 0.25 },
  },
  {
    id: 'reflex',
    name: 'Fast Keeper',
    goal: 'Score 4 of 5',
    target: 4,
    shots: 5,
    keeper: { reaction: 0.3, dive: 0.4, anticipation: 0.3 },
  },
  {
    id: 'reader',
    name: 'The Reader',
    goal: 'Beat anticipating keeper',
    target: 3,
    shots: 5,
    keeper: { reaction: 0.35, dive: 0.42, anticipation: 0.6 },
  },
  {
    id: 'low-power',
    name: 'Finesse',
    goal: 'Score 3 placed shots',
    target: 3,
    shots: 5,
    maxPower: 0.7,
    keeper: { reaction: 0.45, dive: 0.5, anticipation: 0.15 },
  },
  {
    id: 'no-mistakes',
    name: 'No Mistakes',
    goal: 'Score 5 of 5',
    target: 5,
    shots: 5,
    keeper: { reaction: 0.36, dive: 0.42, anticipation: 0.2 },
  },
  {
    id: 'final',
    name: 'The Final',
    goal: 'Score 5 in a row',
    target: 5,
    shots: 10,
    streak: true,
    keeper: { reaction: 0.32, dive: 0.4, anticipation: 0.35 },
  },
];

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: {}, lastPlayed: null };
    return JSON.parse(raw);
  } catch {
    return { completed: {}, lastPlayed: null };
  }
}

export function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

export function isUnlocked(challengeId, progress) {
  const idx = CHALLENGES.findIndex(c => c.id === challengeId);
  if (idx <= 0) return true;
  const prev = CHALLENGES[idx - 1];
  return !!progress.completed[prev.id];
}

// In-memory state for the currently active challenge run.
export function startRun(challenge) {
  return {
    challenge,
    shotsTaken: 0,
    scored: 0,
    currentStreak: 0,
    bestStreak: 0,
    qualifyingScored: 0, // for "with curve" / "in top third" etc.
  };
}

export function applyShotResult(run, result) {
  const { outcome, power, curve, aimY } = result;
  run.shotsTaken += 1;

  const isGoal = outcome === 'goal';
  if (isGoal) {
    run.scored += 1;
    run.currentStreak += 1;
    run.bestStreak = Math.max(run.bestStreak, run.currentStreak);
  } else {
    run.currentStreak = 0;
  }

  // Challenge-specific qualifying goals
  const c = run.challenge;
  if (isGoal) {
    let counts = true;
    if (c.requireCurve && Math.abs(curve) < c.requireCurve) counts = false;
    if (c.requireHigh && aimY < 0.6) counts = false;
    if (c.maxPower && power > c.maxPower) counts = false;
    if (counts) run.qualifyingScored += 1;
  }

  // Win conditions
  let done = false;
  let won = false;
  if (c.streak) {
    if (run.bestStreak >= c.target) { done = true; won = true; }
    else if (run.shotsTaken >= c.shots) { done = true; won = false; }
  } else {
    const target = (c.requireCurve || c.requireHigh || c.maxPower) ? run.qualifyingScored : run.scored;
    if (target >= c.target) { done = true; won = true; }
    else if (run.shotsTaken >= c.shots) { done = true; won = false; }
  }

  return { done, won, isGoal };
}
