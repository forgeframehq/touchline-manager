// World registry: countries, divisions, clubs, real squads and legends. Packs in js/packs/ fill it in.
// Generated players use the name pools in js/names.js.
'use strict';
const WORLD = {
  countries: {}, divisions: {}, clubs: [], squads: {}, legends: [],

  addCountry(c) { WORLD.countries[c.id] = c; },
  addDivision(d) { WORLD.divisions[d.id] = d; },
  addClubs(divId, rows) {
    const d = WORLD.divisions[divId];
    for (const r of rows) {
      const [id, name, short, stadium, capacity, manager, k1, k2, rep, rival] = r;
      WORLD.clubs.push({ id, name, short, stadium, capacity, manager, kit: [k1, k2], rep, rival, country: d.country, div: divId });
    }
  },
  // Text block, one player per line: Name|Pos|Age|Rating|Potential|Nation
  addSquad(clubId, text) { (WORLD.squads[clubId] = WORLD.squads[clubId] || []).push(...parseLines(text).map(f => ({
    name: f[0], pos: f[1], age: +f[2], rating: +f[3], pot: +f[4] || +f[3], nat: f[5] || '' }))); },
  // Name|Pos|PeakAge|Rating|Nation|KnownFor
  addLegends(text) { WORLD.legends.push(...parseLines(text).map(f => ({ name: f[0], pos: f[1], age: +f[2], rating: +f[3], pot: +f[3], nat: f[4], known: f[5] }))); },

  club(id) { return WORLD.clubs.find(c => c.id === id); },
  divisionsOf(country) { return Object.values(WORLD.divisions).filter(d => d.country === country).sort((a, b) => a.tier - b.tier); },
  clubsIn(divId) { return WORLD.clubs.filter(c => c.div === divId); },
};
function parseLines(text) { return text.split('\n').map(l => l.trim()).filter(l => l && l.includes('|')).map(l => l.split('|').map(s => s.trim())); }
if (typeof module !== 'undefined') module.exports = WORLD;
