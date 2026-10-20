/* 道路生成器：讀 district 路網 → 瀝青/水泥路面、標線、中央分隔島、沿路人行道
   全部合併為少量 draw call（路面×2、標線×2、人行道×1、分隔島×1） */

import * as THREE from 'three';
import { mergeBufferGeometries } from '../../libs/addons/utils/BufferGeometryUtils.js';
import { makeCanvasTexture } from '../factory/tex.js';

/* 依 class 的路寬與人行道寬（公尺） */
const WIDTH = { major: 28, minor: 14, lane: 6 };
const WALK_W = { major: 5, minor: 4, lane: 0 };     // lane（巷道/步道）不生成人行道
const WALK_H = 0.15;

/* ---------- 共用材質（chunk dormant 時幾何釋放、材質保留） ---------- */
let _mats = null;
function getMats(){
  if (_mats) return _mats;
  const asphaltTex = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = '#33363b';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1200; i++){
      g.fillStyle = Math.random() > 0.5 ? '#3b3e44' : '#2b2e33';
      g.globalAlpha = 0.35;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.globalAlpha = 0.05;
    g.fillStyle = '#484c53';
    g.fillRect(0, 96, 256, 26);
    g.fillRect(0, 148, 256, 26);
    g.globalAlpha = 1;
  });
  asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
  const concreteTex = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = '#5d6167';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++){
      g.fillStyle = Math.random() > 0.5 ? '#666a70' : '#55585e';
      g.globalAlpha = 0.4;
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    g.globalAlpha = 1;
  });
  concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
  const walkTex = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = '#a9a49b';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(80,76,70,0.45)';
    g.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32){
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    for (let i = 0; i < 700; i++){
      g.fillStyle = Math.random() > 0.5 ? '#9e998f' : '#b3aea4';
      g.globalAlpha = 0.3;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.globalAlpha = 1;
  });
  walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
  _mats = {
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95, side: THREE.DoubleSide }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 1, side: THREE.DoubleSide }),
    lineW: new THREE.MeshStandardMaterial({ color: 0xd8d9d2, roughness: 0.85, side: THREE.DoubleSide }),
    lineY: new THREE.MeshStandardMaterial({ color: 0xc8a232, roughness: 0.85, side: THREE.DoubleSide }),
    walk: new THREE.MeshStandardMaterial({ map: walkTex, roughness: 1, side: THREE.DoubleSide }),
    median: new THREE.MeshStandardMaterial({ color: 0x9a9c96, roughness: 0.95, side: THREE.DoubleSide })
  };
  return _mats;
}

/* ---------- 幾何累加器 ---------- */
function acc(){ return { pos: [], nor: [], uv: [] }; }
function pushTri(a, A, B, C, uA, uB, uC){
  /* A/B/C = [x,y,z]；法線由頂點序決定（材質 DoubleSide 免轉向） */
  a.pos.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
  a.uv.push(uA[0], uA[1], uB[0], uB[1], uC[0], uC[1]);
  for (let i = 0; i < 3; i++) a.nor.push(0, 1, 0);
}
function pushQuad(a, A, B, C, D, uA, uB, uC, uD){
  pushTri(a, A, B, C, uA, uB, uC);
  pushTri(a, A, C, D, uA, uC, uD);
}
function accToGeom(a){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
  return g;
}

/* 折線各點的單位切線（前後段平均）與長度 */
function tangents(path){
  const n = path.length, out = [];
  for (let i = 0; i < n; i++){
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz) || 1;
    out.push([dx / L, dz / L]);
  }
  return out;
}

