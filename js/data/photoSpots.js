/* 信義區打卡機位清單（位置/朝向/鏡頭；座標＝世界公尺）
   機位會隨地標精修持續校訂 */

const PHOTO_SPOTS = [
  { id: 'village101', name: '📷 南村望 101', pos: [140, 0, 250], yaw: 0.51, pitch: 0.35, dist: 5.5 },
  { id: 'plaza101', name: '📷 市民廣場望 101', pos: [-20, 0, -220], yaw: -0.05, pitch: 0.5, dist: 6 },
  { id: 'cityhall', name: '📷 市府正面廣場', pos: [-23, 0, -268], yaw: 0, pitch: 0.14, dist: 9 },
  { id: 't101up', name: '📷 101 裙樓仰角', pos: [20, 0, 40], yaw: 0.48, pitch: 1.05, dist: 4 }
];

export { PHOTO_SPOTS };
