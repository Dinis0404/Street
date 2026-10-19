/* 晝夜系統：時間推進、日月方位、光照、天空/霧色、燈火 */
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../util.js';

function createDayNight(scene, refs){
  const { world, sky, weather, follow } = refs;
  const state = { time: 17.8, auto: false, speed: 24 / 300 };  // 5 分鐘 = 一天
  let onTimeCb = null;

  scene.fog = new THREE.Fog(0xcfe3f2, 60, 5200);

  /* 燈光 */
  const hemi = new THREE.HemisphereLight(0xbfd7f0, 0x59544a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  const shadowRes = refs.quality === 'low' ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowRes, shadowRes);
  const sc = sun.shadow.camera;
  sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 20; sc.far = 560;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  /* ============ 調色盤 ============ */
  const C = {
    dayTop: new THREE.Color(0x3d7cd6), nightTop: new THREE.Color(0x070b18), goldTop: new THREE.Color(0x5a5f8f),
    dayHor: new THREE.Color(0xcfe3f2), nightHor: new THREE.Color(0x141d33), goldHor: new THREE.Color(0xe8a8bc),
    grayDayTop: new THREE.Color(0x8e99a4), grayNightTop: new THREE.Color(0x232830),
    grayDayHor: new THREE.Color(0xaab3bc), grayNightHor: new THREE.Color(0x2a2f38),
    sunHigh: new THREE.Color(0xfff2df), sunLow: new THREE.Color(0xff9d78),
    moonCol: new THREE.Color(0x8fa3d6),
    fujiSnowDay: new THREE.Color(0xffffff), fujiSnowGold: new THREE.Color(0xf2c8d8), fujiSnowNight: new THREE.Color(0x2c3752),
    fujiBodyDay: new THREE.Color(0x5d7484), fujiBodyGold: new THREE.Color(0x66587a), fujiBodyNight: new THREE.Color(0x101a2e),
    cloudDay: new THREE.Color(0xffffff), cloudGold: new THREE.Color(0xf0c0d0), cloudNight: new THREE.Color(0x39445c),
    stormDay: new THREE.Color(0x59606c), stormNight: new THREE.Color(0x1a1f2a),
    groundDay: new THREE.Color(0x59544a), groundNight: new THREE.Color(0x0d1016),
    white: new THREE.Color(0xffffff)
  };
  const tmp = new THREE.Color(), tmp2 = new THREE.Color(), topCol = new THREE.Color(), horCol = new THREE.Color(), sunColC = new THREE.Color();
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();

  function advanceTime(dt){
    if (state.auto){
      state.time = (state.time + dt * state.speed) % 24;
      if (onTimeCb) onTimeCb(state.time, false);
    }
  }

  function update(dt){
    const P = weather.P;

    /* 太陽 / 月亮方位 */
    const th = Math.PI * (state.time - 6) / 12;
    const elev = Math.sin((state.time - 6) / 12 * Math.PI) * 1.12;
    const ce = Math.cos(elev);
    sunDir.set(Math.cos(th) * ce, Math.sin(elev), Math.sin(th) * ce).normalize();
    const em = -elev * 0.85;
    moonDir.set(Math.cos(th + Math.PI) * Math.cos(em), Math.sin(em), Math.sin(th + Math.PI) * Math.cos(em)).normalize();

    const sunH = sunDir.y;
    const day = smoothstep(-0.07, 0.24, sunH);
    const night = 1 - day;
    const golden = Math.max(0, 1 - Math.abs(sunH - 0.05) / 0.17) * smoothstep(-0.1, 0.0, sunH);

    /* 主光（白天太陽 / 夜晚月亮，共用投影） */
    const sunI = day * 2.9 * P.sunDim;
    const moonI = night * 0.55 * (1 - P.gray * 0.55) * (1 - P.rain * 0.3);
    sunColC.copy(C.sunLow).lerp(C.sunHigh, clamp(sunH * 2.4, 0, 1));
    if (sunI >= moonI){
      sun.color.copy(sunColC);
      sun.intensity = sunI;
      sun.position.copy(follow).addScaledVector(sunDir, 260);
    } else {
      sun.color.copy(C.moonCol);
      sun.intensity = moonI;
      sun.position.copy(follow).addScaledVector(moonDir, 260);
    }
    sun.target.position.copy(follow);

    /* 天空與霧顏色 */
    topCol.copy(C.nightTop).lerp(C.dayTop, day).lerp(C.goldTop, golden * 0.55);
    horCol.copy(C.nightHor).lerp(C.dayHor, day).lerp(C.goldHor, golden * 0.75);
    tmp.copy(C.grayNightTop).lerp(C.grayDayTop, day); topCol.lerp(tmp, P.gray * 0.8);
    tmp.copy(C.grayNightHor).lerp(C.grayDayHor, day); horCol.lerp(tmp, P.gray * 0.82);
    scene.fog.color.copy(horCol);
    scene.fog.near = P.fogNear;
    scene.fog.far = P.fogFar;

    sky.u.uTop.value.copy(topCol);
    sky.u.uHor.value.copy(horCol);
    sky.u.uSunCol.value.copy(sunColC);
    sky.u.uSunDir.value.copy(sunDir);
    sky.u.uSunI.value = (0.22 + day) * P.sunDim;

    sky.celestial.sunDir.copy(sunDir);
    sky.celestial.moonDir.copy(moonDir);
    sky.vis.starOp = night * (1 - P.gray * 0.85);
    sky.vis.moonOp = night * (1 - P.gray * 0.8);

    tmp.copy(C.stormNight).lerp(C.stormDay, day);
    tmp2.copy(C.cloudNight).lerp(C.cloudDay, day).lerp(C.cloudGold, golden * 0.6);
    sky.setClouds(P.cloudA * 0.9, tmp2, P.stormA * 0.95, tmp);

    /* 半球環境光 */
    hemi.color.copy(topCol).lerp(horCol, 0.5);
    hemi.groundColor.copy(C.groundNight).lerp(C.groundDay, day);
    hemi.intensity = (0.25 + 1.05 * day) * (0.45 + 0.55 * P.sunDim) + weather.flash * 1.5;

    /* 閃電天空閃光 */
    sky.u.uFlash.value = Math.min(weather.flash, 1) * 0.7;

    /* 富士山顏色（白天蒼藍 / 朝昏染紅 / 夜晚深藍） */
    const FU = world.fujiUniforms;
    if (FU){
      FU.uSnow.value.copy(C.fujiSnowNight).lerp(C.fujiSnowDay, day).lerp(C.fujiSnowGold, golden * 0.85).lerp(horCol, P.gray * 0.35);
      FU.uBody.value.copy(C.fujiBodyNight).lerp(C.fujiBodyDay, day).lerp(C.fujiBodyGold, golden * 0.6).lerp(horCol, P.gray * 0.4);
      FU.uHaze.value.copy(horCol);
      FU.uHazeK.value = clamp(1.35 - P.fogFar / 5200, 0.28, 0.94);
      FU.uSunDir.value.copy(sunI >= moonI ? sunDir : moonDir);
    }

    /* 燈火（黃昏華燈初上 / 夜晚 / 暴雨白天也會亮） */
    const lampF = clamp(Math.max(smoothstep(0.42, 0.8, night), golden * 0.55, P.rain * P.gray * 0.5), 0, 1);
    for (const l of world.glow.lampLights) l.intensity = lampF * l.userData.base;
    if (world.glow.lampBulbMat) world.glow.lampBulbMat.emissiveIntensity = 0.05 + lampF * 2.4;
    for (const s of world.glow.lampGlows) s.material.opacity = lampF * 0.8;
    for (const m of world.glow.signMats) m.emissiveIntensity = m.userData.day + lampF * m.userData.night;
    for (const m of world.glow.windowMats) m.emissiveIntensity = 0.02 + lampF * 1.15;
  }

  return {
    state, advanceTime, update,
    setTime(h){ state.time = ((h % 24) + 24) % 24; if (onTimeCb) onTimeCb(state.time, true); },
    onTime(cb){ onTimeCb = cb; }
  };
}

export { createDayNight };
