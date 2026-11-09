// Simulation: world setup, squads, live minute-by-minute matches (tactics, shouts and subs change the game),
// multi-division seasons with promotion, relegation and play-offs, board and fans, press conferences,
// finances, legends and free agents, manager record and achievements.
// No DOM here — the headless harness (tools/balance.mjs) drives it directly.
'use strict';
const Sim = (() => {
  const POS = DATA.positions, M = DATA.match, F = DATA.finance;
  const HK = {};   // hooks filled by js/fm.js (tactics, contracts, transfers, cups, stats)
  const grpOf = pos => (POS[pos] || POS.CM).grp;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

  // ---------- players ----------
  // Attributes are derived from (id, position, rating) so saves don't need to store them.
  function makeAttr(p) {
    const rng = new RNG((Math.imul(p.id, 2654435761) ^ (p.rating * 97) ^ hash(p.pos)) >>> 0);
    const keys = POS[p.pos] ? POS[p.pos].keys : POS.CM.keys, attr = {};
    for (const a of DATA.attributes) attr[a] = clamp(Math.round(keys.includes(a) ? p.rating + rng.int(-3, 4) : p.rating - rng.int(10, 24)), 5, 99);
    if (p.pos !== 'GK') { attr.handling = rng.int(8, 20); attr.reflexes = rng.int(8, 22); }
    if (p.ib) for (const k in p.ib) if (attr[k] != null) attr[k] = clamp(attr[k] + p.ib[k], 5, 99);
    return attr;
  }
  function makePlayer(c, src, id, extra) {
    const p = Object.assign({ id, club: c, name: src.name, pos: src.pos, grp: grpOf(src.pos), age: src.age, rating: src.rating, pot: Math.max(src.pot || src.rating, src.rating), nat: src.nat || '',
      morale: 70, fitness: 100, injured: 0, goals: 0, apps: 0, seasonGoals: 0, seasonApps: 0 }, extra || {});
    p.attr = makeAttr(p); p.wage = wage(p); return p;
  }
  function rebuild(career) { for (const p of career.players) if (!p.attr) p.attr = makeAttr(p); if (HK.rebuild) HK.rebuild(career); return career; }
  function genName(country, rng) {
    const home = NAMES[country] || NAMES.ENG, pool = rng.chance(DATA.gen.abroadShare) ? NAMES.ABROAD : home;
    return rng.pick(pool.first) + ' ' + rng.pick(pool.last);
  }
  const NAT_OF = { ENG: 'ENG' };
  function fillSquad(club, existing, rng, nextId) {
    const div = WORLD.divisions[club.div], band = div.band || [70, 80], out = [];
    const reps = WORLD.clubsIn(club.div).map(c => c.rep), lo = Math.min(...reps), hi = Math.max(...reps);
    const centre = band[0] + (band[1] - band[0]) * (hi > lo ? (club.rep - lo) / (hi - lo) : .5);
    const have = { GK: 0, DF: 0, MF: 0, FW: 0 }; existing.forEach(p => have[p.grp]++);
    for (const g in DATA.gen.squadShape) {
      while (have[g] < DATA.gen.squadShape[g]) {
        const age = rng.int(DATA.gen.ageRange[0], DATA.gen.ageRange[1]), r = Math.round(clamp(centre + rng.int(-5, 4) - (age < 21 ? 3 : 0), 40, 85));
        const pos = rng.pick(DATA.gen.detailByGroup[g]), abroad = rng.chance(DATA.gen.abroadShare);
        const name = abroad ? rng.pick(NAMES.ABROAD.first) + ' ' + rng.pick(NAMES.ABROAD.last) : genName(club.country, rng);
        out.push(makePlayer(club.id, { name, pos, age, rating: r, pot: age < 23 ? r + rng.int(2, 12) : r, nat: abroad ? '' : (NAT_OF[club.country] || club.country) }, nextId(), { gen: true }));
        have[g]++;
      }
    }
    return out;
  }

  function wage(p) { return Math.max(1, Math.round(F.wageBase * Math.exp((p.rating - 55) * F.wageGrowth) * (p.legend ? F.legendWageMul : 1))); }
  function value(p) {   // £m
    const ageMul = p.age < 22 ? 1.5 : p.age < 25 ? 1.25 : p.age <= 29 ? 1 : Math.max(.15, 1 - (p.age - 29) * .18);
    const potMul = 1 + Math.max(0, p.pot - p.rating) * .03;
    return Math.round(F.valueBase * Math.exp((p.rating - 55) * F.valueGrowth) * ageMul * potMul * 10) / 10;
  }

  // ---------- squads and strength ----------
  function pickXI(squad, formation) {
    const need = Object.assign({ GK: 1 }, DATA.formations[formation]); delete need.balance;
    const score = p => p.rating * (.6 + p.fitness / 250);
    const avail = squad.filter(p => !p.injured && !p.ban).sort((a, b) => score(b) - score(a) || a.id - b.id);
    const xi = [], used = new Set();
    for (const g in need) for (const p of avail) if (need[g] > 0 && p.grp === g && !used.has(p.id)) { xi.push(p); used.add(p.id); need[g]--; }
    for (const g in need) while (need[g] > 0) { const p = avail.find(q => !used.has(q.id) && (g === 'GK' || q.grp !== 'GK')); if (!p) break; xi.push(p); used.add(p.id); need[g]--; }
    const bench = avail.filter(p => !used.has(p.id)).slice(0, DATA.season.subsOnBench);
    return { xi, bench };
  }
  function strength(team) {
    const st = DATA.styles[team.tactics.style], xi = team.xi, bonus = team.bonus || 0;
    const sh = p => p.sharp == null ? 1 : .94 + p.sharp * .0006;
    const mean = (ps, key) => ps.length ? ps.reduce((s, p) => s + (p.attr[key] + bonus) * (st[key] || 1) * (p.fitness / 100) * (.85 + p.morale / 700) * sh(p), 0) / ps.length : 30;
    const by = g => xi.filter(p => p.grp === g), gk = by('GK')[0];
    return {
      gk: gk ? (gk.rating + bonus) * (gk.fitness / 100) : 30,
      def: (mean(by('DF'), 'tackling') + mean(by('DF'), 'positioning') + mean(by('DF'), 'heading')) / 3,
      mid: (mean(by('MF'), 'passing') + mean(by('MF'), 'vision') + mean(by('MF'), 'stamina')) / 3,
      att: (mean(by('FW'), 'shooting') + mean(by('FW'), 'pace') + mean(by('FW'), 'dribbling')) / 3,
    };
  }

  // ---------- live match ----------
  // team = { club, xi, bench, tactics, squad, bonus, ai }. Tactics are copied so in-match changes don't leak into the club's setup.
  function createMatch(home, away, seed, opts) {
    opts = opts || {};
    const rng = new RNG(seed), m = { rng, neutral: !!opts.neutral, min: 0, gH: 0, gA: 0, events: [], done: false,
      total: DATA.season.matchMinutes + rng.int(DATA.season.addedTime[0], DATA.season.addedTime[1]),
      H: Object.assign({}, home, { tactics: Object.assign({}, home.tactics), xi: home.xi.slice(), bench: home.bench.slice(), side: 'H' }),
      A: Object.assign({}, away, { tactics: Object.assign({}, away.tactics), xi: away.xi.slice(), bench: away.bench.slice(), side: 'A' }),
      mods: { H: [], A: [] }, subs: { H: 0, A: 0 }, shots: { H: 0, A: 0 }, cool: { H: {}, A: {} }, stats: {}, played: new Set(), dirty: true };
    for (const p of m.H.xi.concat(m.A.xi)) { m.played.add(p.id); m.stats[p.id] = { g: 0, sh: 0, on: 0, off: null }; }
    return m;
  }
  function modMul(m, side, key) { let v = 1; for (const x of m.mods[side]) if (x.until >= m.min && x[key]) v *= x[key]; return v; }
  function rates(m) {
    if (m.dirty || m.min % 5 === 0) { m.sH = strength(m.H); m.sA = strength(m.A); m.dirty = false; }
    const men = t => DATA.mentality[t.tactics.mentality], bal = t => DATA.formations[t.tactics.formation].balance * .05;
    const midEdge = Math.pow(m.sH.mid / m.sA.mid, M.strengthExponent);
    const c = (me, you, sMe, sYou, isHome, side, oside) => M.baseChancesPerTeam * (isHome && !m.neutral ? M.homeAdvantage : 1) * men(me).create * men(you).concede
      * (1 + bal(me) - bal(you)) * Math.sqrt(isHome ? midEdge : 1 / midEdge) * Math.pow(sMe.att / sYou.def, M.attackExponent)
      * modMul(m, side, 'create') * modMul(m, oside, 'concede') * modMul(m, oside, 'oppCreate') * instrMul(me, 'create') * instrMul(you, 'concede') * instrMul(you, 'oppCreate');
    return { H: c(m.H, m.A, m.sH, m.sA, true, 'H', 'A'), A: c(m.A, m.H, m.sA, m.sH, false, 'A', 'H') };
  }
  // tactical instructions → multipliers (only teams with instr set, i.e. the player's club)
  function instrMul(t, key) {
    if (t.tm) { const T = t.tm; return key === 'create' ? (1 + T.c) * (1 + ((t.chem || 70) - 70) / 300) : key === 'concede' ? 1 + T.x : key === 'oppCreate' ? 1 + T.o : key === 'tire' ? 1 + T.t : 1; }
    const I = t.instr; if (!I) return 1; let v = 1; const tg = I.toggles || {};
    const press = I.press + (tg.highPress ? 1 : 0);
    if (key === 'oppCreate') v *= 1 - .045 * (press - 3);
    if (key === 'create') v *= (1 + .03 * (I.line - 3)) * (1 + .02 * (I.pass - 3)) * (tg.overlap ? 1.04 : 1) * (tg.playOut ? 1.02 : 1) * (tg.possession ? .97 : 1) * (1 + ((t.chem || 70) - 70) / 300);
    if (key === 'concede') v *= (1 + .05 * (I.line - 3)) * (1 + .015 * (I.pass - 3)) * (tg.overlap ? 1.03 : 1) * (tg.playOut ? 1.03 : 1) * (tg.possession ? .94 : 1);
    if (key === 'tire') v *= 1 + .08 * (press - 3);
    return v;
  }
  function aiThink(m, side) {
    const t = m[side], us = side === 'H' ? m.gH : m.gA, them = side === 'H' ? m.gA : m.gH;
    if (m.min === 60 && us < them) t.tactics.mentality = 'attacking';
    if (m.min === 78 && us > them) t.tactics.mentality = 'defensive';
    if ([60, 70, 80].includes(m.min) && m.subs[side] < 3) {
      const tired = t.xi.filter(p => p.grp !== 'GK').sort((a, b) => a.fitness - b.fitness)[0];
      if (tired && tired.fitness < 78) { const inn = t.bench.find(b => b.grp === tired.grp) || t.bench.find(b => b.grp !== 'GK'); if (inn) makeSub(m, side, tired.id, inn.id, true); }
    }
    m.dirty = true;
  }
  function stepMatch(m) {
    if (m.done) return [];
    m.min++; const out = [], r = rates(m), rng = m.rng;
    for (const side of ['H', 'A']) {
      const me = m[side], opp = side === 'H' ? m.A : m.H, sOpp = side === 'H' ? m.sA : m.sH;
      if (!rng.chance(r[side] / m.total)) continue;
      const of = me.xi.filter(p => p.grp !== 'GK'), fw = of.filter(p => p.grp === 'FW'), mf = of.filter(p => p.grp === 'MF');
      let pool = fw.concat(fw, fw, mf, mf, of); if (opp.oppI) { const marked = pool.filter(p => (opp.oppI[p.id] || []).includes('tight')); if (marked.length && rng.chance(.5)) pool = pool.filter(p => !marked.includes(p)); }
      const shooter = rng.pick(pool.length ? pool : of); m.stats[shooter.id].sh++; m.shots[side]++;
      const pGoal = M.goalFromChance * Math.pow(shooter.attr.shooting / Math.max(40, sOpp.gk), M.finishExponent);
      if (rng.chance(pGoal)) {
        if (side === 'H') m.gH++; else m.gA++;
        m.stats[shooter.id].g++; shooter.goals++; shooter.seasonGoals++;
        const assist = rng.chance(.7) ? rng.pick(of.filter(p => p !== shooter)) : null;
        out.push({ min: m.min, type: 'goal', side, who: shooter.name, pid: shooter.id, assist: assist && assist.name, aid: assist && assist.id, score: m.gH + '-' + m.gA });
      } else out.push({ min: m.min, type: rng.chance(.35) ? 'save' : 'chance', side, who: shooter.name, keeper: (opp.xi.find(p => p.grp === 'GK') || {}).name });
      void opp;
    }
    if (HK.minute) HK.minute(m, out);
    for (const side of ['H', 'A']) for (const p of m[side].xi) p.fitness = Math.max(40, p.fitness - M.fatiguePerMinute * (1.2 - p.attr.stamina / 120) * modMul(m, side, 'tire') * instrMul(m[side], 'tire'));
    if (m.min === 45) out.push({ min: 45, type: 'ht' });
    for (const side of ['H', 'A']) if (m[side].ai) aiThink(m, side);
    if (m.min >= m.total) { m.done = true; out.push({ min: m.min, type: 'ft' }); }
    m.events.push(...out); return out;
  }
  function shout(m, side, key) {
    const s = DATA.shouts[key]; if (!s || (m.cool[side][key] || 0) > m.min) return false;
    m.cool[side][key] = m.min + s.cooldown;
    m.mods[side].push(Object.assign({ until: m.min + s.mins }, s.effect));
    if (s.morale) for (const p of m[side].xi) p.morale = clamp(p.morale + s.morale, 20, 100);
    m.dirty = true; m.events.push({ min: m.min, type: 'shout', side, key }); return true;
  }
  function setTactic(m, side, key, val) { m[side].tactics[key] = val; m.dirty = true; }
  function makeSub(m, side, outId, inId, quiet) {
    const t = m[side]; if (m.subs[side] >= DATA.season.subsAllowed) return false;
    const oi = t.xi.findIndex(p => p.id === outId), ii = t.bench.findIndex(p => p.id === inId); if (oi < 0 || ii < 0) return false;
    const off = t.xi[oi], on = t.bench[ii]; t.xi[oi] = on; t.bench.splice(ii, 1); m.subs[side]++;
    m.played.add(on.id); m.stats[on.id] = m.stats[on.id] || { g: 0, sh: 0, on: m.min, off: null }; m.stats[off.id].off = m.min;
    m.dirty = true; m.events.push({ min: m.min, type: 'sub', side, off: off.name, on: on.name, quiet: !!quiet }); return true;
  }
  function finishMatch(m) {
    while (!m.done) stepMatch(m);
    const rng = m.rng, res = m.gH > m.gA ? 'H' : m.gH < m.gA ? 'A' : 'D', ratings = {};
    for (const side of ['H', 'A']) {
      const t = m[side], conceded = side === 'H' ? m.gA : m.gH, won = res === side, lost = res !== 'D' && !won;
      const everyone = t.squad ? t.squad.filter(p => m.played.has(p.id)) : t.xi;
      for (const p of everyone) {
        const s = m.stats[p.id] || { g: 0, sh: 0 };
        let r = 6.3 + s.g * 1.15 + s.sh * .12 + (won ? .45 : lost ? -.35 : 0) + (rng.next() - .5) * .8;
        if (p.grp === 'GK' || p.grp === 'DF') r += conceded === 0 ? .8 : -.25 * conceded;
        ratings[p.id] = Math.round(clamp(r, 4, 10) * 10) / 10;
        p.apps++; p.seasonApps++;
        if (rng.chance(M.injuryChancePerMatch)) { let w = rng.int(M.injuryWeeks[0], M.injuryWeeks[1]); if (t.medical) w = Math.max(1, Math.round(w * (1.25 - t.medical * .07))); p.injured = w; m.events.push({ min: m.total, type: 'injury', who: p.name, side }); }
      }
      const delta = res === 'D' ? M.moraleDraw : won ? M.moraleWin : M.moraleLoss;
      for (const p of t.squad || t.xi) p.morale = clamp(p.morale + delta * (m.played.has(p.id) ? 1 : .4), M.moraleClamp[0], M.moraleClamp[1]);
    }
    if (HK.afterMatch) HK.afterMatch(m, ratings);
    let potm = null; for (const id in ratings) if (!potm || ratings[id] > ratings[potm]) potm = id;
    m.ratings = ratings; m.potm = potm ? +potm : null;
    return { gH: m.gH, gA: m.gA, events: m.events, total: m.total, ratings, potm: m.potm, st: m.st };
  }
  function playMatch(home, away, seed, neutral) { const m = createMatch(Object.assign({}, home, { ai: true }), Object.assign({}, away, { ai: true }), seed, { neutral }); return finishMatch(m); }

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
    if (career.deduct) for (const id in career.deduct) if (rows[id]) rows[id].pts -= career.deduct[id];
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.id.localeCompare(y.id));
  }
  function position(career, clubId) { const c = career.clubs.find(k => k.id === clubId); return table(career, c.div).findIndex(r => r.id === clubId) + 1; }

  // ---------- teams ----------
  function squadOf(career, clubId) { return career.players.filter(p => p.club === clubId); }
  function teamFor(career, clubId) {
    const club = career.clubs.find(c => c.id === clubId), squad = squadOf(career, clubId), tactics = career.tactics[clubId];
    const mine = clubId === career.me;
    const { xi, bench } = mine ? (HK.myXI ? HK.myXI(career) : myXI(career)) : pickXI(squad, tactics.formation);
    const bonus = mine ? (career.boost ? DATA.coins.boost : 0) : (DATA.ai[career.difficulty] || DATA.ai.normal).ratingBonus;
    const t = { club, xi, bench, tactics, squad, bonus, ai: !mine };
    if (mine) { t.instr = career.instr; t.chem = chemistry(career); t.medical = career.facilities.medical; }
    if (HK.team) HK.team(career, t, mine);
    return t;
  }
  function squadStrength(career, clubId) {
    const s = squadOf(career, clubId).map(p => p.rating).sort((a, b) => b - a).slice(0, 14);
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
  }
  function difficulty(career, opp) { const d = squadStrength(career, opp) - squadStrength(career, career.me); return clamp(Math.round(3 + d / 3), 1, 5); }

  // ---------- board ----------
  function brief(career, clubId) {
    const club = career.clubs.find(c => c.id === clubId), div = WORLD.divisions[club.div];
    const ranked = career.clubs.filter(c => c.div === club.div).map(c => ({ id: c.id, s: squadStrength(career, c.id) + c.rep * .05 })).sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
    const rank = ranked.findIndex(r => r.id === clubId) + 1, n = ranked.length;
    const b = (div.tier === 1 ? DATA.board.top : DATA.board.lower).find(x => rank <= x.upTo);
    const fix = v => v < 0 ? n + v : v;
    return { text: b.text, target: fix(b.target), warn: fix(b.warn), rank, style: DATA.board.styles[hash(clubId) % DATA.board.styles.length] };
  }
  function previewBrief(clubId) {   // before a career exists: rank by reputation
    const club = WORLD.club(clubId), div = WORLD.divisions[club.div];
    const peers = WORLD.clubsIn(club.div).slice().sort((a, b) => b.rep - a.rep || a.id.localeCompare(b.id)), rank = peers.indexOf(club) + 1;
    return (div.tier === 1 ? DATA.board.top : DATA.board.lower).find(x => rank <= x.upTo).text;
  }

  // ---------- finances ----------
  function weekFinance(career, clubId, home) {
    const c = career.clubs.find(k => k.id === clubId), div = WORLD.divisions[c.div], tier = div.tier;
    const wages = squadOf(career, clubId).reduce((s, p) => s + (p.wage || wage(p)), 0);
    const price = clubId === career.me && career.ticket ? career.ticket : F.ticket[tier];
    const fill = clubId === career.me ? attendance(career) : Math.min(1, .72 + c.rep / 400);
    const gate = home ? Math.round(c.capacity * fill * price / 1000) : 0;
    const commercial = Math.round(Math.pow(c.rep, 3) / 400 * F.commercialTierMul[tier]);
    return { wages, gate, commercial, tv: div.tv, net: gate + commercial + div.tv - wages };
  }

  // ---------- career ----------
  function newCareer(seed, myClubId, opts) {
    opts = opts || {}; const rng = new RNG(seed); let nid = 1; const nextId = () => nid++;
    const clubs = WORLD.clubs.map(c => Object.assign({}, c, { kit: c.kit.slice() }));
    let players = [];
    for (const c of clubs) {
      const r = rng.fork('squad:' + c.id);
      const real = (WORLD.squads[c.id] || []).map(s => makePlayer(c.id, s, nextId()));
      players = players.concat(real, fillSquad(c, real, r, nextId));
    }
    const balances = {}, tactics = {};
    for (const c of clubs) {
      balances[c.id] = Math.round(c.rep * c.rep * F.balanceMul[WORLD.divisions[c.div].tier]);
      tactics[c.id] = { formation: c.rep >= 80 ? '4-3-3' : c.rep >= 60 ? '4-2-3-1' : '4-4-2', mentality: c.rep >= 85 ? 'attacking' : 'balanced', style: DATA.board.styles[hash(c.id) % 3] };
    }
    const me = clubs.find(c => c.id === myClubId);
    const career = { version: DATA.version, seed, me: myClubId, difficulty: opts.difficulty || 'normal', legendsOn: !!opts.legends,
      season: DATA.season.startYear, week: 0, clubs, players, results: [], balances, tactics, news: [], history: [], inbox: [],
      board: { confidence: DATA.board.start, warned: false }, fans: DATA.fans.start, matchesPlayed: 0, nextId: nid,
      manager: { name: opts.name || 'The Boss', nat: opts.nat || 'ENG', games: 0, w: 0, d: 0, l: 0, trophies: [], sackings: 0, clubs: [{ id: myClubId, name: me.name, from: DATA.season.startYear }] },
      stats: { legendsSigned: 0, derbyWins: 0, bigWins: 0, unbeaten: 0, bestUnbeaten: 0 },
      coins: DATA.coins.start, ticket: null, build: null, lineup: null, fam: {}, boost: false,
      instr: { press: 3, line: 3, pass: 3, toggles: {} }, preset: null, setp: {},
      facilities: startFacilities(me) };
    career.fixtures = {};
    for (const d of Object.values(WORLD.divisions)) career.fixtures[d.id] = fixtures(clubs.filter(c => c.div === d.id).map(c => c.id), seed ^ hash(d.id));
    if (career.legendsOn) addLegends(career, rng.fork('legends'));
    autoRoles(career);
    if (HK.newCareer) HK.newCareer(career, rng.fork('fm'));
    career.brief = brief(career, myClubId);
    news(career, `${me.name} appoint ${career.manager.name} as manager. The board's brief: ${career.brief.text.toLowerCase()}.`, 'board');
    mail(career, 'board', 'The Chairman', `Welcome to ${me.name}. Our brief for this season: ${career.brief.text.toLowerCase()}. We also want to see ${DATA.styles[career.brief.style].label.toLowerCase()} football.`);
    return career;
  }
  function clubName(career, id) { const c = career.clubs.find(k => k.id === id); return c ? c.name : id; }
  function news(career, text, kind) { career.news.unshift({ season: career.season, week: career.week, text, kind: kind || 'news' }); if (career.news.length > 80) career.news.length = 80; }
  function mail(career, kind, from, text) { career.inbox.unshift({ season: career.season, week: career.week, kind, from, text, read: false }); if (career.inbox.length > 60) career.inbox.length = 60; }

  function addLegends(career, rng) {
    const L = DATA.legends, big = career.clubs.filter(c => c.rep >= L.aiClubMinRep && c.id !== career.me), count = {};
    for (const s of WORLD.legends.slice().sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))) {
      const p = makePlayer(null, s, career.nextId++, { legend: true, known: s.known });
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
    if (squadOf(career, career.me).length >= DATA.season.squadMax) return { ok: false, why: 'Squad is full (' + DATA.season.squadMax + ')' };
    const me = career.clubs.find(c => c.id === career.me);
    if (p.legend && me.rep < p.rating - DATA.legends.repGap) return { ok: false, why: 'Wants a bigger club (rep ' + (p.rating - DATA.legends.repGap) + '+)' };
    const f = weekFinance(career, career.me, true), w = p.wage || wage(p);
    if (f.net - w < 0 && career.balances[career.me] < w * 52) return { ok: false, why: 'Board: can’t afford £' + w + 'k a week' };
    return { ok: true };
  }
  function sign(career, pid) {
    const p = career.players.find(q => q.id === pid); if (!p || p.club || !canSign(career, p).ok) return false;
    p.club = career.me; p.morale = 82;
    if (p.legend) { career.stats.legendsSigned++; career.fans = clamp(career.fans + DATA.fans.legendSigned, 0, 100); }
    news(career, `${p.name} signs for ${clubName(career, career.me)} on £${p.wage}k a week.`, 'transfer');
    return true;
  }
  function release(career, pid) {
    const p = career.players.find(q => q.id === pid); if (!p || p.club !== career.me) return false;
    if (squadOf(career, career.me).length <= DATA.season.squadMin) return false;
    p.club = null; news(career, `${p.name} leaves ${clubName(career, career.me)} by mutual consent.`, 'transfer'); return true;
  }
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
  const matchSeed = (career, h, a) => (career.seed ^ (career.season * 31) ^ (career.week * 7919) ^ hash(h + a)) >>> 0;
  function settle(career, divId, h, a, r) {
    career.results.push({ season: career.season, week: career.week, div: divId, h, a, gH: r.gH, gA: r.gA });
    career.balances[h] += weekFinance(career, h, true).net; career.balances[a] += weekFinance(career, a, false).net;
  }
  // Play every fixture this week except mine; return my match ready to play live (or null on a bye).
  function startWeek(career) {
    if (HK.preWeek) HK.preWeek(career, false);
    const w = career.week; if (w >= seasonLength(career)) return null; let live = null;
    for (const divId in career.fixtures) {
      const round = career.fixtures[divId][w]; if (!round) continue;
      for (const [h, a] of round) {
        if (h === career.me || a === career.me) { live = createMatch(teamFor(career, h), teamFor(career, a), matchSeed(career, h, a)); live.h = h; live.a = a; live.div = divId; continue; }
        settle(career, divId, h, a, playMatch(teamFor(career, h), teamFor(career, a), matchSeed(career, h, a)));
      }
    }
    career.pending = !!live;
    return live;
  }
  function finishWeek(career, live) {
    let mine = null;
    if (live) {
      const r = finishMatch(live); settle(career, live.div, live.h, live.a, r);
      mine = Object.assign({ h: live.h, a: live.a, div: live.div }, r);
      career.matchesPlayed++; afterMyMatch(career, mine);
      const us = mine.h === career.me ? mine.gH : mine.gA, them = mine.h === career.me ? mine.gA : mine.gH;
      career.coins += us > them ? DATA.coins.win : us === them ? DATA.coins.draw : 0;
      const f = career.tactics[career.me].formation; career.fam[f] = Math.min(1, (career.fam[f] || .5) + .06);
      career.boost = false;
    }
    if (career.build && career.week + 1 >= career.build.ready) { const c = career.clubs.find(k => k.id === career.me); c.capacity += career.build.seats;
      news(career, `The new stand is open! ${c.stadium} now holds ${c.capacity.toLocaleString()}.`, 'board'); mail(career, 'board', 'Stadium Manager', `Construction is complete. Capacity is now ${c.capacity.toLocaleString()}.`); career.build = null; }
    for (const p of career.players) { if (!p.club) continue; p.fitness = Math.min(100, p.fitness + 30); if (p.injured) p.injured--; }
    if (career.legendsOn) aiMarket(career, new RNG((career.seed ^ (career.season * 104729) ^ (career.week * 7919)) >>> 0));
    if (HK.week) HK.week(career, mine);
    career.week++; career.pending = false;
    return mine;
  }
  function playWeek(career) {   // headless: my match plays itself
    if (HK.preWeek) HK.preWeek(career, true);
    const live = startWeek(career); if (live) { live.H.ai = true; live.A.ai = true; }
    if (career.week >= seasonLength(career) && !live) return null;
    return finishWeek(career, live);
  }

  function afterMyMatch(career, m) {
    const B = DATA.board, home = m.h === career.me, us = home ? m.gH : m.gA, them = home ? m.gA : m.gH, opp = home ? m.a : m.h;
    const me = career.clubs.find(c => c.id === career.me), derby = opp === me.rival, mg = career.manager, st = career.stats;
    mg.games++; if (us > them) mg.w++; else if (us < them) mg.l++; else mg.d++;
    if (us >= them) { st.unbeaten++; st.bestUnbeaten = Math.max(st.bestUnbeaten, st.unbeaten); } else st.unbeaten = 0;
    if (derby && us > them) st.derbyWins++;
    if (us - them >= 4) st.bigWins++;
    let d = us > them ? B.win : us < them ? B.loss : B.draw; if (derby) d *= 2;
    if (career.week >= B.fromWeek) { const pos = position(career, career.me); d += (career.brief.warn - pos) * B.positionWeight * .3 + (pos <= career.brief.target ? .6 : 0); }
    if (career.tactics[career.me].style === career.brief.style) d += .3;
    career.board.confidence = Math.round(clamp(career.board.confidence + d, B.clamp[0], B.clamp[1]) * 10) / 10;
    const fd = (us > them ? DATA.fans.win : us < them ? DATA.fans.loss : DATA.fans.draw) * (derby ? 2 : 1) + (us >= 3 ? 1 : 0);
    career.fans = clamp(Math.round(career.fans + fd), 0, 100);
    if (derby) news(career, us > them ? `Derby joy: ${me.short} beat ${clubName(career, opp)} ${us}–${them}.` : us < them ? `Derby pain: ${me.short} lose ${them}–${us} to ${clubName(career, opp)}.` : `Honours even in the derby, ${us}–${them}.`, 'derby');
    if (career.board.confidence <= B.warnAt && !career.board.warned) { career.board.warned = true; mail(career, 'warning', 'The Chairman', 'The board have called you in. Results must improve quickly, or we will act.'); career.alert = 'warning'; }
    if (career.board.confidence > B.warnAt + 15) career.board.warned = false;
    if (career.board.confidence <= 0) career.sacked = true;
  }

  // ---------- press conferences ----------
  function pressFor(career, fx) {
    if (!fx) return null;
    const me = career.clubs.find(c => c.id === career.me), opp = fx.home ? fx.a : fx.h, derby = opp === me.rival;
    const big = difficulty(career, opp) >= 4, recent = career.results.filter(r => r.h === career.me || r.a === career.me).slice(-3);
    const lost3 = recent.length === 3 && recent.every(r => (r.h === career.me ? r.gH < r.gA : r.gA < r.gH));
    const due = derby || big || lost3 || (career.week > 0 && career.week % 4 === 0);
    if (!due) return null;
    const tag = derby ? 'derby' : lost3 ? 'slump' : big ? 'big' : 'general';
    const pool = DATA.press.filter(q => q.tag === tag);
    const q = pool[(career.week + career.season) % pool.length];
    const fill = s => s.replace('{opp}', clubName(career, opp)).replace('{club}', me.name);
    return { tag, q: fill(q.q), answers: q.answers.map(a => Object.assign({}, a, { text: fill(a.text) })) };
  }
  function applyPress(career, answer) {
    for (const p of squadOf(career, career.me)) p.morale = clamp(p.morale + (answer.morale || 0), 20, 100);
    career.board.confidence = clamp(career.board.confidence + (answer.board || 0), 0, 100);
    career.fans = clamp(career.fans + (answer.fans || 0), 0, 100);
    news(career, `${career.manager.name}: “${answer.text}”`, 'press');
  }

  // ---------- end of season ----------
  function playoffs(career, divId, rng) {
    const d = WORLD.divisions[divId]; if (!d.playoff) return null;
    const t = table(career, divId), [a, b] = d.playoff, teams = t.slice(a - 1, b).map(r => r.id);
    const match = (h, x) => { const r = playMatch(teamFor(career, h), teamFor(career, x), rng.int(1, 1e9), true); return r.gH > r.gA ? h : r.gH < r.gA ? x : (rng.chance(.5) ? h : x); };
    let round = teams;
    while (round.length > 1) { const next = []; for (let i = 0; i < round.length / 2; i++) next.push(match(round[i], round[round.length - 1 - i])); round = next; }
    return round[0];
  }
  function endSeason(career) {
    while (career.week < seasonLength(career)) playWeek(career);
    const rng = new RNG((career.seed ^ career.season * 977) >>> 0), moves = [];
    const summary = { season: career.season, tables: {}, champions: {}, promoted: [], relegated: [], topScorer: {}, playoffWinners: {} };
    const mine = career.results.filter(r => r.h === career.me || r.a === career.me);
    summary.record = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    for (const r of mine) { const us = r.h === career.me ? r.gH : r.gA, them = r.h === career.me ? r.gA : r.gH; summary.record.gf += us; summary.record.ga += them; summary.record[us > them ? 'w' : us < them ? 'l' : 'd']++; }
    for (const c of Object.keys(WORLD.countries)) {
      const divs = WORLD.divisionsOf(c);
      divs.forEach((d, i) => {
        const t = table(career, d.id); summary.tables[d.id] = t.map(r => r.id); summary.champions[d.id] = t[0].id;
        const ts = career.players.filter(p => p.club && career.clubs.find(k => k.id === p.club).div === d.id).sort((x, y) => y.seasonGoals - x.seasonGoals || y.rating - x.rating)[0];
        if (ts) summary.topScorer[d.id] = { name: ts.name, club: ts.club, goals: ts.seasonGoals, id: ts.id };
        const below = divs[i + 1], above = divs[i - 1];
        if (below && d.down) t.slice(-d.down).forEach(r => moves.push([r.id, below.id]));
        if (above) { const ups = t.slice(0, d.up).map(r => r.id), po = playoffs(career, d.id, rng); if (po && !ups.includes(po)) { ups.push(po); summary.playoffWinners[d.id] = po; } ups.forEach(id => moves.push([id, above.id])); }
      });
    }
    const myD = myDiv(career), myPos = summary.tables[myD].indexOf(career.me) + 1, divName = WORLD.divisions[myD].name;
    const beat = myPos <= career.brief.target, missed = myPos > career.brief.warn;
    career.board.confidence = clamp(career.board.confidence + (beat ? DATA.board.seasonBeat : missed ? DATA.board.seasonMiss : 0), 0, 100);
    Object.assign(summary, { myPos, myDiv: myD, brief: career.brief.text, beat, missed });
    for (const [id, to] of moves) { const c = career.clubs.find(k => k.id === id), from = c.div; c.div = to; (WORLD.divisions[to].tier < WORLD.divisions[from].tier ? summary.promoted : summary.relegated).push(id); }
    const meName = clubName(career, career.me);
    if (myPos === 1) career.manager.trophies.push({ season: career.season, label: divName + ' title', club: meName, kind: 'league', tier: WORLD.divisions[myD].tier });
    else if (summary.promoted.includes(career.me)) career.manager.trophies.push({ season: career.season, label: (summary.playoffWinners[myD] === career.me ? 'Play-off winners' : 'Promotion') + ' — ' + divName, club: meName, kind: 'promotion', tier: WORLD.divisions[myD].tier });
    if (missed && career.board.confidence < 30) career.sacked = true;
    // players age, grow, retire; AI squads topped up with youth
    const G = DATA.growth;
    for (const p of career.players) {
      p.age++;
      if (p.age <= G.youngUpTo) p.rating = Math.min(p.pot, p.rating + rng.int(G.youngGain[0], G.youngGain[1]) + (p.club === career.me ? Math.floor(career.facilities.training / 4) : 0));
      else if (p.age >= G.declineFrom) p.rating -= rng.int(G.decline[0], G.decline[1]) + (p.age >= 34 ? 1 : 0);
      else p.rating += rng.int(-1, 1);
      p.rating = clamp(p.rating, 35, 95); p.pot = Math.max(p.pot, p.rating);
      p.attr = makeAttr(p); p.wage = wage(p);
      p.seasonGoals = 0; p.seasonApps = 0; p.injured = 0; p.fitness = 100; p.morale = 70;
    }
    if (HK.contracts) HK.contracts(career, rng);
    const retired = career.players.filter(p => (p.age >= G.retireHardAge) || (p.age >= G.retireAge && p.rating < 72 + (p.age - G.retireAge) * 3));
    for (const p of retired) if (p.club === career.me) news(career, `${p.name} retires after a fine career.`);
    const gone = new Set(retired.map(p => p.id)); career.players = career.players.filter(p => !gone.has(p.id));
    let nid = career.nextId; const nextId = () => nid++;
    for (const c of career.clubs) { if (c.id === career.me) continue; const sq = squadOf(career, c.id); if (sq.length < DATA.gen.squadSize) career.players.push(...fillSquad(c, sq, rng.fork('youth' + c.id + career.season), nextId)); }
    career.nextId = nid;
    summary.intake = youthIntake(career, rng);
    if (beat) career.coins += DATA.coins.briefMet;
    career.history.push(summary);
    career.season++; career.week = 0; career.results = []; career.stats.unbeaten = 0;
    for (const d of Object.values(WORLD.divisions)) career.fixtures[d.id] = fixtures(career.clubs.filter(c => c.div === d.id).map(c => c.id), career.seed ^ hash(d.id) ^ career.season);
    career.brief = brief(career, career.me); career.board.warned = false;
    if (HK.newSeason) HK.newSeason(career, summary, rng);
    news(career, `New season ${career.season}/${String(career.season + 1).slice(2)}. Brief: ${career.brief.text.toLowerCase()}.`, 'board');
    mail(career, 'board', 'The Chairman', `A new season. Our brief: ${career.brief.text.toLowerCase()}.`);
    return summary;
  }

  function jobOffers(career) {
    const me = career.clubs.find(c => c.id === career.me), rng = new RNG((career.seed ^ career.season ^ career.week) >>> 0);
    const pool = career.clubs.filter(c => c.id !== me.id && c.rep <= me.rep - 3 && c.rep >= me.rep - 30);
    const out = []; while (out.length < 3 && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    return out;
  }
  function takeJob(career, clubId) {
    const old = career.me; career.me = clubId; career.sacked = false; career.board = { confidence: DATA.board.start, warned: false }; career.fans = DATA.fans.start;
    if (!career.voluntary) career.manager.sackings++; career.voluntary = false; career.manager.clubs.push({ id: clubId, name: clubName(career, clubId), from: career.season });
    career.brief = brief(career, clubId);
    news(career, `${clubName(career, clubId)} appoint ${career.manager.name}, formerly of ${clubName(career, old)}.`, 'board');
    mail(career, 'board', 'The Chairman', `Welcome to ${clubName(career, clubId)}. Our brief: ${career.brief.text.toLowerCase()}.`);
  }

  // ---------- club systems: facilities, stadium, roles, line-up, chemistry ----------
  function startFacilities(c) { const l = clamp(Math.round(c.rep / 12), 1, 9); return { training: l, youth: clamp(l - 1 + (hash(c.id) % 3), 1, 9), scouting: clamp(l - 1, 1, 9), medical: clamp(l, 1, 9) }; }
  function facilityCost(career, key) { const lvl = career.facilities[key], tier = WORLD.divisions[myDiv(career)].tier; return lvl >= 10 ? null : Math.round(DATA.facilityCost.base * (lvl + 1) * (lvl + 1) * DATA.facilityCost.tierMul[tier]); }
  function upgradeFacility(career, key) {
    const cost = facilityCost(career, key); if (cost == null || career.balances[career.me] < cost) return false;
    career.balances[career.me] -= cost; career.facilities[key]++;
    news(career, `${DATA.facilities[key].name} upgraded to level ${career.facilities[key]}.`, 'board'); return true;
  }
  function expansionInfo(career) {
    const c = career.clubs.find(k => k.id === career.me), tier = WORLD.divisions[c.div].tier, E = DATA.expansion;
    const seats = Math.max(E.minSeats, Math.round(c.capacity * E.share / 500) * 500);
    return { seats, cost: Math.round(seats * E.costPerSeat[tier]), weeks: E.weeks, from: c.capacity, to: c.capacity + seats, building: career.build };
  }
  function startExpansion(career) {
    const e = expansionInfo(career); if (career.build || career.balances[career.me] < e.cost) return false;
    career.balances[career.me] -= e.cost; career.build = { seats: e.seats, ready: career.week + e.weeks, started: career.week };
    news(career, `Work begins on ${e.seats.toLocaleString()} new seats.`, 'board'); return true;
  }
  function basePrice(career) { return F.ticket[WORLD.divisions[myDiv(career)].tier]; }
  function attendance(career) {
    const c = career.clubs.find(k => k.id === career.me), base = basePrice(career), price = career.ticket || base;
    const demand = .72 + c.rep / 400 + (career.fans - 60) / 400;
    return clamp(demand * (1 - .45 * (price / base - 1)), .25, 1);
  }
  function stadiumRating(career) { const c = career.clubs.find(k => k.id === career.me), f = career.facilities; return Math.round(clamp(1 + c.capacity / 20000 + (f.training + f.medical + f.youth) / 12, 1, 5) * 2) / 2; }
  function repTier(rep) { return DATA.reputation.find(([min]) => rep >= min)[1]; }
  function autoRoles(career) {
    const sq = squadOf(career, career.me).sort((a, b) => b.rating - a.rating);
    const cap = sq.filter(p => p.age >= 26)[0] || sq[0]; career.captain = cap && cap.id;
    const shooter = sq.filter(p => p.grp !== 'GK').sort((a, b) => b.attr.shooting - a.attr.shooting)[0], passer = sq.filter(p => p.grp !== 'GK').sort((a, b) => b.attr.passing - a.attr.passing)[0];
    career.setp = { pens: shooter && shooter.id, fk: passer && passer.id, corners: passer && passer.id };
  }
  // my XI: the saved line-up where it is still valid, auto-picked otherwise
  function myXI(career) {
    const sq = squadOf(career, career.me), f = career.tactics[career.me].formation, auto = pickXI(sq, f);
    if (!career.lineup || career.lineup.f !== f) return auto;
    const byId = new Map(sq.map(p => [p.id, p])), used = new Set(), xi = [];
    for (const id of career.lineup.ids) { const p = byId.get(id); if (p && !p.injured && !used.has(id)) { xi.push(p); used.add(id); } else xi.push(null); }
    for (let i = 0; i < xi.length; i++) if (!xi[i]) { const g = auto.xi[i] ? auto.xi[i].grp : 'MF'; const r = sq.filter(p => !p.injured && !used.has(p.id)).sort((a, b) => (b.grp === g) - (a.grp === g) || b.rating - a.rating)[0]; if (r) { xi[i] = r; used.add(r.id); } }
    const bench = sq.filter(p => !p.injured && !used.has(p.id)).sort((a, b) => b.rating - a.rating).slice(0, DATA.season.subsOnBench);
    return { xi: xi.filter(Boolean), bench };
  }
  function swapIntoXI(career, outId, inId) {
    const cur = myXI(career).xi.map(p => p.id), i = cur.indexOf(outId); if (i < 0) return false;
    const j = cur.indexOf(inId); if (j >= 0) cur[j] = outId; cur[i] = inId;
    career.lineup = { f: career.tactics[career.me].formation, ids: cur }; return true;
  }
  function chemistry(career) {
    const xi = myXI(career).xi; if (!xi.length) return 50;
    const morale = xi.reduce((s, p) => s + p.morale, 0) / xi.length, fam = career.fam[career.tactics[career.me].formation] || .5;
    const fit = xi.filter((p, i) => { const f = DATA.formations[career.tactics[career.me].formation], slots = ['GK'].concat(Array(f.DF).fill('DF'), Array(f.MF).fill('MF'), Array(f.FW).fill('FW')); return p.grp === slots[i]; }).length / xi.length;
    return clamp(Math.round(20 + morale * .35 + fam * 25 + fit * 25), 0, 99);
  }
  function applyPreset(career, key) {
    const P = DATA.presets[key]; if (!P) return; const t = career.tactics[career.me];
    t.mentality = P.mentality; t.style = P.style; career.instr = { press: P.press, line: P.line, pass: P.pass, toggles: Object.assign({}, P.toggles) }; career.preset = key;
  }
  function youthIntake(career, rng) {
    const c = career.clubs.find(k => k.id === career.me), lvl = career.facilities.youth, div = WORLD.divisions[c.div];
    const band = div.band || [62, 72], n = 2 + Math.floor(lvl / 3), out = [];
    for (let i = 0; i < n; i++) {
      const g = rng.pick(['DF', 'MF', 'MF', 'FW', 'FW', 'GK']), pos = rng.pick(DATA.gen.detailByGroup[g]), age = rng.int(16, 17);
      const r = clamp(Math.round(band[0] - 6 + lvl + rng.int(-3, 3)), 42, 75), pot = clamp(r + 10 + lvl * 2 + rng.int(0, 10), r + 5, 94);
      const p = makePlayer(c.id, { name: genName(c.country, rng), pos, age, rating: r, pot, nat: c.country }, career.nextId++, { gen: true, youth: true });
      career.players.push(p); out.push(p.id);
    }
    mail(career, 'youth', 'Academy Director', `Youth intake day: ${n} academy graduates join the squad. Have a look in Club › Youth.`);
    return out;
  }
  function boostMatch(career) { if (career.boost || career.coins < DATA.coins.boostCost) return false; career.coins -= DATA.coins.boostCost; career.boost = true; return true; }

  // ---------- achievements ----------
  function achievements(career, ctx) {
    const got = [], A = DATA.achievements, me = career.clubs.find(c => c.id === career.me), m = ctx && ctx.match, s = ctx && ctx.season;
    const us = m ? (m.h === career.me ? m.gH : m.gA) : 0, them = m ? (m.h === career.me ? m.gA : m.gH) : 0;
    const test = {
      first_win: () => career.manager.w >= 1,
      derby_win: () => career.stats.derbyWins >= 1,
      thrash: () => m && us - them >= 5,
      comeback: () => m && us > them && m.events.some(e => e.type === 'goal' && e.side !== (m.h === career.me ? 'H' : 'A') && e.min < 60) && m.events.filter(e => e.type === 'goal').slice(0, 2).every(e => e.side !== (m.h === career.me ? 'H' : 'A')),
      unbeaten10: () => career.stats.bestUnbeaten >= 10,
      legend1: () => career.stats.legendsSigned >= 1,
      legend5: () => career.stats.legendsSigned >= 5,
      champions: () => s && s.myPos === 1,
      promoted: () => s && s.promoted.includes(career.me),
      nonleague_up: () => s && s.promoted.includes(career.me) && WORLD.divisions[s.myDiv].tier === 5,
      top_flight_title: () => s && s.myPos === 1 && WORLD.divisions[s.myDiv].tier === 1,
      survive: () => s && s.myDiv && WORLD.divisions[s.myDiv].tier === 1 && career.history.length && s.myPos <= 17 && s.brief === 'Avoid relegation',
      games100: () => career.manager.games >= 100,
      board_love: () => career.board.confidence >= 95,
      fans_love: () => career.fans >= 95,
    };
    for (const a of A) if (test[a.id] && test[a.id]()) got.push(a.id);
    void me; return got;
  }

  return { grpOf, wage, value, pickXI, strength, makeAttr, rebuild, createMatch, stepMatch, finishMatch, shout, setTactic, makeSub, playMatch, fixtures, table, position,
    teamFor, squadOf, squadStrength, difficulty, brief, previewBrief, weekFinance, newCareer, startWeek, finishWeek, playWeek, endSeason, myFixture, seasonLength,
    freeAgents, canSign, sign, release, jobOffers, takeJob, myDiv, hash, pressFor, applyPress, achievements, clubName,
    facilityCost, upgradeFacility, expansionInfo, startExpansion, basePrice, attendance, stadiumRating, repTier, autoRoles, myXI, swapIntoXI, chemistry, applyPreset, boostMatch, mail,
    HK, makePlayer, news, fillSquad, genName, weightedPick, clamp, settle, matchSeed, afterMyMatch, rates, strength };
})();
if (typeof module !== 'undefined') module.exports = Sim;
