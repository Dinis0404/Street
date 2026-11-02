/* 信義商圈空中走廊（S 級可走設施）
   三跨橋：A9↔A8（跨松高路）、A11↔威秀（跨松壽路）、A4↔微風信義（跨忠孝東路）
   構造：10m 高樓板＋玻璃欄杆＋雨庇＋立柱；兩端 1:4 坡道接入可走面系統
   驗收：A9 → A11 → 威秀 全程可在橋上行走不穿模 */

import * as THREE from 'three';
import { makeCanvasTexture } from '../factory/tex.js';

const DECK_H = 10;        // 樓板高度（百貨 2F）
const DECK_W = 4.4;       // 樓板寬
const RAMP_SLOPE = 4;     // 1:4 坡道（10m 高 → 40m 長）

/* 橋位（依 footprint 淨空掃描定位；A9↔A8、A11↔松壽北側、A4↔置地 跨忠孝） */
const SKYWALKS = [
  { x: 200, z1: -428, z2: -385, axis: 'z' },   // A9 ↔ A8 跨松高路
  { x: 225, z1: -265, z2: -135, axis: 'z' },   // A11 側 ↔ 松壽北側百貨 跨松壽路
  { x: 195, z1: -855, z2: -745, axis: 'z' }    // A4 側 ↔ 國泰置地 跨忠孝東路
];

let _mats = null;
function getMats(){
  if (_mats) return _mats;
  _mats = {
    deck: new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.85 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x5a626a, roughness: 0.5, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xa8c4cc, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xd0d4d6, roughness: 0.6, metalness: 0.3 }),
    post: new THREE.MeshStandardMaterial({ color: 0x6a7076, roughness: 0.6, metalness: 0.4 })
  };
  return _mats;
}

/* 單跨橋：樓板＋欄杆＋玻璃＋雨庇＋立柱；兩端坡道（幾何＋可走面） */
function buildBridge(scene, addCol, groundSys, M, sw){
  const len = Math.abs(sw.z2 - sw.z1);
  const zMid = (sw.z1 + sw.z2) / 2;
  const x = sw.x;
  const g = new THREE.Group();

  /* 樓板 */
  const deck = new THREE.Mesh(new THREE.BoxGeometry(DECK_W, 0.4, len), M.deck);
  deck.position.set(x, DECK_H - 0.2, zMid);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);

  /* 玻璃欄杆（兩側，含金屬扶手）；兩端接坡道故不設端欄 */
  for (const side of [-1, 1]){
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, len), M.glass);
    glass.position.set(x + side * (DECK_W / 2 - 0.06), DECK_H + 0.57, zMid);
    g.add(glass);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, len), M.rail);
    hand.position.set(x + side * (DECK_W / 2 - 0.06), DECK_H + 1.18, zMid);
    g.add(hand);
    /* 座標軸向欄杆碰撞（防止穿越欄杆） */
    addCol(x + side * (DECK_W / 2) - 0.1, x + side * (DECK_W / 2) + 0.1,
      Math.min(sw.z1, sw.z2), Math.max(sw.z1, sw.z2));
  }

  /* 雨庇（樓板上 2.6m，玻璃頂） */
  const roof = new THREE.Mesh(new THREE.BoxGeometry(DECK_W + 0.7, 0.12, len), M.roof);
  roof.position.set(x, DECK_H + 2.7, zMid);
  roof.castShadow = true;
  g.add(roof);
  for (const side of [-1, 1]){
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.6, 0.09), M.post);
    post.position.set(x + side * (DECK_W / 2 - 0.08), DECK_H + 1.4, sw.z1 + 1.2);
    g.add(post);
    const post2 = post.clone();
    post2.position.z = sw.z2 - 1.2;
    g.add(post2);
  }

  /* 立柱（每 12m，中央分隔島內；含碰撞） */
  for (let z = sw.z1 + 6; z < sw.z2; z += 12){
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, DECK_H - 0.4, 10), M.post);
    col.position.set(x, (DECK_H - 0.4) / 2, z);
    col.castShadow = true;
    g.add(col);
    addCol(x - 0.34, x + 0.34, z - 0.34, z + 0.34);
  }

  /* 兩端坡道（1:4，向外延伸，樓板高度漸降至 0） */
  const zA = Math.min(sw.z1, sw.z2);          // 較小 z 端
  const zB = Math.max(sw.z1, sw.z2);
  for (const [foot, top, hAtFoot, hAtTop] of [
    [zA - RAMP_SLOPE * DECK_H / 1 * 1 /* 40m */, zA, 0, DECK_H],
    [zB, zB + 40, DECK_H, 0]
  ]){
    const rampLen = Math.abs(top - foot);
    const slope = new THREE.Mesh(new THREE.BoxGeometry(DECK_W - 0.6, 0.3, Math.hypot(rampLen, DECK_H)), M.deck);
    slope.position.set(x, DECK_H / 2, (foot + top) / 2);
    const dir = top > foot ? 1 : -1;
    slope.rotation.x = dir * Math.atan2(DECK_H, rampLen);
    slope.receiveShadow = true;
    g.add(slope);
    /* 坡道側欄（低矮＋碰撞） */
    for (const side of [-1, 1]){
      const rg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, Math.hypot(rampLen, DECK_H)), M.rail);
      rg.position.set(x + side * (DECK_W / 2 - 0.35), DECK_H / 2 + 0.55, (foot + top) / 2);
      rg.rotation.x = slope.rotation.x;
      g.add(rg);
      addCol(x + side * (DECK_W / 2 - 0.45), x + side * (DECK_W / 2 - 0.25),
        Math.min(foot, top), Math.max(foot, top));
    }
    /* 可走面：ramp 區域（沿 z 軸線性插值高度；ground 的 ramp 以 z 小→大插值） */
    const lo = Math.min(foot, top), hi = Math.max(foot, top);
    const hLo = foot < top ? hAtFoot : hAtTop;
    const hHi = foot < top ? hAtTop : hAtFoot;
    groundSys.addRamp(x - DECK_W / 2, lo, x + DECK_W / 2, hi, 'z', hLo, hHi);
  }

  /* 樓板可走面 */
  groundSys.addRect(x - DECK_W / 2, zA, x + DECK_W / 2, zB, DECK_H);
  scene.add(g);
}

/* 場景接入 */
function buildSkywalks(scene, addCol, groundSys){
  const M = getMats();
  for (const sw of SKYWALKS) buildBridge(scene, addCol, groundSys, M, sw);
}

export { buildSkywalks, SKYWALKS };
