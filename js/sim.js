// Simulation: world setup, squads, deterministic match engine, multi-division seasons with promotion,
// relegation and play-offs, board briefs and confidence, finances, legends and free agents.
// No DOM here — the headless harness (tools/balance.mjs) drives it directly.
'use strict';
const Sim = (() => {
  const POS = DATA.positions, M = DATA.match, F = DATA.finance;
  const grpOf = pos => (POS[pos] || POS.CM).grp;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

  // ---------- players ----------
  function makeAttr(pos, rating, rng) {
    const keys = POS[pos] ? POS[pos].keys : POS.CM.keys, attr = {};
    for (const a of DATA.attributes) attr[a] = clamp(Math.round(keys.includes(a) ? rating + rng.int(-3, 4) : rating - rng.int(10, 24)), 5, 99);
    if (pos !== 'GK') { attr.handling = clamp(rng.int(8, 20), 1, 99); attr.reflexes = clamp(rng.int(8, 22), 1, 99); }
    return attr;
  }
  function makePlayer(c, src, id, rng, extra) {
    const p = Object.assign({ id, club: c, name: src.name, pos: src.pos, grp: grpOf(src.pos), age: src.age, rating: src.rating, pot: Math.max(src.pot || src.rating, src.rating), nat: src.nat || '',
      morale: 70, fitness: 100, injured: 0, goals: 0, apps: 0, seasonGoals: 0, seasonApps: 0 }, extra || {});
    p.attr = makeAttr(p.pos, p.rating, rng); return p;
  }
  function genName(country, rng) {
    const home = NAMES[country] || NAMES.ENG, pool = rng.chance(DATA.gen.abroadShare) ? NAMES.ABROAD : home;
    return rng.pick(pool.first) + ' ' + rng.pick(pool.last);
  }
  // Fill a club's squad up to size with generated players around the division's rating band.
  function fillSquad(club, existing, rng, nextId) {
    const div = WORLD.divisions[club.div], band = div.band || [70, 80], out = [];
    const reps = WORLD.clubsIn(club.div).map(c => c.rep), lo = Math.min(...reps), hi = Math.max(...reps);
    const centre = band[0] + (band[1] - band[0]) * (hi > lo ? (club.rep - lo) / (hi - lo) : .5);
    const have = { GK: 0, DF: 0, MF: 0, FW: 0 }; existing.forEach(p => have[p.grp]++);
    for (const g in DATA.gen.squadShape) {
      while (have[g] < DATA.gen.squadShape[g]) {
        const age = rng.int(DATA.gen.ageRange[0], DATA.gen.ageRange[1]), r = Math.round(clamp(centre + rng.int(-5, 4) - (age < 21 ? 3 : 0), 40, 85));
        const pos = rng.pick(DATA.gen.detailByGroup[g]);
        out.push(makePlayer(club.id, { name: genName(club.country, rng), pos, age, rating: r, pot: age < 23 ? r + rng.int(2, 12) : r }, nextId(), rng, { gen: true }));
        have[g]++;
      }
    }
    return out;
  }

  const wage = p => Math.max(1, Math.round(F.wageBase * Math.exp((p.rating - 55) * F.wageGrowth) * (p.legend ? F.legendWageMul : 1)));
  function value(p) {   // £m
    const ageMul = p.age < 22 ? 1.5 : p.age < 25 ? 1.25 : p.age <= 29 ? 1 : Math.max(.15, 1 - (p.age - 29) * .18);
    const potMul = 1 + Math.max(0, p.pot - p.rating) * .03;
    return Math.round(F.valueBase * Math.exp((p.rating - 55) * F.valueGrowth) * ageMul * potMul * 10) / 10;
  }

  // ---------- squads and strength ----------
  function pickXI(squad, formation) {
    const need = Object.assign({ GK: 1 }, DATA.formations[formation]); delete need.balance;
    const avail = squad.filter(p => !p.injured).sort((a, b) => b.rating * (.6 + p_fit(b)) - a.rating * (.6 + p_fit(a)) || a.id - b.id);
    const xi = [], used = new Set();
    for (const g in need) for (const p of avail) if (need[g] > 0 && p.grp === g && !used.has(p.id)) { xi.push(p); used.add(p.id); need[g]--; }
    for (const g in need) while (need[g] > 0) { const p = avail.find(q => !used.has(q.id) && (g === 'GK' ? true : q.grp !== 'GK')); if (!p) break; xi.push(p); used.add(p.id); need[g]--; }
    const bench = avail.filter(p => !used.has(p.id)).slice(0, DATA.season.subsOnBench);
    return { xi, bench };
  }
  function p_fit(p) { return p.fitness / 250; }
  function strength(team) {
    const st = DATA.styles[team.tactics.style], xi = team.xi, bonus = team.bonus || 0;
    const mean = (ps, key) => ps.length ? ps.reduce((s, p) => s + (p.attr[key] + bonus) * (st[key] || 1) * (p.fitness / 100) * (.85 + p.morale / 700), 0) / ps.length : 30;
    const by = g => xi.filter(p => p.grp === g), gk = by('GK')[0];
    return {
      gk: gk ? (gk.rating + bonus) * (gk.fitness / 100) : 30,
      def: (mean(by('DF'), 'tackling') + mean(by('DF'), 'positioning') + mean(by('DF'), 'heading')) / 3,
      mid: (mean(by('MF'), 'passing') + mean(by('MF'), 'vision') + mean(by('MF'), 'stamina')) / 3,
      att: (mean(by('FW'), 'shooting') + mean(by('FW'), 'pace') + mean(by('FW'), 'dribbling')) / 3,
    };
  }
  function playMatch(home, away, seed, neutral) {
    const rng = new RNG(seed), sH = strength(home), sA = strength(away);
    const men = t => DATA.mentality[t.tactics.mentality], bal = t => DATA.formations[t.tactics.formation].balance * .05;
    const midEdge = Math.pow(sH.mid / sA.mid, M.strengthExponent);
    const chances = (me, you, sMe, sYou, isHome) => M.baseChancesPerTeam * (isHome && !neutral ? M.homeAdvantage : 1) * men(me).create * men(you).concede
      * (1 + bal(me) - bal(you)) * Math.sqrt(isHome ? midEdge : 1 / midEdge) * Math.pow(sMe.att / sYou.def, M.attackExponent);
    const cH = chances(home, away, sH, sA, true), cA = chances(away, home, sA, sH, false);
    const events = []; let gH = 0, gA = 0;
    const total = DATA.season.matchMinutes + rng.int(DATA.season.addedTime[0], DATA.season.addedTime[1]);
    for (let min = 1; min <= total; min++) {
      for (const side of ['H', 'A']) {
        const me = side === 'H' ? home : away, c = side === 'H' ? cH : cA, sy = side === 'H' ? sA : sH;
        if (!rng.chance(c / total)) continue;
        const out = me.xi.filter(p => p.grp !== 'GK'), fw = out.filter(p => p.grp === 'FW'), mf = out.filter(p => p.grp === 'MF');
        const shooter = rng.pick(fw.concat(fw, fw, mf, mf, out));
        const pGoal = M.goalFromChance * Math.pow(shooter.attr.shooting / Math.max(40, sy.gk), M.finishExponent);
        if (rng.chance(pGoal)) { if (side === 'H') gH++; else gA++; shooter.goals++; shooter.seasonGoals++; events.push({ min, type: 'goal', side, who: shooter.name, pid: shooter.id, score: gH + '–' + gA }); }
        else events.push({ min, type: 'chance', side, who: shooter.name });
      }
    }
    for (const t of [home, away]) for (const p of t.xi) {
      p.fitness = Math.max(45, p.fitness - total * M.fatiguePerMinute * (1.2 - p.attr.stamina / 120)); p.apps++; p.seasonApps++;
      if (rng.chance(M.injuryChancePerMatch)) { p.injured = rng.int(M.injuryWeeks[0], M.injuryWeeks[1]); events.push({ min: total, type: 'injury', who: p.name, side: t === home ? 'H' : 'A' }); }
    }
    const res = gH > gA ? 'H' : gH < gA ? 'A' : 'D';
    const mor = (t, r) => { for (const p of t.squad || t.xi) p.morale = clamp(p.morale + r * (t.xi.includes(p) ? 1 : .4), M.moraleClamp[0], M.moraleClamp[1]); };
    mor(home, res === 'H' ? M.moraleWin : res === 'D' ? M.moraleDraw : M.moraleLoss);
    mor(away, res === 'A' ? M.moraleWin : res === 'D' ? M.moraleDraw : M.moraleLoss);
    return { gH, gA, events, total };
  }

  // ---------- fixtures and tables ----------
  function fixtures(ids, seed) {
    const rng = new RNG(seed); const arr0 = ids.slice();
    for (let i = arr0.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [arr0[i], arr0[j]] = [arr0[j], arr0[i]]; }
    if (arr0.length % 2) arr0.push(null);
    const n = arr0.length, rounds = []; let arr = arr0;
    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a && b) round.push(r % 2 ? [a, b] : [b, a]); }
      rounds.push(round); arr = [arr[0]].concat(arr.slice(-1), arr.slice(1, -1));
    }
    return rounds.concat(rounds.map(r => r.map(([h, a]) => [a, h])));
  }
  function table(career, divId) {
    const rows = {};
    for (const c of career.clubs) if (c.div === divId) rows[c.id] = { id: c.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
    for (const m of career.results) {
      if (m.div !== divId || !rows[m.h] || !rows[m.a]) continue;
      const h = rows[m.h], a = rows[m.a]; h.p++; a.p++; h.gf += m.gH; h.ga += m.gA; a.gf += m.gA; a.ga += m.gH;
      if (m.gH > m.gA) { h.w++; a.l++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
      else if (m.gH < m.gA) { a.w++; h.l++; a.pts += 3; h.form.push('L'); a.form.push('W'); }
      else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
    }
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.id.localeCompare(y.id));
  }

  // ---------- teams ----------
  function squadOf(career, clubId) { return career.players.filter(p => p.club === clubId); }
  function teamFor(career, clubId) {
    const club = career.clubs.find(c => c.id === clubId), squad = squadOf(career, clubId), tactics = career.tactics[clubId];
    const { xi, bench } = pickXI(squad, tactics.formation);
    const bonus = clubId === career.me ? 0 : (DATA.ai[career.difficulty] || DATA.ai.normal).ratingBonus;
    return { club, xi, bench, tactics, squad, bonus };
  }
  function squadStrength(career, clubId) {
    const s = squadOf(career, clubId).map(p => p.rating).sort((a, b) => b - a).slice(0, 14);
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
  }

  // ---------- board ----------
  function brief(career, clubId) {
    const club = career.clubs.find(c => c.id === clubId), div = WORLD.divisions[club.div];
    const ranked = career.clubs.filter(c => c.div === club.div).map(c => ({ id: c.id, s: squadStrength(career, c.id) + c.rep * .05 })).sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
    const rank = ranked.findIndex(r => r.id === clubId) + 1, n = ranked.length;
    const list = div.tier === 1 ? DATA.board.top : DATA.board.lower;
    const b = list.find(x => rank <= x.upTo);
    const fix = v => v < 0 ? n + v : v;   // negative targets count up from the bottom
    let text = b.text;
    if (div.tier === 1 && b.target === 17) text = 'Avoid relegation';
    return { text, target: fix(b.target), warn: fix(b.warn), rank, style: DATA.board.styles[hash(clubId) % DATA.board.styles.length] };
  }

  // ---------- finances ----------
  function weekFinance(career, clubId, home) {
    const c = career.clubs.find(k => k.id === clubId), div = WORLD.divisions[c.div], tier = div.tier;
    const wages = squadOf(career, clubId).reduce((s, p) => s + (p.wage || wage(p)), 0);
    const fill = Math.min(1, .72 + c.rep / 400);
    const gate = home ? Math.round(c.capacity * fill * F.ticket[tier] / 1000) : 0;
    const commercial = Math.round(Math.pow(c.rep, 3) / 400 * F.commercialTierMul[tier]);
    const tv = div.tv;
    return { wages, gate, commercial, tv, net: gate + commercial + tv - wages };
  }

  // ---------- career ----------
  function newCareer(seed, myClubId, opts) {
    opts = opts || {}; const rng = new RNG(seed); let nid = 1; const nextId = () => nid++;
    const clubs = WORLD.clubs.map(c => Object.assign({}, c, { kit: c.kit.slice() }));
    let players = [];
    for (const c of clubs) {
      const r = rng.fork('squad:' + c.id);
      const real = (WORLD.squads[c.id] || []).map(s => makePlayer(c.id, s, nextId(), r));
      players = players.concat(real, fillSquad(c, real, r, nextId));
    }
    for (const p of players) p.wage = wage(p);
    const balances = {}, tactics = {};
    for (const c of clubs) {
      const tier = WORLD.divisions[c.div].tier;
      balances[c.id] = Math.round(c.rep * c.rep * F.balanceMul[tier]);
      const b = DATA.board.styles[hash(c.id) % 3];
      tactics[c.id] = { formation: c.rep >= 80 ? '4-3-3' : c.rep >= 60 ? '4-2-3-1' : '4-4-2', mentality: c.rep >= 85 ? 'attacking' : 'balanced', style: b };
    }
    const career = { version: DATA.version, seed, me: myClubId, difficulty: opts.difficulty || 'normal', legendsOn: !!opts.legends,
      season: DATA.season.startYear, week: 0, clubs, players, results: [], balances, tactics, news: [], history: [], inbox: [],
      board: { confidence: DATA.board.start, warned: false }, matchesPlayed: 0, nextId: nid };
    career.fixtures = {};
    for (const d of Object.values(WORLD.divisions)) career.fixtures[d.id] = fixtures(clubs.filter(c => c.div === d.id).map(c => c.id), seed ^ hash(d.id));
    if (career.legendsOn) addLegends(career, rng.fork('legends'));
    career.brief = brief(career, myClubId);
    news(career, `${clubName(career, myClubId)} appoint a new manager. The board's brief: ${career.brief.text.toLowerCase()}.`);
    return career;
  }
  function clubName(career, id) { const c = career.clubs.find(k => k.id === id); return c ? c.name : id; }
  function news(career, text, kind) { career.news.unshift({ season: career.season, week: career.week, text, kind: kind || 'news' }); if (career.news.length > 60) career.news.length = 60; }

  function addLegends(career, rng) {
    const L = DATA.legends, big = career.clubs.filter(c => c.rep >= L.aiClubMinRep && c.id !== career.me);
    const count = {};
    const sorted = WORLD.legends.slice().sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
    for (const s of sorted) {
      const p = makePlayer(null, s, career.nextId++, rng, { legend: true, known: s.known });
      p.wage = wage(p);
      if (rng.chance(L.aiSignShare) && big.length) {
        const opts = big.filter(c => (count[c.id] || 0) < L.perClubMax);
        if (opts.length) { const c = weightedPick(opts, rng); p.club = c.id; count[c.id] = (count[c.id] || 0) + 1; }
      }
      career.players.push(p);
    }
  }
  function weightedPick(list, rng) { const tot = list.reduce((s, c) => s + c.rep, 0); let r = rng.next() * tot; for (const c of list) { r -= c.rep; if (r <= 0) return c; } return list[list.length - 1]; }

  function freeAgents(career) { return career.players.filter(p => !p.club).sort((a, b) => b.rating - a.rating || a.id - b.id); }
  function canSign(career, p) {
    const squad = squadOf(career, career.me);
    if (squad.length >= DATA.season.squadMax) return { ok: false, why: 'Squad is full (' + DATA.season.squadMax + ')' };
    const me = career.clubs.find(c => c.id === career.me);
    if (p.legend && me.rep < p.rating - DATA.legends.repGap) return { ok: false, why: p.name.split(' ').pop() + ' wants a bigger club (reputation ' + (p.rating - DATA.legends.repGap) + '+)' };
    const f = weekFinance(career, career.me, true), w = p.wage || wage(p);
    if (f.net - w < 0 && career.balances[career.me] < w * 52) return { ok: false, why: 'The board says you can’t afford £' + w + 'k a week' };
    return { ok: true };
  }
  function sign(career, pid) {
    const p = career.players.find(q => q.id === pid); if (!p || p.club) return false;
    const chk = canSign(career, p); if (!chk.ok) return false;
    p.club = career.me; p.morale = 80;
    news(career, `${p.name} signs for ${clubName(career, career.me)} on £${p.wage}k a week.`, 'transfer');
    return true;
  }
  function release(career, pid) {
    const p = career.players.find(q => q.id === pid); if (!p || p.club !== career.me) return false;
    if (squadOf(career, career.me).length <= DATA.season.squadMin) return false;
    p.club = null; news(career, `${p.name} leaves ${clubName(career, career.me)} by mutual consent.`, 'transfer'); return true;
  }

  // AI clubs pick up free legends now and then: the market moves even when you don't.
  function aiMarket(career, rng) {
    const L = DATA.legends, big = career.clubs.filter(c => c.rep >= 75 && c.id !== career.me);
    for (const p of freeAgents(career)) {
      if (!p.legend || !rng.chance(L.weeklyAiChance)) continue;
      const opts = big.filter(c => squadOf(career, c.id).length < DATA.season.squadMax && squadOf(career, c.id).filter(q => q.legend).length < L.perClubMax);
      if (!opts.length) continue;
      const c = weightedPick(opts, rng); p.club = c.id;
      news(career, `${p.name} joins ${c.name}.`, 'transfer');
    }
  }

  // ---------- weeks ----------
  const myDiv = career => career.clubs.find(c => c.id === career.me).div;
  function seasonLength(career) { return Math.max(...Object.values(career.fixtures).map(f => f.length)); }
  function myFixture(career) {
    const round = career.fixtures[myDiv(career)][career.week]; if (!round) return null;
    const f = round.find(([h, a]) => h === career.me || a === career.me); return f ? { h: f[0], a: f[1], home: f[0] === career.me } : null;
  }
  function myRoundsLeft(career) { return career.fixtures[myDiv(career)].length - career.week; }

  function playWeek(career) {
    const w = career.week; if (w >= seasonLength(career)) return null; let mine = null;
    const rng = new RNG((career.seed ^ (career.season * 104729) ^ (w * 7919)) >>> 0);
    for (const divId in career.fixtures) {
      const round = career.fixtures[divId][w]; if (!round) continue;
      for (const [h, a] of round) {
        const H = teamFor(career, h), A = teamFor(career, a);
        const r = playMatch(H, A, (career.seed ^ (career.season * 31) ^ (w * 7919) ^ hash(h + a)) >>> 0);
        career.results.push({ season: career.season, week: w, div: divId, h, a, gH: r.gH, gA: r.gA });
        if (h === career.me || a === career.me) mine = Object.assign({ h, a, H, A, div: divId }, r);
        const fin = (id, home) => { career.balances[id] += weekFinance(career, id, home).net; };
        fin(h, true); fin(a, false);
      }
    }
    for (const p of career.players) { if (!p.club) continue; p.fitness = Math.min(100, p.fitness + 30); if (p.injured) p.injured--; }
    if (career.legendsOn) aiMarket(career, rng);
    career.week++; if (mine) { career.matchesPlayed++; boardAfterMatch(career, mine); }
    return mine;
  }

  function boardAfterMatch(career, m) {
    const B = DATA.board, mine = m.h === career.me, us = mine ? m.gH : m.gA, them = mine ? m.gA : m.gH;
    let d = us > them ? B.win : us < them ? B.loss : B.draw;
    const opp = mine ? m.a : m.h, me = career.clubs.find(c => c.id === career.me);
    if (opp === me.rival) d *= 2;
    if (career.week >= B.fromWeek) {
      const pos = table(career, myDiv(career)).findIndex(r => r.id === career.me) + 1;
      d += (career.brief.warn - pos) * B.positionWeight * .3 + (pos <= career.brief.target ? .6 : 0);
    }
    if (career.tactics[career.me].style === career.brief.style) d += .3;
    career.board.confidence = Math.round(clamp(career.board.confidence + d, B.clamp[0], B.clamp[1]) * 10) / 10;
    if (opp === me.rival) news(career, us > them ? `Derby day joy: ${me.short} beat ${clubName(career, opp)} ${us}–${them}.` : us < them ? `Derby pain: ${me.short} lose ${them}–${us} to ${clubName(career, opp)}.` : `Honours even in the derby: ${us}–${them}.`, 'derby');
    if (career.board.confidence <= B.warnAt && !career.board.warned) { career.board.warned = true; career.inbox.push({ kind: 'warning', text: 'The board have called you in. Results must improve, or they will act.' }); }
    if (career.board.confidence > B.warnAt + 15) career.board.warned = false;
    if (career.board.confidence <= 0) career.sacked = true;
  }

  // ---------- end of season ----------
  function playoffs(career, divId, rng) {
    const d = WORLD.divisions[divId]; if (!d.playoff) return null;
    const t = table(career, divId), [a, b] = d.playoff, teams = t.slice(a - 1, b).map(r => r.id);
    const match = (h, x) => { const H = teamFor(career, h), A = teamFor(career, x); let r = playMatch(H, A, rng.int(1, 1e9), true); if (r.gH === r.gA) r = { gH: r.gH + (rng.chance(.5) ? 1 : 0), gA: r.gA }; if (r.gH === r.gA) r.gA++; return r.gH > r.gA ? h : x; };
    let round = teams;
    while (round.length > 1) { const next = []; for (let i = 0; i < round.length / 2; i++) next.push(match(round[i], round[round.length - 1 - i])); round = next; }
    return round[0];
  }

  function endSeason(career) {
    while (career.week < seasonLength(career)) playWeek(career);
    const rng = new RNG((career.seed ^ career.season * 977) >>> 0), moves = [], summary = { season: career.season, tables: {}, champions: {}, promoted: [], relegated: [] };
    for (const c of Object.keys(WORLD.countries)) {
      const divs = WORLD.divisionsOf(c);
      divs.forEach((d, i) => {
        const t = table(career, d.id); summary.tables[d.id] = t.map(r => r.id); summary.champions[d.id] = t[0].id;
        const below = divs[i + 1], above = divs[i - 1];
        if (below && d.down) t.slice(-d.down).forEach(r => moves.push([r.id, below.id]));
        if (above && d.up !== undefined) {
          const ups = t.slice(0, d.up).map(r => r.id);
          const po = playoffs(career, d.id, rng); if (po && !ups.includes(po)) ups.push(po);
          ups.forEach(id => moves.push([id, above.id]));
        }
      });
    }
    // board verdict on my season
    const myPos = summary.tables[myDiv(career)].indexOf(career.me) + 1;
    const beat = myPos <= career.brief.target, missedBadly = myPos > career.brief.warn;
    career.board.confidence = clamp(career.board.confidence + (beat ? DATA.board.seasonBeat : missedBadly ? DATA.board.seasonMiss : 0), 0, 100);
    summary.myPos = myPos; summary.brief = career.brief.text; summary.beat = beat; summary.missed = missedBadly;
    for (const [id, to] of moves) { const c = career.clubs.find(k => k.id === id), from = c.div; c.div = to;
      (WORLD.divisions[to].tier < WORLD.divisions[from].tier ? summary.promoted : summary.relegated).push(id); }
    if (missedBadly && career.board.confidence < 30) career.sacked = true;
    // players: ageing, growth, retirement; top up squads
    const G = DATA.growth;
    for (const p of career.players) {
      p.age++;
      if (p.age <= G.youngUpTo) p.rating = Math.min(p.pot, p.rating + rng.int(G.youngGain[0], G.youngGain[1]));
      else if (p.age >= G.declineFrom) p.rating -= rng.int(G.decline[0], G.decline[1]) + (p.age >= 34 ? 1 : 0);
      else p.rating += rng.int(-1, 1);
      p.rating = clamp(p.rating, 35, 95); p.pot = Math.max(p.pot, p.rating);
      p.attr = makeAttr(p.pos, p.rating, rng); p.wage = wage(p);
      p.seasonGoals = 0; p.seasonApps = 0; p.injured = 0; p.fitness = 100; p.morale = 70;
    }
    const retired = career.players.filter(p => (p.age >= G.retireHardAge) || (p.age >= G.retireAge && p.rating < 72 + (p.age - G.retireAge) * 3));
    for (const p of retired) if (p.club === career.me) news(career, `${p.name} retires after a fine career.`, 'news');
    const gone = new Set(retired.map(p => p.id)); career.players = career.players.filter(p => !gone.has(p.id));
    let nid = career.nextId; const nextId = () => nid++;
    for (const c of career.clubs) { if (c.id === career.me) continue; const sq = squadOf(career, c.id); if (sq.length < DATA.gen.squadSize) career.players.push(...fillSquad(c, sq, rng.fork('youth' + c.id + career.season), nextId).map(p => (p.wage = wage(p), p))); }
    career.nextId = nid;
    career.history.push(summary);
    career.season++; career.week = 0; career.results = [];
    for (const d of Object.values(WORLD.divisions)) career.fixtures[d.id] = fixtures(career.clubs.filter(c => c.div === d.id).map(c => c.id), career.seed ^ hash(d.id) ^ career.season);
    career.brief = brief(career, career.me); career.board.warned = false;
    news(career, `New season ${career.season}/${String(career.season + 1).slice(2)}. The board's brief: ${career.brief.text.toLowerCase()}.`);
    return summary;
  }

  // Sacked: three job offers from clubs of similar or lower standing.
  function jobOffers(career) {
    const me = career.clubs.find(c => c.id === career.me), rng = new RNG((career.seed ^ career.season ^ career.week) >>> 0);
    const pool = career.clubs.filter(c => c.id !== me.id && c.rep <= me.rep - 3 && c.rep >= me.rep - 30);
    const out = []; while (out.length < 3 && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    return out;
  }
  function takeJob(career, clubId) {
    const old = career.me; career.me = clubId; career.sacked = false; career.board = { confidence: DATA.board.start, warned: false };
    career.brief = brief(career, clubId); career.inbox = [];
    news(career, `${clubName(career, clubId)} appoint the former ${clubName(career, old)} manager. Brief: ${career.brief.text.toLowerCase()}.`);
  }

  return { grpOf, wage, value, pickXI, strength, playMatch, fixtures, table, teamFor, squadOf, squadStrength, brief, weekFinance,
    newCareer, playWeek, endSeason, myFixture, myRoundsLeft, seasonLength, freeAgents, canSign, sign, release, jobOffers, takeJob, myDiv, hash };
})();
if (typeof module !== 'undefined') module.exports = Sim;
