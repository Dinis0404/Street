/* 主循環：玩家更新、相機跟隨、環境更新、天空更新、渲染 */
import * as THREE from 'three';

function startLoop(deps){
  const { renderer, scene, camera, composer, player, env, sky, world, orbit, input, stats } = deps;

  const camTarget = new THREE.Vector3().copy(player.state.pos).setY(1.42);
  const camPos = new THREE.Vector3();
  {
    const cp = Math.cos(orbit.pitch);
    camPos.set(
      camTarget.x + Math.sin(orbit.yaw) * cp * orbit.dist,
      camTarget.y + Math.sin(orbit.pitch) * orbit.dist,
      camTarget.z + Math.cos(orbit.yaw) * cp * orbit.dist
    );
  }

  const clock = new THREE.Clock();
  const desired = new THREE.Vector3();
  let frames = 0;

  function loop(){
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    input.yaw = orbit.yaw;
    player.update(dt, input, world.colliders, world.groundHeightAt);

    desired.copy(player.state.pos);
    desired.y += 1.42;
    camTarget.lerp(desired, 1 - Math.exp(-dt * 12));
    env.follow.copy(camTarget);

    env.update(dt);

    const cp = Math.cos(orbit.pitch);
    desired.set(
      camTarget.x + Math.sin(orbit.yaw) * cp * orbit.dist,
      Math.max(camTarget.y + Math.sin(orbit.pitch) * orbit.dist, 0.3),
      camTarget.z + Math.cos(orbit.yaw) * cp * orbit.dist
    );
    camPos.lerp(desired, 1 - Math.exp(-dt * 14));
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    sky.update(dt, camera.position);
    if (stats) stats.beginFrame();
    if (composer) composer.render();
    else renderer.render(scene, camera);
    if (stats) stats.endFrame();

    if (++frames === 3) document.getElementById('loading').classList.add('hide');
  }
  loop();
}

export { startLoop };
