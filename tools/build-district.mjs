#!/usr/bin/env node
/* build-district.mjs — 一次性資料管線（不隨遊戲發布）
   從 OSM 官方 map API（api.openstreetmap.org，XML）分片抓取信義區 bbox，
   投影至世界座標（原點 = 台北 101，1 單位 = 1 m），輸出 js/data/district.js。
   （本環境 Overpass 全鏡像不可達，故走 map API；單片上限 5 萬節點 → 3×3 分片）

   重跑：node tools/build-district.mjs
   手工校訂原則：座標錯了改 district.js，通則性問題才改本腳本重跑。 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* ---------- 常數 ---------- */
const BBOX = { W: 121.5528, S: 25.0230, E: 121.5766, N: 25.0446 };   // 信義區範圍
const GRID = 3;                                                       // 3×3 分片
const ORIGIN = { lat: 25.0338, lon: 121.5647 };                       // 台北 101 塔心
const MX = 100980, MZ = 111320;                                       // 經/緯度每度公尺數（25°N）
const UA = 'StreetScene-dev/1.0 (Xinyi district fan-recreation; data pipeline)';
const API = 'https://api.openstreetmap.org/api/0.6/map';

/* ---------- 投影：x 向東為正、z 向北為負（-z 北） ---------- */
function proj(lat, lon){
  return [round2((lon - ORIGIN.lon) * MX), round2(-(lat - ORIGIN.lat) * MZ)];
}
function round2(n){ return +n.toFixed(2); }

/* ---------- 分類與解析 ---------- */
const MAJOR = new Set(['trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link']);
const MINOR = new Set(['tertiary', 'tertiary_link', 'residential', 'unclassified', 'living_street']);

function roadClass(hw){
  if (MAJOR.has(hw)) return 'major';
  if (MINOR.has(hw)) return 'minor';
  return 'lane';   // service / footway / path / pedestrian / steps / cycleway …
}

function parseHeight(str){
  if (!str) return null;
  const m = parseFloat(String(str).replace(',', '.').replace(/[^0-9.]/g, ''));
  return isFinite(m) && m > 0 ? m : null;
}

function centroidOf(poly){
  let x = 0, z = 0;
  for (const p of poly){ x += p[0]; z += p[1]; }
  return [x / poly.length, z / poly.length];
}

function tierOf(x, z){
  if (Math.abs(x) <= 450 && Math.abs(z) <= 450) return 1;              // 信義計畫區核心
  if (x >= -1100 && x <= 1300 && z >= -1000 && z <= 1000) return 2;   // 延伸街區
  return 3;                                                            // 背景
}

function overrideFor(name){
  if (!name) return null;
  const n = name.trim();
  if (n === '台北101' || n === '台北101大樓' || n === '台北101購物中心' || /^Taipei\s*101$/i.test(n)) return 'taipei101';
  if (n === '台北市政府' || n === '臺北市政府' || n === '台北市政府大樓' || n === '臺北市政府大樓') return 'cityhall';
  if (/四四南村|信義公民會館/i.test(n)) return 'sisy-village';
  return null;
}

/* ---------- XML 解析（OSM API 逐行元素；屬性順序無關） ---------- */
function parseOsmXml(xml){
  const nodes = new Map(), ways = new Map(), relations = new Map();
  let cur = null, curType = null;

  function attrOf(line, name){
    const m = line.match(new RegExp(name + '="([^"]*)"'));
    return m ? m[1] : null;
  }
  function collect(){
    if (!cur) return;
    if (curType === 'node') nodes.set(cur.id, cur);
    else if (curType === 'way') ways.set(cur.id, cur);
    else if (curType === 'relation') relations.set(cur.id, cur);
    cur = null; curType = null;
  }

  for (const raw of xml.split('\n')){
    const line = raw.trim();
    if (line.startsWith('<node ')){
      cur = { id: attrOf(line, 'id'), lat: +attrOf(line, 'lat'), lon: +attrOf(line, 'lon'), tags: {} };
      curType = 'node';
      if (line.endsWith('/>')) collect();
      continue;
    }
    if (line.startsWith('<way ')){
      cur = { id: attrOf(line, 'id'), nds: [], tags: {} };
      curType = 'way';
      if (line.endsWith('/>')) collect();
      continue;
    }
    if (line.startsWith('<relation ')){
      cur = { id: attrOf(line, 'id'), members: [], tags: {} };
      curType = 'relation';
      if (line.endsWith('/>')) collect();
      continue;
    }
    if (line.startsWith('<nd ') && curType === 'way'){
      cur.nds.push(attrOf(line, 'ref'));
      continue;
    }
    if (line.startsWith('<member ') && curType === 'relation'){
      cur.members.push({ type: attrOf(line, 'type'), ref: attrOf(line, 'ref'), role: attrOf(line, 'role') || '' });
      continue;
    }
    if (line.startsWith('<tag ') && cur){
      cur.tags[attrOf(line, 'k')] = decodeEntities(attrOf(line, 'v') || '');
      continue;
    }
    if (line.startsWith('</')) collect();
  }
  return { nodes, ways, relations };
}

