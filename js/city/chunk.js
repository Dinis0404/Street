/* 串流區塊：150 m 格，狀態機 queued → building → active → dormant
   dormant 時自場景移除並 dispose 幾何（材質由呼叫端管理、保留快取不釋放） */

const CHUNK = 150;

function createChunk(cx, cz, buildFn){
  let state = 'queued';
  let group = null;

  /* 格 (cx, cz) 覆蓋世界範圍 [cx*150, (cx+1)*150] × [cz*150, (cz+1)*150] */
  const center = { x: (cx + 0.5) * CHUNK, z: (cz + 0.5) * CHUNK };

  function activate(scene){
    if (state === 'active') return;
    if (!group){
      state = 'building';
      group = buildFn({ cx, cz, x1: cx * CHUNK, z1: cz * CHUNK, x2: (cx + 1) * CHUNK, z2: (cz + 1) * CHUNK, center });
    }
    scene.add(group);
    state = 'active';
  }

  function deactivate(scene){
    if (state !== 'active' || !group) return;
    scene.remove(group);
    group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    group = null;
    state = 'dormant';
  }

  /* dormant → queued（玩家回到半徑內時重新排隊） */
  function requeue(){
    if (state === 'dormant') state = 'queued';
  }

  return {
    key: cx + ',' + cz, cx, cz, center,
    activate, deactivate, requeue,
    get state(){ return state; },
    _d: 0, _inQueue: false   // 串流佇列工作欄位
  };
}

export { createChunk, CHUNK };
