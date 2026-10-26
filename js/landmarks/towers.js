/* 高層塔建構器（S 級）：台北南山廣場（272m 頂部斜切）、統一國際大樓（154m）、君悅酒店
   支援可變高度擠出（南山斜切頂）；夜間塔冠泛光＋窗光 */

import * as THREE from 'three';
import { makeCanvasTexture } from '../factory/tex.js';
import { registerSign } from '../systems/nightlights.js';

const TOWERS = [
  { id: 'w383731054', code: 'NANSHAN', h: 272, tint: '#b9c6c4', slant: 24, crown: true },
  { id: 'w228938184', code: 'PRESIDENT', h: 154, tint: '#aeb6ba', antenna: 28, crown: true },
  { id: 'w137077760', code: 'GRAND HYATT', h: 85, tint: '#d9d4c6', bands: true, canopy: true }
];

let _mats = {};
function towerMat(tint, bands){
  const key = tint + (bands ? '-b' : '');
  if (_mats[key]) return _mats[key];
  const tex = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = tint;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(40,55,60,0.45)';
    g.lineWidth = 3;
    for (let y = 0; y <= 256; y += 32){
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
    if (bands){
      /* 君悅：淡色橫帶（白簷帶＋深窗帶交替） */
      for (let y = 4; y < 256; y += 32){
        g.fillStyle = '#e7e2d4';
        g.fillRect(0, y, 256, 7);
        g.fillStyle = '#4c5a66';
        g.fillRect(14, y + 11, 228, 16);
      }
    } else {
      for (let x = 0; x <= 256; x += 32){
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.10)';
      for (let y = 3; y < 256; y += 32) g.fillRect(0, y, 256, 9);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const lit = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 256, 256);
    for (let y = 5; y < 256; y += 32){
      for (let x = 5; x < 250; x += 26){
        if (Math.random() < 0.38){
          g.fillStyle = Math.random() < 0.7 ? '#ffd9a2' : '#d5e8f2';
          g.fillRect(x, y, 18, 20);
        }
      }
    }
  });
  lit.wrapS = lit.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.4, metalness: 0.35,
    emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: 0.03
  });
  registerSign(mat, 0.03, 0.8);
  _mats[key] = mat;
  return mat;
}

/* 塔冠泛光材質 */
let _crownMat = null;
function crownMat(){
  if (_crownMat) return _crownMat;
  _crownMat = new THREE.MeshStandardMaterial({
    color: 0x4a5256, emissive: 0xdfeaff, emissiveIntensity: 0.12, roughness: 0.4, metalness: 0.4
  });
  registerSign(_crownMat, 0.12, 2.4);
  return _crownMat;
}

function signedArea(poly){
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/* 可變高度擠出：hFn(x, z) → 牆頂高度（南山斜切用） */
function extrudeVar(pos, uv, nor, roofPos, poly, hFn, uPerM){
  const n = poly.length;
  let u = 0;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const nx = dz / len, nz = -dx / len;
    const ha = hFn(a[0], a[1]), hb = hFn(b[0], b[1]);
    const u0 = u * uPerM, u1 = (u + len) * uPerM;
    pos.push(a[0], 0, a[1], b[0], 0, b[1], b[0], hb, b[1]);
    pos.push(a[0], 0, a[1], b[0], hb, b[1], a[0], ha, a[1]);
    const va = ha / 32, vb = hb / 32;   // v 以 32m 一貼圖循環
    uv.push(u0, 0, u1, 0, u1, vb, u0, 0, u1, vb, u0, va);
    for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
    u += len;
  }
  const cx = poly.reduce((s, p) => s + p[0], 0) / n;
  const cz = poly.reduce((s, p) => s + p[1], 0) / n;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    roofPos.push(cx, hFn(cx, cz), cz, a[0], hFn(a[0], a[1]), a[1], b[0], hFn(b[0], b[1]), b[1]);
  }
}

/* 場景接入 */
function buildTowers(scene, addCol, buildings){
  const byId = new Map(buildings.map((b) => [b.id, b]));
  const built = [];
  for (const cfg of TOWERS){
    const b = byId.get(cfg.id);
    if (!b) continue;
    const poly = signedArea(b.poly) < 0 ? b.poly.slice().reverse() : b.poly;
    let x1 = 1e9, x2 = -1e9, z1 = 1e9, z2 = -1e9;
    for (const p of poly){
      if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0];
      if (p[1] < z1) z1 = p[1]; if (p[1] > z2) z2 = p[1];
    }
    /* 南山：東北角（+x, -z）最高 */
    const hFn = cfg.slant
      ? (x, z) => cfg.h + cfg.slant * (((x - x1) / (x2 - x1)) - ((z - z1) / (z2 - z1))) / 2
      : () => cfg.h;
    const hMax = hFn(x2, z1);

    const pos = [], uv = [], nor = [], roofPos = [];
    extrudeVar(pos, uv, nor, roofPos, poly, hFn, 1 / 26);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const mesh = new THREE.Mesh(geo, towerMat(cfg.tint, cfg.bands));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
    roofGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x6d7175, roughness: 1 })));

    /* 塔冠泛光（頂緣環帶） */
    if (cfg.crown){
      const w = Math.max(x2 - x1, 8), d = Math.max(z2 - z1, 8);
      const ring = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 2.4, d + 0.6), crownMat());
      ring.position.set((x1 + x2) / 2, hMax - 1.2, (z1 + z2) / 2);
      scene.add(ring);
    }
    /* 統一國際：屋頂天線 */
    if (cfg.antenna){
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, cfg.antenna, 8),
        new THREE.MeshStandardMaterial({ color: 0xb8bdc2, roughness: 0.5, metalness: 0.7 }));
      mast.position.set((x1 + x2) / 2, hMax + cfg.antenna / 2, (z1 + z2) / 2);
      scene.add(mast);
    }
    /* 君悅：入口雨庇 */
    if (cfg.canopy){
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xd9d4c6, roughness: 0.7 }));
      canopy.position.set((x1 + x2) / 2, 5.4, z2 + 4);
      canopy.castShadow = true;
      scene.add(canopy);
    }

    addCol(x1, x2, z1, z2);
    built.push(b.id);
  }
  return built;
}

function towerIds(){
  return TOWERS.map((t) => t.id);
}

export { buildTowers, towerIds };
