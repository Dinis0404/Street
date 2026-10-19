/* 空間雜湊：cell 20 m 網格的 AABB 碰撞登記與查詢
   insert(box) 會登記到 box 覆蓋的所有 cell；query(x, z, out) 回傳該位置的碰撞盒 */

const CELL = 20;

function createSpatialHash(){
  const cells = new Map();

  function insert(box){
    const cx1 = Math.floor(box.x1 / CELL), cx2 = Math.floor(box.x2 / CELL);
    const cz1 = Math.floor(box.z1 / CELL), cz2 = Math.floor(box.z2 / CELL);
    for (let cx = cx1; cx <= cx2; cx++){
      for (let cz = cz1; cz <= cz2; cz++){
        const k = cx + ',' + cz;
        let arr = cells.get(k);
        if (!arr){ arr = []; cells.set(k, arr); }
        arr.push(box);
      }
    }
  }

  function query(x, z, out){
    const arr = cells.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
    if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
    return out;
  }

  return { insert, query };
}

export { createSpatialHash };
