/* 天氣系統：天氣參數漸變、雨雪花瓣粒子、閃電、濕地與積雪 */
import * as THREE from 'three';
import { TAU, lerp, rand } from '../util.js';
import { makeCanvasTexture, softDotTexture } from '../factory/tex.js';

const WEATHERS = {
  clear:  { sunDim: 1.00, fogNear: 60,  fogFar: 6000, gray: 0.00, rain: 0, snow: 0, wet: 0.00, gSnow: 0, cloudA: 0.55, stormA: 0.00, thunder: 0, petals: 0 },
  cloudy: { sunDim: 0.55, fogNear: 40,  fogFar: 2800, gray: 0.50, rain: 0, snow: 0, wet: 0.10, gSnow: 0, cloudA: 1.00, stormA: 0.35, thunder: 0, petals: 0 },
  rain:   { sunDim: 0.34, fogNear: 20,  fogFar: 1500, gray: 0.72, rain: 1, snow: 0, wet: 1.00, gSnow: 0, cloudA: 0.90, stormA: 0.85, thunder: 0, petals: 0 },
  storm:  { sunDim: 0.22, fogNear: 15,  fogFar: 1000, gray: 0.85, rain: 1, snow: 0, wet: 1.00, gSnow: 0, cloudA: 0.80, stormA: 1.00, thunder: 1, petals: 0 },
  snow:   { sunDim: 0.55, fogNear: 15,  fogFar: 1100, gray: 0.55, rain: 0, snow: 1, wet: 0.25, gSnow: 1, cloudA: 0.90, stormA: 0.55, thunder: 0, petals: 0 },
  fog:    { sunDim: 0.62, fogNear: 6,   fogFar: 430,  gray: 0.42, rain: 0, snow: 0, wet: 0.35, gSnow: 0, cloudA: 0.70, stormA: 0.15, thunder: 0, petals: 0 },
  sakura: { sunDim: 1.00, fogNear: 60,  fogFar: 5200, gray: 0.00, rain: 0, snow: 0, wet: 0.00, gSnow: 0, cloudA: 0.60, stormA: 0.00, thunder: 0, petals: 1 }
};

