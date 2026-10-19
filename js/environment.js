/* 環境系統組裝：晝夜（systems/daynight）＋ 天氣（systems/weather） */
import * as THREE from 'three';
import { createDayNight } from './systems/daynight.js';
import { createWeather } from './systems/weather.js';

function createEnvironment(scene, refs){
  const { world, sky, quality } = refs;
  const follow = new THREE.Vector3(0, 1.4, 25);
  const weather = createWeather(scene, { world, quality, follow });
  const daynight = createDayNight(scene, { world, sky, weather, follow, quality });

  return {
    state: daynight.state, follow, P: weather.P,
    update(dt){
      daynight.advanceTime(dt);   // 時間推進
      weather.update(dt);         // 天氣漸變＋粒子（P 供光照讀取）
      daynight.update(dt);        // 光照／天空／燈火
    },
    setWeather(w){ weather.setWeather(w); },
    setTime(h){ daynight.setTime(h); },
    onTime(cb){ daynight.onTime(cb); }
  };
}

export { createEnvironment };
