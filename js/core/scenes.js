/* 場景註冊器：地圖清單＋工廠（切換地圖 = 攜帶 ?scene= 重新載入頁面） */
import { createWorld as createFuji } from '../world.js';
import { createWorld as createXinyiPlaceholder } from '../city/placeholder.js';

const SCENES = {
  fuji: { id: 'fuji', label: '🗻 河口湖', loadingText: '🗻 正在搭建富士山下的街道…', create: createFuji },
  xinyi: { id: 'xinyi', label: '🏙 信義區', loadingText: '🏗 正整地開發信義區…', create: createXinyiPlaceholder }
};
const DEFAULT_SCENE = 'fuji';

function currentSceneId(){
  const p = new URLSearchParams(location.search);
  const id = p.get('scene');
  return (id && SCENES[id]) ? id : DEFAULT_SCENE;
}

function getScene(id){ return SCENES[id] || SCENES[DEFAULT_SCENE]; }

function switchScene(id){
  if (!SCENES[id] || id === currentSceneId()) return;
  location.search = '?scene=' + id;
}

export { SCENES, currentSceneId, getScene, switchScene };
