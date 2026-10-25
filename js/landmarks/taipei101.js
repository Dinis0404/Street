/* 台北 101 地標建構器（S 級）
   比例依實景照片量測（高寬比約 9:1、8 個斗形模組、頂緣外張、輪廓燈在斗頂緣）
   座標：district 標記之 footprint 中心（原點附近），總高 508 m
   幾何：裙樓 Box → 基座梯形 → 8×斗形模組（每模組 8 層薄 frustum 疊出內收＋頂緣外張）
        → 頂部 4 段圓筒收分 → 塔尖錐＋桅杆；夜間輪廓燈＝每斗頂緣 emissive 細帶 */

import * as THREE from 'three';
import { mergeGeoms } from '../factory/geo.js';
import { mergeBufferGeometries } from '../../libs/addons/utils/BufferGeometryUtils.js';
import { makeCanvasTexture } from '../factory/tex.js';
import { registerSign } from '../systems/nightlights.js';

/* 尺寸參數（公尺；依照片與公開資料校訂） */
const P = {
  podiumW: 90, podiumD: 66, podiumH: 28,       // 裙樓商場
  baseBot: 56, baseTop: 46, baseH: 32,         // 塔樓基座收分段（28–60）
  moduleN: 8, moduleH: 41,                     // 斗形主體（60–389），每模組 8 層
  moduleW0: 46, moduleW1: 34,                  // 模組寬度自 46 收至 34
  topH: 60, topW0: 34, topW1: 20,              // 頂部圓筒收分（389–449）
  spireH: 59,                                  // 塔尖（449–508）
  glass: 0x7fa8aa                              // 藍綠玻璃色
};

let _mats = null;
function getMats(){
  if (_mats) return _mats;

  /* 藍綠玻璃格柵貼圖（深色窗框網格＋淡綠反光漸層） */
  const glassTex = makeCanvasTexture(256, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#8fb6b4');
    gr.addColorStop(0.5, '#6f9a9c');
    gr.addColorStop(1, '#7fa8a4');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 512);
    g.strokeStyle = 'rgba(30,45,48,0.55)';
    g.lineWidth = 3;
    for (let y = 0; y <= 512; y += 32){
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
    for (let x = 0; x <= 256; x += 32){
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke();
    }
    /* 交叉斜撐意象（外牆支撐桁架） */
    g.strokeStyle = 'rgba(40,60,62,0.35)';
    g.lineWidth = 5;
    for (let k = -512; k < 512; k += 128){
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 512, 512); g.stroke();
    }
  });
  glassTex.wrapS = glassTex.wrapT = THREE.RepeatWrapping;

  /* 夜間亮燈貼圖（斗緣帶狀亮） */
  const litTex = makeCanvasTexture(64, 64, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, '#ffe9b0');
    gr.addColorStop(0.5, '#403415');
    gr.addColorStop(1, '#1a1508');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });
  litTex.wrapS = litTex.wrapT = THREE.RepeatWrapping;

  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex, color: 0xffffff, roughness: 0.35, metalness: 0.4,
    emissive: 0xffffff, emissiveMap: litTex, emissiveIntensity: 0.03
  });
  registerSign(glassMat, 0.03, 0.85);

  /* 裙樓商場玻璃（較透明感、水平帶） */
  const podiumTex = makeCanvasTexture(256, 128, (g) => {
    g.fillStyle = '#9db3b2';
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = 'rgba(35,50,52,0.5)';
    g.lineWidth = 4;
    for (let y = 0; y <= 128; y += 32){
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.10)';
    for (let x = 0; x < 256; x += 64) g.fillRect(x + 4, 6, 56, 20);
  });
  podiumTex.wrapS = podiumTex.wrapT = THREE.RepeatWrapping;
  const podiumMat = new THREE.MeshStandardMaterial({
    map: podiumTex, roughness: 0.4, metalness: 0.3,
    emissive: 0xffffff, emissiveMap: podiumTex, emissiveIntensity: 0.04
  });
  registerSign(podiumMat, 0.04, 0.9);

  /* 輪廓燈細帶（暖白 emissive，日夜插值） */
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x3a3d40, emissive: 0xffe2a8, emissiveIntensity: 0.1, roughness: 0.6
  });
  registerSign(beltMat, 0.1, 2.6);

  _mats = { glass: glassMat, podium: podiumMat, belt: beltMat };
  return _mats;
}

/* 方形 frustum（4 邊 Cylinder，面對齊軸向） */
function squareFrustum(wBot, wTop, h){
  const geo = new THREE.CylinderGeometry(wTop / 2 * Math.SQRT2, wBot / 2 * Math.SQRT2, h, 4, 1);
  geo.rotateY(Math.PI / 4);
  return geo;
}

/* 單個斗形模組：8 層薄 frustum 層層內收，最上層外張（斗口）
   回傳 [玻璃幾何們, 頂緣輪廓燈帶] */
