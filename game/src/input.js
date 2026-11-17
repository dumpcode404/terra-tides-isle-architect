// Mouse + touch + keyboard cursor for the isometric board.

export function createInput(canvas) {
  const keys = Object.create(null);
  const state = {
    mouseX: 0,
    mouseY: 0,
    usingTouch: false,
    clickFired: false,
    cursorX: 3,
    cursorY: 3,
    cursorMoved: false,
    rotateDir: 0,
    placePressed: false,
    undoPressed: false,
    hintPressed: false,
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    confirmPressed: false,
    cardChoice: -1,
  };

  function canvasPos(t) {
    const r = canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      return;
    }
    keys[e.code] = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      state.cursorY -= 1;
      state.cursorMoved = true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      state.cursorY += 1;
      state.cursorMoved = true;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      state.cursorX -= 1;
      state.cursorMoved = true;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      state.cursorX += 1;
      state.cursorMoved = true;
    }
    if (e.code === 'KeyQ') state.rotateDir = -1;
    if (e.code === 'KeyE') state.rotateDir = 1;
    if (e.code === 'Space' || e.code === 'Enter') {
      state.placePressed = true;
      state.confirmPressed = true;
    }
    if (e.code === 'KeyZ') state.undoPressed = true;
    if (e.code === 'KeyH') state.hintPressed = true;
    if (e.code === 'KeyP' || e.code === 'Escape') state.pausePressed = true;
    if (e.code === 'KeyM') state.mutePressed = true;
    if (e.code === 'KeyR') state.restartPressed = true;
    if (e.code === 'Digit1') state.cardChoice = 0;
    if (e.code === 'Digit2') state.cardChoice = 1;
    if (e.code === 'Digit3') state.cardChoice = 2;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    Object.keys(keys).forEach((k) => { keys[k] = false; });
  });

  canvas.addEventListener('mousedown', (e) => {
    const p = canvasPos(e);
    state.mouseX = p.x;
    state.mouseY = p.y;
    if (e.button === 0) state.clickFired = true;
  });
  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    state.mouseX = p.x;
    state.mouseY = p.y;
  });
  canvas.addEventListener('touchstart', (e) => {
    state.usingTouch = true;
    const p = canvasPos(e.changedTouches[0]);
    state.mouseX = p.x;
    state.mouseY = p.y;
    state.clickFired = true;
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  state.tapAt = function tapAt(x, y) {
    state.mouseX = x;
    state.mouseY = y;
    state.confirmPressed = true;
  };

  state.endFrame = function endFrame() {
    state.clickFired = false;
    state.cursorMoved = false;
    state.rotateDir = 0;
    state.placePressed = false;
    state.undoPressed = false;
    state.hintPressed = false;
    state.pausePressed = false;
    state.mutePressed = false;
    state.restartPressed = false;
    state.confirmPressed = false;
    state.cardChoice = -1;
  };

  return state;
}
