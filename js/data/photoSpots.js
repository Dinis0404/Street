/* 信義區打卡機位清單（位置/朝向/鏡頭；座標＝世界公尺）
   機位會隨地標精修持續校訂 */

const PHOTO_SPOTS = [
  { id: 'village101', name: '📷 南村望 101', pos: [148, 0, 202], yaw: 0.64, pitch: 0.32, dist: 5.5 },
  { id: 'plaza101', name: '📷 市民廣場望 101', pos: [-20, 0, -220], yaw: -0.05, pitch: 0.5, dist: 6 },
  { id: 'cityhall', name: '📷 市府正面廣場', pos: [-23, 0, -268], yaw: 0, pitch: 0.14, dist: 9 },
  { id: 'songshou', name: '📷 松壽路百貨街', pos: [30, 0, -210], yaw: -1.45, pitch: 0.08, dist: 5 },
  { id: 'skyline', name: '📷 信義路天際線', pos: [60, 0, 150], yaw: 0.12, pitch: 0.38, dist: 6 },
  { id: 'xinyiW', name: '📷 信義路五段望西', pos: [40, 0, 60], yaw: 1.55, pitch: 0.1, dist: 5 },
  { id: 'site3', name: '📷 世貿三館工地', pos: [0, 0, 55], yaw: 2.95, pitch: 0.05, dist: 5 },
  { id: 't101up', name: '📷 101 裙樓仰角', pos: [20, 0, 40], yaw: 0.48, pitch: 1.05, dist: 4 }
];

export { PHOTO_SPOTS };