function douModule(y, wBot, wTop, h, glassGeoms, beltGeoms){
  const floors = 8;
  const fh = (h * 0.86) / floors;              // 內收段佔 86%
  const flareH = h * 0.14;                     // 頂緣外張段
  let w = wBot;
  for (let i = 0; i < floors; i++){
    const wNext = wBot + (wTop - wBot) * ((i + 1) / floors) * 0.82;
    const seg = squareFrustum(w, wNext, fh);
    seg.translate(0, y + fh / 2, 0);
    glassGeoms.push(seg);
    w = wNext;
  }
  /* 斗口：向上外張回 wBot 寬度 */
  const flare = squareFrustum(w, wBot * 0.985, flareH);
  flare.translate(0, y + fh * floors + flareH / 2, 0);
  glassGeoms.push(flare);

  /* 頂緣輪廓燈細帶（方形環，四邊框條；外擴 3% 使燈帶明顯突出幕牆） */
  const wb = wBot * 1.03;
  const beltRing = mergeGeoms([
    new THREE.BoxGeometry(wb, 1.6, wBot * 0.12).translate(0, 0, wb * 0.44),
    new THREE.BoxGeometry(wb, 1.6, wBot * 0.12).translate(0, 0, -wb * 0.44),
    new THREE.BoxGeometry(wBot * 0.12, 1.6, wb * 0.88).translate(wb * 0.44, 0, 0),
    new THREE.BoxGeometry(wBot * 0.12, 1.6, wb * 0.88).translate(-wb * 0.44, 0, 0)
  ]);
  beltRing.translate(0, y + h - 0.6, 0);
  beltGeoms.push(beltRing);
}

/* 主建構器：g = THREE.Group 容器（位置由呼叫端設定） */
function buildTaipei101(){
  const M = getMats();
  const g = new THREE.Group();
  const glassGeoms = [], beltGeoms = [];

  /* 裙樓商場 */
  const podium = new THREE.Mesh(new THREE.BoxGeometry(P.podiumW, P.podiumH, P.podiumD), M.podium);
  podium.position.y = P.podiumH / 2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  g.add(podium);

  /* 塔樓基座收分段 */
  let y = P.podiumH;
  const base = squareFrustum(P.baseBot, P.baseTop, P.baseH);
  base.translate(0, y + P.baseH / 2, 0);
  glassGeoms.push(base);
  y += P.baseH;

  /* 8 個斗形模組（逐段縮小） */
  for (let i = 0; i < P.moduleN; i++){
    const wBot = P.moduleW0 + (P.moduleW1 - P.moduleW0) * (i / P.moduleN);
    const wTop = P.moduleW0 + (P.moduleW1 - P.moduleW0) * ((i + 0.6) / P.moduleN);
    douModule(y, wBot, wTop, P.moduleH, glassGeoms, beltGeoms);
    y += P.moduleH;
  }

  /* 頂部圓筒收分 ×4 段 */
  const topSegs = 4;
  const topSegH = P.topH / topSegs;
  for (let i = 0; i < topSegs; i++){
    const w0 = P.topW0 + (P.topW1 - P.topW0) * (i / topSegs);
    const w1 = P.topW0 + (P.topW1 - P.topW0) * ((i + 1) / topSegs);
    const cyl = new THREE.CylinderGeometry(w1 / 2, w0 / 2, topSegH, 16);
    cyl.translate(0, y + topSegH / 2, 0);
    glassGeoms.push(cyl);
    y += topSegH;
  }

  /* 塔尖：錐＋桅杆 */
  const coneH = P.spireH * 0.5;
  const cone = new THREE.CylinderGeometry(1.2, P.topW1 / 2 * 0.8, coneH, 12);
  cone.translate(0, y + coneH / 2, 0);
  glassGeoms.push(cone);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, P.spireH - coneH - 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xb8bdc2, roughness: 0.5, metalness: 0.7 }));
  mast.position.y = y + coneH + (P.spireH - coneH - 4) / 2 + 4;
  mast.castShadow = true;
  g.add(mast);

  /* 合併玻璃幕牆（帶 UV 供格柵貼圖）與輪廓燈帶 */
  const glass = new THREE.Mesh(mergeBufferGeometries(glassGeoms, false), M.glass);
  glass.castShadow = true;
  glass.receiveShadow = true;
  g.add(glass);
  if (beltGeoms.length){
    const belts = new THREE.Mesh(mergeGeoms(beltGeoms), M.belt);
    g.add(belts);
  }
  return g;
}

/* 場景接入：createTaipei101(scene, addCol, cx, cz) → group（含裙樓碰撞） */
function createTaipei101(scene, addCol, cx, cz){
  const g = buildTaipei101();
  g.position.set(cx, 0, cz);
  scene.add(g);
  addCol(cx - P.podiumW / 2 - 0.3, cx + P.podiumW / 2 + 0.3,
    cz - P.podiumD / 2 - 0.3, cz + P.podiumD / 2 + 0.3);
  return g;
}

export { createTaipei101 };
