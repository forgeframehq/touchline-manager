// Exports the rule numbers, clubs, squads, legends and name pools from the web game's JS into godot/data/game.json,
// so the Godot game plays by exactly the same data. Run after changing js/data.js or a pack: node tools/export_godot_data.mjs
// With "ref" as an argument it also prints a reference season from the base JS sim (no fm/career layers) for port checks.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = vm.createContext({ console, Math, Date });
const load = fs => { for (const f of fs) vm.runInContext(readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/^const (\w+) =/m, 'var $1 =').replace(/^function RNG/m, 'var RNG = function RNG'), ctx, { filename: f }); };
load(['js/data.js', 'js/data_fm.js', 'js/rng.js', 'js/world.js', 'js/names.js', 'js/packs/eng_clubs.js', 'js/packs/eng_players.js', 'js/packs/legends.js']);
const { DATA, WORLD, NAMES } = ctx;
const out = { data: DATA, fm: ctx.FM_DATA || ctx.DATA_FM || null, names: NAMES,
  world: { countries: WORLD.countries, divisions: WORLD.divisions, clubs: WORLD.clubs, squads: WORLD.squads, legends: WORLD.legends } };
writeFileSync(new URL('../godot/data/game.json', import.meta.url), JSON.stringify(out));
console.log('clubs', WORLD.clubs.length, 'real players', Object.values(WORLD.squads).reduce((s, a) => s + a.length, 0), 'legends', WORLD.legends.length);
if (process.argv[2] === 'ref') {
  load(['js/sim.js']); const Sim = ctx.Sim;
  const c = Sim.newCareer(1000, 'arsenal', {});
  console.log('players', c.players.length, 'p1', JSON.stringify(c.players[0].attr), 'last', c.players[c.players.length - 1].name);
  while (c.week < Sim.seasonLength(c)) Sim.playWeek(c);
  let g = 0, n = 0; for (const r of c.results) if (r.div === 'eng1') { g += r.gH + r.gA; n++; }
  console.log('eng1 goals/match', (g / n).toFixed(3));
  console.log(Sim.table(c, 'eng1').map((r, i) => `${i + 1}.${r.id} ${r.pts}`).join(' '));
  const s = Sim.endSeason(c); console.log('promoted', s.promoted.join(','), 'relegated', s.relegated.join(','), 'players', c.players.length);
}