/* 帶狀平面：沿 path 偏移 offset、半寬 halfW、高度 y（人行道頂面/路面用） */
function flatRibbon(a, path, offset, halfW, y, uvRepeat){
  const tg = tangents(path);
  const left = [], right = [];
  let dist = 0;
  for (let i = 0; i < path.length; i++){
    const [dx, dz] = tg[i];
    const px = -dz, pz = dx;
    left.push([path[i][0] + (offset + halfW) * px, y, path[i][1] + (offset + halfW) * pz, dist]);
    right.push([path[i][0] + (offset - halfW) * px, y, path[i][1] + (offset - halfW) * pz, dist]);
    if (i > 0) dist += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  }
  for (let i = 0; i < path.length - 1; i++){
    const L = left[i], R = right[i], L2 = left[i + 1], R2 = right[i + 1];
    const v0 = L[3] / uvRepeat, v1 = L2[3] / uvRepeat;
    pushQuad(a,
      [L[0], L[1], L[2]], [R[0], R[1], R[2]], [R2[0], R2[1], R2[2]], [L2[0], L2[1], L2[2]],
      [0, v0], [1, v0], [1, v1], [0, v1]);
  }
}

/* 垂直裙邊：沿 path 偏移 offset 的單線，從 yTop 到 yBottom（人行道側面/緣石） */
function skirt(a, path, offset, yTop, yBottom){
  const tg = tangents(path);
  const line = [];
  for (let i = 0; i < path.length; i++){
    const [dx, dz] = tg[i];
    line.push([path[i][0] - dz * offset, path[i][1] + dx * offset]);
  }
  for (let i = 0; i < path.length - 1; i++){
    const A = line[i], B = line[i + 1];
    pushQuad(a,
      [A[0], yTop, A[1]], [B[0], yTop, B[1]], [B[0], yBottom, B[1]], [A[0], yBottom, A[1]],
      [0, 0], [1, 0], [1, 1], [0, 1]);
  }
}

/* 中央虛線（黃）：沿 path 每 dash/gap 一段 */
function dashes(a, path, halfW, y, dashLen, gapLen, width){
  let acc2 = 0;
  for (let i = 0; i < path.length - 1; i++){
    const A = path[i], B = path[i + 1];
    const dx = B[0] - A[0], dz = B[1] - A[1];
    const L = Math.hypot(dx, dz);
    if (L < 0.01) continue;
    const ux = dx / L, uz = dz / L;
    let t = 0;
    while (t < L){
      const start = t;
      const end = Math.min(t + dashLen, L);
      const cx = (A[0] + ux * (start + end) / 2), cz = (A[1] + uz * (start + end) / 2);
      const len = end - start;
      const px = -uz, pz = ux;
      /* 以段中心放一個小 quad（避免跨段拆分複雜化） */
      if (len > 0.3){
        pushQuad(a,
          [cx + px * width / 2 - ux * len / 2, y, cz + pz * width / 2 - uz * len / 2],
          [cx - px * width / 2 - ux * len / 2, y, cz - pz * width / 2 - uz * len / 2],
          [cx - px * width / 2 + ux * len / 2, y, cz - pz * width / 2 + uz * len / 2],
          [cx + px * width / 2 + ux * len / 2, y, cz + pz * width / 2 + uz * len / 2],
          [0, 0], [1, 0], [1, 1], [0, 1]);
      }
      t += dashLen + gapLen;
    }
    acc2 += L;
  }
}

/* ---------- 主生成 ---------- */
/* buildRoadNetwork(roads) → { group, walkPolys }
   group：合併後的路面/標線/人行道/分隔島（receiveShadow）
   walkPolys：人行道頂面多邊形（供可走面系統註冊高度） */
