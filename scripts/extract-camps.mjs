// One-off migration: pull the hardcoded CAMP_DATA object out of src/app.js and
// write it as the CMS-editable src/data/camps.json (brands + cities + flat
// session list). Safe to re-run; safe to delete after the migration lands.
//
//   node scripts/extract-camps.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── 1. Pull the CAMP_DATA object literal out of app.js ──────────────────────
const appJs = readFileSync(join(root, 'src/app.js'), 'utf8');
const marker = appJs.indexOf('const CAMP_DATA = {');
if (marker === -1) throw new Error('CAMP_DATA not found in src/app.js');

const objStart = appJs.indexOf('{', marker);
let depth = 0;
let objEnd = -1;
for (let i = objStart; i < appJs.length; i++) {
  const ch = appJs[i];
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { objEnd = i; break; }
  }
}
if (objEnd === -1) throw new Error('Could not find end of CAMP_DATA literal');

const literal = appJs.slice(objStart, objEnd + 1);
// Pure data literal (no function calls / identifiers) — safe to evaluate.
const CAMP_DATA = new Function(`return ${literal};`)();

// ── 2. Reference lists (brand + city order/labels come from the reg form) ───
const brands = [
  { key: 'bricks4kidz', label: '🔵 Bricks4Kidz' },
  { key: 'lms', label: '🔴 Little Medical School' },
  { key: 'businesskids', label: '🟡 Business Kids' },
];

const cities = [
  { key: 'kaunas', label: 'Kaunas – Savanorių pr. 130' },
  { key: 'vilnius_zverynas', label: 'Vilnius Žvėrynas – Sakalų g. 6' },
  { key: 'vilnius_gabijos', label: 'Vilnius Pasilaičiai – Gabijos g. 40' },
  { key: 'klaipeda', label: 'Klaipėda – Karkų g. 17-1' },
  { key: 'palanga', label: 'Palanga – Meilės al. 11' },
  { key: 'kretinga', label: 'Kretinga – J. Pabrėžos g. 8' },
  { key: 'gargzdai', label: 'Gargždai – Kvietinių g. 2' },
  { key: 'silute', label: 'Šilutė – K. Kalinausko g. 2' },
  { key: 'nida', label: 'Nida – Taikos g. 11-2' },
  { key: 'mazeikiai', label: 'Mažeikiai – Sedos g. 12' },
  { key: 'plunge', label: 'Plungė – J. Tumo-Vaižganto g. 98' },
  { key: 'telsiai', label: 'Telšiai – Mašio g. 14' },
  { key: 'kedainiai', label: 'Kėdainiai – Pirmūnų g. 13a' },
  { key: 'alytus', label: 'Alytus – Jaunimo g. 1' },
  { key: 'marijampole', label: 'Marijampolė – Vytauto g. 26' },
  { key: 'panevezys', label: 'Panevėžys – Respublikos g. 34' },
  { key: 'siauliai', label: 'Šiauliai – A. Mickevičiaus g. 9' },
  { key: 'utena', label: 'Utena – J. Basanavičiaus g. 55' },
];

// ── 3. Flatten CAMP_DATA[brand][city] = ['Theme – Date', ...] into sessions ─
const sessions = [];
for (const [brand, byCity] of Object.entries(CAMP_DATA)) {
  for (const [city, entries] of Object.entries(byCity)) {
    for (const entry of entries) {
      const idx = entry.indexOf(' – ');
      const theme = idx === -1 ? entry.trim() : entry.slice(0, idx).trim();
      const date = idx === -1 ? '' : entry.slice(idx + 3).trim();
      sessions.push({ brand, city, theme, date });
    }
  }
}

// ── 4. Write src/data/camps.json ────────────────────────────────────────────
mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(
  join(root, 'src/data/camps.json'),
  JSON.stringify({ brands, cities, sessions }, null, 2) + '\n',
  'utf8',
);

const knownCities = new Set(cities.map((c) => c.key));
const unknown = [...new Set(sessions.map((s) => s.city))].filter((c) => !knownCities.has(c));
console.log(`✓ Wrote src/data/camps.json — ${brands.length} brands, ${cities.length} cities, ${sessions.length} sessions`);
if (unknown.length) console.warn(`⚠ Sessions reference cities not in the list: ${unknown.join(', ')}`);
