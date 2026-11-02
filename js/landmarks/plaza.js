/* 廣場與幹道細節（P2-T2.6）
   市民廣場：紅色 LOVE 風格化雕塑＋旗杆座（市民廣場本體在 cityhall.js）
   香堤廣場：A11 南側開放鋪面＋造型矮牆
   信義路公車專用道：黃色鋪面帶＋候車亭×2＋電桿式站牌 */

import * as THREE from 'three';
import { makeCanvasTexture, textTexture } from '../factory/tex.js';
import { registerSign } from '../systems/nightlights.js';

let _mats = null;
function getMats(){
  if (_mats) return _mats;
  const loveMat = new THREE.MeshStandardMaterial({ color: 0xc8352c, roughness: 0.35, metalness: 0.2 });
  _mats = {
    plaza: new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 1 }),
    love: loveMat,
    planter: new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.95 }),
    busYellow: new THREE.MeshStandardMaterial({ color: 0xd8b93a, roughness: 0.9 }),
    shelter: new THREE.MeshStandardMaterial({ color: 0xd0d4d6, roughness: 0.55, metalness: 0.35 }),
    shelterGlass: new THREE.MeshStandardMaterial({ color: 0xa8c4cc, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.5 }),
    bench: new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 }),
    pole: new THREE.MeshStandardMaterial({ color: 0x6a7076, roughness: 0.6, metalness: 0.4 })
  };
  return _mats;
}

/* 市民廣場擺件（座標於市府廣場中軸） */
function loveSculpture(scene, addCol, x, z){
  const M = getMats();
  const g = new THREE.Group();
  g.position.set(x, 0.24, z);   // 廣場鋪面高 0.24
  /* L O V E 四字塊（風格化：方塊堆疊，O 臥置） */
  const letterH = 2.2, letterT = 0.7;
  const L = new THREE.Mesh(new THREE.BoxGeometry(letterT, letterH, letterT), M.love);
  L.position.set(-2.1, letterH / 2, 0);
  const lBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, letterT, letterT), M.love);
  lBar.position.set(-1.35, letterT / 2, 0);
  const O = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.35, 12, 24), M.love);
  O.rotation.x = Math.PI / 2;
  O.position.set(-0.2, letterT / 2 + 0.35, 0);
  const V1 = new THREE.Mesh(new THREE.BoxGeometry(letterT, letterH, letterT), M.love);
  V1.position.set(0.85, letterH / 2, 0);
  V1.rotation.z = 0.3;
  const V2 = new THREE.Mesh(new THREE.BoxGeometry(letterT, letterH, letterT), M.love);
  V2.position.set(1.75, letterH / 2, 0);
  V2.rotation.z = -0.3;
  const E = new THREE.Mesh(new THREE.BoxGeometry(letterT, letterH, letterT), M.love);
  E.position.set(3, letterH / 2, 0);
  const eBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, letterT, letterT), M.love);
  eBar.position.set(2.6, letterH - 0.35, 0);
  const eMid = new THREE.Mesh(new THREE.BoxGeometry(1.1, letterT, letterT), M.love);
  eMid.position.set(2.55, letterH / 2, 0);
  for (const m of [L, lBar, O, V1, V2, E, eBar, eMid]){ m.castShadow = true; g.add(m); }
  scene.add(g);
  addCol(x - 3.2, x + 3.8, z - 0.7, z + 0.7);
}

/* 香堤廣場（A11 南側開放空間） */
function champsSquare(scene, addCol, groundSys){
  const M = getMats();
  /* 鋪面 */
  const sq = new THREE.Mesh(new THREE.BoxGeometry(64, 0.22, 34), M.plaza);
  sq.position.set(258, 0.11, -226);
  sq.receiveShadow = true;
  scene.add(sq);
  groundSys.addRect(226, -243, 290, -209, 0.22);
  /* 造型矮牆/花台 */
  for (const [px, pz, w, d] of [[238, -232, 14, 2.2], [278, -232, 14, 2.2], [258, -216, 2.2, 12]]){
    const pl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.85, d), M.planter);
    pl.position.set(px, 0.22 + 0.42, pz);
    pl.castShadow = true;
    pl.receiveShadow = true;
    scene.add(pl);
    addCol(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2);
  }
}

/* 信義路公車專用道：黃鋪面帶＋候車亭＋站牌 */
function busLane(scene, addCol, groundSys){
  const M = getMats();
  /* 專用道黃鋪面（信義路五段中央：z 64..80，x -180..180） */
  const lane = new THREE.Mesh(new THREE.BoxGeometry(360, 0.05, 15), M.busYellow);
  lane.position.set(0, 0.04, 72);
  lane.receiveShadow = true;
  scene.add(lane);
  groundSys.addRect(-180, 64.5, 180, 79.5, 0.05);
  /* 候車亭×2（市政府 x120、101 x-40） */
  for (const bx of [120, -40]){
    const g = new THREE.Group();
    g.position.set(bx, 0.05, 72);
    for (const px of [-3, 3]){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), M.pole);
      post.position.set(px, 1.5, -1.5);
      g.add(post);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 2.4), M.shelter);
    roof.position.set(0, 3.05, -1.5);
    roof.castShadow = true;
    g.add(roof);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(7, 1.1, 0.07), M.shelterGlass);
    glass.position.set(0, 1.9, -2.6);
    g.add(glass);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 0.5), M.bench);
    bench.position.set(0, 0.75, -2.2);
    g.add(bench);
    /* 公車站牌 */
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), M.pole);
    pole.position.set(4.4, 1.7, -0.5);
    g.add(pole);
    const signTex = textTexture('公車專用道', '#0b6cb6', '#ffffff', 128, 256, 34, true);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7 }));
    sign.position.set(4.4, 3, -0.5);
    g.add(sign);
    scene.add(g);
    addCol(bx - 3.6, bx + 3.6, 69.9, 70.3);
  }
}

/* 場景接入 */
function buildPlazas(scene, addCol, groundSys){
  loveSculpture(scene, addCol, -30, -300);       // 市民廣場中軸（市府南）
  champsSquare(scene, addCol, groundSys);
  busLane(scene, addCol, groundSys);
}

export { buildPlazas };
