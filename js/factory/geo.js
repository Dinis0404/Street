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

/* InstancedMesh 工廠：transforms = [{ p:[x,y,z], rx/ry/rz, s:統一或 [x,y,z] }]
   opts: { castShadow（預設 true）, receiveShadow（預設 false）} */
function makeInstanced(geom, mat, transforms, opts){
  opts = opts || {};
  const m = new THREE.InstancedMesh(geom, mat, transforms.length);
  const M = new THREE.Matrix4();
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const E = new THREE.Euler();
  for (let i = 0; i < transforms.length; i++){
    const t = transforms[i];
    P.set(t.p[0], t.p[1], t.p[2]);
    E.set(t.rx || 0, t.ry || 0, t.rz || 0);
    Q.setFromEuler(E);
    if (Array.isArray(t.s)) S.set(t.s[0], t.s[1], t.s[2]);
    else S.setScalar(t.s !== undefined ? t.s : 1);
    M.compose(P, Q, S);
    m.setMatrixAt(i, M);
  }
  m.instanceMatrix.needsUpdate = true;
  m.castShadow = opts.castShadow !== false;
  m.receiveShadow = opts.receiveShadow === true;
  return m;
}

export { mergeGeoms, createSceneKit, makeInstanced };
