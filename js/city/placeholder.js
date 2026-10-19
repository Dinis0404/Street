/* 信義區場景佔位：灰盒城市量體＋施工中告示牌（P1 起由城市總管 city.js 取代） */
import * as THREE from 'three';
import { createSceneKit } from '../factory/geo.js';
import { textTexture } from '../factory/tex.js';

function createWorld(scene){
  const { colliders, snowOverlays, A, addCol } = createSceneKit(scene);
  const glow = { signMats: [], lampLights: [], lampBulbMat: null, lampGlows: [], windowMats: [] };

  /* 灰盒地面 */
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x878d94, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  A(ground, false, true);

  /* 灰盒街廓（信義計畫區量體示意，原點 = 未來台北 101 位置） */
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xb6bcc4, roughness: 0.95 });
  const blocks = [
    [-60, 30, 26, 60, 40], [-60, -50, 30, 46, 24], [50, 40, 30, 56, 55],
    [55, -45, 26, 40, 18], [-10, 85, 56, 26, 12], [15, -90, 44, 40, 30]
  ];
  for (const [x, z, w, d, h] of blocks){
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat);
    b.position.set(x, h / 2, z);
    A(b);
    addCol(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }
  /* 台北 101 預定地：一格高的灰盒塔 */
  const t101 = new THREE.Mesh(new THREE.BoxGeometry(28, 120, 28),
    new THREE.MeshStandardMaterial({ color: 0x9fb0ba, roughness: 0.9 }));
  t101.position.set(0, 60, -140);
  A(t101);
  addCol(-14, 14, -154, -126);

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

  function groundHeightAt(){ return 0; }

  return {
    colliders, glow, snowOverlays,
    spawn: new THREE.Vector3(0, 0, 20),
    classic: { pos: new THREE.Vector3(0, 0, 20), yaw: 0, pitch: 0.05, dist: 6 },
    groundHeightAt,
    fujiUniforms: null
  };
}

export { createWorld };
