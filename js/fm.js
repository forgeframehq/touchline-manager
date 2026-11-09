// Football Manager depth on top of the engine (js/sim.js hooks):
// 1–20 attributes, player profiles, the position grid with roles and duties, team / opposition instructions,
// set pieces, cards and assists, contracts and squad status, budgets, transfers (bids, terms, AI market,
// windows and deadline day, scouting), and the FA Cup + League Cup.
'use strict';
(() => {
  const S = Sim, HK = S.HK, clamp = S.clamp, D = DATA, GR = D.grid;
  const hash = S.hash, squadOf = S.squadOf;
  const byId = (career, id) => career.players.find(p => p.id === id);
  const club = (career, id) => career.clubs.find(c => c.id === id);
  const me = career => club(career, career.me);

  // ================= players: 1–20 attributes and profile =================
  const memo = new Map();
  function prng(p, salt) { return new RNG((Math.imul(p.id, 2246822519) ^ hash(p.name + salt)) >>> 0); }
  function to20(v) { return clamp(Math.round((v - 18) / 4.1), 1, 20); }
  function fmAttrs(p) {
    const k = p.id + ':' + p.rating + ':' + p.pos; if (memo.has(k)) return memo.get(k);
    const r = prng(p, 'fm'), A = p.attr, out = {};
    const groups = p.grp === 'GK' ? ['goalkeeping', 'mental', 'physical'] : ['technical', 'mental', 'physical'];
    for (const g of groups) { out[g] = {};
      for (const [name, keys] of Object.entries(D.fmAttr[g])) {
        let v = keys.reduce((s, x) => s + (A[x] || 50), 0) / keys.length + r.int(-7, 7);
        if (name === 'Determination' || name === 'Leadership') v = 45 + r.int(0, 45) + (p.age > 28 ? 6 : 0);
        if (name === 'Natural Fitness' && p.age > 31) v -= 8;
        out[g][name] = to20(v);
      } }
    memo.set(k, out); return out;
  }
  function profile(career, p) {
    const r = prng(p, 'meta'), f = r.next();
    const foot = f < .68 ? 'Right' : f < .92 ? 'Left' : 'Either';
    const pers = p.persona || D.personalities[r.int(0, D.personalities.length - 1)];
    const alt = (D.grid.fits && Object.entries(D.grid.fits).filter(([code, list]) => list[0] === p.pos).map(([code]) => code)) || [];
    return { foot, personality: pers, natural: alt, status: statusOf(career, p), years: p.club ? yearsLeft(career, p) : 0,
      avg: p.rn ? Math.round(p.rs / p.rn * 100) / 100 : null, form: p.form || [], value: S.value(p), known: knows(career, p) };
  }
  // squad status: chosen (contract) or by rank in the squad
  function statusOf(career, p) {
    if (p.status) return p.status; if (!p.club) return p.legend ? 'Star Player' : 'First Team';
    const sq = squadOf(career, p.club).slice().sort((a, b) => b.rating - a.rating || a.id - b.id), i = sq.indexOf(p);
    if (p.age <= 20 && p.pot - p.rating >= 8) return 'Hot Prospect';
    if (p.age <= 19) return 'Youngster';
    return i < 2 ? (p.rating >= 80 ? 'Star Player' : 'Key Player') : i < 6 ? 'Key Player' : i < 12 ? 'First Team' : i < 18 ? 'Rotation' : 'Backup';
  }
  const yearsLeft = (career, p) => Math.max(0, (p.con || career.season + 1) - career.season);
  const contractEnd = (career, p) => `30/6/${p.con || career.season + 1}`;

  // ================= my tactics: grid slots, roles, duties, instructions =================
  function defaultInstr(group) { const o = {}; for (const [k, v] of Object.entries(D.instr[group])) o[k] = v.def; return o; }
  function newTactic(name, shape, mentality) {
    const pos = D.shapes[shape].map(x => x.slice());
    return { name, shape, pos, roles: pos.map(([r, c]) => defaultRole(GR.code(r, c))), mentality: mentality || 'balanced',
      ip: defaultInstr('inPossession'), op: defaultInstr('outPossession'), tr: defaultInstr('transition'), opp: {}, sp: Object.fromEntries(Object.entries(D.setPiece).map(([k, v]) => [k, v.def])), ids: null };
  }
  const rolesFor = code => D.roles[D.roleAlias[code] || code] || D.roles.MC;
  function defaultRole(code) { const r = rolesFor(code)[0]; return [r[0], r[2].includes('S') ? 'S' : r[2][0]]; }
  function roleDef(code, key) { return rolesFor(code).find(r => r[0] === key) || rolesFor(code)[0]; }
  function tac(career) { return career.tac.slots[career.tac.slot]; }
  function slotCodes(t) { return t.pos.map(([r, c]) => GR.code(r, c)); }
  function syncTactics(career) {   // keep the engine's simple tactic record in step with the full one
    const t = tac(career), base = career.tactics[career.me];
    base.formation = D.formations[t.shape] && sameShape(t) ? t.shape : nearestShape(t); base.mentality = t.mentality;
    base.style = t.ip.passing === 0 ? 'possession' : t.tr.won === 2 ? 'counter' : t.ip.passing === 2 ? 'direct' : base.style;
  }
  function sameShape(t) { const a = D.shapes[t.shape]; return a && a.every((x, i) => x[0] === t.pos[i][0] && x[1] === t.pos[i][1]); }
  function nearestShape(t) { const n = { DF: 0, MF: 0, FW: 0 }; slotCodes(t).forEach(c => { const g = GR.grp[c]; if (g !== 'GK') n[g]++; });
    return Object.keys(D.formations).find(k => D.formations[k].DF === n.DF && D.formations[k].MF === n.MF && D.formations[k].FW === n.FW) || t.shape; }
  // how well a player suits a grid position (1 natural … .55 out of position)
  function posFit(p, code) { const f = GR.fits[code] || []; const i = f.indexOf(p.pos); if (i === 0) return 1; if (i > 0) return i === 1 ? .93 : .86; return S.grpOf(p.pos) === GR.grp[code] ? .8 : (p.pos === 'GK' || code === 'GK') ? .3 : .6; }
  function roleStars(p, code, roleKey) {
    const R = roleDef(code, roleKey), keys = R[3], v = keys.reduce((s, k) => s + (p.attr[k] || 50), 0) / keys.length;
    return clamp(Math.round(((v * posFit(p, code)) - 45) / 9 * 2) / 2, .5, 5);
  }
  // my XI from the current tactic: saved ids where still valid, best fits otherwise
  function myXI(career) {
    const t = tac(career), codes = slotCodes(t), sq = squadOf(career, career.me), ok = p => !p.injured && !p.ban;
    const used = new Set(), xi = new Array(11).fill(null), byIdm = new Map(sq.map(p => [p.id, p]));
    if (t.ids) t.ids.forEach((id, i) => { const p = byIdm.get(id); if (p && ok(p) && !used.has(id)) { xi[i] = p; used.add(id); } });
    const order = codes.map((c, i) => i).sort((a, b) => (codes[a] === 'GK' ? -1 : 0) - (codes[b] === 'GK' ? -1 : 0));
    for (const i of order) if (!xi[i]) { const best = sq.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => b.rating * posFit(b, codes[i]) - a.rating * posFit(a, codes[i]) || a.id - b.id)[0]; if (best) { xi[i] = best; used.add(best.id); } }
    t.ids = xi.map(p => p && p.id);
    const bench = sq.filter(p => ok(p) && !used.has(p.id)).sort((a, b) => b.rating - a.rating).slice(0, D.season.subsOnBench);
    return { xi: xi.filter(Boolean), bench, codes };
  }
  function swapIntoXI(career, outId, inId) {
    const t = tac(career); myXI(career); const i = t.ids.indexOf(outId); if (i < 0) return false;
    const j = t.ids.indexOf(inId); if (j >= 0) t.ids[j] = outId; t.ids[i] = inId; return true;
  }
  // chemistry: morale, familiarity with the shape, players in natural positions, roles that suit them
  function chemistry(career) {
    const { xi, codes } = myXI(career), t = tac(career); if (!xi.length) return 50;
    const morale = xi.reduce((s, p) => s + p.morale, 0) / xi.length, fam = career.fam[t.shape] || .5;
    const fit = t.ids.reduce((s, id, i) => { const p = xi.find(q => q.id === id); return s + (p ? posFit(p, codes[i]) : 0); }, 0) / 11;
    const roleFit = t.ids.reduce((s, id, i) => { const p = xi.find(q => q.id === id); return s + (p ? roleStars(p, codes[i], t.roles[i][0]) : 0); }, 0) / 55;
    return clamp(Math.round(10 + morale * .3 + fam * 20 + fit * 25 + roleFit * 20), 0, 99);
  }
  // effects of the whole tactic on the engine
  function add(a, e, w) { for (const k in e) a[k] = (a[k] || 0) + e[k] * (w == null ? 1 : w); }
  function tmods(career) {
    const t = tac(career), m = { c: 0, x: 0, o: 0, t: 0, k: 0, cards: 0 }, codes = slotCodes(t), { xi } = myXI(career);
    t.roles.forEach(([rk, du], i) => { const R = roleDef(codes[i], rk); add(m, R[4], .6); const d = D.duty[du] || D.duty.S; m.c += d.c * .25; m.x += d.x * .25;
      const p = t.ids && xi.find(q => q.id === t.ids[i]); if (p) { const s = roleStars(p, codes[i], rk); m.c += (s - 3) * .006; m.x -= (s - 3) * .005; } });
    for (const g of ['ip', 'op', 'tr']) { const grp = D.instr[g === 'ip' ? 'inPossession' : g === 'op' ? 'outPossession' : 'transition'];
      for (const [k, v] of Object.entries(t[g])) { const o = grp[k] && grp[k].opts[v]; if (o) add(m, o[1]); } }
    m.c = clamp(m.c, -.25, .3); m.x = clamp(m.x, -.25, .3); m.o = clamp(m.o, -.2, .15); return m;
  }

  // ================= engine hooks =================
  HK.myXI = career => { syncTactics(career); const r = myXI(career); return { xi: r.xi, bench: r.bench }; };
  HK.team = (career, t, mine) => {
    if (!mine) return;
    t.tm = tmods(career); t.chem = chemistry(career); const T = tac(career);
    t.sp = T.sp; t.oppI = T.opp; t.oppMarks = T.opp;   // my instructions on opposition players, keyed by their player id
    t.tactics = Object.assign({}, career.tactics[career.me]);
  };
  // set pieces and cards, minute by minute
  HK.minute = (m, out) => {
    const rng = m.rng;
    for (const side of ['H', 'A']) {
      const t = m[side], o = m[side === 'H' ? 'A' : 'H'];
      // set piece chance
      if (rng.chance(.034)) {
        const corner = rng.chance(.6), routine = t.sp ? (corner ? D.setPiece.corners.opts[t.sp.corners] : D.setPiece.freekicks.opts[t.sp.freekicks]) : 'Mixed';
        const def = o.sp ? D.setPiece.defCorners.opts[o.sp.defCorners] : 'Mixed';
        const field = t.xi.filter(p => p.grp !== 'GK'); if (!field.length) continue;
        let scorer, p = .036;
        if (!corner && routine === 'Shoot') { scorer = field.slice().sort((a, b) => b.attr.shooting - a.attr.shooting)[0]; p = .05 * Math.pow(scorer.attr.shooting / 80, 2); }
        else { scorer = rng.pick(field.slice().sort((a, b) => b.attr.heading - a.attr.heading).slice(0, 4)); p *= Math.pow(scorer.attr.heading / 75, 2) * (routine === 'Short' ? .7 : routine === 'Near post' || routine === 'Far post' ? 1.12 : 1) * (def === 'Man-marking' ? .95 : def === 'Zonal' && routine === 'Near post' ? .9 : 1); }
        m.shots[side]++; if (m.stats[scorer.id]) m.stats[scorer.id].sh++;
        if (rng.chance(p)) { if (side === 'H') m.gH++; else m.gA++; if (m.stats[scorer.id]) m.stats[scorer.id].g++; scorer.goals++; scorer.seasonGoals++;
          const taker = field.slice().sort((a, b) => b.attr.passing - a.attr.passing)[0];
          out.push({ min: m.min, type: 'goal', side, who: scorer.name, pid: scorer.id, assist: corner && taker !== scorer ? taker.name : null, aid: corner && taker !== scorer ? taker.id : null, score: m.gH + '-' + m.gA, sp: corner ? 'corner' : 'free kick' }); }
        else if (rng.chance(.25)) out.push({ min: m.min, type: 'chance', side, who: scorer.name, sp: corner ? 'corner' : 'free kick' });
      }
      // cards
      const cardMul = 1 + (t.tm ? t.tm.cards : 0) + ((t.oppMarks && Object.values(t.oppMarks).some(v => v.includes('hard'))) ? .3 : 0);
      if (rng.chance(.021 * cardMul)) {
        const pool = t.xi.filter(p => p.grp !== 'GK'); if (!pool.length) continue;
        const p = rng.pick(pool.concat(pool.filter(q => q.grp === 'DF' || q.pos === 'CDM')));
        m.cards = m.cards || {}; m.cards[p.id] = (m.cards[p.id] || 0) + 1;
        if (m.cards[p.id] >= 2 || rng.chance(.025)) {
          t.xi = t.xi.filter(q => q !== p); m.mods[side].push({ until: 999, create: .84, concede: 1.18 }); m.dirty = true; p.ban = 1; m.reds = m.reds || {}; m.reds[p.id] = 1;
          out.push({ min: m.min, type: 'red', side, who: p.name, pid: p.id });
        } else out.push({ min: m.min, type: 'yellow', side, who: p.name, pid: p.id });
      }
    }
  };
  HK.afterMatch = (m, ratings) => {
    for (const e of m.events) if (e.type === 'goal' && e.aid) { const pl = m.H.squad && m.H.squad.concat(m.A.squad || []).find(q => q.id === e.aid); if (pl) pl.ast = (pl.ast || 0) + 1; }
    const all = (m.H.squad || m.H.xi).concat(m.A.squad || m.A.xi);
    if (m.cards) for (const id in m.cards) { const p = all.find(q => q.id === +id); if (p) p.yc = (p.yc || 0) + 1; }
    for (const id in ratings) { const p = all.find(q => q.id === +id); if (!p) continue; p.rs = Math.round(((p.rs || 0) + ratings[id]) * 10) / 10; p.rn = (p.rn || 0) + 1; p.form = (p.form || []).concat(ratings[id]).slice(-5); }
  };

  // ================= contracts, status, budgets =================
  function setBudgets(career) {
    const wages = squadOf(career, career.me).reduce((s, p) => s + p.wage, 0), bal = career.balances[career.me];
    career.budget = { transfer: Math.max(0, Math.round(bal * D.transfer.budgetShare / 50) * 50), wage: Math.round(wages * D.transfer.wageHeadroom) };
  }
  const wageBill = career => squadOf(career, career.me).reduce((s, p) => s + p.wage, 0);
  function wageDemand(career, p, toClub) {
    const from = p.club ? club(career, p.club).rep : 60, to = club(career, toClub || career.me).rep;
    const base = Math.max(p.wage, S.wage(p)) * D.transfer.wageDemand * (1 + D.transfer.repPull * Math.max(0, from - to)) * (p.legend ? 1.1 : 1);
    return Math.max(1, Math.round(base));
  }
  // the status a player expects in my squad (by where his rating ranks)
  function expectedStatus(career, p) {
    if (p.age <= 20 && p.pot - p.rating >= 8) return 'Hot Prospect';
    const better = squadOf(career, career.me).filter(q => q.id !== p.id && q.rating > p.rating).length;
    return better < 2 ? (p.rating >= 80 ? 'Star Player' : 'Key Player') : better < 6 ? 'Key Player' : better < 12 ? 'First Team' : better < 18 ? 'Rotation' : 'Backup';
  }
  // offer a contract (renewal or new signing). status: one of DATA.squadStatus
  function contractVerdict(career, p, wage, years, status) {
    const demand = wageDemand(career, p), si = D.squadStatus.indexOf(status), want = D.squadStatus.indexOf(expectedStatus(career, p));
    const statusPenalty = si > want && want >= 0 ? (si - want) * .07 : -(Math.max(0, want - si)) * .03;
    const need = demand * (1 + statusPenalty) * (years >= 4 && p.age >= 31 ? .95 : 1);
    if (p.age >= 33 && years > 2) return { ok: false, why: `At ${p.age} he only wants up to 2 years.`, need: Math.round(need) };
    if (wage >= need) return { ok: true, need: Math.round(need) };
    return { ok: false, why: wage >= need * .9 ? 'Close. His agent wants a little more.' : 'His agent says the offer is too low.', need: Math.round(need) };
  }
  function offerContract(career, pid, wage, years, status) {
    const p = byId(career, pid); if (!p || p.club !== career.me) return { ok: false, why: 'Not your player.' };
    const delta = wage - p.wage; if (wageBill(career) + delta > career.budget.wage && delta > 0) return { ok: false, why: 'That would break your wage budget.' };
    const v = contractVerdict(career, p, wage, years, status); if (!v.ok) return v;
    p.wage = wage; p.con = career.season + years; p.status = status; p.morale = clamp(p.morale + 8, 0, 100);
    S.news(career, `${p.name} signs a new ${years}-year contract.`, 'transfer'); return { ok: true };
  }
  HK.contracts = (career, rng) => {    // end of season: contracts expire
    for (const p of career.players) {
      if (!p.club || (p.con || 0) > career.season) continue;
      if (p.club === career.me) { S.news(career, `${p.name}'s contract has expired. He leaves on a free.`, 'transfer'); S.mail(career, 'transfer', 'Director of Football', `${p.name} has left the club as his contract expired.`); p.club = null; p.status = null; p.listed = false; continue; }
      if (rng.chance(.86) && p.age < 34) p.con = career.season + 1 + rng.int(1, 3); else { p.club = null; p.status = null; }
    }
    for (const p of career.players) if (!p.club) { p.con = null; p.status = null; }
  };

  // ================= scouting =================
  function knows(career, p) {
    if (!p.club || p.club === career.me || p.legend) return true;
    if (club(career, p.club).div === me(career).div) return true;
    const s = career.scouted[p.id]; return s != null && s <= career.week + career.season * 100;
  }
  function scout(career, pid) {
    const lvl = career.facilities.scouting, wait = lvl >= 9 ? 0 : lvl >= 6 ? 1 : 2;
    career.scouted[pid] = career.season * 100 + career.week + wait; return wait;
  }

  // ================= transfers =================
  const inWindow = career => D.transfer.windows.some(([a, b]) => career.week >= a && career.week <= b);
  const deadlineDay = career => D.transfer.windows.some(([a, b]) => career.week === b);
  const nextWindow = career => { const w = D.transfer.windows.find(([a]) => a > career.week); return w ? w[0] : null; };
  function asking(career, p) {
    if (!p.club) return 0;
    const st = p.listed ? 'listed' : statusOf(career, p), y = Math.min(5, yearsLeft(career, p));
    const sel = club(career, p.club), rich = 1 + Math.max(0, sel.rep - me(career).rep) * .006;
    return Math.max(25, Math.round(S.value(p) * 1000 * (D.transfer.askMul[st] || 1) * D.transfer.contractMul[y] * rich / 25) * 25);
  }
  // returns { verdict: 'accept'|'counter'|'reject', fee, why }
  function bid(career, pid, fee) {
    const p = byId(career, pid); if (!p || !p.club || p.club === career.me) return { verdict: 'reject', why: 'Not available.' };
    if (!inWindow(career)) return { verdict: 'reject', why: `The transfer window is closed. It opens in week ${nextWindow(career) + 1}.` };
    if (fee > career.budget.transfer) return { verdict: 'reject', why: 'That is more than your transfer budget.' };
    const n = career.neg[pid] = career.neg[pid] || { tries: 0 }; n.tries++;
    if (n.tries > 3 && !n.fee) return { verdict: 'reject', why: `${S.clubName(career, p.club)} are tired of your bids and have ended talks.` };
    const ask = asking(career, p), st = statusOf(career, p), sel = club(career, p.club), rng = new RNG((career.seed ^ pid * 31 ^ career.week * 977 ^ n.tries) >>> 0);
    if ((st === 'Star Player' || st === 'Key Player') && sel.rep >= me(career).rep + 8 && fee < ask * 1.5) return { verdict: 'reject', why: `${sel.name} will not sell a key player to a smaller club.` };
    if (squadOf(career, p.club).length <= 18) return { verdict: 'reject', why: `${sel.name} cannot spare any more players.` };
    const want = ask * (.95 + rng.next() * .1);
    if (fee >= want) { n.fee = fee; return { verdict: 'accept', fee }; }
    if (fee >= ask * .78) { const c = Math.round((want + fee) / 2 / 25) * 25; n.counter = c; return { verdict: 'counter', fee: Math.max(c, fee + 25), why: `${sel.name} want ${feeLabel(Math.max(c, fee + 25))}.` }; }
    return { verdict: 'reject', why: `${sel.name} reject the bid. They value him at around ${feeLabel(Math.round(ask / 100) * 100)}.` };
  }
  const feeLabel = k => k >= 1000 ? '£' + (k / 1000).toFixed(k >= 10000 ? 0 : 1) + 'M' : '£' + k + 'K';
  function willJoin(career, p) {
    const from = p.club ? club(career, p.club).rep : (p.legend ? p.rating - 5 : 55), to = me(career).rep;
    if (p.legend && to < p.rating - D.legends.repGap) return { ok: false, why: `He wants a bigger club (reputation ${p.rating - D.legends.repGap}+).` };
    if (from - to > 22 && p.rating >= 78) return { ok: false, why: `He is not interested in joining a club of your stature.` };
    return { ok: true };
  }
  // complete a move to my club after the fee (or free) and terms are agreed
  function signPlayer(career, pid, fee, wage, years, status) {
    const p = byId(career, pid); if (!p) return { ok: false, why: 'Gone.' };
    if (squadOf(career, career.me).length >= D.season.squadMax) return { ok: false, why: `Your squad is full (${D.season.squadMax}).` };
    const j = willJoin(career, p); if (!j.ok) return j;
    if (wageBill(career) + wage > career.budget.wage) return { ok: false, why: `That breaks your wage budget (${feeLabel(career.budget.wage - wageBill(career))}/wk left).` };
    const v = contractVerdict(career, p, wage, years, status); if (!v.ok) return v;
    if (p.club) { const ask = career.neg[pid] && career.neg[pid].fee; if (!ask || fee < ask) return { ok: false, why: 'No fee agreed with his club.' };
      career.balances[p.club] += fee; career.balances[career.me] -= fee; career.budget.transfer -= fee;
      S.news(career, `${p.name} joins ${me(career).name} from ${S.clubName(career, p.club)} for ${feeLabel(fee)}.`, 'transfer'); }
    else S.news(career, `${p.name} signs for ${me(career).name} on a free transfer.`, 'transfer');
    if (p.legend) { career.stats.legendsSigned++; career.fans = clamp(career.fans + D.fans.legendSigned, 0, 100); }
    p.club = career.me; p.wage = wage; p.con = career.season + years; p.status = status; p.morale = 85; p.listed = false;
    delete career.neg[pid]; career.shortlist = career.shortlist.filter(x => x !== pid);
    career.transfers.unshift({ season: career.season, week: career.week, pid, name: p.name, from: p.club, fee, dir: 'in' });
    return { ok: true };
  }
  // selling
  function listPlayer(career, pid, on) { const p = byId(career, pid); if (p && p.club === career.me) p.listed = on; }
  function acceptOffer(career, idx) {
    const o = career.offers[idx]; if (!o) return false; const p = byId(career, o.pid);
    if (!p || p.club !== career.me || squadOf(career, career.me).length <= D.season.squadMin) { career.offers.splice(idx, 1); return false; }
    career.balances[career.me] += o.fee; career.balances[o.club] -= o.fee; career.budget.transfer += Math.round(o.fee * .6);
    p.club = o.club; p.status = null; p.listed = false; p.con = career.season + 3;
    S.news(career, `${p.name} leaves for ${S.clubName(career, o.club)} for ${feeLabel(o.fee)}.`, 'transfer');
    career.transfers.unshift({ season: career.season, week: career.week, pid: p.id, name: p.name, to: o.club, fee: o.fee, dir: 'out' });
    career.offers = career.offers.filter(x => x.pid !== o.pid); return true;
  }
  function counterOffer(career, idx) {
    const o = career.offers[idx]; if (!o) return null; const p = byId(career, o.pid), max = S.value(p) * 1000 * 1.35;
    const want = Math.round(o.fee * 1.2 / 25) * 25, rng = new RNG((career.seed ^ o.pid ^ career.week * 13) >>> 0);
    if (want <= max && rng.chance(.6)) { o.fee = want; o.countered = true; return { ok: true, fee: want }; }
    career.offers.splice(idx, 1); return { ok: false };
  }
  function rejectOffer(career, idx) { career.offers.splice(idx, 1); }
  // weekly market: AI bids for my players, AI-to-AI deals, deadline day buzz
  HK.week = (career, mine) => {
    for (const p of career.players) if (p.ban) p.ban--;
    const rng = new RNG((career.seed ^ career.season * 7717 ^ career.week * 104723) >>> 0), T = D.transfer;
    // contract warnings
    const len = S.seasonLength(career);
    if (career.week === len - D.contract.renewWarnWeeks) { const ending = squadOf(career, career.me).filter(p => (p.con || 0) <= career.season);
      if (ending.length) S.mail(career, 'transfer', 'Director of Football', `${ending.length} contract${ending.length > 1 ? 's' : ''} end this summer: ${ending.slice(0, 5).map(p => p.name).join(', ')}${ending.length > 5 ? '…' : ''}. Offer new deals from their profiles or they will leave.`); }
    if (!inWindow(career)) { career.offers = []; return; }
    // offers for my players (listed ones often, stars occasionally)
    for (const p of squadOf(career, career.me)) {
      const chance = p.listed ? T.aiBidChance * (deadlineDay(career) ? 2 : 1) : (p.rating >= 78 ? T.unsolicitedChance : 0);
      if (!rng.chance(chance) || career.offers.some(o => o.pid === p.id)) continue;
      const buyers = career.clubs.filter(c => c.id !== career.me && c.rep >= me(career).rep - 15 && career.balances[c.id] > S.value(p) * 800 && squadOf(career, c.id).length < D.season.squadMax);
      if (!buyers.length) continue;
      const b = S.weightedPick(buyers, rng), fee = Math.round(S.value(p) * 1000 * (p.listed ? .75 + rng.next() * .3 : 1 + rng.next() * .4) / 25) * 25;
      career.offers.push({ pid: p.id, club: b.id, fee, week: career.week });
      S.mail(career, 'offer', 'Director of Football', `${b.name} have bid ${feeLabel(fee)} for ${p.name}. Respond in Market › Offers.`);
    }
    // AI to AI
    const deals = T.aiDealsPerWeek * (deadlineDay(career) ? 3 : 1);
    for (let i = 0; i < deals; i++) {
      const buyer = S.weightedPick(career.clubs.filter(c => c.id !== career.me), rng), bsq = squadOf(career, buyer.id);
      if (bsq.length >= D.season.squadMax) continue;
      const avg = bsq.map(p => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((s, v, k, a) => s + v / a.length, 0);
      const targets = career.players.filter(p => p.club && p.club !== buyer.id && p.club !== career.me && p.rating >= avg - 1 && p.rating <= avg + 5 && club(career, p.club).rep < buyer.rep && squadOf(career, p.club).length > 19);
      if (!targets.length) continue;
      const p = rng.pick(targets), fee = asking(career, p); if (career.balances[buyer.id] < fee) continue;
      career.balances[buyer.id] -= fee; career.balances[p.club] += fee;
      S.news(career, `${p.name} moves from ${S.clubName(career, p.club)} to ${buyer.name} for ${feeLabel(fee)}.`, 'transfer');
      career.transfers.unshift({ season: career.season, week: career.week, pid: p.id, name: p.name, from: p.club, to: buyer.id, fee, dir: 'ai' });
      p.club = buyer.id; p.status = null; p.con = career.season + rng.int(2, 5);
    }
    // free agents get picked up slowly
    for (const p of career.players) if (!p.club && !p.legend && rng.chance(.02)) { const c = rng.pick(career.clubs.filter(k => k.id !== career.me && squadOf(career, k.id).length < 25)); if (c) { p.club = c.id; p.con = career.season + 1; } }
    if (career.transfers.length > 120) career.transfers.length = 120;
  };
  function freeAgentPool(career, rng) {
    const tiers = [[42, 58], [52, 66], [60, 72], [66, 78], [72, 82]];
    for (let i = 0; i < D.transfer.freeAgentPool; i++) {
      const [lo, hi] = tiers[i % tiers.length], g = rng.pick(['GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW']), pos = rng.pick(D.gen.detailByGroup[g]), age = rng.int(20, 34);
      const abroad = rng.chance(.4), name = abroad ? rng.pick(NAMES.ABROAD.first) + ' ' + rng.pick(NAMES.ABROAD.last) : S.genName('ENG', rng);
      const p = S.makePlayer(null, { name, pos, age, rating: rng.int(lo, hi), pot: 0, nat: abroad ? '' : 'ENG' }, career.nextId++, { gen: true });
      career.players.push(p);
    }
  }
  function search(career, f) {
    const mineDiv = me(career).div;
    let list = career.players.filter(p => p.club !== career.me);
    if (f.grp && f.grp !== 'all') list = list.filter(p => p.grp === f.grp);
    if (f.scope === 'free') list = list.filter(p => !p.club);
    else if (f.scope === 'listed') list = list.filter(p => p.listed || (p.club && yearsLeft(career, p) <= 0));
    else if (f.scope === 'league') list = list.filter(p => p.club && club(career, p.club).div === mineDiv);
    else if (f.scope === 'legends') list = list.filter(p => p.legend);
    if (f.maxAge) list = list.filter(p => p.age <= f.maxAge);
    if (f.minRating) list = list.filter(p => p.rating >= f.minRating);
    if (f.maxFee) list = list.filter(p => asking(career, p) <= f.maxFee);
    const key = f.sort || 'rating';
    list.sort((a, b) => key === 'value' ? S.value(b) - S.value(a) : key === 'age' ? a.age - b.age || b.rating - a.rating : key === 'potential' ? b.pot - a.pot : b.rating - a.rating || a.id - b.id);
    return list;
  }

  // ================= cups =================
  function initCups(career) {
    career.cups = {};
    for (const [id, C] of Object.entries(D.cups)) {
      if (id === 'roundNames') continue;
      const teams = career.clubs.filter(c => WORLD.divisions[c.div].country === 'ENG' && C.tiers.includes(WORLD.divisions[c.div].tier));
      const byes = teams.slice().sort((a, b) => WORLD.divisions[a.div].tier - WORLD.divisions[b.div].tier || b.rep - a.rep).slice(0, C.byes).map(c => c.id);
      career.cups[id] = { id, name: C.name, round: 0, alive: teams.map(c => c.id), byes, results: [], winner: null, out: {} };
    }
  }
  function cupRoundName(cup) { const n = D.cups[cup.id].weeks.length; return D.cups.roundNames[D.cups.roundNames.length - (n - cup.round)] || 'Round ' + (cup.round + 1); }
  function cupTies(career, cup) {
    const rng = new RNG((career.seed ^ hash(cup.id) ^ career.season * 131 ^ cup.round * 7) >>> 0);
    let pool = cup.round === 0 ? cup.alive.filter(id => !cup.byes.includes(id)) : cup.alive.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const ties = []; for (let i = 0; i + 1 < pool.length; i += 2) ties.push([pool[i], pool[i + 1]]);
    return ties;
  }
  function cupDue(career) {
    if (!career.cups) return null;
    for (const cup of Object.values(career.cups)) { const wk = D.cups[cup.id].weeks[cup.round]; if (!cup.winner && wk != null && career.week >= wk && cup.playedWeek !== career.season * 100 + career.week) return cup; }
    return null;
  }
  function myCupTie(career) {
    const cup = cupDue(career); if (!cup || !cup.alive.includes(career.me) || (cup.round === 0 && cup.byes.includes(career.me))) return null;
    const t = cupTies(career, cup).find(([h, a]) => h === career.me || a === career.me); if (!t) return null;
    return { cup, h: t[0], a: t[1], home: t[0] === career.me, round: cupRoundName(cup), final: cup.round === D.cups[cup.id].weeks.length - 1 };
  }
  function resolveTie(career, cup, h, a, r) {
    let w = r.gH > r.gA ? h : r.gH < r.gA ? a : null, pens = null;
    if (!w) { const rng = new RNG((career.seed ^ hash(h + a) ^ career.week) >>> 0), sh = S.squadStrength(career, h), sa = S.squadStrength(career, a);
      const pH = rng.int(2, 5), pA = rng.int(2, 5); let x = pH, y = pA; if (x === y) { if (rng.chance(.5 + (sh - sa) / 100)) x++; else y++; } pens = [x, y]; w = x > y ? h : a; }
    const loser = w === h ? a : h; cup.out[loser] = cupRoundName(cup);
    cup.results.push({ round: cup.round, h, a, gH: r.gH, gA: r.gA, pens, w });
    career.balances[w] += D.cups[cup.id].prize[cup.round] || 0;
    return w;
  }
  function closeRound(career, cup, winners) {
    const byes = cup.round === 0 ? cup.byes : [];
    cup.alive = winners.concat(byes); cup.playedWeek = career.season * 100 + career.week;
    if (cup.alive.length === 1) { cup.winner = cup.alive[0];
      S.news(career, `${S.clubName(career, cup.winner)} win the ${cup.name}!`, 'board');
      if (cup.winner === career.me) career.manager.trophies.push({ season: career.season, label: cup.name, club: S.clubName(career, career.me), kind: 'cup', tier: 1 }); }
    cup.round++;
  }
  // play a due cup round; if mine is included and a live match is wanted, return it
  function startCup(career) {
    const cup = cupDue(career); if (!cup) return null; const winners = []; let live = null;
    for (const [h, a] of cupTies(career, cup)) {
      const seed = (S.matchSeed(career, h, a) ^ 0x5bd1e995) >>> 0, fin = cup.round === D.cups[cup.id].weeks.length - 1;
      if (h === career.me || a === career.me) { live = S.createMatch(S.teamFor(career, h), S.teamFor(career, a), seed, { neutral: fin }); Object.assign(live, { h, a, cup: cup.id, comp: cup.name + ' · ' + cupRoundName(cup) }); continue; }
      winners.push(resolveTie(career, cup, h, a, S.playMatch(S.teamFor(career, h), S.teamFor(career, a), seed, fin)));
    }
    cup.pendingWinners = winners;
    if (!live) closeRound(career, cup, winners);
    return live;
  }
  function finishCup(career, live) {
    const cup = career.cups[live.cup], r = S.finishMatch(live), w = resolveTie(career, cup, live.h, live.a, r);
    const res = cup.results[cup.results.length - 1];
    closeRound(career, cup, (cup.pendingWinners || []).concat(w)); cup.pendingWinners = null;
    for (const side of ['H', 'A']) for (const p of live[side].xi) p.fitness = Math.max(55, p.fitness);
    const us = live.h === career.me ? r.gH : r.gA, them = live.h === career.me ? r.gA : r.gH;
    career.coins += us > them || w === career.me ? D.coins.win : 0;
    const mg = career.manager; mg.games++; if (w === career.me) mg.w++; else mg.l++;
    if (w !== career.me) S.news(career, `${S.clubName(career, career.me)} are knocked out of the ${cup.name}.`, 'board');
    return Object.assign({ h: live.h, a: live.a, cup: live.cup, comp: live.comp, pens: res.pens, winner: w }, r);
  }
  HK.preWeek = (career, headless) => {
    let cup = cupDue(career), guard = 0;
    while (cup && guard++ < 4) {
      const mineIn = !!myCupTie(career);
      if (mineIn && !headless) return;      // the UI plays it live first
      const live = startCup(career); if (live) { live.H.ai = true; live.A.ai = true; finishCup(career, live); }
      cup = cupDue(career);
    }
  };
  function nextMatch(career) {
    const ct = myCupTie(career); if (ct) return Object.assign({ kind: 'cup', comp: ct.cup.name, compShort: D.cups[ct.cup.id].short }, ct);
    const fx = S.myFixture(career); return fx ? Object.assign({ kind: 'league', comp: WORLD.divisions[me(career).div].name }, fx) : null;
  }

  // ================= career hooks =================
  HK.newCareer = (career, rng) => {
    for (const p of career.players) if (p.club) p.con = career.season + 1 + Math.min(4, Math.max(0, Math.round((30 - p.age) / 3 + rng.int(-1, 1))));
    freeAgentPool(career, rng);
    const base = career.tactics[career.me], shape = D.shapes[base.formation] ? base.formation : '4-2-3-1';
    career.tac = { slot: 0, slots: [newTactic('Plan A', shape, base.mentality), newTactic('Plan B', '4-4-2', 'balanced'), newTactic('Protect lead', '5-4-1', 'defensive')] };
    career.scouted = {}; career.shortlist = []; career.offers = []; career.neg = {}; career.transfers = [];
    setBudgets(career); initCups(career);
  };
  HK.newSeason = (career, summary, rng) => {
    setBudgets(career); initCups(career); career.neg = {}; career.offers = [];
    for (const p of career.players) { p.ast = 0; p.yc = 0; p.rs = 0; p.rn = 0; p.ban = 0; }
    const top = career.players.filter(p => !p.club).length; if (top < 40) freeAgentPool(career, rng.fork('fa' + career.season));
    const cupWins = Object.values(career.cups).length; void cupWins;
  };
  HK.rebuild = career => { if (!career.tac) HK.newCareer(career, new RNG(career.seed)); };

  // ================= odds and dashboard helpers =================
  function odds(career, h, a) {
    const sh = S.squadStrength(career, h) + 1.5, sa = S.squadStrength(career, a), d = (sh - sa) / 6;
    const pH = clamp(.45 + d * .18, .08, .85), pA = clamp(.3 - d * .16, .06, .8), pD = Math.max(.12, 1 - pH - pA);
    const F = [[1, 5], [2, 9], [1, 4], [2, 7], [1, 3], [2, 5], [1, 2], [4, 7], [8, 13], [4, 6], [8, 11], [4, 5], [10, 11], [1, 1], [11, 10], [6, 5], [5, 4], [11, 8], [6, 4], [13, 8], [7, 4], [15, 8], [2, 1], [9, 4], [5, 2], [11, 4], [3, 1], [10, 3], [7, 2], [4, 1], [9, 2], [5, 1], [11, 2], [6, 1], [7, 1], [8, 1], [10, 1], [12, 1], [16, 1], [20, 1]];
    const frac = p => { const o = Math.max(.2, 1 / p - 1); let best = F[0]; for (const f of F) if (Math.abs(f[0] / f[1] - o) < Math.abs(best[0] / best[1] - o)) best = f; return best[0] + '-' + best[1]; };
    return { h: frac(pH), d: frac(pD), a: frac(pA), fav: pH >= pA ? h : a };
  }
  function finState(career) { const b = career.balances[career.me]; return b > 50000 ? 'Rich' : b > 15000 ? 'Secure' : b > 3000 ? 'Okay' : b > 0 ? 'Tight' : 'In debt'; }
  function leaders(career) {
    const sq = squadOf(career, career.me);
    const top = k => sq.slice().sort((a, b) => (b[k] || 0) - (a[k] || 0))[0];
    const rated = sq.filter(p => p.rn >= 3).sort((a, b) => b.rs / b.rn - a.rs / a.rn)[0];
    return { goals: top('seasonGoals'), assists: top('ast'), cards: top('yc'), rating: rated };
  }

  Object.assign(Sim, { chemistry, fmAttrs, profile, statusOf, yearsLeft, contractEnd, tac, newTactic, rolesFor, roleDef, slotCodes, posFit, roleStars, fmXI: myXI, swapIntoXI, tmods, syncTactics, defaultRole,
    setBudgets, wageBill, wageDemand, expectedStatus, contractVerdict, offerContract, knows, scout, inWindow, deadlineDay, nextWindow, asking, bid, feeLabel, willJoin, signPlayer,
    listPlayer, acceptOffer, counterOffer, rejectOffer, search, initCups, cupRoundName, cupDue, myCupTie, startCup, finishCup, nextMatch, odds, finState, leaders });
})();
