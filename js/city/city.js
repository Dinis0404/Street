/* 城市總管：chunk 註冊、串流佇列（距離優先、每幀限時 4 ms 建構）、活躍半徑管理
   update(px, pz) 每幀呼叫：半徑 450 m 內啟動、外休眠（dispose 幾何） */

import { createChunk } from './chunk.js';

const ACTIVE_R = 450;      // 活躍半徑（3 格）
const BUDGET_MS = 4;       // 每幀建構預算

function createCity(scene){
  const chunks = new Map();
  const queue = [];
  const counts = { active: 0, queued: 0, dormant: 0 };   // 開發觀察用（?chunks=1 時掛到 window.__city）

  function register(cx, cz, buildFn){
    const key = cx + ',' + cz;
    if (chunks.has(key)) return;
    chunks.set(key, createChunk(cx, cz, buildFn));
  }

  function update(px, pz){
    /* 1. 依距離決定目標狀態 */
    for (const ch of chunks.values()){
      ch._d = Math.hypot(ch.center.x - px, ch.center.z - pz);
      if (ch._d <= ACTIVE_R){
        ch.requeue();
        if (ch.state === 'queued' && !ch._inQueue){
          queue.push(ch);
          ch._inQueue = true;
        }
      } else {
        if (ch.state === 'active') ch.deactivate(scene);
        ch._inQueue = false;   // 已排隊但玩家離開 → 自佇列剔除
      }
    }
    for (let i = queue.length - 1; i >= 0; i--){
      if (!queue[i]._inQueue) queue.splice(i, 1);
    }

    /* 2. 距離近者優先，每幀限時建構 */
    if (queue.length){
      queue.sort((a, b) => a._d - b._d);
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < BUDGET_MS){
        const ch = queue.shift();
        ch._inQueue = false;
        ch.activate(scene);
        if (ch._d > ACTIVE_R) ch.deactivate(scene);   // 建構期間玩家已跑遠
      }
    }

    /* 3. 統計 */
    counts.active = counts.queued = counts.dormant = 0;
    for (const ch of chunks.values()){
      if (ch.state === 'active') counts.active++;
      else if (ch.state === 'queued') counts.queued++;
      else counts.dormant++;
    }
  }

  return { register, update, counts };
}

export { createCity };
