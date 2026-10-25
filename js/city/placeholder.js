/* 信義區場景：城市總管接入（T1.4）
   路網＋街廓以 150 m chunk 串流建構；可走面與碰撞全域註冊（查詢本來就只看玩家所在格）
   玩家出生：四四南村前草坪（T1.7 精校座標） */
import * as THREE from 'three';
import { createSceneKit } from '../factory/geo.js';
import { createGround } from './ground.js';
import { buildRoadNetwork, walkPolysFor, splitRoadsForChunks, WALK_H } from './roads.js';
import { buildBlocks } from './blocks.js';
import { createTaipei101 } from '../landmarks/taipei101.js';
import { textTexture } from '../factory/tex.js';
import * as district from '../data/district.js';

const CHUNK = 150;

function createWorld(scene, ctx){
  const { colliders, collide, snowOverlays, A, addCol } = createSceneKit(scene);

  /* 基地地面 */
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x7d8288, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  A(ground, false, true);

  /* 可走面（人行道高度）與碰撞（建築 AABB）全域註冊 */
  const groundSys = createGround();
  for (const p of walkPolysFor(district.roads)) groundSys.addPoly(p, WALK_H);

  const generic = district.buildings.filter((b) => !b.override);
  for (const b of generic){
    if (b.tier > 2) continue;
    let x1 = 1e9, x2 = -1e9, z1 = 1e9, z2 = -1e9;
    for (const p of b.poly){
      if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0];
      if (p[1] < z1) z1 = p[1]; if (p[1] > z2) z2 = p[1];
    }
    addCol(x1, x2, z1, z2);
  }

  /* 依 150 m chunk 分派內容（路網按段中點、建物按重心） */
  const roadChunks = splitRoadsForChunks(district.roads);
  const blockChunks = new Map();
  for (const b of generic){
    let cx = 0, cz = 0;
    for (const p of b.poly){ cx += p[0]; cz += p[1]; }
    cx /= b.poly.length; cz /= b.poly.length;
    const key = Math.floor(cx / CHUNK) + ',' + Math.floor(cz / CHUNK);
    const arr = blockChunks.get(key) || [];
    arr.push(b);
    blockChunks.set(key, arr);
  }
  const keys = new Set([...roadChunks.keys(), ...blockChunks.keys()]);
  for (const key of keys){
    const [cx, cz] = key.split(',').map(Number);
    ctx.city.register(cx, cz, () => {
      const g = new THREE.Group();
      const subRoads = roadChunks.get(key);
      if (subRoads) g.add(buildRoadNetwork(subRoads).group);
      const subBlocks = blockChunks.get(key);
      if (subBlocks) g.add(buildBlocks(subBlocks).group);
      return g;
    });
  }

  /* 台北 101（S 級地標，位置＝district footprint 中心） */
  createTaipei101(scene, addCol, -9, -16);

  /* 施工告示（出生點東側，面向玩家） */
  const signMat = new THREE.MeshStandardMaterial({
    map: textTexture('🚧 四四南村 整建中', '#f7c948', '#2b2f36', 1024, 256, 96),
    roughness: 0.8
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), signMat);
  sign.position.set(163, 2.5, 260);
  sign.rotation.y = -Math.PI / 2;   // 面向西側出生點
  A(sign, false, false);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.7, metalness: 0.3 });
  for (const lz of [256, 264]){
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), legMat);
    leg.position.set(163, 1.3, lz);
    A(leg);
  }
  addCol(162.6, 163.4, 255.6, 264.4);

  /* 交通錐 */
  for (const [cx2, cz2] of [[156, 266], [156, 254], [160, 260]]){
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.2, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8641e, roughness: 0.7 }));
    cone.position.set(cx2, 0.28, cz2);
    A(cone);
  }

  /* 出生點：四四南村草坪一帶（避開信義運動中心量體），北望 101 */
  const spawn = new THREE.Vector3(150, 0, 260);
  return {
    colliders, collide, snowOverlays,
    spawn: spawn.clone(),
    classic: { pos: spawn.clone(), yaw: 0.05, pitch: 0.12, dist: 5.5 },
    groundHeightAt: groundSys.surfaceHeightAt,
    fujiUniforms: null
  };
}

export { createWorld };
