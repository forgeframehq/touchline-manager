// Headless balance harness: simulate N full seasons, report points and goals by tier. Expect ±10–15% noise; tune on averages.
// usage: node tools/balance.mjs [seasons]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.DATA = require('../js/data.js'); globalThis.RNG = require('../js/rng.js'); globalThis.Sim = require('../js/sim.js');
const N = +process.argv[2] || 20, tier = { 1: [], 2: [], 3: [] }; let goals = 0, matches = 0;
for (let s = 0; s < N; s++) {
  const c = Sim.newCareer(1000 + s, DATA.clubs[0].id);
  while (c.week < c.fixtures.length) Sim.playWeek(c);
  for (const r of c.results) { goals += r.gH + r.gA; matches++; }
  for (const row of Sim.table(c)) tier[c.clubs.find(k => k.id === row.id).tier].push(row.pts);
}
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`seasons=${N} goals/match=${(goals / matches).toFixed(2)}`);
for (const t in tier) console.log(`tier ${t}: avg pts ${avg(tier[t])} (${tier[t].length} club-seasons)`);
