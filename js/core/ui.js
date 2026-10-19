/* UI 綁定：時鐘、時間滑桿、快捷鈕、天氣按鈕、機位按鈕、面板收合 */

function bindUI(deps){
  const { env, player, world, orbit } = deps;
  const $ = (id) => document.getElementById(id);
  const clockEl = $('clock'), slider = $('timeSlider'), autoTime = $('autoTime');
  let sliderHeld = false;

  function fmtTime(h){
    const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }
  env.onTime((h) => {
    clockEl.textContent = fmtTime(h);
    if (!sliderHeld) slider.value = h;
  });
  slider.addEventListener('pointerdown', () => { sliderHeld = true; });
  window.addEventListener('pointerup', () => { sliderHeld = false; });
  slider.addEventListener('input', () => {
    if (autoTime.checked){ autoTime.checked = false; env.state.auto = false; }
    env.setTime(parseFloat(slider.value));
    clockEl.textContent = fmtTime(parseFloat(slider.value));
  });
  autoTime.addEventListener('change', () => { env.state.auto = autoTime.checked; });
  document.querySelectorAll('.timePreset').forEach((b) => {
    b.addEventListener('click', () => {
      env.setTime(parseFloat(b.dataset.t));
      b.blur();
    });
  });
  document.querySelectorAll('.wx').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.wx').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      env.setWeather(b.dataset.w);
      b.blur();
    });
  });
  $('classicBtn').addEventListener('click', (e) => {
    player.state.pos.copy(world.classic.pos);
    player.state.vy = 0;
    orbit.yaw = world.classic.yaw; orbit.pitch = world.classic.pitch; orbit.dist = world.classic.dist;
    e.target.blur();
  });
  $('resetBtn').addEventListener('click', (e) => {
    player.state.pos.copy(world.spawn);
    player.state.vy = 0;
    orbit.yaw = 0; orbit.pitch = 0.3; orbit.dist = 5.5;
    e.target.blur();
  });
  $('collapseBtn').addEventListener('click', () => {
    $('panel').classList.toggle('collapsed');
    $('collapseBtn').textContent = $('panel').classList.contains('collapsed') ? '☰' : '—';
  });
}

export { bindUI };
