// Tiny synthesized SFX via Web Audio API — no asset files needed.

let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function envGain(audioCtx, { attack = 0.005, decay = 0.15, sustain = 0, release = 0.1, peak = 0.4 } = {}) {
  const g = audioCtx.createGain();
  const t = audioCtx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.linearRampToValueAtTime(sustain * peak, t + attack + decay);
  g.gain.linearRampToValueAtTime(0, t + attack + decay + release);
  return g;
}

export function sfxKick() {
  const a = ac();
  // Low thump
  const o = a.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(50, a.currentTime + 0.18);
  const g = envGain(a, { attack: 0.001, decay: 0.05, release: 0.18, peak: 0.6 });
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.3);

  // Snap (noise)
  const buf = a.createBuffer(1, a.sampleRate * 0.08, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const ng = a.createGain(); ng.gain.value = 0.35;
  const filt = a.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 1200;
  src.connect(filt).connect(ng).connect(a.destination);
  src.start();
}

export function sfxNet() {
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.6;
  const src = a.createBufferSource(); src.buffer = buf;
  const filt = a.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2400; filt.Q.value = 0.7;
  const g = envGain(a, { attack: 0.001, decay: 0.15, release: 0.25, peak: 0.5 });
  src.connect(filt).connect(g).connect(a.destination);
  src.start();
}

export function sfxPost() {
  const a = ac();
  const o = a.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(900, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(700, a.currentTime + 0.6);
  const g = envGain(a, { attack: 0.001, decay: 0.05, release: 0.8, peak: 0.4 });
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 1.0);
}

export function sfxSave() {
  const a = ac();
  const o = a.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(110, a.currentTime + 0.25);
  const g = envGain(a, { attack: 0.001, decay: 0.05, release: 0.25, peak: 0.35 });
  const filt = a.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 800;
  o.connect(filt).connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.4);
}

export function sfxCrowd() {
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * 1.6, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
  const src = a.createBufferSource(); src.buffer = buf;
  const filt = a.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1100; filt.Q.value = 0.7;
  const g = a.createGain();
  g.gain.setValueAtTime(0, a.currentTime);
  g.gain.linearRampToValueAtTime(0.5, a.currentTime + 0.05);
  g.gain.linearRampToValueAtTime(0.3, a.currentTime + 0.6);
  g.gain.linearRampToValueAtTime(0, a.currentTime + 1.6);
  src.connect(filt).connect(g).connect(a.destination);
  src.start();
}
