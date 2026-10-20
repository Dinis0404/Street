/* 通用建築生成器：footprint 多邊形 → 擠出量體＋窗帶貼圖＋平屋頂
   材質分四系（混凝土/米黃/磁磚/玻璃），同系合併 → 全城約 5 draw call
   夜間窗光走 nightlights 註冊表；L1/L2 LOD 預留（P2 起依距離切換） */

import * as THREE from 'three';
import { makeCanvasTexture } from '../factory/tex.js';
import { registerWindow } from '../systems/nightlights.js';

const FLOOR_H = 3.2, WIN_W = 3.5;               // 一窗格 ≈ 一開間/一樓
const DEFAULT_H = { 1: 25, 2: 12, 3: 9 };       // 無高度資料時的推估
const TEX_CELLS = 8;                            // 貼圖 8×8 窗格

/* ---------- 四系外觀材質（dormant 釋放幾何、材質常駐） ---------- */
let _mats = null;
function getMats(){
  if (_mats) return _mats;

  function facadePair(base, frame, winDay, litCol, roughness, metalness){
    const cell = 512 / TEX_CELLS;
    const draw = (g, lit) => {
      g.fillStyle = lit ? '#000000' : base;
      g.fillRect(0, 0, 512, 512);
      if (!lit){
        g.fillStyle = 'rgba(0,0,0,0.06)';
        for (let i = 0; i < 200; i++) g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
      }
      for (let r = 0; r < TEX_CELLS; r++){
        for (let c = 0; c < TEX_CELLS; c++){
          const x = c * cell + cell * 0.22, y = r * cell + cell * 0.28;
          const w = cell * 0.56, h = cell * 0.44;
          if (lit){
            if (Math.random() < 0.34){
              g.fillStyle = Math.random() < 0.75 ? litCol : '#ffe9c0';
              g.fillRect(x, y, w, h);
            }
          } else {
            g.fillStyle = frame;
            g.fillRect(x - 2, y - 2, w + 4, h + 4);
            g.fillStyle = winDay;
            g.fillRect(x, y, w, h);
            g.fillStyle = 'rgba(255,255,255,0.14)';
            g.fillRect(x, y, w, h * 0.35);
          }
        }
      }
    };
    const day = makeCanvasTexture(512, 512, (g) => draw(g, false));
    day.wrapS = day.wrapT = THREE.RepeatWrapping;
    const lit = makeCanvasTexture(512, 512, (g) => draw(g, true));
    lit.wrapS = lit.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({
      map: day, emissive: 0xffffff, emissiveMap: lit,
      emissiveIntensity: 0.02, roughness, metalness: metalness || 0
    });
    registerWindow(mat);
    return mat;
  }

  _mats = [
    facadePair('#c9c5bd', '#8f8c86', '#7e8a96', '#ffd9a0', 0.9),        // 混凝土
    facadePair('#d9cdb8', '#a09484', '#6f7d8a', '#ffd9a0', 0.85),       // 米黃
    facadePair('#b08d78', '#7c5f4e', '#5c6a78', '#ffe0ae', 0.8),        // 磁磚
    facadePair('#9fb3ba', '#5d7078', '#39505e', '#cfe6f2', 0.35, 0.55)  // 玻璃幕牆
  ];
  _mats.roof = new THREE.MeshStandardMaterial({ color: 0x676b6f, roughness: 1 });
  _mats.bg = new THREE.MeshStandardMaterial({ color: 0x8d929a, roughness: 1 });  // 背景剪影（tier3）
  return _mats;
}

/* ---------- 幾何累加器 ---------- */
function acc(){ return { pos: [], nor: [], uv: [] }; }
function pushQuad(a, A, B, C, D, uA, uB, uC, uD, nx, ny, nz){
  a.pos.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
  a.pos.push(A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2]);
  a.uv.push(uA[0], uA[1], uB[0], uB[1], uC[0], uC[1]);
  a.uv.push(uA[0], uA[1], uC[0], uC[1], uD[0], uD[1]);
  for (let i = 0; i < 6; i++) a.nor.push(nx, ny, nz);
}
function accToGeom(a){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
  return g;
}

/* 多邊形有向面積（>0 = 逆時針，統一轉向用） */
function signedArea(poly){
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/* 單棟建築：牆面（窗帶 UV）＋平屋頂 */
function buildingInto(wallAcc, roofAcc, poly, h, texRowOffset){
  const n = poly.length;
  let u = texRowOffset;   // 起始 UV 行（整數窗格偏移，讓每棟窗位不同）
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    /* 牆面朝向（外向；多邊形已統一逆時針） */
    const nx = dz / len, nz = -dx / len;
    const u0 = u / TEX_CELLS, u1 = (u + len / WIN_W) / TEX_CELLS;
    const v0 = 0, v1 = h / FLOOR_H / TEX_CELLS;
    pushQuad(wallAcc,
      [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h, b[1]], [a[0], h, a[1]],
      [u0, v0], [u1, v0], [u1, v1], [u0, v1], nx, 0, nz);
    u += len / WIN_W;
    /* 屋頂扇形 */
  }
  /* 屋頂（fan 三角化，法線朝上） */
  const cx = poly.reduce((s, p) => s + p[0], 0) / n;
  const cz = poly.reduce((s, p) => s + p[1], 0) / n;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    roofAcc.pos.push(cx, h, cz, a[0], h, a[1], b[0], h, b[1]);
    roofAcc.uv.push(0.5, 0.5, 0, 0, 1, 0);
    for (let k = 0; k < 3; k++) roofAcc.nor.push(0, 1, 0);
  }
}

/* 以 id 雜湊決定外觀系（同棟重跑一致） */
function matIndexOf(id){
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 4;
}
function rowOffsetOf(id){
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % TEX_CELLS;
}

/* ---------- 主生成 ---------- */
/* buildBlocks(buildings) → { group, count }
   buildings：district.builds 子集（override 者由地標建構器接管，呼叫端過濾） */
function buildBlocks(buildings){
  const M = getMats();
  const walls = [acc(), acc(), acc(), acc()];
  const roofs = acc();
  const bg = acc();          // tier3 背景剪影（無窗）
  let count = 0;

  for (const b of buildings){
    const poly = b.poly;
    if (poly.length < 3) continue;
    const h = b.height || DEFAULT_H[b.tier] || 10;
    const p = signedArea(poly) < 0 ? poly.slice().reverse() : poly;
    if (b.tier === 3){
      buildingInto(bg, bg, p, h, 0);
    } else {
      buildingInto(walls[matIndexOf(b.id)], roofs, p, h, rowOffsetOf(b.id));
    }
    count++;
  }

  const group = new THREE.Group();
  for (let i = 0; i < 4; i++){
    if (walls[i].pos.length){
      const m = new THREE.Mesh(accToGeom(walls[i]), M[i]);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
  }
  if (roofs.pos.length){
    const m = new THREE.Mesh(accToGeom(roofs), M.roof);
    m.receiveShadow = true;
    group.add(m);
  }
  if (bg.pos.length){
    const m = new THREE.Mesh(accToGeom(bg), M.bg);
    group.add(m);
  }
  return { group, count };
}

export { buildBlocks };
