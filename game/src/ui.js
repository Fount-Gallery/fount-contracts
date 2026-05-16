import { CHALLENGES, isUnlocked } from './progression.js';

export function setupOverlay({ progress, onStart }) {
  const overlay = document.getElementById('overlay');
  const list = document.getElementById('challenge-list');
  const btn = document.getElementById('overlay-btn');
  const title = document.getElementById('overlay-title');
  const body = document.getElementById('overlay-body');

  let selected = null;

  function render(state = {}) {
    title.textContent = state.title ?? 'Penalty Kick';
    body.textContent = state.body ?? 'Pick a challenge. Swipe up on the pitch to shoot — angle, length and curve all matter.';
    btn.textContent = state.btnLabel ?? 'Play';

    list.innerHTML = '';
    selected = null;

    CHALLENGES.forEach((c, i) => {
      const row = document.createElement('div');
      const unlocked = isUnlocked(c.id, progress);
      const done = !!progress.completed[c.id];
      row.className = 'challenge' + (unlocked ? '' : ' locked') + (done ? ' complete' : '');

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = done ? '✓' : unlocked ? String(i + 1) : '🔒';

      const text = document.createElement('div');
      text.className = 'challenge-text';
      const name = document.createElement('div');
      name.className = 'challenge-name';
      name.textContent = c.name;
      const goal = document.createElement('div');
      goal.className = 'challenge-goal';
      goal.textContent = c.goal + ` · ${c.shots} shots`;
      text.append(name, goal);

      row.append(badge, text);

      if (unlocked) {
        row.addEventListener('click', () => {
          document.querySelectorAll('.challenge.selected').forEach(el => el.classList.remove('selected'));
          row.classList.add('selected');
          selected = c;
        });
      }
      list.appendChild(row);

      // Auto-select first unlocked-but-not-complete
      if (unlocked && !done && !selected) {
        row.classList.add('selected');
        selected = c;
      }
    });

    // Fallback selection
    if (!selected) {
      const firstUnlocked = CHALLENGES.find(c => isUnlocked(c.id, progress));
      if (firstUnlocked) selected = firstUnlocked;
    }
  }

  btn.onclick = () => {
    if (!selected) return;
    overlay.classList.add('hidden');
    onStart(selected);
  };

  return {
    show(state) {
      overlay.classList.remove('hidden');
      render(state);
    },
    hide() {
      overlay.classList.add('hidden');
    },
  };
}

export function setChallengeTitle(text) {
  const el = document.getElementById('challenge-title');
  if (el) el.textContent = text;
}

export function setScore(scored, shots, totalShots) {
  const el = document.getElementById('score-value');
  if (el) el.textContent = `${scored} · ${shots}/${totalShots}`;
}

export function setHint(text, fade = false) {
  const el = document.getElementById('hint');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('hidden', fade);
}
