/* 主程式：組裝渲染基建、場景、角色、環境、輸入、UI 與主循環 */
import { createRenderer } from './core/renderer.js';
import { createInput } from './core/input.js';
import { bindUI } from './core/ui.js';
import { startLoop } from './core/loop.js';
import { createStats } from './core/stats.js';
import { createFlyCam } from './core/flycam.js';
import { currentSceneId, getScene } from './core/scenes.js';
import { createSky } from './sky.js';
import { createCharacter } from './character.js';
import { createEnvironment } from './environment.js';

const app = document.getElementById('app');
const { renderer, scene, camera, composer, isLowEnd } = createRenderer(app);

/* 場景選擇（URL ?scene= 直達，預設河口湖） */
const sceneId = currentSceneId();
const sceneDef = getScene(sceneId);
const world = sceneDef.create(scene);
const sky = createSky(scene);
const player = createCharacter(scene);
const env = createEnvironment(scene, { world, sky, quality: isLowEnd ? 'low' : 'high' });

/* 載入文字依地圖置換 */
document.querySelector('#loading .box').textContent = sceneDef.loadingText;

/* 玩家初始位置：經典機位（店正面 + 背後富士山） */
player.state.pos.copy(world.classic.pos);
player.state.yaw = 0;
env.follow.copy(world.classic.pos).setY(1.4);

/* 相機軌道（初始 = 經典機位） */
const orbit = { yaw: world.classic.yaw, pitch: world.classic.pitch, dist: world.classic.dist };
const input = createInput(renderer.domElement, orbit);

bindUI({ env, player, world, orbit, sceneId });

const stats = createStats(renderer);
const flycam = createFlyCam(camera, renderer.domElement);
startLoop({ renderer, scene, camera, composer, player, env, sky, world, orbit, input: input.state, stats, flycam });
