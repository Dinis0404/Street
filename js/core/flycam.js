/* 除錯飛行相機：F 鍵進出自由飛行
   WASD 前後左右 · Q/E 下降/上升 · Shift 加速×4 · 滑鼠拖曳轉向 */
import * as THREE from 'three';

function createFlyCam(camera, dom){
  const keys = { f: false, b: false, l: false, r: false, run: false, down: false, up: false };
  let active = false;
  let yaw = 0, pitch = 0;
  const tmpDir = new THREE.Vector3();

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF'){ toggle(); e.preventDefault(); return; }
    if (!active) return;
    switch (e.code){
      case 'KeyW': case 'ArrowUp': keys.f = true; break;
      case 'KeyS': case 'ArrowDown': keys.b = true; break;
      case 'KeyA': case 'ArrowLeft': keys.l = true; break;
      case 'KeyD': case 'ArrowRight': keys.r = true; break;
      case 'ShiftLeft': case 'ShiftRight': keys.run = true; break;
      case 'KeyQ': keys.down = true; break;
      case 'KeyE': keys.up = true; break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code){
      case 'KeyW': case 'ArrowUp': keys.f = false; break;
      case 'KeyS': case 'ArrowDown': keys.b = false; break;
      case 'KeyA': case 'ArrowLeft': keys.l = false; break;
      case 'KeyD': case 'ArrowRight': keys.r = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.run = false; break;
      case 'KeyQ': keys.down = false; break;
      case 'KeyE': keys.up = false; break;
    }
  });

  let dragging = false, lastX = 0, lastY = 0;
  dom.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging || !active) return;
    yaw -= (e.clientX - lastX) * 0.0056;
    pitch += (e.clientY - lastY) * 0.0045;
    pitch = Math.max(-1.55, Math.min(1.55, pitch));
    lastX = e.clientX; lastY = e.clientY;
  });
  dom.addEventListener('pointerup', () => { dragging = false; });

  function toggle(){
    active = !active;
    if (active){
      /* 從目前視角無縫接手 */
      const dir = camera.getWorldDirection(tmpDir);
      pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
      yaw = Math.atan2(-dir.x, -dir.z);
    }
    keys.f = keys.b = keys.l = keys.r = keys.down = keys.up = false;
  }

  return {
    get active(){ return active; },
    /* 每幀呼叫：飛行中直接驅動相機並回傳 true */
    update(dt){
      if (!active) return false;
      const sp = (keys.run ? 96 : 24) * dt;
      const f = (keys.f ? 1 : 0) - (keys.b ? 1 : 0);
      const r = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      const v = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
      const cp = Math.cos(pitch);
      const fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp;
      const rx = -fz, rz = fx;   /* 右向量 = 前向量繞 Y 軸 90° */
      camera.position.x += (fx * f + rx * r) * sp;
      camera.position.y += (fy * f + v) * sp;
      camera.position.z += (fz * f + rz * r) * sp;
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
      return true;
    }
  };
}

export { createFlyCam };
