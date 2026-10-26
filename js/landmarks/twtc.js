/* 世貿群建構器（S 級）
   一館：大跨距展館量體（實際 footprint）＋東北角辦公塔＋信義路側入口雨庇
   國際會議中心：實際 footprint 擠出
   三館現址（2022 標售拆除）：施工圍籬＋塔吊（旋轉動畫）＋工地照明 */

import * as THREE from 'three';
import { makeCanvasTexture, textTexture } from '../factory/tex.js';
import { registerSign } from '../systems/nightlights.js';

/* 三館現址街廓（依實況手工定位：信義路南側、松智路東側） */
const SITE3 = { x1: -80, z1: 115, x2: 10, z2: 225 };

let _mats = null;
function getMats(){
  if (_mats) return _mats;
  const hallTex = makeCanvasTexture(256, 128, (g) => {
    g.fillStyle = '#c2c8ca';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#5d7382';
    for (let y = 18; y < 118; y += 36) g.fillRect(6, y, 244, 20);
    g.strokeStyle = 'rgba(50,60,66,0.5)';
    g.lineWidth = 3;
    for (let x = 0; x <= 256; x += 61){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  });
  hallTex.wrapS = THREE.RepeatWrapping;
  const litTex = makeCanvasTexture(256, 128, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 128);
    for (let y = 18; y < 118; y += 36){
      for (let x = 8; x < 248; x += 30){
        if (Math.random() < 0.45){ g.fillStyle = '#ffe2b0'; g.fillRect(x, y, 22, 20); }
      }
    }
  });
  litTex.wrapS = THREE.RepeatWrapping;
  const hallMat = new THREE.MeshStandardMaterial({
    map: hallTex, roughness: 0.5, metalness: 0.3,
    emissive: 0xffffff, emissiveMap: litTex, emissiveIntensity: 0.04
  });
  registerSign(hallMat, 0.04, 0.9);

  const fenceTex = makeCanvasTexture(256, 64, (g) => {
    g.fillStyle = '#3f7a55';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#e8e8e2';
    g.fillRect(0, 26, 256, 12);
    g.fillStyle = '#d8c23a';
    for (let x = 0; x < 256; x += 24) g.fillRect(x, 56, 12, 8);
    g.fillStyle = '#f0f0ea';
    g.font = '700 22px "Microsoft JhengHei",sans-serif';
    g.fillText('工地施工中', 44, 22);
  });
  fenceTex.wrapS = THREE.RepeatWrapping;

  _mats = {
    hall: hallMat,
    tower: new THREE.MeshStandardMaterial({ color: 0xaab4b8, roughness: 0.4, metalness: 0.4 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x6d7175, roughness: 1 }),
    canopy: new THREE.MeshStandardMaterial({ color: 0xd8dcde, roughness: 0.6, metalness: 0.3 }),
    fence: new THREE.MeshStandardMaterial({ map: fenceTex, roughness: 0.9 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x8a7358, roughness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8a23a, roughness: 0.6, metalness: 0.4 })
  };
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x552222, emissive: 0xff3020, emissiveIntensity: 0.3, roughness: 0.5 });
  registerSign(beaconMat, 0.3, 1.6);
  _mats.beacon = beaconMat;
  return _mats;
}

function signedArea(poly){
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++){
    const a = poly[i], b = poly[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

function extrudeInto(pos, uv, nor, roofPos, poly, h, uPerM){
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

/* 塔吊（緩慢旋轉＋警示燈） */
function buildCrane(g, animators, x, z, h, reach, phase){
  const M = getMats();
  const crane = new THREE.Group();
  crane.position.set(x, 0, z);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(2, h, 2), M.steel);
  mast.position.y = h / 2;
  mast.castShadow = true;
  crane.add(mast);
  const top = new THREE.Group();
  top.position.y = h;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.6), M.steel);
  top.add(cab);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(reach, 1.2, 1.2), M.steel);
  jib.position.x = reach / 2 + 1;
  top.add(jib);
  const cjib = new THREE.Mesh(new THREE.BoxGeometry(reach * 0.36, 1.1, 1.1), M.steel);
  cjib.position.x = -reach * 0.18;
  top.add(cjib);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.14, h * 0.5, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x444a4e, roughness: 0.8 }));
  cable.position.set(reach * 0.7, -h * 0.25, 0);
  top.add(cable);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), M.beacon);
  beacon.position.y = 2.2;
  top.add(beacon);
  crane.add(top);
  g.add(crane);
  animators.push((t) => {
    top.rotation.y = phase + Math.sin(t * 0.05 + phase) * 2.2;
  });
}

