/* 共用數學工具 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
/* 啟用正確的 sRGB 色彩管理，讓顏色所見即所得 */
if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

function clamp(x, a, b){ return x < a ? a : (x > b ? b : x); }
function lerp(a, b, t){ return a + (b - a) * t; }
function smoothstep(a, b, x){ const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function rand(a, b){ return a + Math.random() * (b - a); }

export { TAU, clamp, lerp, smoothstep, rand };
