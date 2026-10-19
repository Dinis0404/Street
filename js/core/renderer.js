/* 渲染基建：renderer、scene、camera、bloom 後處理、低階降載判定、resize */
import * as THREE from 'three';
import { EffectComposer } from '../../libs/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../libs/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../libs/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../../libs/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from '../../libs/addons/shaders/GammaCorrectionShader.js';

function createRenderer(appEl){
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e){
    document.querySelector('#loading .box').textContent = '⚠ 此瀏覽器不支援 WebGL';
    throw e;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  appEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 30000);

  /* 手機 / 平板自動降載：粒子減量、陰影降解析度、關閉 bloom */
  const isLowEnd = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || '') ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  /* 後處理：場景 → 泛光（霓虹/招牌夜間光暈）→ sRGB 輸出 */
  let composer = null;
  if (!isLowEnd){
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.5, 0.92);
    composer.addPass(bloom);
    composer.addPass(new ShaderPass(GammaCorrectionShader));
  }

  /* 視窗縮放 */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, composer, isLowEnd };
}

export { createRenderer };
