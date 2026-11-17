// Deterministic screenshot staging behind ?shot=title|place|cascade|mastery.
// Real placements through the scoring pipeline; same seed, same frame.

import { GRID } from './config.js';
import { SCREEN_CHAPTERWIN, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const STEP = 1 / 60;

function baseInput() {
  return {
    mouseX: 480, mouseY: 300, usingTouch: false,
    clickFired: false, cursorMoved: false, rotateDir: 0,
    placePressed: false, undoPressed: false, hintPressed: false,
    pausePressed: false, mutePressed: false, restartPressed: false,
    confirmPressed: false, cardChoice: -1,
  };
}

function setHover(world, input, cx, cy) {
  const p = world.cellCenter(cx, cy);
  const v = world.state.view;
  input.mouseX = p.x * v.scale + v.ox;
  input.mouseY = p.y * v.scale + v.oy;
  world.update(STEP, input, null);
}

function settle(world, input, maxSteps) {
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.state.cascadeQueue.length === 0) break;
    world.update(STEP, input, null);
  }
}

// Script a short authentic opening: place hand tiles on good cells.
function scriptedOpening(world, input, moves) {
  const inp = baseInput();
  for (const [hx, hy, rot] of moves) {
    const s = world.state;
    if (s.screen !== SCREEN_PLAY) return;
    // Select a matching hand tile if present.
    world.state.rot = rot || 0;
    setHover(world, inp, hx, hy);
    // Find hand index whose type fits best (just use current sel, rotate through).
    let placed = false;
    for (let attempt = 0; attempt < s.hand.length && !placed; attempt += 1) {
      world.state.sel = attempt;
      const probe = world.computePlacement(hx, hy, s.hand[attempt], world.state.rot);
      if (probe.legal) {
        inp.placePressed = true;
        world.update(STEP, inp, null);
        inp.placePressed = false;
        placed = true;
      }
    }
    settle(world, inp, 120);
    if (world.state.screen !== SCREEN_PLAY) return;
  }
}

