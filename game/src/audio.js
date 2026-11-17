// Warm marimba/chime soundscape: wooden plucks, soft thocks, rising cascade
// notes and chapter motifs. No audio files; context starts on first gesture.

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.4;
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

export function setMuted(m) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.4, ctx.currentTime, 0.02);
}

// Marimba-ish pluck: triangle + harmonic, fast decay.
function pluck(freq, vol, delay) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + (delay || 0);
  const osc = c.createOscillator();
  const harm = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  harm.type = 'sine';
  harm.frequency.value = freq * 4;
  const hg = c.createGain();
  hg.gain.value = 0.18;
  harm.connect(hg);
  hg.connect(g);
  osc.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(vol || 0.22, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  osc.start(t0);
  harm.start(t0);
  osc.stop(t0 + 0.55);
  harm.stop(t0 + 0.55);
}

function thock(delay) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + (delay || 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, t0);
  osc.frequency.exponentialRampToValueAtTime(140, t0 + 0.08);
  g.gain.setValueAtTime(0.3, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.15);
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0];

export function sfxPlace() {
  thock(0);
  pluck(392, 0.16, 0.02);
}

export function sfxRotate() {
  thock(0);
}

export function sfxCascade(step) {
  pluck(SCALE[Math.min(SCALE.length - 1, 2 + step)], 0.24, 0);
  pluck(SCALE[Math.min(SCALE.length - 1, 2 + step)] * 2, 0.06, 0);
}

export function sfxPickup() {
  pluck(1318.5, 0.12, 0);
}

export function sfxChapter() {
  [0, 2, 4, 7, 9].forEach((s, i) => pluck(SCALE[s % SCALE.length], 0.2, i * 0.14));
}

export function sfxWin() {
  [0, 2, 4, 5, 7, 9, 11, 12].forEach((s, i) => pluck(SCALE[s % SCALE.length], 0.2, i * 0.13));
}

export function sfxFail() {
  pluck(392, 0.18, 0);
  pluck(311.1, 0.18, 0.25);
}

export function sfxSelect() {
  pluck(659.25, 0.14, 0);
}
