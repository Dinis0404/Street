/* 信義區場景：城市總管接入（T1.4）
   路網＋街廓以 150 m chunk 串流建構；可走面與碰撞全域註冊（查詢本來就只看玩家所在格）
   玩家出生：四四南村前草坪（T1.7 精校座標） */
import * as THREE from 'three';
import { createSceneKit } from '../factory/geo.js';
import { createGround } from './ground.js';
import { buildRoadNetwork, walkPolysFor, splitRoadsForChunks, WALK_H } from './roads.js';
import { buildBlocks } from './blocks.js';
import { createTaipei101 } from '../landmarks/taipei101.js';
import { createCityHall } from '../landmarks/cityhall.js';
import { createSisyVillage } from '../landmarks/sisy-village.js';
import * as district from '../data/district.js';
import { PHOTO_SPOTS } from '../data/photoSpots.js';

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

  /* 台北市政府（S 級地標：實際 footprint＋市民廣場） */
  const cityhall = district.buildings.find((b) => b.override === 'cityhall');
  if (cityhall) createCityHall(scene, addCol, groundSys, cityhall);

  /* 四四南村（S 級地標：連棟黑瓦平房＋草坪望 101，全案第一打卡點） */
  createSisyVillage(scene, addCol);

  /* 出生點：四四南村草坪，北望 101 */
  const spawn = new THREE.Vector3(148, 0, 200);
  return {
    colliders, collide, snowOverlays,
    spawn: spawn.clone(),
    classic: { pos: spawn.clone(), yaw: 0.05, pitch: 0.12, dist: 5.5 },
    photoSpots: PHOTO_SPOTS,
    groundHeightAt: groundSys.surfaceHeightAt,
    fujiUniforms: null
  };
}

export { createWorld };