function buildRoadNetwork(roads){
  const M = getMats();
  const asphalt = acc(), concrete = acc(), lineW = acc(), lineY = acc(), walk = acc(), median = acc();
  const walkPolys = [];

  for (const road of roads){
    const path = road.path;
    if (path.length < 2) continue;
    const w = WIDTH[road.class] || WIDTH.lane;
    const halfW = w / 2;
    const isVeh = road.class !== 'lane';

    /* 路面 */
    const surf = road.class === 'major' ? asphalt : road.class === 'minor' ? asphalt : concrete;
    flatRibbon(surf, path, 0, halfW, 0.01, road.class === 'lane' ? 3 : 8);

    /* 標線（車行道路） */
    if (isVeh){
      /* 邊線（白） */
      flatRibbon(lineW, path, halfW - 0.45, 0.14, 0.02, 50);
      flatRibbon(lineW, path, -(halfW - 0.45), 0.14, 0.02, 50);
      if (road.class === 'major'){
        /* 幹道：雙黃實線中央 */
        flatRibbon(lineY, path, 0.22, 0.12, 0.022, 50);
        flatRibbon(lineY, path, -0.22, 0.12, 0.022, 50);
        /* 中央分隔島（混凝土島） */
        flatRibbon(median, path, 0, 0.55, 0.19, 4);
        skirt(median, path, 0.55, 0.19, 0.0);
        skirt(median, path, -0.55, 0.19, 0.0);
      } else {
        /* 次要：黃虛線 */
        dashes(lineY, path, 0, 0.022, 3, 3, 0.25);
      }
    }

    /* 人行道（major/minor 兩側） */
    const ww = WALK_W[road.class] || 0;
    if (ww > 0){
      for (const side of [1, -1]){
        const off = side * (halfW + ww / 2);
        flatRibbon(walk, path, off, ww / 2, WALK_H, 2);
        skirt(walk, path, off - side * ww / 2, WALK_H, 0);
        skirt(walk, path, off + side * ww / 2, WALK_H, 0);
        /* 可走面多邊形（取頂帶左右邊界頂點重組） */
        walkPolys.push(sidePolyFromRibbon(path, off, ww / 2));
      }
    }
  }

  const group = new THREE.Group();
  const parts = [
    [asphalt, M.asphalt], [concrete, M.concrete],
    [lineW, M.lineW], [lineY, M.lineY],
    [walk, M.walk], [median, M.median]
  ];
  for (const [a, mat] of parts){
    if (a.pos.length){
      const mesh = new THREE.Mesh(accToGeom(a), mat);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  return { group, walkPolys };
}

/* 由 ribbon 數學重建人行道頂面多邊形（供 point-in-poly 高度查詢） */
function sidePolyFromRibbon(path, offset, halfW){
  const tg = tangents(path);
  const left = [], right = [];
  for (let i = 0; i < path.length; i++){
    const [dx, dz] = tg[i];
    const px = -dz, pz = dx;
    left.push([path[i][0] + (offset + halfW) * px, path[i][1] + (offset + halfW) * pz]);
    right.push([path[i][0] + (offset - halfW) * px, path[i][1] + (offset - halfW) * pz]);
  }
  return left.concat(right.reverse());
}

/* 只算人行道可走面多邊形（不建幾何；chunk 全域註冊用） */
function walkPolysFor(roads){
  const out = [];
  for (const road of roads){
    const ww = WALK_W[road.class] || 0;
    if (ww <= 0 || road.path.length < 2) continue;
    const halfW = (WIDTH[road.class] || WIDTH.lane) / 2;
    for (const side of [1, -1]){
      out.push(sidePolyFromRibbon(road.path, side * (halfW + ww / 2), ww / 2));
    }
  }
  return out;
}

/* 依 150m chunk 切分路網（段中點歸屬；跨格 way 拆成子路） */
const CHUNK = 150;
function splitRoadsForChunks(roads){
  const map = new Map();
  for (const road of roads){
    const path = road.path;
    if (path.length < 2) continue;
    let curKey = null, curPath = null;
    const flush = () => {
      if (curPath && curPath.length >= 2){
        const arr = map.get(curKey) || [];
        arr.push(Object.assign({}, road, { path: curPath }));
        map.set(curKey, arr);
      }
    };
    for (let i = 0; i < path.length - 1; i++){
      const a = path[i], b = path[i + 1];
      const key = Math.floor((a[0] + b[0]) / 2 / CHUNK) + ',' + Math.floor((a[1] + b[1]) / 2 / CHUNK);
      if (key !== curKey){
        flush();
        curKey = key;
        curPath = [a, b];
      } else {
        curPath.push(b);
      }
    }
    flush();
  }
  return map;
}

export { buildRoadNetwork, walkPolysFor, splitRoadsForChunks, WIDTH, WALK_W, WALK_H };
