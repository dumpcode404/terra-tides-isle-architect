// Entry point: fixed-timestep loop, pointer UI, screens.
// Frame-rate independent: requestAnimationFrame with clamped deltaTime.

import { FIELD } from './config.js';
import { createInput } from './input.js';
import {
  createWorld, SCREEN_CAMPAIGNWIN, SCREEN_CHAPTERWIN,
  SCREEN_FAIL, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE,
} from './world.js';
import { createParticles } from './particles.js';
import { fitView, renderFrame } from './render.js';
import { setMuted, unlockAudio } from './audio.js';
import { shotParams, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const g = canvas.getContext('2d');

const params = shotParams();
const SHOT_MODE = params.shot !== '';
const SEED = (params.seed || 7) >>> 0;

const world = createWorld({ seed: SEED, silent: SHOT_MODE, store: SHOT_MODE ? null : window.localStorage });
world.state.fx = createParticles();
const input = createInput(canvas);
const particles = world.state.fx;

world.loadBest(SHOT_MODE ? null : window.localStorage);
if (world.state.best > 0) {
  setStatus(`Best voyage ${world.state.best}. Press Enter or click a mode.`);
}

function setStatus(text) {
  if (statusEl && statusEl.textContent !== text) statusEl.textContent = text;
}

function toLogical(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = clientX - r.left;
  const y = clientY - r.top;
  const v = world.state.view || { scale: 1, ox: 0, oy: 0 };
  return { x: (x - v.ox) / v.scale, y: (y - v.oy) / v.scale };
}

canvas.addEventListener('mousedown', (e) => {
  unlockAudio();
  if (SHOT_MODE) return;
  const p = toLogical(e.clientX, e.clientY);
  const s = world.state;
  if (s.screen === SCREEN_TITLE || s.screen === SCREEN_CHAPTERWIN || s.screen === SCREEN_FAIL) {
    world.clickAt(p.x, p.y);
    input.endFrame(); // consume the click so it never leaks into a placement
    setStatus('Draft tiles, weave rivers, bloom forests.');
  }
});

canvas.addEventListener('touchstart', (e) => {
  unlockAudio();
  if (SHOT_MODE) return;
  const s = world.state;
  for (const t of e.changedTouches) {
    const p = toLogical(t.clientX, t.clientY);
    if (s.screen === SCREEN_TITLE || s.screen === SCREEN_CHAPTERWIN || s.screen === SCREEN_FAIL) {
      world.clickAt(p.x, p.y);
      input.endFrame(); // consume the tap so it never leaks into a placement
      setStatus('Draft tiles, weave rivers, bloom forests.');
    }
  }
}, { passive: true });

window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);

if (SHOT_MODE) {
  stageShot(params.shot, world, input);
  const view = fitView(canvas);
  particles.update(0.016);
  world.update(0.0001, input, null);
  renderFrame(g, world, input, particles, view, world.state.time + 4.2);
  setStatus(`Screenshot scene: ${params.shot}.`);
} else {
  let last = performance.now();
  let announced = SCREEN_TITLE;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    if (input.mutePressed) {
      world.state.muted = !world.state.muted;
      setMuted(world.state.muted);
    }
    world.update(dt, input, window.localStorage);
    particles.update(dt);
    const view = fitView(canvas);
    renderFrame(g, world, input, particles, view, world.state.time);
    const s = world.state;
    if (s.screen !== announced) {
      announced = s.screen;
      if (s.screen === SCREEN_PLAY) setStatus(`Score ${s.score}. Place tiles, chase synergy.`);
      else if (s.screen === SCREEN_CHAPTERWIN) setStatus(`Chapter complete! Score ${s.score}. Click for next.`);
      else if (s.screen === SCREEN_CAMPAIGNWIN) setStatus(`Master Architect! Final score ${s.score}.`);
      else if (s.screen === SCREEN_FAIL) setStatus('The tide fell short. Press R to retry.');
      else setStatus('TERRACOTTA TIDES: ISLE ARCHITECT. Click a mode or press Enter.');
    }
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => fitView(canvas));
window.addEventListener('orientationchange', () => fitView(canvas));

export { FIELD };