function decodeEntities(s){
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'");
}

/* ---------- 分片抓取（map API 單片 ≤ 5 萬節點） ---------- */
async function fetchAll(){
  const dLon = (BBOX.E - BBOX.W) / GRID, dLat = (BBOX.N - BBOX.S) / GRID;
  const nodes = new Map(), ways = new Map(), relations = new Map();
  for (let i = 0; i < GRID; i++){
    for (let j = 0; j < GRID; j++){
      const w = BBOX.W + i * dLon, e = i === GRID - 1 ? BBOX.E : w + dLon;
      const s = BBOX.S + j * dLat, n = j === GRID - 1 ? BBOX.N : s + dLat;
      const url = `${API}?bbox=${w},${s},${e},${n}`;
      process.stdout.write(`抓取分片 (${i},${j}) … `);
      let xml = null;
      for (let attempt = 1; attempt <= 3; attempt++){
        try {
          const res = await fetch(url, { headers: { 'User-Agent': UA } });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          xml = await res.text();
          break;
        } catch (e){
          process.stdout.write(`失敗（${e.message}）重試 ${attempt}/3 … `);
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
      if (!xml) throw new Error(`分片 (${i},${j}) 抓取失敗`);
      const parsed = parseOsmXml(xml);
      for (const [k, v] of parsed.nodes) nodes.set(k, v);
      for (const [k, v] of parsed.ways) ways.set(k, v);
      for (const [k, v] of parsed.relations) relations.set(k, v);
      process.stdout.write(`nodes=${parsed.nodes.size} ways=${parsed.ways.size} relations=${parsed.relations.size}\n`);
      await new Promise(r => setTimeout(r, 600));   // 禮貌性間隔
    }
  }
  return { nodes, ways, relations };
}

/* ---------- 主流程 ---------- */
const { nodes, ways, relations } = await fetchAll();
const roads = [], buildings = [], zones = [], pois = [];

/* 節點 → 座標 */
function nodePos(id){ return nodes.get(id); }

/* 建物組裝 */
function pushBuilding(id, name, tags, poly){
  if (poly.length < 3) return;
  const [cx, cz] = centroidOf(poly);
  const levels = parseInt(tags['building:levels']) || null;
  buildings.push({
    id, name: name || '',
    tier: tierOf(cx, cz), poly,
    height: parseHeight(tags.height) ?? (levels ? +(levels * 3.2).toFixed(1) : null),
    levels, roof: 'flat', override: overrideFor(name)
  });
}

for (const way of ways.values()){
  const tags = way.tags;
  if (tags.building){
    const poly = [];
    for (const nid of way.nds){
      const nd = nodePos(nid);
      if (nd) poly.push(proj(nd.lat, nd.lon));
    }
    pushBuilding('w' + way.id, tags.name, tags, poly);
    continue;
  }
  if (tags.highway){
    const path = [];
    for (const nid of way.nds){
      const nd = nodePos(nid);
      if (nd) path.push(proj(nd.lat, nd.lon));
    }
    if (path.length >= 2){
      roads.push({
        id: 'w' + way.id, name: tags.name || tags.ref || '',
        class: roadClass(tags.highway),
        lanes: parseInt(tags.lanes) || null,
        oneway: tags.oneway === 'yes',
        busLane: !!(tags['lanes:bus'] || tags['bus:lanes'] || tags.busway || tags['psv:lanes']),
        elevated: !!(tags.bridge && (parseInt(tags.layer) || 0) > 0),
        path
      });
    }
    continue;
  }
  if (tags.leisure === 'park' || tags.natural === 'water'){
    const poly = [];
    for (const nid of way.nds){
      const nd = nodePos(nid);
      if (nd) poly.push(proj(nd.lat, nd.lon));
    }
    if (poly.length >= 3){
      zones.push({ kind: tags.leisure === 'park' ? 'park' : 'water', name: tags.name || '', poly });
    }
  }
}

/* multipolygon 建物：各 outer ring 一棟（inner 天井簡化略過） */
for (const rel of relations.values()){
  if (!rel.tags.building) continue;
  let idx = 0;
  for (const m of rel.members){
    if (m.type !== 'way' || m.role === 'inner') continue;
    const way = ways.get(m.ref);
    if (!way) continue;
    const poly = [];
    for (const nid of way.nds){
      const nd = nodePos(nid);
      if (nd) poly.push(proj(nd.lat, nd.lon));
    }
    pushBuilding('r' + rel.id + '#' + (idx++), rel.tags.name, rel.tags, poly);
  }
}

/* POI（有名字的 shop/amenity 節點） */
for (const nd of nodes.values()){
  const t = nd.tags;
  if (!t || !(t.shop || t.amenity) || !t.name) continue;
  const [x, z] = proj(nd.lat, nd.lon);
  pois.push({ kind: t.shop ? 'shop' : 'amenity', name: t.name, x: round2(x), z: round2(z), facing: null });
}

/* ---------- 輸出 ---------- */
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'district.js');
const generated = new Date().toISOString();
const header = `/* 由 tools/build-district.mjs 生成 · ${generated.slice(0, 10)}
   底圖 © OpenStreetMap 貢獻者 (ODbL) · 手工校訂請直接改本檔
   （座標錯了改這裡；通則性問題才改生成器並重跑）
   來源：api.openstreetmap.org map API（本環境 Overpass 不可達）*/
`;
const body =
  `export const meta = ${JSON.stringify({ originLat: ORIGIN.lat, originLon: ORIGIN.lon, generated }, null, 2)};\n\n` +
  `export const roads = ${JSON.stringify(roads)};\n\n` +
  `export const buildings = ${JSON.stringify(buildings)};\n\n` +
  `export const zones = ${JSON.stringify(zones)};\n\n` +
  `export const pois = ${JSON.stringify(pois)};\n`;
writeFileSync(outPath, header + body, 'utf8');

/* ---------- 摘要 ---------- */
const t101 = buildings.filter((b) => b.override === 'taipei101');
let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
for (const b of buildings){
  const [cx, cz] = centroidOf(b.poly);
  if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
  if (cz < minZ) minZ = cz; if (cz > maxZ) maxZ = cz;
}
console.log(`輸出：${outPath}`);
console.log(`  buildings=${buildings.length}（tier1=${buildings.filter(b=>b.tier===1).length} tier2=${buildings.filter(b=>b.tier===2).length} tier3=${buildings.filter(b=>b.tier===3).length}）`);
console.log(`  roads=${roads.length}（major=${roads.filter(r=>r.class==='major').length} minor=${roads.filter(r=>r.class==='minor').length} lane=${roads.filter(r=>r.class==='lane').length}）`);
console.log(`  zones=${zones.length} pois=${pois.length}`);
console.log(`  建物座標範圍 x ∈ [${minX.toFixed(0)}, ${maxX.toFixed(0)}]，z ∈ [${minZ.toFixed(0)}, ${maxZ.toFixed(0)}]（原點 = 台北 101）`);
for (const b of t101){
  const [cx, cz] = centroidOf(b.poly);
  console.log(`  台北101：id=${b.id} name="${b.name}" 中心=(${cx.toFixed(1)}, ${cz.toFixed(1)}) 高度=${b.height}`);
}
if (!t101.length) console.log('  ⚠ 未找到台北 101（名稱比對失敗，請檢查 override 規則）');
