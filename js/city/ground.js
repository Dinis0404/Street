/* 可走面系統：區域（矩形/多邊形，含高度）＋坡道/樓梯的統一高度查詢
   surfaceHeightAt(x, z) 回傳該位置最高可走面高度（預設 0） */

function pointInPoly(x, z, poly){
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function createGround(){
  const surfaces = [];

  function addRect(x1, z1, x2, z2, h){
    surfaces.push({ kind: 'rect', x1, z1, x2, z2, h });
  }

  function addPoly(poly, h){
    surfaces.push({ kind: 'poly', poly, h });
  }

  /* 軸對齊坡道：沿 axis 從 h1 線性升至 h2（樓梯近似） */
  function addRamp(x1, z1, x2, z2, axis, h1, h2){
    surfaces.push({ kind: 'ramp', x1, z1, x2, z2, axis, h1, h2 });
  }

  function surfaceHeightAt(x, z){
    let best = 0;
    for (let i = 0; i < surfaces.length; i++){
      const s = surfaces[i];
      if (s.kind === 'rect'){
        if (x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2 && s.h > best) best = s.h;
      } else if (s.kind === 'poly'){
        if (pointInPoly(x, z, s.poly) && s.h > best) best = s.h;
      } else {
        if (x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2){
          const t = s.axis === 'x' ? (x - s.x1) / (s.x2 - s.x1) : (z - s.z1) / (s.z2 - s.z1);
          const h = s.h1 + (s.h2 - s.h1) * Math.min(1, Math.max(0, t));
          if (h > best) best = h;
        }
      }
    }
    return best;
  }

  return { addRect, addPoly, addRamp, surfaceHeightAt };
}

export { createGround };
