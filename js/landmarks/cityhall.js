/* 台北市政府地標（S 級）
   依 district 實際 footprint 擠出量體；立面＝灰白牆＋綠玻璃橫帶（每層一帶）
   南面（z 較小側）市民廣場：鋪面＋入口階梯（可走面 ramp）＋夜間屋頂輪廓燈 */

import * as THREE from 'three';
import { mergeGeoms } from '../factory/geo.js';
import { makeCanvasTexture } from '../factory/tex.js';
import { registerSign } from '../systems/nightlights.js';

let _mats = null;
function getMats(){
  if (_mats) return _mats;
  /* 立面：12 層，每層上緣綠玻璃帶＋下緣灰白牆 */
  const facadeTex = makeCanvasTexture(256, 384, (g) => {
    g.fillStyle = '#cdd0cb';
    g.fillRect(0, 0, 256, 384);
    for (let f = 0; f < 12; f++){
      const y = f * 32;
      g.fillStyle = '#b9beba';
      g.fillRect(0, y, 256, 4);                 // 樑線
      g.fillStyle = '#5f8f78';                  // 綠玻璃帶
      g.fillRect(8, y + 6, 240, 12);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(8, y + 6, 240, 4);
      g.fillStyle = '#9aa39d';
      for (let x = 16; x < 240; x += 32) g.fillRect(x, y + 6, 3, 12);
    }
  });
  facadeTex.wrapS = THREE.RepeatWrapping;
  const litTex = makeCanvasTexture(256, 384, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 256, 384);
    for (let f = 0; f < 12; f++){
      const y = f * 32;
      for (let x = 8; x < 248; x += 24){
        if (Math.random() < 0.4){
          g.fillStyle = Math.random() < 0.7 ? '#ffd9a0' : '#cfe8dd';
          g.fillRect(x, y + 6, 16, 12);
        }
      }
    }
  });
  litTex.wrapS = THREE.RepeatWrapping;
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex, roughness: 0.7, metalness: 0.15,
    emissive: 0xffffff, emissiveMap: litTex, emissiveIntensity: 0.03
  });
  registerSign(facadeMat, 0.03, 0.9);

  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x3a3d40, emissive: 0xffe2a8, emissiveIntensity: 0.1, roughness: 0.6
  });
  registerSign(beltMat, 0.1, 2.2);

  _mats = { facade: facadeMat, belt: beltMat,
    plaza: new THREE.MeshStandardMaterial({ color: 0xb4b0a6, roughness: 1 }),
    step: new THREE.MeshStandardMaterial({ color: 0xc8c4ba, roughness: 0.95 }) };
  return _mats;
}

/* 多邊形有向面積 */
function signedArea(poly){
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/* 擠出量體：牆面（立面貼圖 UV：u 每公尺、v 每棟高）＋屋頂 */
function extrude(wallPos, wallUv, wallNor, roofPos, poly, h, uPerM){
  const n = poly.length;
  let u = 0;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const nx = dz / len, nz = -dx / len;
    const u0 = u * uPerM, u1 = (u + len) * uPerM;
    wallPos.push(a[0], 0, a[1], b[0], 0, b[1], b[0], h, b[1]);
    wallPos.push(a[0], 0, a[1], b[0], h, b[1], a[0], h, a[1]);
    wallUv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    for (let k = 0; k < 6; k++) wallNor.push(nx, 0, nz);
    u += len;
  }
  const cx = poly.reduce((s, p) => s + p[0], 0) / n;
  const cz = poly.reduce((s, p) => s + p[1], 0) / n;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    roofPos.push(cx, h, cz, a[0], h, a[1], b[0], h, b[1]);
  }
}

/* 場景接入：createCityHall(scene, addCol, groundSys, building)
   building＝district 標記 override:'cityhall' 的建物（含 poly/height） */
function createCityHall(scene, addCol, groundSys, building){
  const M = getMats();
  const g = new THREE.Group();
  const h = building.height || 38.4;
  const poly = signedArea(building.poly) < 0 ? building.poly.slice().reverse() : building.poly;

  /* 主量體 */
  const wallPos = [], wallUv = [], wallNor = [], roofPos = [];
  extrude(wallPos, wallUv, wallNor, roofPos, poly, h, 1 / 40);   // u：40m 一循環
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
  wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUv, 2));
  wallGeo.setAttribute('normal', new THREE.Float32BufferAttribute(wallNor, 3));
  const wall = new THREE.Mesh(wallGeo, M.facade);
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x6f7377, roughness: 1 }));
  roof.receiveShadow = true;
  g.add(roof);

  /* 屋頂輪廓燈（沿 footprint 頂緣細帶，段方向對齊後置中） */
  const beltGeoms = [];
  for (let i = 0; i < poly.length; i++){
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const box = new THREE.BoxGeometry(len + 0.4, 0.8, 0.5);
    box.rotateY(Math.atan2(-dz, dx));
    box.translate((a[0] + b[0]) / 2, h - 0.4, (a[1] + b[1]) / 2);
    beltGeoms.push(box);
  }
  const belts = new THREE.Mesh(mergeGeoms(beltGeoms), M.belt);
  g.add(belts);

  /* 市民廣場（南側）：鋪面＋入口階梯＋旗杆座 */
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const p of poly){
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minZ) minZ = p[1]; if (p[1] > maxZ) maxZ = p[1];
  }
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX + 30, 0.24, 95), M.plaza);
  plaza.position.set((minX + maxX) / 2, 0.12, maxZ + 47.5 + 2);
  plaza.receiveShadow = true;
  g.add(plaza);
  groundSys.addRect(minX - 15, maxZ + 2, maxX + 15, maxZ + 97, 0.24);

  /* 入口階梯（南面三階，往下到廣場） */
  for (let s = 0; s < 3; s++){
    const step = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 3.2), M.step);
    step.position.set((minX + maxX) / 2, 0.36 - s * 0.12, maxZ - 1.6 - s * 3);
    step.receiveShadow = true;
    g.add(step);
  }
  groundSys.addRamp((minX + maxX) / 2 - 30, maxZ - 11, (minX + maxX) / 2 + 30, maxZ - 1, 'z', 0.6, 0.24);

  scene.add(g);
  addCol(minX, maxX, minZ, maxZ);
  return g;
}

export { createCityHall };
