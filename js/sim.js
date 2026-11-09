// Simulation: squad generation, team strength, deterministic match engine, league table.
// No DOM here — the headless balance harness (tools/balance.py / node) drives this directly.
'use strict';
const Sim = (() => {
  const P = DATA.positions, G = DATA.gen, M = DATA.match;

  function rating(pl) {
    const w = P[pl.pos].weights; let r = 0;
    for (const k in w) r += (pl.attr[k] || 0) * w[k];
    return Math.round(r);
  }

  // Build a squad for a club. Attributes land near the tier's range, position attrs boosted.
  function genSquad(club, rng, idStart) {
    const [lo, hi] = G.tierRating[club.tier], out = []; let id = idStart, stars = G.starPerSquad[club.tier];
    for (const pos in G.squadShape) for (let i = 0; i < G.squadShape[pos]; i++) {
      let target = rng.int(lo, hi); if (stars > 0 && pos !== 'GK' && rng.chance(.3)) { target += 6; stars--; }
      const attr = {}; const w = P[pos].weights;
      for (const a of DATA.attributes) attr[a] = Math.max(1, Math.min(99, Math.round(target + (w[a] ? rng.int(2, 10) : rng.int(-22, -6)))));
      const age = rng.int(G.ageRange[0], G.ageRange[1]);
      const pl = { id: id++, club: club.id, pos, age, name: rng.pick(G.firstNames) + ' ' + rng.pick(G.lastNames), attr,
        morale: 70, fitness: 100, injured: 0, suspended: 0, goals: 0, apps: 0 };
      pl.rating = rating(pl); out.push(pl);
    }
    out.sort((a, b) => b.rating - a.rating || a.id - b.id);
    return out;
  }

  function wage(pl) { return Math.round(Math.pow(pl.rating, DATA.finance.wageExponent) * DATA.finance.wagePerRating / 1000); }  // £k / week
  function value(pl) {
    const ageMul = pl.age < 23 ? 1.3 : pl.age <= 30 ? 1 : Math.max(.25, 1 - (pl.age - 30) * .15);
    return Math.round(Math.pow(pl.rating, 2.4) * DATA.finance.transferValuePerRating / 1000 * ageMul);
  }

  // Auto pick: best available XI for the formation, then bench. Deterministic (sorted by rating, id tiebreak).
  function pickXI(squad, formation) {
    const need = Object.assign({ GK: 1 }, DATA.formations[formation]); delete need.balance;
    const avail = squad.filter(p => !p.injured && !p.suspended).sort((a, b) => b.rating - a.rating || a.id - b.id);
    const xi = []; const used = new Set();
    for (const pos in need) for (const p of avail) { if (need[pos] > 0 && p.pos === pos && !used.has(p.id)) { xi.push(p); used.add(p.id); need[pos]--; } }
    for (const pos in need) while (need[pos] > 0) { const p = avail.find(q => !used.has(q.id)); if (!p) break; xi.push(p); used.add(p.id); need[pos]--; }
    const bench = avail.filter(p => !used.has(p.id)).slice(0, DATA.season.subsOnBench);
    return { xi, bench };
  }

  // Team strength: attack / midfield / defence / GK, shaped by style and fitness.
  function strength(team) {
    const st = DATA.styles[team.tactics.style], xi = team.xi;
    const mean = (ps, key) => ps.length ? ps.reduce((s, p) => s + p.attr[key] * (st[key] || 1) * (p.fitness / 100) * (0.8 + p.morale / 500), 0) / ps.length : 30;
    const by = pos => xi.filter(p => p.pos === pos);
    const gk = by('GK')[0], df = by('DF'), mf = by('MF'), fw = by('FW');
    return {
      gk: gk ? gk.rating * (gk.fitness / 100) : 30,
      def: (mean(df, 'tackling') + mean(df, 'positioning') + mean(df, 'heading')) / 3,
      mid: (mean(mf, 'passing') + mean(mf, 'vision') + mean(mf, 'stamina')) / 3,
      att: (mean(fw, 'shooting') + mean(fw, 'pace') + mean(fw, 'dribbling')) / 3,
    };
  }

  // Deterministic match. team = { club, xi, bench, tactics:{formation,mentality,style} }. Returns events + score.
  function playMatch(home, away, seed) {
    const rng = new RNG(seed); const sH = strength(home), sA = strength(away);
    const men = t => DATA.mentality[t.tactics.mentality], bal = t => DATA.formations[t.tactics.formation].balance * .06;
    const midEdge = Math.pow(sH.mid / sA.mid, M.strengthExponent);
    const chances = (me, you, sMe, sYou, isHome) => M.baseChancesPerTeam * (isHome ? M.homeAdvantage : 1) * men(me).create * men(you).concede
      * (1 + bal(me) - bal(you)) * (isHome ? midEdge : 1 / midEdge) * Math.pow(sMe.att / sYou.def, M.strengthExponent * .6);
    const cH = chances(home, away, sH, sA, true), cA = chances(away, home, sA, sH, false);
    const events = []; let gH = 0, gA = 0;
    const total = DATA.season.matchMinutes + rng.int(DATA.season.addedTime[0], DATA.season.addedTime[1]);
    for (let min = 1; min <= total; min++) {
      for (const side of ['H', 'A']) {
        const me = side === 'H' ? home : away, you = side === 'H' ? away : home, c = side === 'H' ? cH : cA, s = side === 'H' ? sH : sA, sy = side === 'H' ? sA : sH;
        if (!rng.chance(c / total)) continue;
        const shooters = me.xi.filter(p => p.pos !== 'GK'); const shooter = rng.pick(shooters.filter(p => p.pos === 'FW').concat(shooters.filter(p => p.pos === 'FW')).concat(shooters));
        const pGoal = M.goalFromChance * (shooter.attr.shooting / 60) / (1 + M.gkSaveWeight * (sy.gk / 70 - 1));
        if (rng.chance(pGoal)) { if (side === 'H') gH++; else gA++; shooter.goals++; events.push({ min, type: 'goal', side, who: shooter.name, score: gH + '–' + gA }); }
        else events.push({ min, type: 'chance', side, who: shooter.name });
      }
      for (const t of [home, away]) for (const p of t.xi) p.fitness = Math.max(40, p.fitness - M.fatiguePerMinute * (1 - p.attr.stamina / 200));
    }
    // injuries and apps
    for (const t of [home, away]) for (const p of t.xi) { p.apps++; if (rng.chance(M.injuryChancePerMatch)) { p.injured = rng.int(M.injuryWeeks[0], M.injuryWeeks[1]); events.push({ min: total, type: 'injury', who: p.name }); } }
    const res = gH > gA ? 'H' : gH < gA ? 'A' : 'D';
    const mor = (t, r) => { for (const p of t.xi) p.morale = Math.max(M.moraleClamp[0], Math.min(M.moraleClamp[1], p.morale + r)); };
    mor(home, res === 'H' ? M.moraleWin : res === 'D' ? M.moraleDraw : M.moraleLoss);
    mor(away, res === 'A' ? M.moraleWin : res === 'D' ? M.moraleDraw : M.moraleLoss);
    return { gH, gA, events, total };
  }

  // Round-robin fixtures (circle method), home/away. Deterministic by club order.
  function fixtures(clubIds) {
    const ids = clubIds.slice(); if (ids.length % 2) ids.push(null);
    const n = ids.length, rounds = []; let arr = ids.slice();
    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a && b) round.push(r % 2 ? [a, b] : [b, a]); }
      rounds.push(round); arr = [arr[0]].concat(arr.slice(-1), arr.slice(1, -1));
    }
    const back = rounds.map(r => r.map(([h, a]) => [a, h]));
    return rounds.concat(back);
  }

  function table(career) {
    const rows = {}; for (const c of career.clubs) rows[c.id] = { id: c.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    for (const m of career.results) {
      const h = rows[m.h], a = rows[m.a]; h.p++; a.p++; h.gf += m.gH; h.ga += m.gA; a.gf += m.gA; a.ga += m.gH;
      if (m.gH > m.gA) { h.w++; a.l++; h.pts += DATA.season.pointsWin; } else if (m.gH < m.gA) { a.w++; h.l++; a.pts += DATA.season.pointsWin; } else { h.d++; a.d++; h.pts += DATA.season.pointsDraw; a.pts += DATA.season.pointsDraw; }
    }
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.id.localeCompare(y.id));
  }

  // Weekly money for a club given last result and form.
  function weekFinance(career, clubId, played, won) {
    const c = career.clubs.find(k => k.id === clubId), F = DATA.finance;
    const squad = career.players.filter(p => p.club === clubId);
    const wages = squad.reduce((s, p) => s + wage(p), 0);
    const gate = played ? Math.round(c.stadium * Math.min(F.attendanceCap, F.attendanceBase + (won ? F.attendanceWinBonus : 0)) * F.ticketPrice / 1000) : 0;
    return { wages, gate, sponsor: F.sponsorPerWeek[c.tier], tv: F.tvPerWeek[c.tier], net: gate + F.sponsorPerWeek[c.tier] + F.tvPerWeek[c.tier] - wages };
  }

  // New career: all squads, fixtures, balances.
  function newCareer(seed, myClubId, difficulty) {
    const rng = new RNG(seed); const clubs = DATA.clubs.map(c => Object.assign({}, c)); let players = [], id = 1;
    for (const c of clubs) { const sq = genSquad(c, rng.fork('squad:' + c.id), id); id += sq.length; players = players.concat(sq); }
    const balances = {}; for (const c of clubs) balances[c.id] = c.tier === 1 ? 12000 : c.tier === 2 ? 5000 : 1800;
    const tactics = {}; for (const c of clubs) tactics[c.id] = { formation: '4-4-2', mentality: 'balanced', style: 'possession' };
    return { version: DATA.version, seed, me: myClubId, difficulty: difficulty || 'normal', week: 0, season: 1,
      clubs, players, fixtures: fixtures(clubs.map(c => c.id)), results: [], balances, tactics, boardPatience: DATA.finance.boardPatienceStart, matchesPlayed: 0 };
  }

  function teamFor(career, clubId) {
    const club = career.clubs.find(c => c.id === clubId), squad = career.players.filter(p => p.club === clubId), tactics = career.tactics[clubId];
    const { xi, bench } = pickXI(squad, tactics.formation); return { club, xi, bench, tactics, squad };
  }

  // Advance one week: play every fixture (mine with full events), settle money, heal.
  function playWeek(career) {
    const round = career.fixtures[career.week]; if (!round) return null; let mine = null;
    for (const [h, a] of round) {
      const H = teamFor(career, h), A = teamFor(career, a);
      const r = playMatch(H, A, (career.seed ^ (career.week * 7919) ^ hash(h + a)) >>> 0);
      career.results.push({ week: career.week, h, a, gH: r.gH, gA: r.gA });
      if (h === career.me || a === career.me) mine = Object.assign({ h, a, H, A }, r);
    }
    for (const c of career.clubs) {
      const res = career.results.filter(m => m.week === career.week && (m.h === c.id || m.a === c.id))[0];
      const won = res && ((res.h === c.id && res.gH > res.gA) || (res.a === c.id && res.gA > res.gH));
      career.balances[c.id] += weekFinance(career, c.id, !!res, won).net;
    }
    for (const p of career.players) { p.fitness = Math.min(100, p.fitness + 25); if (p.injured) p.injured--; }
    career.week++; career.matchesPlayed++;
    return mine;
  }

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

  return { rating, genSquad, wage, value, pickXI, strength, playMatch, fixtures, table, weekFinance, newCareer, teamFor, playWeek };
})();
if (typeof module !== 'undefined') module.exports = Sim;
