/* 輸入系統：鍵盤（WASD/跳躍/奔跑）、滑鼠拖曳軌道、滾輪縮放 */

function createInput(dom, orbit){
  const state = { f: false, b: false, l: false, r: false, run: false, jump: false, yaw: 0 };
  const KEYMAP = {
    KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b',
    KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
    ShiftLeft: 'run', ShiftRight: 'run'
  };
  window.addEventListener('keydown', (e) => {
    const m = KEYMAP[e.code];
    if (m){ state[m] = true; e.preventDefault(); }
    if (e.code === 'Space'){ state.jump = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const m = KEYMAP[e.code];
    if (m) state[m] = false;
  });

  let dragging = false, lastX = 0, lastY = 0;
  dom.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    orbit.yaw -= (e.clientX - lastX) * 0.0056;
    orbit.pitch += (e.clientY - lastY) * 0.0045;
    orbit.pitch = Math.max(-0.45, Math.min(1.25, orbit.pitch));
    lastX = e.clientX; lastY = e.clientY;
  });
  dom.addEventListener('pointerup', () => { dragging = false; });
  dom.addEventListener('wheel', (e) => {
    orbit.dist = Math.max(2.2, Math.min(16, orbit.dist * (1 + e.deltaY * 0.001)));
    e.preventDefault();
  }, { passive: false });

  return { state, orbit };
}

export { createInput };
