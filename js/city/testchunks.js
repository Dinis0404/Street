/* 開發驗證用：12 個假 chunk（?chunks=1 時由 main 註冊）
   內容＝灰色量體群，用來驗證串流載入/休眠；材質共用展示「dormant 釋放幾何、保留材質」 */

import * as THREE from 'three';
import { CHUNK } from './chunk.js';

const mat = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.95 });

/* 以格座標決定性的偽隨機（同格每次建構結果一致） */
function hash01(cx, cz, n){
  let h = (cx * 73856093) ^ (cz * 19349663) ^ (n * 83492791);
  h = (h ^ (h >>> 13)) * 0x5bd1e995;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967295;
}

function registerTestChunks(city){
  const CELLS = [
    [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 1]
  ];
  for (const [cx, cz] of CELLS){
    city.register(cx, cz, (b) => {
      const g = new THREE.Group();
      /* 格底板（辨識格範圍） */
      const plate = new THREE.Mesh(new THREE.BoxGeometry(CHUNK - 4, 0.08, CHUNK - 4), mat);
      plate.position.set(b.center.x, 0.04, b.center.z);
      plate.receiveShadow = true;
      g.add(plate);
      /* 量體群：4 座高度不一的灰盒＋1 座高塔標記 */
      for (let i = 0; i < 4; i++){
        const w = 12 + hash01(cx, cz, i) * 26;
        const h = 8 + hash01(cx, cz, i + 10) * 46;
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
        box.position.set(
          b.x1 + 20 + hash01(cx, cz, i + 20) * (CHUNK - 40),
          h / 2,
          b.z1 + 20 + hash01(cx, cz, i + 30) * (CHUNK - 40)
        );
        box.castShadow = true;
        g.add(box);
      }
      const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 90, 6), mat);
      tower.position.set(b.center.x, 45, b.center.z);
      tower.castShadow = true;
      g.add(tower);
      return g;
    });
  }
}

export { registerTestChunks };
