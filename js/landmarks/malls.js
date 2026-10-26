/* 百貨群建構器（S 級）：新光三越 A4/A8/A9/A11、ATT 4 FUN＋信義威秀、Bellavita
   共用結構：實際 footprint 擠出＋玻璃幕牆貼圖＋一樓櫥窗帶（夜亮）＋屋頂字樣
   廣告牆：CanvasTexture 風格化海報（兩格輪播，texture.offset 位移換檔）
   商標風格化：字樣以館別代碼呈現，不重製真實商標 */

import * as THREE from 'three';
import { makeCanvasTexture, textTexture } from '../factory/tex.js';
import { registerSign } from '../systems/nightlights.js';

/* 手工樓高表（OSM 缺 height；依實景約略樓層推估，比對時校訂） */
const MALLS = [
  { id: 'w274647897', code: 'A4', h: 54, tint: '#9fb8c4' },
  { id: 'w274647896', code: 'A8', h: 38, tint: '#a8bcc6' },
  { id: 'w269773067', code: 'A9', h: 60, tint: '#9ab4be', atrium: true },
  { id: 'w391309615', code: 'A11', h: 38, tint: '#a2b6c0', ad: true },
  { id: 'w269773066', code: 'A11', h: 36, tint: '#a2b6c0', ad: true },   // 松壽路沿線（OSM 名稱待校）
  { id: 'w234589397', code: 'ATT 4 FUN', h: 30, tint: '#8fa8b2', ad: true },
  { id: 'r18356791#0', code: 'VIESHOW', h: 26, tint: '#9aa9b4', ad: true },
  { id: 'w274646859', code: 'BELLA VITA', h: 36, tint: '#cabfa8', stone: true }
];

let _mats = {};
function facadeMat(tint, stone){
  const key = tint + (stone ? '-s' : '');
  if (_mats[key]) return _mats[key];
  const tex = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = stone ? '#d8cfba' : tint;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(40,55,60,0.5)';
    g.lineWidth = 3;
    if (stone){
      for (let y = 0; y <= 256; y += 64){
        for (let x = (y / 64) % 2 ? -32 : 0; x < 256; x += 64){
          g.strokeRect(x + 1.5, y + 1.5, 61, 61);
        }
      }
    } else {
      for (let y = 0; y <= 256; y += 42){
        g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
      }
      for (let x = 0; x <= 256; x += 42){
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.10)';
      for (let y = 4; y < 256; y += 42) g.fillRect(0, y, 256, 12);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const lit = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 256, 256);
    if (!stone){
      for (let y = 4; y < 256; y += 42){
        for (let x = 6; x < 250; x += 30){
          if (Math.random() < 0.4){
            g.fillStyle = Math.random() < 0.7 ? '#ffdca8' : '#d8ecf5';
            g.fillRect(x, y, 22, 30);
          }
        }
      }
    }
  });
  lit.wrapS = lit.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: stone ? 0.8 : 0.35, metalness: stone ? 0.05 : 0.45,
    emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: 0.03
  });
  registerSign(mat, 0.03, 0.75);
  _mats[key] = mat;
  return mat;
}

/* 一樓櫥窗帶材質（全寬、夜亮） */
let _shopMat = null;
function shopBandMat(){
  if (_shopMat) return _shopMat;
  const tex = makeCanvasTexture(512, 64, (g) => {
    g.fillStyle = '#25313a';
    g.fillRect(0, 0, 512, 64);
    for (let x = 8; x < 504; x += 64){
      g.fillStyle = '#3c5260';
      g.fillRect(x, 8, 52, 48);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x, 8, 52, 10);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.3, metalness: 0.3,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.05
  });
  registerSign(mat, 0.05, 1.25);
  _shopMat = mat;
  return mat;
}

/* 風格化廣告牆海報（兩格輪播 → texture.offset.x 動畫） */
let _adCount = 0;
function adWallTexture(){
  const posters = [
    { bg: '#c8412f', fg: '#ffffff', word: 'SALE 30%', sub: 'AUTUMN FESTIVAL' },
    { bg: '#22346b', fg: '#ffd873', word: 'NEW SEASON', sub: 'GRAND OPENING' },
    { bg: '#e9e2d0', fg: '#2b2b28', word: 'BEAUTY WEEK', sub: 'XINYI PLAZA' }
  ];
  const idx = _adCount++;
  const a = posters[idx % posters.length];
  const b = posters[(idx + 1) % posters.length];
  return makeCanvasTexture(1024, 512, (g) => {
    /* 左右兩格海報，offset.x 0→0.5 輪播 */
    [[a, 0], [b, 512]].forEach(([p, ox]) => {
      g.fillStyle = p.bg;
      g.fillRect(ox, 0, 512, 512);
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.beginPath(); g.arc(ox + 256, 190, 150, 0, Math.PI * 2); g.fill();
      g.fillStyle = p.fg;
      g.font = '900 64px "Microsoft JhengHei",sans-serif';
      g.textAlign = 'center';
      g.fillText(p.word, ox + 256, 220);
      g.font = '600 26px "Microsoft JhengHei",sans-serif';
      g.fillText(p.sub, ox + 256, 290);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(ox, 470, 512, 42);
    });
  });
}

