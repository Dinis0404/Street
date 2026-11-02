/* 捷運出入口（S 級）：市政府站、台北101/世貿站、象山站
   全線地下，僅做出入口：玻璃雨罩＋白光條＋站名燈箱＋下潛樓梯意象＋YouBike 想像留白
   出口座標＝district POI 真實出口位置 */

import * as THREE from 'three';
import { makeCanvasTexture, textTexture } from '../factory/tex.js';
import { registerSign } from '../systems/nightlights.js';

/* 出口清單：pos=世界座標，rotY=雨罩朝向 */
const EXITS = [
  { station: '市政府', id: 'M8', x: 264, z: -853, rotY: 0 },
  { station: '市政府', id: 'M3', x: 340, z: -769, rotY: 0 },
  { station: '台北101/世貿', id: 'M5', x: -143, z: 53, rotY: 0 },
  { station: '台北101/世貿', id: 'M1', x: 105, z: 55, rotY: 0 },
  { station: '象山', id: 'R1', x: 401, z: 95, rotY: 0 },
  { station: '象山', id: 'R2', x: 509, z: 176, rotY: Math.PI / 2 },
  { station: '象山', id: 'R3', x: 656, z: 95, rotY: 0 }
];

let _mats = null;
function getMats(){
  if (_mats) return _mats;
  /* 站名燈箱（白底黑字＋路線色帶：M=板南藍、R=信義紅） */
  const boxTex = (name, code) => makeCanvasTexture(512, 128, (g) => {
    g.fillStyle = '#f2f4f2';
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = code[0] === 'M' ? '#0b6cb6' : '#c4006b';
    g.fillRect(0, 0, 88, 128);
    g.fillStyle = '#ffffff';
    g.font = '900 56px "Microsoft JhengHei",sans-serif';
    g.textAlign = 'center';
    g.fillText(code, 44, 88);
    g.fillStyle = '#22262a';
    g.font = '700 44px "Microsoft JhengHei",sans-serif';
    g.textAlign = 'left';
    g.fillText(name, 104, 78);
    g.fillStyle = '#8a9096';
    g.font = '600 24px sans-serif';
    g.fillText('Metro Station', 106, 112);
  });
  const cache = {};
  _mats = {
    frame: new THREE.MeshStandardMaterial({ color: 0x8e959b, roughness: 0.5, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbcd2da, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.5 }),
    stair: new THREE.MeshStandardMaterial({ color: 0x5b6167, roughness: 0.95 }),
    strip: (() => {
      const m = new THREE.MeshStandardMaterial({ color: 0xdde6ec, emissive: 0xeaf4ff, emissiveIntensity: 0.25, roughness: 0.4 });
      registerSign(m, 0.25, 2.2);
      return m;
    })()
  };
  _mats.boxTex = boxTex;
  return _mats;
}

/* 單一出口：雨罩（弧形近似＝斜板）＋光條＋燈箱＋下潛樓梯 */
function buildExit(scene, addCol, exit){
  const M = getMats();
  const g = new THREE.Group();
  g.position.set(exit.x, 0, exit.z);
  g.rotation.y = exit.rotY;

  /* 下潛樓梯坑（深灰，往下意象） */
  const pit = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 6), M.stair);
  pit.position.set(0, 0.02, 0);
  pit.receiveShadow = true;
  g.add(pit);
  for (let i = 0; i < 4; i++){
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.1), M.stair);
    step.position.set(0, -0.12 - i * 0.14, -1.6 + i * 1.1);
    g.add(step);
  }

  /* 玻璃雨罩：兩側斜板＋背板 */
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 7.4, ), M.glass);
  canopy.position.set(0, 3.1, 0);
  canopy.rotation.x = 0.1;
  canopy.castShadow = true;
  g.add(canopy);
  for (const side of [-1, 1]){
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.1, 8), M.frame);
    post.position.set(side * 2.6, 1.55, 2.6);
    g.add(post);
    const post2 = post.clone();
    post2.position.z = -2.6;
    g.add(post2);
  }
  /* 背板（封牆＋站名燈箱） */
  const back = new THREE.Mesh(new THREE.BoxGeometry(6, 3.1, 0.18), M.frame);
  back.position.set(0, 1.55, -3.5);
  back.castShadow = true;
  g.add(back);
  const tex = M.boxTex(exit.station, exit.id);
  const boxMat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3, roughness: 0.5
  });
  registerSign(boxMat, 0.3, 1.6);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), boxMat);
  sign.position.set(0, 2.1, -3.39);
  g.add(sign);
  /* 光條（雨罩邊緣，夜間亮） */
  for (const side of [-1, 1]){
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 7.4), M.strip);
    strip.position.set(side * 3, 3.2, 0);
    g.add(strip);
  }

  scene.add(g);
  addCol(exit.x - 3, exit.x + 3, exit.z - 3.6, exit.z + 3.6);
}

/* 場景接入 */
function buildMetro(scene, addCol){
  for (const e of EXITS) buildExit(scene, addCol, e);
}

export { buildMetro, EXITS };
