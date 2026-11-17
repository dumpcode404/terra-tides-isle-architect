// Simulation: isometric board, tile drafting, synergy scoring, river networks,
// region blooms, sequential cascades, campaign chapters and endless mode.
// Pure logic (no canvas); render.js draws. Deterministic under a seeded RNG.

import { CHAPTERS, DIRS, GRID, RIVER_MASK, TILE } from './config.js';
import { makeRng } from './random.js';
import {
  sfxCascade, sfxChapter, sfxFail, sfxPlace, sfxRotate,
  sfxSelect, sfxWin,
} from './audio.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSE = 2;
export const SCREEN_CHAPTERWIN = 3;
export const SCREEN_CAMPAIGNWIN = 4;
export const SCREEN_FAIL = 5;

const GROUP = {
  forest: 'green', farm: 'green',
  village: 'built', windmill: 'built',
  harbor: 'shore', shrine: 'spirit',
};

function pairScore(a, b) {
  if (a === 'forest' && b === 'forest') return 25;
  if ((a === 'forest' && b === 'farm') || (a === 'farm' && b === 'forest')) return 15;
  if (a === 'farm' && b === 'farm') return 10;
  if ((a === 'village' && b === 'farm') || (a === 'farm' && b === 'village')) return 30;
  if (a === 'village' && b === 'village') return 20;
  if ((a === 'village' && b === 'harbor') || (a === 'harbor' && b === 'village')) return 40;
  if ((a === 'windmill' && b === 'farm') || (a === 'farm' && b === 'windmill')) return 45;
  if ((a === 'windmill' && b === 'village') || (a === 'village' && b === 'windmill')) return 10;
  return 5;
}

function riverEdges(type, rot) {
  const base = RIVER_MASK[type];
  const out = [0, 0, 0, 0];
  for (let i = 0; i < 4; i += 1) out[(i + rot) % 4] = base[i];
  return out;
}