function signedArea(poly){
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/* 擠出量體（立面 UV：u 公尺制、v 全高） */
function extrude(pos, uv, nor, roofPos, poly, h, uPerM){
  const n = poly.length;
  let u = 0;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const nx = dz / len, nz = -dx / len;
    const u0 = u * uPerM, u1 = (u + len) * uPerM;
    pos.push(a[0], 0, a[1], b[0], 0, b[1], b[0], h, b[1]);
    pos.push(a[0], 0, a[1], b[0], h, b[1], a[0], h, a[1]);
    uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
    u += len;
  }
  const cx = poly.reduce((s, p) => s + p[0], 0) / n;
  const cz = poly.reduce((s, p) => s + p[1], 0) / n;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    roofPos.push(cx, h, cz, a[0], h, a[1], b[0], h, b[1]);
  }
}

/* 主入口：依 footprint 找最寬的南向面（朝松壽/松高路）放字樣與櫥窗 */
function widestSouthFace(poly){
  let best = null;
  for (let i = 0; i < poly.length; i++){
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const nx = dz / len, nz = -dx / len;
    if (nz > 0.5 && (!best || len > best.len)) best = { a, b, len, nx, nz };
  }
  return best;
}

/* 場景接入：buildMalls(scene, addCol, buildings, animators) */
function buildMalls(scene, addCol, buildings, animators){
  const byId = new Map(buildings.map((b) => [b.id, b]));
  const built = [];
  for (const cfg of MALLS){
    const b = byId.get(cfg.id);
    if (!b) continue;
    const poly = signedArea(b.poly) < 0 ? b.poly.slice().reverse() : b.poly;
    const h = cfg.h;
    const g = new THREE.Group();

    /* 量體 */
    const pos = [], uv = [], nor = [], roofPos = [];
    extrude(pos, uv, nor, roofPos, poly, h, 1 / 24);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const mesh = new THREE.Mesh(geo, facadeMat(cfg.tint, cfg.stone));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
    roofGeo.computeVertexNormals();
    g.add(new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x70747a, roughness: 1 })));

    /* 主入口面：櫥窗帶＋屋頂字樣＋廣告牆 */
    const face = widestSouthFace(poly);
    if (face){
      const mx = (face.a[0] + face.b[0]) / 2, mz = (face.a[1] + face.b[1]) / 2;
      const ang = Math.atan2(face.nx, face.nz);   // 面法線 → 平面旋轉角
      /* 櫥窗帶（一樓，沿面外移 0.1） */
      const band = new THREE.Mesh(new THREE.PlaneGeometry(face.len * 0.92, 4.2), shopBandMat());
      band.position.set(mx + face.nx * 0.12, 2.1, mz + face.nz * 0.12);
      band.rotation.y = ang;
      g.add(band);
      /* 屋頂字樣（館別代碼，風格化） */
      const codeTex = textTexture(cfg.code, '#f4f4f0', '#c8412f', 512, 128, 72);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(face.len * 0.6, cfg.code.length * 3.4 + 4), 3.4),
        new THREE.MeshStandardMaterial({
          map: codeTex, emissive: 0xffffff, emissiveMap: codeTex,
          emissiveIntensity: 0.25, roughness: 0.6
        }));
      registerSign(sign.material, 0.25, 1.9);
      sign.position.set(mx + face.nx * 0.5, h + 2.2, mz + face.nz * 0.5);
      sign.rotation.y = ang;
      g.add(sign);
      /* 廣告牆（輪播動畫） */
      if (cfg.ad){
        const adTex = adWallTexture();
        adTex.wrapS = THREE.RepeatWrapping;
        const adW = Math.min(face.len * 0.55, 26), adH = Math.min(h * 0.42, 18);
        const ad = new THREE.Mesh(new THREE.PlaneGeometry(adW, adH), new THREE.MeshStandardMaterial({
          map: adTex, emissive: 0xffffff, emissiveMap: adTex,
          emissiveIntensity: 0.28, roughness: 0.5
        }));
        registerSign(ad.material, 0.28, 1.35);
        ad.position.set(mx + face.nx * 0.3, 4.2 + adH / 2 + 0.4, mz + face.nz * 0.3);
        ad.rotation.y = ang;
        g.add(ad);
        /* 換檔動畫：每 8 秒切到右半格，短暫滑動 */
        let phase = 0;
        animators.push((t) => {
          const c = (t + phase) % 16;
          if (c < 7.4) adTex.offset.x = 0;
          else if (c < 8) adTex.offset.x = (c - 7.4) / 0.6 * 0.5;
          else if (c < 15.4) adTex.offset.x = 0.5;
          else adTex.offset.x = 0.5 - (c - 15.4) / 0.6 * 0.5;
        });
      }
    }

    scene.add(g);
    let x1 = 1e9, x2 = -1e9, z1 = 1e9, z2 = -1e9;
    for (const p of b.poly){
      if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0];
      if (p[1] < z1) z1 = p[1]; if (p[1] > z2) z2 = p[1];
    }
    addCol(x1, x2, z1, z2);
    built.push(b.id);
  }
  return built;
}

/* 供通用生成器排除用 */
function mallIds(){
  return MALLS.map((m) => m.id);
}

export { buildMalls, mallIds };