/* 場景接入：回傳需自通用生成排除的建物 id 清單 */
function buildTwtc(scene, addCol, buildings, animators){
  const M = getMats();
  const byId = new Map(buildings.map((b) => [b.id, b]));
  const excluded = [];

  /* ---- 世貿一館（展覽大樓）---- */
  const hall = byId.get('w137077752');
  if (hall){
    const poly = signedArea(hall.poly) < 0 ? hall.poly.slice().reverse() : hall.poly;
    let x1 = 1e9, x2 = -1e9, z1 = 1e9, z2 = -1e9;
    for (const p of poly){
      if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0];
      if (p[1] < z1) z1 = p[1]; if (p[1] > z2) z2 = p[1];
    }
    const pos = [], uv = [], nor = [], roofPos = [];
    extrudeInto(pos, uv, nor, roofPos, poly, 33, 1 / 30);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const hallMesh = new THREE.Mesh(geo, M.hall);
    hallMesh.castShadow = true;
    hallMesh.receiveShadow = true;
    scene.add(hallMesh);
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
    roofGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(roofGeo, M.roof));
    /* 東北角辦公塔 */
    const tower = new THREE.Mesh(new THREE.BoxGeometry(24, 57, 24), M.tower);
    tower.position.set(x2 - 13, 28.5, z1 + 13);
    tower.castShadow = true;
    scene.add(tower);
    /* 信義路側入口雨庇（南面） */
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 10), M.canopy);
    canopy.position.set((x1 + x2) / 2, 12, z2 + 5);
    canopy.castShadow = true;
    scene.add(canopy);
    addCol(x1, x2, z1, z2);
    excluded.push(hall.id);
  }

  /* ---- 國際會議中心 ---- */
  const ticc = byId.get('w136814399');
  if (ticc){
    const poly = signedArea(ticc.poly) < 0 ? ticc.poly.slice().reverse() : ticc.poly;
    let x1 = 1e9, x2 = -1e9, z1 = 1e9, z2 = -1e9;
    for (const p of poly){
      if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0];
      if (p[1] < z1) z1 = p[1]; if (p[1] > z2) z2 = p[1];
    }
    const h = ticc.height || 49;
    const pos = [], uv = [], nor = [], roofPos = [];
    extrudeInto(pos, uv, nor, roofPos, poly, h, 1 / 26);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const mesh = new THREE.Mesh(geo, M.hall);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
    roofGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(roofGeo, M.roof));
    addCol(x1, x2, z1, z2);
    excluded.push(ticc.id);
  }

  /* ---- 世貿三館現址：施工圍籬＋塔吊 ---- */
  {
    const S = SITE3;
    const g = new THREE.Group();
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(S.x2 - S.x1 - 4, 0.3, S.z2 - S.z1 - 4), M.dirt);
    dirt.position.set((S.x1 + S.x2) / 2, 0.15, (S.z1 + S.z2) / 2);
    dirt.receiveShadow = true;
    g.add(dirt);
    const H = 2.3;
    const sides = [
      [S.x1, S.z1, S.x2, S.z1],
      [S.x1, S.z2, S.x2, S.z2],
      [S.x1, S.z1, S.x1, S.z2],
      [S.x2, S.z1, S.x2, S.z2]
    ];
    for (const [ax, az, bx, bz] of sides){
      const len = Math.hypot(bx - ax, bz - az);
      const fence = new THREE.Mesh(new THREE.BoxGeometry(len + 1, H, 0.15), M.fence);
      fence.position.set((ax + bx) / 2, H / 2, (az + bz) / 2);
      fence.rotation.y = Math.abs(bx - ax) > Math.abs(bz - az) ? 0 : Math.PI / 2;
      fence.castShadow = true;
      g.add(fence);
    }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 3),
      new THREE.MeshStandardMaterial({ map: textTexture('世貿三館新建工程', '#2f4f6f', '#ffffff', 1024, 256, 88), roughness: 0.8 }));
    board.position.set((S.x1 + S.x2) / 2, 3.4, S.z1 - 0.15);
    g.add(board);
    buildCrane(g, animators, S.x1 + 22, S.z1 + 30, 42, 34, 0);
    buildCrane(g, animators, S.x2 - 22, S.z2 - 30, 36, 30, 2.4);
    for (const [mx, mz] of [[S.x1 + 45, S.z2 - 20], [S.x2 - 35, S.z1 + 45]]){
      const stack = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 4), M.steel);
      stack.position.set(mx, 1.2, mz);
      stack.rotation.y = 0.4;
      stack.castShadow = true;
      g.add(stack);
    }
    scene.add(g);
    addCol(S.x1 - 0.5, S.x2 + 0.5, S.z1, S.z2);
  }

  return excluded;
}

/* 三館基地內的小建物碎片一併交給呼叫端排除 */
function inSite3(building){
  let cx = 0, cz = 0;
  for (const p of building.poly){ cx += p[0]; cz += p[1]; }
  cx /= building.poly.length; cz /= building.poly.length;
  return cx > SITE3.x1 && cx < SITE3.x2 && cz > SITE3.z1 && cz < SITE3.z2;
}

function twtcIds(){
  return ['w137077752', 'w136814399'];
}

export { buildTwtc, inSite3, twtcIds };