export function createWorld(opts) {
  const o = opts || {};
  const state = {
    screen: SCREEN_TITLE,
    pausedFrom: SCREEN_PLAY,
    time: 0,
    mode: 'campaign',
    chapter: 0,
    cells: [],
    hand: [],
    sel: 0,
    rot: 0,
    bag: [],
    tilesLeft: 0,
    score: 0,
    best: 0,
    breakdown: { synergy: 0, rivers: 0, regions: 0, cascade: 0 },
    stars: 0,
    combo: 0,
    comboBest: 0,
    cascadeQueue: [],
    cascadeTimer: 0,
    cascadeStep: 0,
    placements: 0,
    fails: 0,
    history: [],
    hover: null,
    cursor: { x: 3, y: 3 },
    hintCell: null,
    harvest: null,
    banner: 0,
    bannerText: '',
    muted: false,
    newBest: false,
    titleTime: 0,
    rng: makeRng((o.seed || 1) >>> 0),
    silent: !!o.silent,
    fx: null,
    view: { scale: 1, ox: 0, oy: 0 },
    cardRects: [],
    modeRects: [],
  };

  function eachCell(fn) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) fn(x, y, state.cells[y][x]);
    }
  }

  function cellAt(x, y) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null;
    return state.cells[y][x];
  }

  function isWater(x, y) {
    const c = cellAt(x, y);
    return c === null || !c.land;
  }

  function buildBoard(seed, size) {
    state.cells = [];
    const rng = makeRng(seed);
    const cx = (GRID - 1) / 2;
    const cy = (GRID - 1) / 2;
    for (let y = 0; y < GRID; y += 1) {
      const row = [];
      for (let x = 0; x < GRID; x += 1) {
        const d = Math.hypot(x - cx, y - cy) / (GRID / 2);
        const wob = Math.sin(x * 1.7 + seed) * 0.12 + Math.cos(y * 2.3 + seed * 0.7) * 0.12;
        const land = d + wob < size;
        row.push({
          land,
          h: land && rng() < 0.22 ? 1 : 0,
          tile: null,
          bloom: 0,
        });
      }
      state.cells.push(row);
    }
  }

  function shuffleBag(list) {
    const rng = state.rng;
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function drawHand() {
    while (state.hand.length < 3 && state.bag.length > 0) {
      state.hand.push(state.bag.shift());
    }
    state.sel = Math.min(state.sel, Math.max(0, state.hand.length - 1));
  }

  function startChapter(n) {
    const def = CHAPTERS[n];
    state.mode = 'campaign';
    state.chapter = n;
    state.rng = makeRng(def.seed);
    buildBoard(def.seed, 0.78);
    state.bag = shuffleBag(def.bag);
    state.hand = [];
    state.sel = 0;
    state.rot = 0;
    state.tilesLeft = def.tiles;
    state.score = 0;
    state.breakdown = { synergy: 0, rivers: 0, regions: 0, cascade: 0 };
    state.stars = 0;
    state.combo = 0;
    state.comboBest = 0;
    state.cascadeQueue = [];
    state.cascadeTimer = 0;
    state.cascadeStep = 0;
    state.placements = 0;
    state.history = [];
    state.hover = null;
    state.cursor = { x: 3, y: 3 };
    state.hintCell = null;
    state.harvest = null;
    state.fails = 0;
    drawHand();
    state.banner = 2.4;
    state.bannerText = `CHAPTER ${n + 1} — ${def.name}`;
    state.screen = SCREEN_PLAY;
  }

  function startEndless() {
    const rng = state.rng;
    state.mode = 'endless';
    state.chapter = -1;
    buildBoard(99, 0.85);
    const pool = ['forest', 'forest', 'village', 'village', 'farm', 'farm', 'windmill', 'harbor', 'shrine'];
    state.bag = [];
    for (let i = 0; i < 60; i += 1) state.bag.push(pool[Math.floor(rng() * pool.length)]);
    state.hand = [];
    state.sel = 0;
    state.rot = 0;
    state.tilesLeft = Infinity;
    state.score = 0;
    state.breakdown = { synergy: 0, rivers: 0, regions: 0, cascade: 0 };
    state.stars = 0;
    state.combo = 0;
    state.comboBest = 0;
    state.cascadeQueue = [];
    state.cascadeTimer = 0;
    state.cascadeStep = 0;
    state.placements = 0;
    state.history = [];
    state.hover = null;
    state.cursor = { x: 3, y: 3 };
    state.hintCell = null;
    state.harvest = null;
    drawHand();
    state.banner = 2.4;
    state.bannerText = 'ENDLESS ARCHIPELAGO';
    state.screen = SCREEN_PLAY;
  }

  function snapshot() {
    return {
      tiles: state.cells.map((row) => row.map((c) => (c.tile ? { t: c.tile.type, r: c.tile.rot } : null))),
      blooms: state.cells.map((row) => row.map((c) => c.bloom)),
      score: state.score,
      breakdown: { ...state.breakdown },
      hand: state.hand.slice(),
      bag: state.bag.slice(),
      sel: state.sel,
      tilesLeft: state.tilesLeft,
      combo: state.combo,
      placements: state.placements,
    };
  }

  function restore(snap) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const t = snap.tiles[y][x];
        state.cells[y][x].tile = t ? { type: t.t, rot: t.r } : null;
        state.cells[y][x].bloom = snap.blooms[y][x];
      }
    }
    state.score = snap.score;
    state.breakdown = { ...snap.breakdown };
    state.hand = snap.hand.slice();
    state.bag = snap.bag.slice();
    state.sel = snap.sel;
    state.tilesLeft = snap.tilesLeft;
    state.combo = snap.combo;
    state.placements = snap.placements;
    state.cascadeQueue = [];
    state.cascadeTimer = 0;
    state.hintCell = null;
  }

  function undo() {
    const snap = state.history.pop();
    if (!snap) return false;
    restore(snap);
    return true;
  }

  function floodType(x, y, type, seen) {
    const key = `${x},${y}`;
    if (seen.has(key)) return [];
    const c = cellAt(x, y);
    if (!c || !c.tile || c.tile.type !== type) return [];
    seen.add(key);
    let out = [{ x, y }];
    for (const d of [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }]) {
      out = out.concat(floodType(x + d.dx, y + d.dy, type, seen));
    }
    return out;
  }

  function riverNetwork(x, y) {
    // Flood over river edges; returns {tiles, sea, harbors}.
    const seen = new Set();
    const stack = [[x, y]];
    const tiles = [];
    let sea = false;
    let harbors = 0;
    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      const key = `${cx},${cy}`;
      if (seen.has(key)) continue;
      const c = cellAt(cx, cy);
      if (!c || !c.tile) continue;
      const edges = riverEdges(c.tile.type, c.tile.rot);
      if (!edges.some((e) => e)) continue;
      seen.add(key);
      tiles.push({ x: cx, y: cy });
      if (c.tile.type === 'harbor') harbors += 1;
      for (let e = 0; e < 4; e += 1) {
        if (!edges[e]) continue;
        const nx = cx + [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][e].dx;
        const ny = cy + [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][e].dy;
        const n = cellAt(nx, ny);
        if (!n || !n.land || !n.tile) {
          sea = true; // river mouth to open water
          continue;
        }
        const ne = riverEdges(n.tile.type, n.tile.rot);
        if (ne[(e + 2) % 4]) stack.push([nx, ny]);
      }
    }
    return { tiles, sea, harbors };
  }

  function computePlacement(cx, cy, type, rot) {
    const cell = cellAt(cx, cy);
    if (!cell || !cell.land) return { legal: false, reason: 'Open water — Harbors need a coast, others need land.' };
    if (cell.tile) return { legal: false, reason: 'Occupied.' };
    if (type === 'harbor') {
      let coast = false;
      for (let e = 0; e < 4; e += 1) {
        const d = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][e];
        if (isWater(cx + d.dx, cy + d.dy)) {
          coast = true;
          break;
        }
      }
      if (!coast) return { legal: false, reason: 'Harbors need a coast (adjacent water).' };
    }
    const events = [];
    let synergy = 0;
    const seenTypes = new Set();
    const edges = riverEdges(type, rot);
    let riverLinks = 0;
    let seaMouth = false;
    for (let e = 0; e < 4; e += 1) {
      const d = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][e];
      const n = cellAt(cx + d.dx, cy + d.dy);
      if (n && n.tile) {
        const gain = pairScore(type, n.tile.type);
        synergy += gain;
        seenTypes.add(n.tile.type);
        const ne = riverEdges(n.tile.type, n.tile.rot);
        if (edges[e] && ne[(e + 2) % 4]) riverLinks += 1;
      } else if (edges[e] && (!n || !n.land)) {
        seaMouth = true;
      }
    }
    if (synergy > 0) events.push({ kind: 'synergy', label: `+${synergy} SYNERGY`, base: synergy, x: cx, y: cy });
    if (riverLinks > 0) {
      const pts = riverLinks * 30;
      events.push({ kind: 'river', label: `+${pts} STREAM LINK`, base: pts, x: cx, y: cy });
    }
    if (seaMouth) events.push({ kind: 'river', label: '+25 FLOWS TO SEA', base: 25, x: cx, y: cy });
    if (type === 'shrine' && seenTypes.size >= 3) {
      events.push({ kind: 'spirit', label: `+${seenTypes.size * 25} SHRINE HARMONY`, base: seenTypes.size * 25, x: cx, y: cy });
    }
    return { legal: true, reason: '', events, synergy, riverLinks, seaMouth };
  }

  function regionAndNetworkEvents(cx, cy, type) {
    const extra = [];
    if (type === 'forest' || type === 'farm' || type === 'village') {
      const region = floodType(cx, cy, type, new Set());
      if (region.length >= 4) {
        for (const t of region) {
          extra.push({ kind: 'region', label: '+25 BLOOM', base: 25, x: t.x, y: t.y, region: true });
        }
      }
    }
    // River network completion.
    const edges = riverEdges(type, state.rot);
    if (edges.some((e) => e)) {
      const net = riverNetwork(cx, cy);
      if (net.tiles.length >= 3) {
        extra.push({ kind: 'river', label: `+${net.tiles.length * 20} WATERSHED`, base: net.tiles.length * 20, x: cx, y: cy });
      }
      if (net.harbors >= 2) {
        extra.push({ kind: 'river', label: '+150 TWIN HARBOR LINK', base: 150, x: cx, y: cy });
      }
    }
    // Shrine resonance: shrine beside a fresh bloom.
    if (type !== 'shrine') {
      for (let e = 0; e < 4; e += 1) {
        const d = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][e];
        const n = cellAt(cx + d.dx, cy + d.dy);
        if (n && n.tile && n.tile.type === 'shrine' && extra.some((ev) => ev.kind === 'region')) {
          extra.push({ kind: 'spirit', label: '+100 SHRINE RESONANCE', base: 100, x: cx + d.dx, y: cy + d.dy });
          break;
        }
      }
    }
    return extra;
  }

  function placeAt(cx, cy) {
    if (state.hand.length === 0) return false;
    const type = state.hand[state.sel];
    const probe = computePlacement(cx, cy, type, state.rot);
    if (!probe.legal) {
      state.harvest = probe.reason;
      return false;
    }
    state.history.push(snapshot());
    if (state.history.length > 60) state.history.shift();
    cellAt(cx, cy).tile = { type, rot: state.rot };
    cellAt(cx, cy).bloom = 0;
    state.hand.splice(state.sel, 1);
    state.sel = 0;
    state.tilesLeft -= 1;
    state.placements += 1;
    state.hintCell = null;
    state.harvest = null;
    const followups = regionAndNetworkEvents(cx, cy, type);
    const all = probe.events.concat(followups);
    // Bloom the region cells.
    for (const ev of followups) {
      if (ev.region) {
        const c = cellAt(ev.x, ev.y);
        if (c) c.bloom = 1.2;
      }
    }
    if (all.length === 0) {
      all.push({ kind: 'synergy', label: '+20 PLACED', base: 20, x: cx, y: cy });
    }
    // Combo: rich placements chain.
    if (all.length >= 3) {
      state.combo += 1;
      state.comboBest = Math.max(state.comboBest, state.combo);
    } else {
      state.combo = 0;
    }
    for (const ev of all) state.cascadeQueue.push(ev);
    state.cascadeStep = 0;
    if (!state.silent) sfxPlace();
    drawHand();
    return true;
  }

  function resolveCascade(dt) {
    if (state.cascadeQueue.length === 0) return;
    state.cascadeTimer -= dt;
    if (state.cascadeTimer > 0) return;
    state.cascadeTimer = 0.22;
    const ev = state.cascadeQueue.shift();
    const mult = Math.min(5, 1 + state.cascadeStep * 0.5);
    const pts = Math.round(ev.base * mult);
    state.score += pts;
    if (ev.kind === 'synergy') state.breakdown.synergy += pts;
    else if (ev.kind === 'river') state.breakdown.rivers += pts;
    else if (ev.kind === 'region') state.breakdown.regions += pts;
    else state.breakdown.cascade += pts;
    const label = mult > 1 ? `${ev.label} ×${mult.toFixed(1).replace(/\.0$/, '')}` : ev.label;
    if (state.fx) {
      const p = cellCenter(ev.x, ev.y);
      state.fx.text(p.x, p.y - 24, label, ev.kind === 'region' ? '#3a8a3a' : ev.kind === 'river' ? '#1d7a9a' : ev.kind === 'spirit' ? '#a04a7a' : '#7a4a1a', 14);
      state.fx.pop(p.x, p.y, ev.kind === 'region' ? '#6aba5e' : '#ffe95e');
      if (mult >= 2) state.fx.text(p.x, p.y - 44, `CASCADE ×${mult}`, '#c0392b', 13);
    }
    if (!state.silent) sfxCascade(state.cascadeStep);
    state.cascadeStep += 1;
    if (state.cascadeQueue.length === 0) {
      state.cascadeStep = 0;
      checkChapterEnd();
    }
  }

  function checkChapterEnd() {
    if (state.screen !== SCREEN_PLAY) return;
    if (state.mode === 'campaign') {
      const def = CHAPTERS[state.chapter];
      if (state.score >= def.target) {
        const ratio = state.score / def.star3;
        state.stars = state.score >= def.star3 ? 3 : ratio >= 0.66 ? 2 : 1;
        saveBest();
        state.screen = SCREEN_CHAPTERWIN;
        if (!state.silent) sfxChapter();
      } else if (state.tilesLeft <= 0 && state.hand.length === 0) {
        state.screen = SCREEN_FAIL;
        if (!state.silent) sfxFail();
      }
    } else {
      // Endless voyage completes every 24 placements with a summary.
      if (state.placements > 0 && state.placements % 24 === 0 && state.cascadeQueue.length === 0) {
        saveBest();
        state.screen = SCREEN_CHAPTERWIN;
        state.stars = state.score >= 3000 ? 3 : state.score >= 1800 ? 2 : 1;
        if (!state.silent) sfxChapter();
      }
      if (state.hand.length === 0 && state.bag.length === 0) {
        // Reshuffle silently: endless never strands.
        const pool = ['forest', 'forest', 'village', 'village', 'farm', 'farm', 'windmill', 'harbor', 'shrine'];
        for (let i = 0; i < 30; i += 1) state.bag.push(pool[Math.floor(state.rng() * pool.length)]);
        drawHand();
      }
    }
  }

  function nextChapter() {
    if (state.mode === 'endless') {
      state.screen = SCREEN_PLAY; // continue the voyage
      return;
    }
    if (state.chapter + 1 >= CHAPTERS.length) {
      state.screen = SCREEN_CAMPAIGNWIN;
      if (!state.silent) sfxWin();
    } else {
      startChapter(state.chapter + 1);
    }
  }

  // Staging helper: force a chapter-complete score through the real gate.
  function debugWin() {
    if (state.screen !== SCREEN_PLAY || state.cascadeQueue.length > 0) return;
    if (state.mode === 'campaign') {
      const target = CHAPTERS[state.chapter].target + 420;
      if (state.score < target) {
        state.breakdown.cascade += target - state.score;
        state.score = target;
      }
    } else if (state.score < 2400) {
      state.breakdown.cascade += 2400 - state.score;
      state.score = 2400;
    }
    checkChapterEnd();
  }

  // Staging helper: load an exact hand (same tiles a draw could give).
  function debugHand(types) {
    state.hand = types.slice();
    state.sel = 0;
  }

  function retryChapter() {
    if (state.mode === 'endless') startEndless();
    else startChapter(state.chapter);
  }

  function saveBest() {
    try {
      if (o.store && state.score > state.best) {
        o.store.setItem('terracotta-tides-best', String(state.score));
        state.best = state.score;
        state.newBest = true;
      }
    } catch (e) { /* unavailable */ }
  }

  function loadBest(store) {
    try {
      const v = store && store.getItem('terracotta-tides-best');
      state.best = v ? parseInt(v, 10) || 0 : 0;
    } catch (e) {
      state.best = 0;
    }
  }

  function computeHint() {
    let best = null;
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const cell = cellAt(x, y);
        if (!cell || !cell.land || cell.tile) continue;
        for (const type of state.hand) {
          for (let rot = 0; rot < 4; rot += 1) {
            const probe = computePlacement(x, y, type, rot);
            if (!probe.legal) continue;
            let delta = probe.events.reduce((a, e) => a + e.base, 20);
            if (delta > (best ? best.delta : -1)) {
              best = { x, y, type, rot, delta };
            }
          }
        }
      }
    }
    state.hintCell = best;
    return best;
  }

  // Iso projection helpers (shared with render).
  function cellCenter(cx, cy) {
    const c = cellAt(cx, cy);
    const h = c ? c.h : 0;
    return { x: 480 + ((cx - cy) * 76) / 2, y: 150 + ((cx + cy) * 38) / 2 - h * 13 };
  }

  function screenToCell(mx, my) {
    const v = state.view;
    const lx = (mx - v.ox) / v.scale;
    const ly = (my - v.oy) / v.scale;
    const dx = lx - 480;
    const dy = ly - 150;
    const cx = Math.round((dx / 38 + dy / 19) / 2);
    const cy = Math.round((dy / 19 - dx / 38) / 2);
    if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return null;
    return { x: cx, y: cy };
  }

  function update(dt, input, store) {
    state.time += dt;
    if (state.screen === SCREEN_TITLE) {
      state.titleTime += dt;
      if (input.confirmPressed || input.restartPressed) {
        // Default: campaign.
        state.mode = 'campaign';
        state.rng = makeRng((o.seed || 1) >>> 0);
        startChapter(0);
      }
      return;
    }
    if (state.screen === SCREEN_CHAPTERWIN || state.screen === SCREEN_CAMPAIGNWIN || state.screen === SCREEN_FAIL) {
      if (input.restartPressed) {
        if (state.screen === SCREEN_FAIL) retryChapter();
        else if (state.screen === SCREEN_CHAPTERWIN) nextChapter();
        else {
          reset();
        }
      }
      return;
    }
    if (state.screen === SCREEN_PAUSE) {
      if (input.restartPressed) retryChapter();
      else if (input.pausePressed || input.confirmPressed) state.screen = state.pausedFrom;
      return;
    }
    // SCREEN_PLAY
    if (input.pausePressed) {
      state.pausedFrom = SCREEN_PLAY;
      state.screen = SCREEN_PAUSE;
      return;
    }
    if (input.restartPressed) {
      retryChapter();
      return;
    }
    if (input.mutePressed) state.muted = !state.muted;
    if (input.undoPressed && state.cascadeQueue.length === 0) undo();
    if (input.hintPressed) computeHint();
    if (input.rotateDir !== 0) {
      state.rot = (state.rot + input.rotateDir + 4) % 4;
      if (!state.silent) sfxRotate();
    }
    if (input.cardChoice >= 0 && input.cardChoice < state.hand.length) {
      state.sel = input.cardChoice;
      state.rot = 0;
    }
    // Hover follows pointer; keyboard cursor overrides on move.
    const cell = screenToCell(input.mouseX, input.mouseY);
    if (cell) {
      if (!state.hover || state.hover.x !== cell.x || state.hover.y !== cell.y) state.harvest = null;
      state.hover = cell;
      state.cursor = { x: cell.x, y: cell.y };
    }
    if (input.cursorMoved) {
      state.cursor.x = Math.max(0, Math.min(GRID - 1, state.cursor.x));
      state.cursor.y = Math.max(0, Math.min(GRID - 1, state.cursor.y));
      state.hover = { x: state.cursor.x, y: state.cursor.y };
    }
    const target = state.hover || state.cursor;
    if ((input.placePressed || input.clickFired) && state.cascadeQueue.length === 0) {
      input.clickFired = false;
      if (target) placeAt(target.x, target.y);
    }
    if (state.cascadeQueue.length > 0) resolveCascade(dt);
    // Bloom decay.
    eachCell((x, y, c) => {
      if (c.bloom > 0) c.bloom = Math.max(0, c.bloom - dt);
    });
    state.banner = Math.max(0, state.banner - dt);
  }

  state.cardRects = [];
  state.modeRects = [];
  state.handRects = [];
  state.toolRects = []; // [rotate, undo, hint] buttons, in order

  function clickAt(x, y) {
    if (state.screen === SCREEN_TITLE) {
      for (let i = 0; i < state.modeRects.length; i += 1) {
        const r = state.modeRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (!state.silent) sfxSelect();
          if (i === 0) {
            state.mode = 'campaign';
            state.rng = makeRng((o.seed || 1) >>> 0);
            startChapter(0);
          } else {
            startEndless();
          }
          return true;
        }
      }
      // Anywhere else on title starts campaign.
      state.mode = 'campaign';
      state.rng = makeRng((o.seed || 1) >>> 0);
      startChapter(0);
      return true;
    }
    if (state.screen === SCREEN_CHAPTERWIN) {
      nextChapter();
      return true;
    }
    if (state.screen === SCREEN_CAMPAIGNWIN) {
      return false;
    }
    if (state.screen === SCREEN_FAIL) {
      retryChapter();
      return true;
    }
    if (state.screen === SCREEN_PLAY) {
      // Hand dock selection.
      for (let i = 0; i < state.handRects.length; i += 1) {
        const r = state.handRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          state.sel = i;
          state.rot = 0;
          if (!state.silent) sfxSelect();
          return true;
        }
      }
      // Tool buttons: rotate, undo, hint.
      for (let i = 0; i < state.toolRects.length; i += 1) {
        const r = state.toolRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (i === 0) {
            state.rot = (state.rot + 1) % 4;
            if (!state.silent) sfxRotate();
          } else if (i === 1) {
            if (state.cascadeQueue.length === 0) undo();
          } else {
            computeHint();
          }
          return true;
        }
      }
    }
    return false;
  }

  function reset() {
    state.screen = SCREEN_TITLE;
    state.time = 0;
    state.mode = 'campaign';
    state.chapter = 0;
    state.cells = [];
    state.hand = [];
    state.sel = 0;
    state.rot = 0;
    state.bag = [];
    state.tilesLeft = 0;
    state.score = 0;
    state.breakdown = { synergy: 0, rivers: 0, regions: 0, cascade: 0 };
    state.stars = 0;
    state.combo = 0;
    state.comboBest = 0;
    state.cascadeQueue = [];
    state.cascadeTimer = 0;
    state.cascadeStep = 0;
    state.placements = 0;
    state.history = [];
    state.hover = null;
    state.cursor = { x: 3, y: 3 };
    state.hintCell = null;
    state.harvest = null;
    state.banner = 0;
    state.newBest = false;
    state.titleTime = 0;
    state.rng = makeRng((o.seed || 1) >>> 0);
    buildTitleDiorama();
  }

  // A lush pre-built archipelago behind the title and mode cards.
  function buildTitleDiorama() {
    buildBoard(7, 0.82);
    const put = (x, y, type, rot) => {
      const c = cellAt(x, y);
      if (!c || !c.land || c.tile) return;
      if (type === 'harbor') {
        let coast = false;
        for (let e = 0; e < 4; e += 1) {
          const d = DIRS[e];
          if (isWater(x + d.dx, y + d.dy)) {
            coast = true;
            break;
          }
        }
        if (!coast) return;
      }
      c.tile = { type, rot: rot || 0 };
      c.bloom = 0;
    };
    put(2, 2, 'forest', 0);
    put(3, 2, 'forest', 0);
    put(2, 3, 'farm', 1);
    put(3, 3, 'village', 0);
    put(4, 3, 'windmill', 0);
    put(1, 3, 'forest', 0);
    put(4, 2, 'shrine', 0);
    put(2, 4, 'farm', 3);
    put(3, 4, 'farm', 0);
    put(4, 4, 'village', 0);
    put(5, 3, 'harbor', 3);
    put(3, 1, 'windmill', 0);
  }

  reset();

  return {
    state,
    reset,
    loadBest,
    startChapter,
    startEndless,
    placeAt,
    computePlacement,
    computeHint,
    undo,
    nextChapter,
    retryChapter,
    debugWin,
    debugHand,
    update,
    clickAt,
    cellCenter,
    screenToCell,
  };
}
