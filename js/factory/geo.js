/* 幾何工廠：同材質幾何合併、場景套件（加物件＋碰撞註冊） */
import * as THREE from 'three';
import { createSpatialHash } from '../core/spatialhash.js';

/* 合併多個 BufferGeometry（僅 position + normal，適用純色材質） */
function mergeGeoms(geoms){
  const flat = geoms.map(g => g.index ? g.toNonIndexed() : g);
  let n = 0;
  for (const g of flat) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of flat){
    pos.set(g.attributes.position.array, o);
    nor.set(g.attributes.normal.array, o);
    o += g.attributes.position.count * 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/* 場景套件：A() 加場景＋陰影、addCol 碰撞矩形（同步登記空間雜湊）、snowOverlays 積雪覆蓋面收集 */
function createSceneKit(scene){
  const colliders = [];
  const snowOverlays = [];
  const hash = createSpatialHash();
  const A = (m, cast, recv) => { m.castShadow = cast !== false; m.receiveShadow = recv !== false; scene.add(m); return m; };
  const addCol = (x1, x2, z1, z2) => {
    const box = { x1, x2, z1, z2 };
    colliders.push(box);
    hash.insert(box);
  };
  const collide = { query: hash.query };
  return { colliders, snowOverlays, A, addCol, collide };
}

export { mergeGeoms, createSceneKit };