function createWeather(scene, refs){
  const { world, quality, follow } = refs;
  const low = quality === 'low';
  let name = 'clear';
  const P = Object.assign({}, WEATHERS.clear);
  let flash = 0, nextBolt = 6;
  const tmp = new THREE.Color();
  const C = { roadSnow: new THREE.Color(0x828a90) };

  /* ============ 雨（線段雨絲） ============ */
  const RAIN_N = low ? 700 : 1300;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_N * 6);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
  const rainMat = new THREE.LineBasicMaterial({ color: 0x9db8cf, transparent: true, opacity: 0, depthWrite: false });
  const rainMesh = new THREE.LineSegments(rainGeo, rainMat);
  rainMesh.frustumCulled = false;
  rainMesh.visible = false;
  scene.add(rainMesh);
  const rainDrops = [];
  for (let i = 0; i < RAIN_N; i++){
    rainDrops.push({ x: rand(-35, 35), y: rand(0, 30), z: rand(-35, 35), v: rand(16, 25) });
  }
  function updateRain(dt, amount, cx, cz){
    if (amount < 0.02){ rainMesh.visible = false; return; }
    rainMesh.visible = true;
    rainMat.opacity = amount * 0.38;
    const windX = 1.6;
    for (let i = 0; i < RAIN_N; i++){
      const d = rainDrops[i];
      d.y -= d.v * dt;
      d.x += windX * dt;
      if (d.y < 0){ d.y = rand(22, 32); d.x = cx + rand(-35, 35); d.z = cz + rand(-35, 35); }
      if (d.x - cx > 35) d.x -= 70; else if (d.x - cx < -35) d.x += 70;
      if (d.z - cz > 35) d.z -= 70; else if (d.z - cz < -35) d.z += 70;
      const o = i * 6;
      const L = 0.35 + d.v * 0.014;
      rainPos[o] = d.x; rainPos[o + 1] = d.y; rainPos[o + 2] = d.z;
      rainPos[o + 3] = d.x - windX * 0.045; rainPos[o + 4] = d.y - L; rainPos[o + 5] = d.z;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  /* ============ 雪（點粒子） ============ */
  const SNOW_N = low ? 500 : 900;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(SNOW_N * 3);
  const snowSeeds = new Float32Array(SNOW_N);
  for (let i = 0; i < SNOW_N; i++){
    snowPos[i * 3] = rand(-35, 35);
    snowPos[i * 3 + 1] = rand(0, 26);
    snowPos[i * 3 + 2] = rand(-35, 35);
    snowSeeds[i] = Math.random();
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3).setUsage(THREE.DynamicDrawUsage));
  const snowMat = new THREE.PointsMaterial({
    size: 0.28, map: softDotTexture(), transparent: true, opacity: 0,
    depthWrite: false, sizeAttenuation: true
  });
  const snowMesh = new THREE.Points(snowGeo, snowMat);
  snowMesh.frustumCulled = false;
  snowMesh.visible = false;
  scene.add(snowMesh);
  let snowTime = 0;
  function updateSnow(dt, amount, cx, cz){
    if (amount < 0.02){ snowMesh.visible = false; return; }
    snowMesh.visible = true;
    snowMat.opacity = amount * 0.95;
    snowTime += dt;
    for (let i = 0; i < SNOW_N; i++){
      const sd = snowSeeds[i];
      const o = i * 3;
      snowPos[o + 1] -= (1.0 + sd * 1.5) * dt;
      snowPos[o] += Math.sin(snowTime * 0.8 + sd * 40) * dt * 1.4;
      if (snowPos[o + 1] < 0){
        snowPos[o + 1] = rand(20, 28);
        snowPos[o] = cx + rand(-35, 35);
        snowPos[o + 2] = cz + rand(-35, 35);
      }
      if (snowPos[o] - cx > 35) snowPos[o] -= 70; else if (snowPos[o] - cx < -35) snowPos[o] += 70;
      if (snowPos[o + 2] - cz > 35) snowPos[o + 2] -= 70; else if (snowPos[o + 2] - cz < -35) snowPos[o + 2] += 70;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }

  /* ============ 櫻花花瓣 ============ */
  const PET_N = low ? 300 : 600;
  const petalGeo = new THREE.BufferGeometry();
  const petalPos = new Float32Array(PET_N * 3);
  const petalSeeds = new Float32Array(PET_N);
  for (let i = 0; i < PET_N; i++){
    petalPos[i * 3] = rand(-35, 35);
    petalPos[i * 3 + 1] = rand(0, 24);
    petalPos[i * 3 + 2] = rand(-35, 35);
    petalSeeds[i] = Math.random();
  }
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3).setUsage(THREE.DynamicDrawUsage));
  const petalMat = new THREE.PointsMaterial({
    size: 0.36, color: 0xffa8c6,
    map: makeCanvasTexture(64, 64, (g) => {
      g.translate(32, 32);
      g.rotate(0.6);
      const gr = g.createRadialGradient(0, 0, 2, 0, 0, 26);
      gr.addColorStop(0, '#ffe6f0');
      gr.addColorStop(0.55, '#ffb7d5');
      gr.addColorStop(1, 'rgba(255,155,195,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, 0, 26, 15, 0, 0, TAU);
      g.fill();
    }),
    transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true
  });
  const petalMesh = new THREE.Points(petalGeo, petalMat);
  petalMesh.frustumCulled = false;
  petalMesh.visible = false;
  scene.add(petalMesh);
  let petalTime = 0;
  function updatePetals(dt, amount, cx, cz){
    if (amount < 0.02){ petalMesh.visible = false; return; }
    petalMesh.visible = true;
    petalMat.opacity = amount * 0.95;
    petalTime += dt;
    for (let i = 0; i < PET_N; i++){
      const sd = petalSeeds[i];
      const o = i * 3;
      petalPos[o + 1] -= (0.9 + sd * 1.2) * dt;
      petalPos[o] += (Math.sin(petalTime * 0.9 + sd * 50) * 1.5 + 0.8) * dt;
      petalPos[o + 2] += Math.cos(petalTime * 0.7 + sd * 30) * dt * 0.9;
      if (petalPos[o + 1] < 0){
        petalPos[o + 1] = rand(18, 26);
        petalPos[o] = cx + rand(-35, 35);
        petalPos[o + 2] = cz + rand(-35, 35);
      }
      if (petalPos[o] - cx > 35) petalPos[o] -= 70; else if (petalPos[o] - cx < -35) petalPos[o] += 70;
      if (petalPos[o + 2] - cz > 35) petalPos[o + 2] -= 70; else if (petalPos[o + 2] - cz < -35) petalPos[o + 2] += 70;
    }
    petalGeo.attributes.position.needsUpdate = true;
  }

  const api = {
    P, flash: 0,
    setWeather(w){ name = w; },
    update(dt){
      /* 天氣參數漸變 */
      const T = WEATHERS[name];
      const k = 1 - Math.exp(-dt * 1.5);
      for (const key in P) P[key] = lerp(P[key], T[key], k);

      /* 閃電 */
      if (P.thunder > 0.5){
        nextBolt -= dt;
        if (nextBolt <= 0){ flash = rand(0.8, 1.4); nextBolt = rand(2.5, 8); }
      }
      flash = Math.max(0, flash - dt * 3.2);
      api.flash = flash;

      /* 雨天濕路面 */
      const roadMat = world.roadMat, parkMat = world.parkMat;
      if (roadMat){
        roadMat.roughness = lerp(0.95, 0.28, P.wet);
        tmp.setScalar(1).lerp(C.roadSnow, P.gSnow * 0.5).multiplyScalar(lerp(1, 0.58, P.wet));
        roadMat.color.copy(tmp);
      }
      if (parkMat) parkMat.roughness = lerp(0.95, 0.35, P.wet);

      /* 積雪覆蓋 */
      for (const s of world.snowOverlays) s.material.opacity = P.gSnow * 0.9;

      /* 粒子 */
      updateRain(dt, P.rain, follow.x, follow.z);
      updateSnow(dt, P.snow, follow.x, follow.z);
      updatePetals(dt, P.petals, follow.x, follow.z);
    }
  };
  return api;
}

export { createWeather };
