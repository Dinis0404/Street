/* 夜間燈光註冊表：隨晝夜插值的發光體（招牌／櫥窗／路燈）集中管理
   場景建構時註冊，daynight 每幀以夜間因子（lampF）驅動全域插值 */

const signMats = [];       // userData = { day, night }：emissiveIntensity = day + f * night
const windowMats = [];     // 櫥窗/住家窗：0.02 + f * 1.15
const lampLights = [];     // 路燈點光源：intensity = f * userData.base
const lampGlows = [];      // 路燈光暈 Sprite：opacity = f * 0.8
let lampBulbMat = null;    // 路燈燈罩材質：0.05 + f * 2.4

/* 註冊日夜景發光材質（白天/夜晚 emissiveIntensity 插值對） */
function registerSign(mat, day, night){
  mat.userData = { day: day !== undefined ? day : 0.05, night: night !== undefined ? night : 1.0 };
  signMats.push(mat);
  return mat;
}

/* 註冊櫥窗/住家窗材質（固定曲線亮起） */
function registerWindow(mat){
  windowMats.push(mat);
  return mat;
}

/* 註冊路燈點光源（強度基準讀 userData.base） */
function registerLampLight(light){
  lampLights.push(light);
  return light;
}

/* 註冊路燈光暈 Sprite */
function registerLampGlow(sprite){
  lampGlows.push(sprite);
  return sprite;
}

/* 註冊路燈燈罩共用材質（全系統僅一個） */
function setLampBulb(mat){
  lampBulbMat = mat;
  return mat;
}

/* 每幀全域插值（f = 夜間因子，由 daynight 依時刻/黃昏/雨天計算） */
function update(f){
  for (const l of lampLights) l.intensity = f * l.userData.base;
  if (lampBulbMat) lampBulbMat.emissiveIntensity = 0.05 + f * 2.4;
  for (const s of lampGlows) s.material.opacity = f * 0.8;
  for (const m of signMats) m.emissiveIntensity = m.userData.day + f * m.userData.night;
  for (const m of windowMats) m.emissiveIntensity = 0.02 + f * 1.15;
}

export { registerSign, registerWindow, registerLampLight, registerLampGlow, setLampBulb, update };
