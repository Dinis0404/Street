/* 打卡機位系統：world.photoSpots 清單 → 面板下拉選單，一鍵切換機位
   機位格式：{ id, name, pos:[x,y,z], yaw, pitch, dist } */

function setupPhotoSpots(world, player, orbit){
  const sel = document.getElementById('spotSel');
  if (!sel || !world.photoSpots || !world.photoSpots.length) return;

  world.photoSpots.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = s.name;
    sel.appendChild(opt);
  });
  sel.classList.add('show');

  sel.addEventListener('change', () => {
    const s = world.photoSpots[parseInt(sel.value, 10)];
    if (!s) return;
    player.state.pos.set(s.pos[0], s.pos[1], s.pos[2]);
    player.state.vy = 0;
    orbit.yaw = s.yaw;
    orbit.pitch = s.pitch;
    orbit.dist = s.dist;
    sel.blur();
  });
}

export { setupPhotoSpots };