/** Drive world to the named scene. */
export function stageShot(name, world, input) {
  const s = world.state;
  if (name === 'place') {
    world.startChapter(0);
    scriptedOpening(world, input, [[2, 2, 0], [3, 2, 0], [2, 3, 1], [4, 3, 0]]);
    if (s.screen !== SCREEN_PLAY) {
      world.startChapter(0);
      scriptedOpening(world, input, [[2, 2, 0], [3, 2, 0]]);
    }
    // Hold a ghost over a rich cell with synergy arcs showing.
    if (s.screen === SCREEN_PLAY) {
      let hx = 3;
      let hy = 3;
      const probe0 = world.computePlacement(3, 3, s.hand[s.sel] || 'forest', s.rot);
      if (!probe0.legal) {
        hx = 4;
        hy = 2;
      }
      if (s.fx) s.fx.clear(); // fresh popups only, from the live preview
      for (let i = 0; i < 12; i += 1) setHover(world, baseInput(), hx, hy);
    }
    s.banner = 0;
    return;
  }
  if (name === 'cascade') {
    // Autumn highlands: plant a real 4-forest grove through the scoring
    // pipeline, then freeze mid-cascade with the multiplier running.
    world.startChapter(1);
    scriptedOpening(world, input, [[2, 4, 0], [4, 4, 0]]);
    if (s.screen === SCREEN_PLAY) {
      world.debugHand(['forest', 'forest', 'forest', 'forest']);
      // Find a free 2x2 land block.
      let block = null;
      for (let y = 1; y < GRID - 1 && !block; y += 1) {
        for (let x = 1; x < GRID - 1 && !block; x += 1) {
          const cells = [s.cells[y][x], s.cells[y][x + 1], s.cells[y + 1][x], s.cells[y + 1][x + 1]];
          if (cells.every((c) => c.land && !c.tile)) block = [x, y];
        }
      }
      if (block) {
        const [bx, by] = block;
        const inp = baseInput();
        const spots = [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]];
        for (const [fx, fy] of spots) {
          if (s.screen !== SCREEN_PLAY || s.hand.length === 0) break;
          const idx = s.hand.indexOf('forest');
          if (idx < 0) break;
          s.sel = idx;
          s.rot = 0;
          setHover(world, inp, fx, fy);
          const probe = world.computePlacement(fx, fy, 'forest', 0);
          if (!probe.legal) break;
          inp.placePressed = true;
          world.update(STEP, inp, null);
          inp.placePressed = false;
          settle(world, inp, 30);
        }
      }
    }
    // No cursor ghost in the cascade frame: park it off-board.
    s.hover = null;
    s.cursor = { x: -1, y: -1 };
    // Step a few events in so region pops + multiplier show mid-flight,
    // with a clean slate so only cascade callouts are visible.
    if (s.screen === SCREEN_PLAY && s.cascadeQueue.length > 2) {
      s.harvest = null;
      s.hover = null; // no ghost preview in the cascade frame
      if (s.fx) s.fx.clear();
      const inp = baseInput();
      inp.mouseX = -100;
      inp.mouseY = -100;
      const take = Math.min(3, s.cascadeQueue.length - 1);
      for (let i = 0; i < take; i += 1) {
        world.update(0.23, inp, null);
      }
    }
    if (s.screen !== SCREEN_PLAY) {
      world.startChapter(1);
      scriptedOpening(world, input, [[2, 2, 0], [3, 2, 0]]);
    }
    s.banner = 0;
    return;
  }
  if (name === 'mastery') {
    world.startChapter(0);
    // Play a real stretch of the chapter, then complete it through the gate.
    const spots = [[2, 2], [3, 2], [2, 3], [3, 3], [4, 3], [1, 3], [4, 2], [2, 4]];
    const inp = baseInput();
    for (const [hx, hy] of spots) {
      if (s.screen !== SCREEN_PLAY || s.hand.length === 0) break;
      let placed = false;
      for (let a = 0; a < s.hand.length && !placed; a += 1) {
        s.sel = a;
        for (let r = 0; r < 4 && !placed; r += 1) {
          s.rot = r;
          if (world.computePlacement(hx, hy, s.hand[a], r).legal) {
            setHover(world, inp, hx, hy);
            inp.placePressed = true;
            world.update(STEP, inp, null);
            inp.placePressed = false;
            placed = true;
          }
        }
      }
      settle(world, inp, 200);
      if (s.screen !== SCREEN_PLAY) break;
    }
    settle(world, baseInput(), 300);
    if (s.screen === SCREEN_PLAY) {
      world.debugWin();
    }
    settle(world, baseInput(), 300);
    // Freeze the blink phase so the next-chapter call to action is visible.
    if (s.screen === SCREEN_CHAPTERWIN) {
      const inp = baseInput();
      for (let i = 0; i < 40 && Math.floor(s.time * 2) % 2 !== 0; i += 1) {
        world.update(STEP, inp, null);
      }
    }
    return;
  }
  // Default: title diorama.
  world.reset();
  for (let i = 0; i < 4 / STEP; i += 1) {
    world.update(STEP, baseInput(), null);
    if (world.state.screen !== SCREEN_TITLE) break;
  }
  const inp = baseInput();
  for (let i = 0; i < 40 && Math.floor(world.state.time * 2) % 2 !== 0; i += 1) {
    world.update(STEP, inp, null);
  }
}

/** Query helper: read ?shot= and ?seed= from the URL. */
export function shotParams() {
  try {
    const q = new URLSearchParams(window.location.search);
    return { shot: q.get('shot') || '', seed: parseInt(q.get('seed') || '7', 10) || 7 };
  } catch (e) {
    return { shot: '', seed: 7 };
  }
}

export { SCREEN_CHAPTERWIN, SCREEN_PLAY, SCREEN_TITLE, GRID, baseInput };
