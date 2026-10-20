# tools — 資料管線腳本

一次性開發工具（**不隨遊戲發布、不進入頁面載入路徑**）。

## build-district.mjs

以 OSM 官方 map API 抓取信義區建物與路網，投影至世界座標
（原點台北 101，1 單位 = 1 m），輸出 `js/data/district.js`。

```bash
node tools/build-district.mjs          # 重新生成資料檔
```

- 本環境 Overpass API 全鏡像不可達，改走 `api.openstreetmap.org/api/0.6/map`
  （單片上限 5 萬節點 → 3×3 分片抓取合併）。
- 查詢範圍、投影公式、輸出格式規格：見 `docs/開發路線圖.md` §6 P1-T1.1 與 §8。
- 資料檔可直接手工校訂（座標錯誤改資料檔；通則性問題才改腳本重跑）。

## 依賴

Node 18+ 內建模組（`fetch`/`node:fs` 等），不引入任何 npm 套件。
（本機 Node 不在 PATH 時用完整路徑：`C:\Program Files\nodejs\node.exe`）
