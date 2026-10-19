/* 主程式：組裝渲染基建、場景、角色、環境、輸入、UI 與主循環 */
import { createRenderer } from './core/renderer.js';
import { createInput } from './core/input.js';
import { bindUI } from './core/ui.js';
import { startLoop } from './core/loop.js';
import { createWorld } from './world.js';
import { createSky } from './sky.js';
import { createCharacter } from './character.js';
import { createEnvironment } from './environment.js';

const app = document.getElementById('app');
const { renderer, scene, camera, composer, isLowEnd } = createRenderer(app);

const world = createWorld(scene);
const sky = createSky(scene);
const player = createCharacter(scene);
const env = createEnvironment(scene, { world, sky, quality: isLowEnd ? 'low' : 'high' });

/* 玩家初始位置：經典機位（店正面 + 背後富士山） */
player.state.pos.copy(world.classic.pos);
player.state.yaw = 0;
env.follow.copy(world.classic.pos).setY(1.4);

/* 相機軌道（初始 = 經典機位） */
const orbit = { yaw: world.classic.yaw, pitch: world.classic.pitch, dist: world.classic.dist };
const input = createInput(renderer.domElement, orbit);

bindUI({ env, player, world, orbit });

startLoop({ renderer, scene, camera, composer, player, env, sky, world, orbit, input: input.state });
