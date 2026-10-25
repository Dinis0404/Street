/* 四四南村地標（S 級）— 全案第一打卡點
   連棟黑瓦平房×3 排（灰磚牆＋藍白木窗＋深灰雙坡瓦頂）、西側草坪望 101
   視線走廊硬性要求：草坪朝 101（西北）方向不放任何高過屋脊之物件 */

import * as THREE from 'three';
import { mergeGeoms } from '../factory/geo.js';
import { makeCanvasTexture } from '../factory/tex.js';
import { registerWindow } from '../systems/nightlights.js';

let _mats = null;
function getMats(){
  if (_mats) return _mats;
  /* 灰磚牆（下緣紅磚帶） */
  const wallTex = makeCanvasTexture(256, 128, (g) => {
    g.fillStyle = '#a8a49c';
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = 'rgba(90,86,80,0.35)';
    g.lineWidth = 1;
    for (let y = 0; y <= 128; y += 16){
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
    for (let y = 0; y < 128; y += 16){
      for (let x = (y / 16) % 2 ? 0 : 16; x < 256; x += 32){
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke();
      }
    }
    g.fillStyle = '#9c5f4a';                     // 下緣紅磚帶
    g.fillRect(0, 108, 256, 20);
    g.strokeStyle = 'rgba(70,40,30,0.4)';
    for (let x = 0; x < 256; x += 24){ g.beginPath(); g.moveTo(x, 108); g.lineTo(x, 128); g.stroke(); }
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  /* 深灰黑瓦 */
  const roofTex = makeCanvasTexture(256, 128, (g) => {
    g.fillStyle = '#43474e';
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = 'rgba(25,28,34,0.55)';
    g.lineWidth = 2;
    for (let y = 0; y <= 128; y += 10){
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let y = 5; y < 128; y += 10){
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
  });
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;

  const winMat = new THREE.MeshStandardMaterial({
    color: 0x27405a, roughness: 0.4, metalness: 0.1,
    emissive: 0xffc98a, emissiveIntensity: 0.02
  });
  registerWindow(winMat);
  _mats = {
    wall: new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.9 }),
    win: winMat,
    door: new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.9 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x5d7a45, roughness: 1 }),
    path: new THREE.MeshStandardMaterial({ color: 0xaaa498, roughness: 1 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4f7040, roughness: 1, flatShading: true })
  };
  return _mats;
}

/* 雙坡屋頂（與河口湖 gableRoofGeom 同式：屋脊沿 Z 軸） */
function gableRoofGeom(w, d, h, oh){
  const x0 = w / 2, ze = d / 2 + oh, zd = d / 2;
  const V = [];
  const tri = (a, b, c) => V.push(...a, ...b, ...c);
  const Ae = [-x0, 0, -ze], Be = [x0, 0, -ze], Ce = [x0, 0, ze], De = [-x0, 0, ze];
  const R1 = [-x0, h, 0], R2 = [x0, h, 0];
  tri(Ae, R2, Be); tri(Ae, R1, R2);
  tri(Ce, R1, De); tri(Ce, R2, R1);
  tri([-x0, 0, -zd], [-x0, 0, zd], [-x0, h, 0]);
  tri([x0, 0, zd], [x0, 0, -zd], [x0, h, 0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V), 3));
  geo.computeVertexNormals();
  return geo;
}

/* 場景接入：createSisyVillage(scene, addCol) — 村落中心約 (188, 186) */
function createSisyVillage(scene, addCol){
  const M = getMats();
  const g = new THREE.Group();
  const walls = [], roofs = [], wins = [], doors = [];

  /* 三排連棟平房（E-W 走向，排間巷道） */
  const ROWS = [167, 187, 207];
  const UNIT_W = 4.7, DEPTH = 8, H = 3.1;
  const X0 = 165, X1 = 212;
  for (let ri = 0; ri < ROWS.length; ri++){
    const rowZ = ROWS[ri];
    let x = X0, u = 0;
    while (x + UNIT_W <= X1 + 0.01){
      const w = UNIT_W - 0.18;                     // 單元間留縫
      const h = H + ((ri + u) % 3) * 0.22;         // 高度微變化
      const wall = new THREE.BoxGeometry(w, h, DEPTH);
      wall.translate(x + w / 2, h / 2, rowZ);
      walls.push(wall);

      const roof = gableRoofGeom(w + 0.3, DEPTH, h * 0.32, 0.35);
      roof.rotateY(Math.PI / 2);                   // 屋脊轉為 E-W 向
      roof.translate(x + w / 2, h, rowZ);
      roofs.push(roof);

      /* 南面門（朝巷道/草坪側）＋南北長向窗 */
      if (u % 2 === 0){
        const door = new THREE.BoxGeometry(0.9, 1.9, 0.08);
        door.translate(x + w / 2, 0.95, rowZ - DEPTH / 2 - 0.06);
        doors.push(door);
      }
      for (const side of [-1, 1]){
        const win = new THREE.BoxGeometry(DEPTH * 0.5, 0.95, 0.08);
        win.translate(x + w / 2, 1.55, rowZ + side * (DEPTH / 2 + 0.06));
        wins.push(win);
      }
      x += UNIT_W;
      u++;
    }
    addCol(X0, X1, rowZ - DEPTH / 2 - 0.3, rowZ + DEPTH / 2 + 0.3);
  }

  const wallMesh = new THREE.Mesh(mergeGeoms(walls), M.wall);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  g.add(wallMesh);
  const roofMesh = new THREE.Mesh(mergeGeoms(roofs), M.roof);
  roofMesh.castShadow = true;
  g.add(roofMesh);
  if (wins.length){
    const wm = new THREE.Mesh(mergeGeoms(wins), M.win);
    g.add(wm);
  }
  if (doors.length){
    const dm = new THREE.Mesh(mergeGeoms(doors), M.door);
    g.add(dm);
  }

  /* 西側草坪（望 101 視線走廊：不放高物） */
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(34, 0.06, 58), M.lawn);
  lawn.position.set(144, 0.03, 188);
  lawn.receiveShadow = true;
  g.add(lawn);

  /* 草坪入口步道（東接村落巷） */
  const path = new THREE.Mesh(new THREE.BoxGeometry(12, 0.08, 3), M.path);
  path.position.set(160.5, 0.05, 187);
  g.add(path);

  /* 南緣低樹兩棵（低於屋脊，不擋 101 視線） */
  for (const [tx, tz, s] of [[136, 212, 1], [152, 214, 0.85]]){
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 2.2 * s, 6), M.trunk);
    trunk.position.set(tx, 1.1 * s, tz);
    trunk.castShadow = true;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * s, 1), M.leaf);
    crown.position.set(tx, 2.6 * s, tz);
    crown.scale.set(1, 0.8, 1);
    crown.castShadow = true;
    g.add(crown);
  }

  scene.add(g);
  return g;
}

export { createSisyVillage };
