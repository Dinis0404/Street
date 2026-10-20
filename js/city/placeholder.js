/* 信義區場景：真實路網＋街廓量體階段（T1.2/T1.3）
   依 district 資料鋪設道路與建築；地標（101/市政府）由專屬建構器接管 */
import * as THREE from 'three';
import { createSceneKit } from '../factory/geo.js';
import { createGround } from './ground.js';
import { buildRoadNetwork, WALK_H } from './roads.js';
import { buildBlocks } from './blocks.js';
import { textTexture } from '../factory/tex.js';
import * as district from '../data/district.js';

function createWorld(scene){
  const { colliders, collide, snowOverlays, A, addCol } = createSceneKit(scene);

  /* 基地地面 */
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x7d8288, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  A(ground, false, true);

  /* 真實路網（忠孝東路/信義路/基隆路…，含標線與人行道） */
  const groundSys = createGround();
  const { group: roadGroup, walkPolys } = buildRoadNetwork(district.roads);
  scene.add(roadGroup);
  for (const p of walkPolys) groundSys.addPoly(p, WALK_H);

  /* 街廓量體（override 的地標由 T1.5+ 專屬建構器接管） */
  const generic = district.buildings.filter((b) => !b.override);
  const { group: blockGroup, count: blockCount } = buildBlocks(generic);
  scene.add(blockGroup);
  for (const b of generic){
    let x1 = 1e9, x2 = -1e9, z1 = 1e9, z2 = -1e9;
    for (const p of b.poly){
      if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0];
      if (p[1] < z1) z1 = p[1]; if (p[1] > z2) z2 = p[1];
    }
    if (b.tier <= 2) addCol(x1, x2, z1, z2);
  }

  /* 台北 101 預定地：一格高的灰盒塔（T1.5 由正式地標取代） */
  const t101 = new THREE.Mesh(new THREE.BoxGeometry(28, 120, 28),
    new THREE.MeshStandardMaterial({ color: 0x9fb0ba, roughness: 0.9 }));
  t101.position.set(-9, 60, -16);
  A(t101);
  addCol(-23, 5, -30, -2);

  /* 施工中告示牌（面向玩家出生點） */
  const signMat = new THREE.MeshStandardMaterial({
    map: textTexture('🚧 信義區施工中', '#f7c948', '#2b2f36', 1024, 256, 96),
    roughness: 0.8
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), signMat);
  sign.position.set(0, 2.5, 8);
  A(sign, false, false);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.7, metalness: 0.3 });
  for (const lx of [-4, 4]){
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), legMat);
    leg.position.set(lx, 1.3, 8);
    A(leg);
  }
  addCol(-4.4, 4.4, 7.8, 8.2);

  /* 交通錐 */
  for (const [cx, cz] of [[-6, 10], [6, 10], [0, 3]]){
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.2, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8641e, roughness: 0.7 }));
    cone.position.set(cx, 0.28, cz);
    A(cone);
  }

  return {
    colliders, collide, snowOverlays,
    spawn: new THREE.Vector3(0, 0, 40),
    classic: { pos: new THREE.Vector3(0, 0, 40), yaw: 0, pitch: 0.05, dist: 6 },
    groundHeightAt: groundSys.surfaceHeightAt,
    fujiUniforms: null
  };
}

export { createWorld };
