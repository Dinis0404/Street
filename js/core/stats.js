/* 效能面板：FPS（即時＋10 秒平均）、draw calls、三角形數、JS heap
   F3 切換顯示。draw calls 以每幀手動 reset 累計（EffectComposer 多 pass 會疊加，屬正常）。 */

function createStats(renderer){
  /* 關閉自動歸零，改由本面板每幀手動 reset → 累計整幀所有 pass */
  renderer.info.autoReset = false;

  const el = document.createElement('div');
  el.id = 'statsPanel';
  el.style.display = 'none';
  document.body.appendChild(el);

  /* ?stats=1 直接開啟（開發/自動驗證用） */
  let visible = new URLSearchParams(location.search).get('stats') === '1';
  if (visible) el.style.display = 'block';
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3'){
      e.preventDefault();
      visible = !visible;
      el.style.display = visible ? 'block' : 'none';
      frameTimes.length = 0;
    }
  });

  const frameTimes = [];
  let lastText = 0;

  function fmtNum(n){
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  }

  /* 每幀渲染前呼叫：歸零統計 */
  function beginFrame(){
    renderer.info.reset();
  }

  /* 每幀渲染後呼叫：取樣與顯示 */
  function endFrame(){
    if (!visible) return;
    const now = performance.now();
    frameTimes.push(now);
    while (frameTimes.length && now - frameTimes[0] > 10000) frameTimes.shift();

    if (now - lastText < 250) return;   // 文字更新節流
    lastText = now;

    let n1 = 0;
    for (const t of frameTimes) if (now - t <= 1000) n1++;
    const span = Math.min(10, (now - frameTimes[0]) / 1000) || 1;
    const fpsAvg = frameTimes.length / span;

    const info = renderer.info.render;
    const heapMB = (performance.memory && performance.memory.usedJSHeapSize)
      ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB'
      : 'N/A';

    el.textContent =
      'FPS      ' + n1 + '（10s 平均 ' + fpsAvg.toFixed(1) + '）\n' +
      'DrawCalls ' + info.calls + '\n' +
      'Triangles ' + fmtNum(info.triangles) + '\n' +
      'JS Heap  ' + heapMB;
  }

  return { beginFrame, endFrame };
}

export { createStats };
