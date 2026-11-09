// Career depth: condition + match sharpness, weekly training (focus, intensity) and individual training,
// in-season development, happiness and player talks, transfer requests, reserves, staff (hire / fire, real
// effects), loans out and in, story events with decisions, board meetings and requests, club history and
// records, youth intake day, rival managers (sackings, moves) and job offers, sponsors, merchandise, prize
// money, debt with points deductions, weather and referees. Chained onto the Sim.HK hooks.
'use strict';
(() => {
  const S = Sim, HK = S.HK, D = DATA, clamp = S.clamp;
  const squad = c => S.squadOf(c, c.me), me = c => c.clubs.find(k => k.id === c.me);
  const byId = (c, id) => c.players.find(p => p.id === id);
  const rngW = (c, salt) => new RNG((c.seed ^ c.season * 7919 ^ c.week * 104729 ^ S.hash(salt)) >>> 0);
  const tier = c => WORLD.divisions[me(c).div].tier;

  Object.assign(D, {
    training: {
      focus: { balanced: ['Balanced', {}], attacking: ['Attacking', { c: .02 }], defending: ['Defending', { x: -.02 }], fitness: ['Fitness', { rec: 6 }], setpieces: ['Set Pieces', { sp: 1.15 }], tactics: ['Tactics', { fam: .04 }], youth: ['Youth Focus', { young: 1.5 }] },
      intensity: [['Light', 36, .001, .7], ['Normal', 30, .002, 1], ['Heavy', 22, .006, 1.4]],   // label, fitness recovery, injury risk/player, growth factor
      individual: ['pace', 'passing', 'shooting', 'dribbling', 'heading', 'tackling', 'positioning', 'vision', 'stamina', 'handling', 'reflexes'],
    },
    staffRoles: { assistant: ['Assistant Manager', 'clipboard'], coach: ['First-Team Coach', 'dumbbell'], gk: ['Goalkeeping Coach', 'user'], scout: ['Chief Scout', 'binoculars'], physio: ['Head Physio', 'medical'] },
    expectShare: { 'Star Player': .85, 'Key Player': .75, 'First Team': .6, Rotation: .4, Backup: .2, 'Hot Prospect': .25, Youngster: .1 },
    weathers: [['Clear', '☀️', {}], ['Cloudy', '⛅', {}], ['Rain', '🌧️', { create: .96 }], ['Heavy rain', '⛈️', { create: .92, concede: 1.03 }], ['Windy', '💨', { create: .95 }], ['Snow', '❄️', { create: .9 }]],
    sponsorNames: ['Apex Energy', 'Northgate Bank', 'Volt Mobile', 'Harbour Air', 'Crestline Motors', 'Bluepeak Insurance', 'Ironbridge Beer', 'Solace Hotels', 'Kestrel Logistics', 'Orbit Bet', 'Meridian Tech', 'Redline Tyres'],
    prize: { 1: [40000, 1500], 2: [8000, 300], 3: [2500, 80], 4: [1200, 40], 5: [500, 15] },   // [champion, per place] £k
  });

  // ---------- staff ----------
  const NAMES2 = () => NAMES.ENG || NAMES.ABROAD;
  function staffMember(rng, role, t) { const lo = [0, 12, 9, 7, 5, 3][t], r = clamp(lo + rng.int(-2, 6), 1, 20); return { role, name: rng.pick(NAMES2().first) + ' ' + rng.pick(NAMES2().last), r, wage: Math.max(1, Math.round(r * r / [0, 12, 40, 90, 150, 250][t])), age: rng.int(34, 66) }; }
  function staffPool(c) { const rng = rngW(c, 'staffpool'), t = tier(c), out = []; for (const role of Object.keys(D.staffRoles)) for (let i = 0; i < 4; i++) { const s = staffMember(rng, role, t); s.r = clamp(s.r + (i - 1) * 2, 1, 20); s.wage = Math.max(1, Math.round(s.r * s.r / [0, 12, 40, 90, 150, 250][t])); out.push(s); } return out; }
  const staffR = (c, role) => (c.staff && c.staff[role] ? c.staff[role].r : 8);
  function hireStaff(c, s) { const cur = c.staff[s.role], comp = cur ? cur.wage * 10 : 0; if (c.balances[c.me] < comp + s.wage * 4) return { ok: false, why: 'Not enough money for the compensation.' };
    c.balances[c.me] -= comp; c.staff[s.role] = { role: s.role, name: s.name, r: s.r, wage: s.wage, age: s.age }; S.news(c, `${s.name} joins as ${D.staffRoles[s.role][0]}.`, 'board'); return { ok: true }; }
  function fireStaff(c, role) { const cur = c.staff[role]; if (!cur) return false; c.balances[c.me] -= cur.wage * 10; c.staff[role] = null; S.news(c, `${cur.name} leaves the club.`, 'board'); return true; }
  const staffWages = c => Object.values(c.staff || {}).reduce((s, x) => s + (x ? x.wage : 0), 0);

  // ---------- training and development (weekly) ----------
  function trainingWeek(c, played) {
    const T = c.training, I = D.training.intensity[T.intensity], F = D.training.focus[T.focus][1], rng = rngW(c, 'train');
    const coach = staffR(c, 'coach'), gkc = staffR(c, 'gk'), physio = staffR(c, 'physio'), fac = c.facilities.training;
    for (const p of squad(c)) {
      // condition already recovers +30 in finishWeek; adjust to the intensity and focus
      p.fitness = clamp(p.fitness + (I[1] - 30) + (F.rec || 0), 30, 100);
      // match sharpness
      const pl = played.has(p.id); p.sharp = clamp((p.sharp == null ? 70 : p.sharp) + (pl ? 12 : p.res ? 5 : -4), 20, 100);
      // training injuries
      if (!p.injured && rng.chance(I[2] * (1.2 - physio / 25))) { p.injured = rng.int(1, 3); S.mail(c, 'injury', 'Head Physio', `${p.name} picked up a knock in training and will miss ${p.injured} week${p.injured > 1 ? 's' : ''}.`); }
      // development: young players with room to grow, faster with good coaching, facilities, minutes and focus
      if (p.pot > p.rating) {
        const young = p.age <= 21 ? 1.6 : p.age <= 24 ? 1 : p.age <= 28 ? .35 : .1;
        let rate = .045 * young * I[3] * (.7 + coach / 30) * (.75 + fac / 20) * (pl ? 1.25 : p.res ? 1.05 : .8) * (F.young && p.age <= 21 ? F.young : 1) * (p.grp === 'GK' ? (.7 + gkc / 30) : 1);
        p.dv = (p.dv || 0) + rate;
        if (p.dv >= 1) { p.dv -= 1; p.rating++; p.attr = S.makeAttr(p); p.up = c.season * 100 + c.week; }
      }
      // individual training: a chosen attribute climbs
      if (p.it) { p.itp = (p.itp || 0) + .12 * I[3] * (.7 + coach / 30) * (p.age <= 24 ? 1.3 : p.age <= 30 ? 1 : .5);
        if (p.itp >= 1) { p.itp -= 1; p.ib = p.ib || {}; if ((p.ib[p.it] || 0) < 10) { p.ib[p.it] = (p.ib[p.it] || 0) + 1; p.attr = S.makeAttr(p); p.up = c.season * 100 + c.week; } } }
      // older players fade slowly in-season
      if (p.age >= 32 && rng.chance(.012)) { p.rating = Math.max(35, p.rating - 1); p.attr = S.makeAttr(p); }
    }
    if (F.fam) { const t = S.tac(c); c.fam[t.shape] = Math.min(1, (c.fam[t.shape] || .5) + F.fam); }
  }

  // ---------- happiness, requests, promises ----------
  function happinessWeek(c, played, myMatch) {
    for (const p of squad(c)) {
      if (myMatch) { p.lap = (p.lap || []).concat(played.has(p.id) ? 1 : 0).slice(-10); }
      const share = p.lap && p.lap.length >= 3 ? p.lap.reduce((s, v) => s + v, 0) / p.lap.length : null;
      const st = S.statusOf(c, p), want = D.expectShare[st] == null ? .5 : D.expectShare[st];
      let target = 70 + (share == null ? 0 : (share - want) * 60) + (p.morale - 70) * .2;
      if (S.yearsLeft(c, p) <= 0 && c.week > 20) target -= 10;
      if (p.res && p.age >= 23) target -= 15;
      if (p.promise) { if (c.week >= p.promise.until) { const ok = share != null && share >= p.promise.share; S.mail(c, 'talk', p.name, ok ? 'Thanks boss, you kept your word about my playing time.' : 'You promised me more football. I don\'t trust you any more.'); p.happy = clamp((p.happy || 70) + (ok ? 12 : -25), 0, 100); p.promise = null; } else target += 8; }
      p.happy = Math.round(clamp((p.happy == null ? 70 : p.happy) + (target - (p.happy == null ? 70 : p.happy)) * .2, 0, 100));
      if (p.happy < 30) { p.unh = (p.unh || 0) + 1; if (p.unh === 3 && !p.req) { p.req = true; p.listed = true; S.mail(c, 'request', p.name, `I want to leave. I've handed in a transfer request. Status: ${st}, playing time well below what I expect.`); S.news(c, `${p.name} hands in a transfer request.`, 'transfer'); } }
      else p.unh = 0;
      if (p.happy < 45) p.morale = clamp(p.morale - 1.5, 20, 100);
    }
  }
  // talks: praise, criticise, promise time, discuss future, tell him he can leave
  function talk(c, pid, kind) {
    const p = byId(c, pid); if (!p) return null;
    if (p.talkWk != null && c.season * 100 + c.week - p.talkWk < 3) return { ok: false, text: `${G.surname(p.name)} doesn't want another chat so soon.` };
    p.talkWk = c.season * 100 + c.week; const avg = p.rn ? p.rs / p.rn : 6.7, pers = S.profile(c, p).personality, tough = /Determined|Resolute|Model|Driven|Professional/.test(pers);
    let d = 0, text = '';
    if (kind === 'praise') { if (avg >= 7) { d = 8; text = 'He appreciates it. Confidence up.'; } else { d = -2; text = 'He looks puzzled; his form hasn\'t been great.'; } p.morale = clamp(p.morale + Math.max(0, d), 20, 100); }
    if (kind === 'criticise') { if (avg < 6.6) { d = tough ? 4 : -6; text = tough ? 'He accepts it and promises to work harder.' : 'He takes it badly.'; p.morale = clamp(p.morale + (tough ? 6 : -6), 20, 100); } else { d = -10; text = 'He thinks the criticism is unfair.'; } }
    if (kind === 'promise') { const st = S.statusOf(c, p), want = (D.expectShare[st] || .5) + .15; p.promise = { until: Math.min(S.seasonLength(c) - 1, c.week + 8), share: Math.min(.95, want) }; d = 10; text = 'He is delighted. Make sure he gets those minutes in the next 8 weeks.'; }
    if (kind === 'future') { if (S.yearsLeft(c, p) <= 1) { d = 4; text = 'He wants a new contract. Offer one from his profile.'; } else if (p.req) { d = 3; text = 'He still wants to leave, but respects that you listened.'; } else { d = 3; text = 'He is happy with his situation.'; } }
    if (kind === 'leave') { d = -20; p.listed = true; text = 'He is shocked. He has been placed on the transfer list.'; }
    p.happy = clamp((p.happy == null ? 70 : p.happy) + d, 0, 100); if (p.happy >= 45 && p.req && kind !== 'leave') { p.req = false; text += ' He withdraws his transfer request.'; }
    return { ok: true, text, d };
  }

  // ---------- reserves and loans ----------
  function setReserve(c, pid, on) { const p = byId(c, pid); if (p && p.club === c.me) p.res = on; }
  function loanOffers(c, pid) {
    const p = byId(c, pid), rng = rngW(c, 'loan' + pid), myT = tier(c);
    return c.clubs.filter(k => k.id !== c.me && WORLD.divisions[k.div].tier >= myT && WORLD.divisions[k.div].tier <= myT + 2 && S.squadOf(c, k.id).length < D.season.squadMax)
      .sort((a, b) => b.rep - a.rep).filter((k, i) => i % 3 === rng.int(0, 2)).slice(0, 4).map(k => ({ club: k.id, share: rng.pick([50, 75, 100]), time: rng.pick(['Starter', 'Rotation', 'Backup']) }));
  }
  function loanOut(c, pid, offer) { const p = byId(c, pid); if (!p || p.club !== c.me) return false; if (squad(c).length <= D.season.squadMin) return false;
    p.loan = { from: c.me, to: offer.club, share: offer.share, time: offer.time }; p.club = offer.club; S.news(c, `${p.name} joins ${S.clubName(c, offer.club)} on loan until the end of the season.`, 'transfer');
    c.transfers.unshift({ season: c.season, week: c.week, pid, name: p.name, to: offer.club, fee: 0, dir: 'loan out' }); return true; }
  function loanIn(c, pid) {
    const p = byId(c, pid); if (!p || !p.club || p.club === c.me) return { ok: false, why: 'Not available.' };
    if (!S.inWindow(c)) return { ok: false, why: 'Loans need the transfer window to be open.' };
    const st = S.statusOf(c, p), from = c.clubs.find(k => k.id === p.club);
    if (['Star Player', 'Key Player'].includes(st)) return { ok: false, why: `${from.name} won't loan out a key player.` };
    if (squad(c).length >= D.season.squadMax) return { ok: false, why: 'Your squad is full.' };
    if (S.wageBill(c) + p.wage > c.budget.wage) return { ok: false, why: 'His wages would break your wage budget.' };
    p.loan = { from: p.club, to: c.me }; p.club = c.me; p.num = 0; S.assignNumbers(c); S.news(c, `${p.name} joins ${me(c).name} on loan from ${from.name}.`, 'transfer');
    c.transfers.unshift({ season: c.season, week: c.week, pid, name: p.name, from: from.id, fee: 0, dir: 'loan in' }); return { ok: true };
  }
  function endLoans(c) { for (const p of c.players) if (p.loan) { p.club = p.loan.from; p.loan = null; if (p.club === c.me) { p.num = 0; } } S.assignNumbers(c); }

  // ---------- story events ----------
  function makeEvent(c, rng) {
    const sq = squad(c), mc = me(c), pool = [];
    const star = sq.slice().sort((a, b) => b.rating - a.rating)[0];
    if (star && S.yearsLeft(c, star) <= 1) pool.push({ kind: 'contract', title: 'Contract stand-off', text: `${star.name}'s agent says his client wants a new deal now, or he'll stop talking about the future.`, options: [{ label: 'Open talks (go to his contract)', go: 'contract:' + star.id, happy: [star.id, 6] }, { label: 'Tell the agent to wait', happy: [star.id, -12], morale: [star.id, -5] }] });
    const nx = S.nextMatch(c); if (nx && (nx.home ? nx.a : nx.h) === mc.rival) { const rv = c.clubs.find(k => k.id === mc.rival); pool.push({ kind: 'rival', title: 'Mind games', text: `${rv.manager || 'Their manager'} says ${mc.short.replace(/\d/g, '')} "have no chance" in the derby.`, options: [{ label: 'Fire back in the press', team: 4, fans: 3, board: -1 }, { label: 'Stay classy, no comment', board: 2 }, { label: 'Use it to fire up the squad', team: 6 }] }); }
    if (c.ticket && c.ticket > S.basePrice(c) * 1.25) pool.push({ kind: 'fans', title: 'Fan protest', text: 'Supporters groups are protesting about ticket prices outside the stadium.', options: [{ label: 'Cut prices back to normal', ticket: 'reset', fans: 8 }, { label: 'Hold firm', fans: -8, money: 0 }] });
    const young = sq.filter(p => p.age <= 20 && p.pot >= p.rating + 8).sort((a, b) => b.pot - a.pot)[0];
    if (young) pool.push({ kind: 'youth', title: 'Wonderkid\'s agent', text: `The agent of ${young.name} (${young.age}) wants a promise of first-team football, or other clubs will circle.`, options: [{ label: 'Promise minutes', talk: [young.id, 'promise'] }, { label: 'He must earn it', happy: [young.id, -8] }] });
    const unhappy = sq.filter(p => p.happy < 40)[0];
    if (unhappy) pool.push({ kind: 'unrest', title: 'Dressing room whispers', text: `Players say ${unhappy.name} is unsettled and it's affecting the group.`, options: [{ label: 'Talk to him privately', talk: [unhappy.id, 'future'] }, { label: 'Transfer list him', list: unhappy.id, team: 2 }, { label: 'Ignore it', team: -3 }] });
    const any = rng.pick(sq.filter(p => p.rating >= 70) || sq);
    if (any) pool.push({ kind: 'rumour', title: 'Transfer rumour', text: `Papers claim a bigger club is lining up a bid for ${any.name}. He's been asked about it.`, options: [{ label: '"He is going nowhere"', happy: [any.id, 5], board: 1 }, { label: '"Every player has a price"', happy: [any.id, -6], money: 0, list: null }] });
    pool.push({ kind: 'friendly', title: 'Lucrative friendly', text: 'A tour promoter offers a mid-season friendly abroad. Big money, but the players will be tired.', options: [{ label: 'Accept (£' + Math.round(200 * Math.max(1, 6 - tier(c)) ** 2) + 'K)', money: Math.round(200 * Math.max(1, 6 - tier(c)) ** 2), tire: 12 }, { label: 'Decline', team: 2 }] });
    pool.push({ kind: 'charity', title: 'Community day', text: 'The club foundation asks for players to visit the local children\'s hospital.', options: [{ label: 'Send the whole squad', fans: 6, team: 2, tire: 3 }, { label: 'Send a few youngsters', fans: 3 }] });
    if (any) pool.push({ kind: 'incident', title: 'Off-field headlines', text: `${any.name} was photographed at a nightclub two days before the match.`, options: [{ label: 'Fine him two weeks\' wages', money: any.wage * 2, happy: [any.id, -10], board: 2 }, { label: 'Warn him privately', happy: [any.id, -2] }, { label: 'Let it go', team: -2, board: -2 }] });
    return pool.length ? rng.pick(pool) : null;
  }
  function applyEvent(c, ev, opt) {
    const msg = [];
    if (opt.team) { for (const p of squad(c)) p.morale = clamp(p.morale + opt.team, 20, 100); msg.push(`Team morale ${opt.team > 0 ? '+' : ''}${opt.team}`); }
    if (opt.fans) { c.fans = clamp(c.fans + opt.fans, 0, 100); msg.push(`Fans ${opt.fans > 0 ? '+' : ''}${opt.fans}`); }
    if (opt.board) { c.board.confidence = clamp(c.board.confidence + opt.board, 0, 100); msg.push(`Board ${opt.board > 0 ? '+' : ''}${opt.board}`); }
    if (opt.money) { c.balances[c.me] += opt.money; msg.push(`+${S.feeLabel(opt.money)}`); }
    if (opt.tire) for (const p of squad(c)) p.fitness = clamp(p.fitness - opt.tire, 30, 100);
    if (opt.happy) { const p = byId(c, opt.happy[0]); if (p) p.happy = clamp((p.happy || 70) + opt.happy[1], 0, 100); }
    if (opt.morale) { const p = byId(c, opt.morale[0]); if (p) p.morale = clamp(p.morale + opt.morale[1], 20, 100); }
    if (opt.list) S.listPlayer(c, opt.list, true);
    if (opt.ticket === 'reset') c.ticket = null;
    if (opt.talk) { const r = talk(Object.assign(c), opt.talk[0], opt.talk[1]); if (r) msg.push(r.text); }
    c.events = (c.events || []).filter(e => e !== ev);
    return msg.join(' · ');
  }

  // ---------- board meetings ----------
  const REQ = { transfer: 'Increase the transfer budget', wage: 'Increase the wage budget', facility: 'Fund a facility upgrade', time: 'Ask for more time', youth: 'Invest in youth recruitment' };
  function boardRequest(c, key) {
    const last = (c.boardAsk || {})[key]; if (last != null && c.season * 100 + c.week - last < 6) return { ok: false, text: 'The board discussed that recently. Ask again in a few weeks.' };
    c.boardAsk = c.boardAsk || {}; c.boardAsk[key] = c.season * 100 + c.week;
    const conf = c.board.confidence, rich = c.balances[c.me] > 0, rng = rngW(c, 'board' + key), yes = rng.chance(clamp((conf - 35) / 50, .05, .9)) && rich;
    if (!yes) { c.board.confidence = clamp(conf - 2, 0, 100); return { ok: false, text: conf < 45 ? 'The board refuse. Results first.' : 'The board decline for now.' }; }
    if (key === 'transfer') { const add = Math.round(c.budget.transfer * .25 / 50) * 50 + 250; c.budget.transfer += add; return { ok: true, text: `Approved: +${S.feeLabel(add)} for transfers.` }; }
    if (key === 'wage') { const add = Math.round(c.budget.wage * .1); c.budget.wage += add; return { ok: true, text: `Approved: wage budget +£${add}K a week.` }; }
    if (key === 'facility') { const keys = Object.keys(c.facilities).sort((a, b) => c.facilities[a] - c.facilities[b]), k = keys[0]; if (c.facilities[k] >= 10) return { ok: false, text: 'Facilities are already top class.' }; c.facilities[k]++; return { ok: true, text: `Approved: ${D.facilities[k].name} upgraded to level ${c.facilities[k]}.` }; }
    if (key === 'time') { if (c.timeGiven === c.season) return { ok: false, text: 'You already had your extra time this season.' }; c.timeGiven = c.season; c.board.confidence = clamp(conf + 12, 0, 100); return { ok: true, text: 'The board will give you more time. Confidence +12.' }; }
    if (key === 'youth') { c.academy = Math.min(3, (c.academy || 1) + 1); return { ok: true, text: `Approved: youth recruitment widened to ${['', 'Local', 'National', 'International'][c.academy]}.` }; }
  }

  // ---------- records and history ----------
  function record(c, key, value, label) { c.records = c.records || {}; const r = c.records[key]; if (!r || value > r.v) { const first = !r; c.records[key] = { v: value, label, season: c.season }; if (!first) { c.recordFlash = (c.recordFlash || []).concat(`New club record: ${label}`); } } }
  function afterMatchRecords(c, m) {
    if (!m) return; const home = m.h === c.me, us = home ? m.gH : m.gA, them = home ? m.gA : m.gH, opp = S.clubName(c, home ? m.a : m.h);
    if (us > them) record(c, 'bigWin', (us - them) * 100 + us, `${us}-${them} vs ${opp}`);
    if (them > us) record(c, 'bigLoss', (them - us) * 100 + them, `${us}-${them} vs ${opp}`);
    for (const id in m.ratings) { const p = byId(c, +id); if (p && p.club === c.me) { p.ca = (p.ca || 0) + 1; } }
    for (const e of m.events || []) if (e.type === 'goal' && e.side === (home ? 'H' : 'A')) { const p = byId(c, e.pid); if (p) { p.cg = (p.cg || 0) + 1; record(c, 'topScorer', p.cg, `${p.name}, ${p.cg} goals`); } }
  }
  function hallOfFame(c) { return c.players.filter(p => (p.ca || 0) >= 60 || (p.cg || 0) >= 25).sort((a, b) => (b.cg || 0) * 2 + (b.ca || 0) - (a.cg || 0) * 2 - (a.ca || 0)); }

  // ---------- rival managers and job offers ----------
  function managersWeek(c, rng) {
    if (![19, 30].includes(c.week)) return;
    for (const d of Object.values(WORLD.divisions)) { const t = S.table(c, d.id); if (!t.length || t[0].p < 10) continue;
      t.slice(-3).forEach(r => { const k = c.clubs.find(x => x.id === r.id); if (k.id === c.me || !rng.chance(.35)) return;
        const old = k.manager || 'The manager'; k.manager = rng.pick(NAMES2().first) + ' ' + rng.pick(NAMES2().last);
        S.news(c, `${k.name} sack ${old}. ${k.manager} takes over.`, 'board');
        const myRep = mgrRep(c); if (k.rep > me(c).rep + 2 && k.rep <= myRep + 8 && !c.jobOffer) { c.jobOffer = { club: k.id, week: c.week }; S.mail(c, 'job', k.name, `${k.name} have approached you about their vacant manager's job. Respond from the Office.`); } }); }
  }
  function mgrRep(c) { const m = c.manager, wr = m.games ? m.w / m.games : .35; return Math.round(clamp(40 + m.trophies.length * 6 + wr * 40 + Math.min(20, m.games / 10) + me(c).rep * .2, 20, 99)); }
  function acceptJob(c) { const o = c.jobOffer; if (!o) return false; c.voluntary = true; S.takeJob(c, o.club); c.jobOffer = null; setBudgets2(c); S.assignNumbers(c); for (const t of c.tac.slots) { t.ids = null; t.bench = null; } return true; }
  function setBudgets2(c) { S.setBudgets(c); }

  // ---------- money ----------
  function sponsorOffers(c) { const rng = rngW(c, 'spons' + c.season), t = tier(c), base = [0, 250, 45, 15, 7, 3][t] * Math.pow(me(c).rep / 70, 3);
    return [0, 1, 2].map(i => ({ name: D.sponsorNames[(rng.int(0, 99) + i * 4) % D.sponsorNames.length], weekly: Math.round(base * (1.15 - i * .15)), bonus: Math.round(base * 12 * (i * .6 + .4)), target: i === 0 ? 'none' : i === 1 ? 'Meet the board brief' : 'Finish in the top half' })); }
  function moneyWeek(c) {
    const mc = me(c), merch = Math.round(c.fans * mc.rep / 120 * [0, 4, 1, .35, .15, .07][tier(c)]);
    c.balances[c.me] += merch + (c.sponsor ? c.sponsor.weekly : 0) - staffWages(c); c.lastIncome = { merch, sponsor: c.sponsor ? c.sponsor.weekly : 0, staff: staffWages(c) };
    if (c.balances[c.me] < 0) { c.debtWeeks = (c.debtWeeks || 0) + 1; if (c.debtWeeks === 4) S.mail(c, 'warning', 'The Chairman', 'We are in debt. If this continues the league will punish us.');
      if (c.debtWeeks === 10) { c.deduct = c.deduct || {}; c.deduct[c.me] = (c.deduct[c.me] || 0) + 6; S.news(c, `${mc.name} are deducted 6 points for breaching financial rules.`, 'board'); S.mail(c, 'warning', 'League Office', 'You have been deducted 6 points for persistent debt.'); c.debtWeeks = 0; } }
    else c.debtWeeks = 0;
  }

  // ---------- weather and referees ----------
  function matchInfo(c, h, a) {
    const r = new RNG((S.matchSeed(c, h, a) ^ 0x9e3779b9) >>> 0), wk = c.week, winter = wk >= 14 && wk <= 28;
    const w = r.pick(winter ? D.weathers.slice(1) : D.weathers.slice(0, 5)), ref = r.pick(['Michael Oliver', 'Anthony Taylor', 'Simon Hooper', 'Chris Kavanagh', 'Robert Jones', 'Jarred Gillett', 'Paul Tierney', 'Sam Barrott', 'Andy Madley', 'Darren England', 'Tim Robinson', 'Craig Pawson']);
    const strict = r.pick([['Lenient', .75], ['Average', 1], ['Average', 1], ['Strict', 1.3]]);
    return { weather: w[0], icon: w[1], wmod: w[2], ref, strict: strict[0], refMul: strict[1] };
  }

  // ---------- hooks ----------
  const prevWeek = HK.week;
  HK.week = (c, mine) => {
    prevWeek && prevWeek(c, mine);
    if (!c.training) return;
    const played = new Set(mine ? Object.keys(mine.ratings || {}).map(Number) : []);
    trainingWeek(c, played); happinessWeek(c, played, !!mine); moneyWeek(c); if (mine) afterMatchRecords(c, mine);
    const rng = rngW(c, 'events');
    managersWeek(c, rng);
    if (rng.chance(.3) && !(c.events || []).length && c.week > 1) { const ev = makeEvent(c, rng); if (ev) { c.events = [ev]; } }
  };
  const prevNC = HK.newCareer;
  HK.newCareer = (c, rng) => {
    prevNC && prevNC(c, rng);
    initCareerDepth(c, rng);
  };
  function initCareerDepth(c, rng) {
    c.training = { focus: 'balanced', intensity: 1 };
    const t = tier(c); c.staff = {}; for (const role of Object.keys(D.staffRoles)) c.staff[role] = staffMember(rng, role, t);
    c.events = []; c.records = {}; c.academy = 1; c.sponsor = null; c.deduct = {}; c.debtWeeks = 0;
    for (const p of c.players) { if (p.club === c.me) { p.happy = 70; p.sharp = 75; } }
  }
  // saves made before staff wages were rescaled
  HK.fixStaff = c => { for (const s2 of Object.values(c.staff || {})) if (s2) s2.wage = Math.max(1, Math.round(s2.r * s2.r / [0, 12, 40, 90, 150, 250][tier(c)])); };
  const prevContracts = HK.contracts;
  HK.contracts = (c, rng) => { endLoans(c); prevContracts && prevContracts(c, rng); };
  const prevNS = HK.newSeason;
  HK.newSeason = (c, summary, rng) => {
    prevNS && prevNS(c, summary, rng);
    // prize money by final position (all clubs), sponsor bonus
    for (const [divId, ids] of Object.entries(summary.tables || {})) { const t = WORLD.divisions[divId].tier, [champ, per] = D.prize[t]; ids.forEach((id, i) => { c.balances[id] += Math.round(champ * (1 - i / ids.length) * .5 + per * (ids.length - i)); }); }
    const myI = summary.tables[summary.myDiv] ? summary.tables[summary.myDiv].indexOf(c.me) : -1;
    summary.prize = myI >= 0 ? Math.round(D.prize[WORLD.divisions[summary.myDiv].tier][0] * (1 - myI / summary.tables[summary.myDiv].length) * .5 + D.prize[WORLD.divisions[summary.myDiv].tier][1] * (summary.tables[summary.myDiv].length - myI)) : 0;
    if (c.sponsor && ((c.sponsor.target === 'none') || (c.sponsor.target === 'Meet the board brief' && summary.beat) || (c.sponsor.target === 'Finish in the top half' && myI >= 0 && myI < summary.tables[summary.myDiv].length / 2))) { c.balances[c.me] += c.sponsor.bonus; summary.sponsorBonus = c.sponsor.bonus; }
    c.sponsor = null; c.boardAsk = {}; c.deduct = {};
    c.records = c.records || {}; record(c, 'bestFinish', 100 - summary.myPos + (5 - WORLD.divisions[summary.myDiv].tier) * 100, `${summary.myPos}${['th', 'st', 'nd', 'rd'][summary.myPos] || 'th'} in ${WORLD.divisions[summary.myDiv].name}`);
    summary.mgrRep = mgrRep(c);
    for (const p of squad(c)) { p.lap = []; p.promise = null; p.unh = 0; if (p.happy == null) p.happy = 70; p.sharp = 60; }
    // youth intake: wider recruitment = higher ceilings; graduates start in the reserves
    for (const id of summary.intake || []) { const p = byId(c, id); if (!p) continue; p.pot = Math.min(95, p.pot + ((c.academy || 1) - 1) * 3); if ((c.academy || 1) >= 3 && rng.chance(.4)) p.nat = rng.pick(['BRA', 'ARG', 'FRA', 'ESP', 'POR', 'NED', 'GER']); p.res = true; p.happy = 75; }
    summary.wonderkid = (summary.intake || []).map(id => byId(c, id)).filter(p => p && p.pot >= 85).length;
  };
  const prevRebuild = HK.rebuild;
  HK.rebuild = c => { prevRebuild && prevRebuild(c); if (!c.training) initCareerDepth(c, new RNG(c.seed ^ 77)); };
  HK.rebuildTac = c => { if (!c.tac) { const base = c.tactics[c.me], shape = D.shapes[base.formation] ? base.formation : '4-2-3-1'; c.tac = { slot: 0, slots: [S.newTactic('Plan A', shape, base.mentality), S.newTactic('Plan B', '4-4-2', 'balanced'), S.newTactic('Protect lead', '5-4-1', 'defensive')] }; } };
  // youth intake: academy recruitment widens the potential spread; graduates start in the reserves
  // set pieces training bonus + weather + referee per match
  const prevMinute = HK.minute;
  HK.minute = (m, out) => {
    if (!m.wset) { m.wset = true; const info = m.info || (() => { const r = m.rng; const w = r.pick(D.weathers.slice(0, 5)); return { weather: w[0], wmod: w[2], refMul: r.pick([.75, 1, 1, 1.3]) }; })();
      m.weather = info.weather; m.refMul = info.refMul; if (info.wmod && (info.wmod.create || info.wmod.concede)) for (const s of ['H', 'A']) m.mods[s].push(Object.assign({ until: 999 }, info.wmod)); }
    prevMinute && prevMinute(m, out);
  };
  // training focus effects on my team's tactic modifiers
  const prevTeam = HK.team;
  HK.team = (c, t, mine) => { prevTeam && prevTeam(c, t, mine); if (!mine || !c.training || !t.tm) return; const F = D.training.focus[c.training.focus][1]; if (F.c) t.tm.c += F.c; if (F.x) t.tm.x += F.x; t.assistant = staffR(c, 'assistant'); };

  Object.assign(Sim, { staffPool, hireStaff, fireStaff, staffWages, staffR, talk, setReserve, loanOffers, loanOut, loanIn, makeEvent, applyEvent, boardRequest, REQ, hallOfFame, mgrRep, acceptJob, sponsorOffers, matchInfo });
})();
