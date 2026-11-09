// Headless balance harness: simulate N seasons of the whole world and report pace and spread.
// Expect ±10–15% noise between runs; tune on averages across seeds.
// usage: node tools/balance.mjs [seasons] [legends]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
// load the browser scripts into one shared context, in index.html order
const ctx = vm.createContext({ console, Math, Date });
const order = ['js/data.js', 'js/rng.js', 'js/world.js', 'js/names.js', 'js/packs/eng_clubs.js', 'js/packs/eng_players.js', 'js/packs/legends.js', 'js/sim.js'];
for (const f of order) vm.runInContext(readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/^const (\w+) =/m, 'var $1 =').replace(/^function RNG/m, 'var RNG = function RNG'), ctx, { filename: f });
const { Sim, WORLD, DATA } = ctx;
const N = +process.argv[2] || 3, legends = process.argv[3] === 'legends';
const pts = {}, goals = {}, games = {};
const t0 = Date.now();
for (let s = 0; s < N; s++) {
  const c = Sim.newCareer(1000 + s, 'arsenal', { legends });
  while (c.week < Sim.seasonLength(c)) Sim.playWeek(c);
  for (const r of c.results) { goals[r.div] = (goals[r.div] || 0) + r.gH + r.gA; games[r.div] = (games[r.div] || 0) + 1; }
  const t = Sim.table(c, 'eng1');
  t.forEach((r, i) => { (pts[r.id] = pts[r.id] || []).push(r.pts); });
  if (s === 0) console.log('Season 1 PL table:', t.map((r, i) => `${i + 1}.${r.id} ${r.pts}`).join('  '));
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`seasons=${N} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const d in goals) console.log(`${d}: ${(goals[d] / games[d]).toFixed(2)} goals/match`);
console.log('PL average points:', Object.entries(pts).map(([k, v]) => [k, avg(v)]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', '));
