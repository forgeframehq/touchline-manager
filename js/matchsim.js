// Match detail layer: possession, passes, xG, corners, fouls, offsides, penalties, the woodwork, VAR checks,
// in-match injuries (forced substitutions), momentum, live ratings and the ball-by-ball "flow" that drives
// the 2D match view and the commentary. Runs after the engine's minute via the HK.minute hook chain.
'use strict';
(() => {
  const S = Sim, HK = S.HK, clamp = S.clamp;
  const blank = () => ({ poss: 0, shots: 0, on: 0, xg: 0, corners: 0, fouls: 0, off: 0, yc: 0, rc: 0, passes: 0, woodwork: 0 });
  const prev = HK.minute;
  HK.minute = (m, out) => {
    if (!m.st) { m.st = { H: blank(), A: blank() }; m.flow = []; m.mom = 0; m.kicks = 0; }
    prev && prev(m, out);
    const rng = m.rng, st = m.st;
    // possession this minute from midfield strength and how each side keeps the ball
    const kH = m.H.tm ? m.H.tm.k : 0, kA = m.A.tm ? m.A.tm.k : 0;
    const pH = clamp(.5 + (m.sH.mid - m.sA.mid) / 120 + (kH - kA) * 1.2 + (m.H.xi.length - m.A.xi.length) * .03, .25, .75);
    const side = rng.chance(pH) ? 'H' : 'A', o = side === 'H' ? 'A' : 'H';
    st.H.poss += pH; st.A.poss += 1 - pH;
    st.H.passes += Math.round(pH * rng.int(7, 13)); st.A.passes += Math.round((1 - pH) * rng.int(7, 13));
    // ball-by-ball flow for the animation and commentary (a few touches per minute)
    const t = m[side], field = t.xi.filter(p => p.grp !== 'GK');
    if (field.length) {
      let x = rng.next() * .35 + .1;
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        x = clamp(x + rng.next() * .3, .05, .9);
        const g = x < .35 ? 'DF' : x < .7 ? 'MF' : 'FW', pool = field.filter(p => p.grp === g), pl = rng.pick(pool.length ? pool : field);
        const kind = x > .72 ? rng.pick(['cross', 'dribble', 'through', 'pass', 'cutback']) : x > .4 ? rng.pick(['pass', 'pass', 'dribble', 'switch', 'through']) : rng.pick(['pass', 'pass', 'long', 'carry']);
        m.flow.push({ min: m.min, side, pid: pl.id, name: pl.name, kind, x, y: rng.next() * .8 + .1 });
      }
      if (rng.chance(.06)) { const d = m[o].xi.filter(p => p.grp !== 'GK'); if (d.length) { const tk = rng.pick(d); m.flow.push({ min: m.min, side: o, pid: tk.id, name: tk.name, kind: 'tackle', x: 1 - x, y: rng.next() * .8 + .1 }); } }
      if (m.flow.length > 40) m.flow.splice(0, m.flow.length - 40);
    }
    // fouls and offsides
    if (rng.chance(.12)) { st[o].fouls++; if (rng.chance(.12)) out.push({ min: m.min, type: 'foul', side: o, who: rng.pick(m[o].xi).name, on: field.length ? rng.pick(field).name : '' }); }
    if (rng.chance(.024)) { st[side].off++; out.push({ min: m.min, type: 'offside', side, who: (field.filter(p => p.grp === 'FW')[0] || field[0] || {}).name }); }
    // penalties
    if (rng.chance(.0026) && field.length) {
      const taker = (m[side].pens && m[side].xi.find(p => p.id === m[side].pens)) || field.slice().sort((a, b) => b.attr.shooting - a.attr.shooting)[0];
      const keeper = m[o].xi.find(p => p.grp === 'GK'), pGoal = clamp(.74 + (taker.attr.shooting - (keeper ? keeper.attr.reflexes : 60)) / 400, .55, .9);
      st[side].shots++; st[side].xg += .76; st[o].fouls++;
      out.push({ min: m.min, type: 'penalty', side, who: taker.name });
      if (rng.chance(pGoal)) { if (side === 'H') m.gH++; else m.gA++; st[side].on++; taker.goals++; taker.seasonGoals++; if (m.stats[taker.id]) m.stats[taker.id].g++;
        out.push({ min: m.min, type: 'goal', side, who: taker.name, pid: taker.id, pen: true, score: m.gH + '-' + m.gA, xg: .76 }); }
      else { const saved = rng.chance(.6); if (saved) st[side].on++; out.push({ min: m.min, type: 'penmiss', side, who: taker.name, keeper: keeper && keeper.name, saved }); }
    }
    // in-match injuries
    if (rng.chance(.0019)) {
      const s2 = rng.chance(.5) ? 'H' : 'A', team = m[s2], pool = team.xi.filter(p => p.grp !== 'GK' && !p.injured);
      if (pool.length) { const p = rng.pick(pool); p.injured = rng.int(1, 5); out.push({ min: m.min, type: 'injury', side: s2, who: p.name, pid: p.id, weeks: p.injured });
        if (team.ai || m.headless) { const inn = team.bench.find(b => b.grp === p.grp) || team.bench.find(b => b.grp !== 'GK'); if (inn && m.subs[s2] < D().season.subsAllowed) S.makeSub(m, s2, p.id, inn.id, true); else { team.xi = team.xi.filter(q => q !== p); m.mods[s2].push({ until: 999, create: .9, concede: 1.1 }); } }
        else m.forced = { side: s2, pid: p.id }; m.dirty = true; }
    }
    // decorate this minute's chances: xG, shot kind, woodwork; VAR on some goals; corners from blocked shots
    for (const e of out) {
      if (e.side == null) continue;
      if ((e.type === 'chance' || e.type === 'save') && !e.sp) {
        const x = .04 + rng.next() * .2; e.xg = Math.round(x * 100) / 100; st[e.side].xg += x; if (e.type === 'save') st[e.side].on++;
        if (e.type === 'chance') { const r = rng.next(); e.kind = r < .08 ? 'post' : r < .35 ? 'blocked' : r < .65 ? 'wide' : 'over'; if (e.kind === 'post') st[e.side].woodwork++; if (e.kind === 'blocked' && rng.chance(.6)) { st[e.side].corners++; e.corner = true; } }
        m.mom = clamp(m.mom + (e.side === 'H' ? .12 : -.12), -1, 1);
      }
      if (e.type === 'goal' && !e.pen && !e.var) {
        const x = e.sp ? .12 : .12 + rng.next() * .5; e.xg = Math.round(x * 100) / 100; st[e.side].xg += x; st[e.side].on++;
        m.mom = clamp(m.mom + (e.side === 'H' ? .35 : -.35), -1, 1);
        if (rng.chance(.11)) { e.var = 'check';
          if (rng.chance(.22)) { e.var = 'overturned'; if (e.side === 'H') m.gH--; else m.gA--; const sc = m[e.side].xi.concat(m[e.side].bench).find(p => p.id === e.pid) || m.H.squad && m.H.squad.concat(m.A.squad || []).find(p => p.id === e.pid);
            if (sc) { sc.goals--; sc.seasonGoals--; } if (m.stats[e.pid]) m.stats[e.pid].g--; e.type = 'disallowed'; e.score = m.gH + '-' + m.gA; } }
      }
      if (e.type === 'goal' || e.type === 'chance' || e.type === 'save') st[e.side].shots += 0;   // shots counted by the engine
      if (e.sp === 'corner') st[e.side].corners++;
      if (e.type === 'yellow') st[e.side].yc++; if (e.type === 'red') st[e.side].rc++;
    }
    st.H.shots = m.shots.H; st.A.shots = m.shots.A;
    m.mom *= .93;
  };
  const D = () => DATA;
  // live rating for any player in a match (no randomness, for the Ratings tab)
  function liveRating(m, p, side) {
    const s = m.stats[p.id]; if (!s) return null;
    const us = side === 'H' ? m.gH : m.gA, them = side === 'H' ? m.gA : m.gH;
    let r = 6.3 + s.g * 1.1 + s.sh * .1 + (us > them ? .3 : us < them ? -.25 : 0);
    if (p.grp === 'GK' || p.grp === 'DF') r += them === 0 ? .5 : -.25 * them;
    if (m.cards && m.cards[p.id]) r -= .3 * m.cards[p.id]; if (m.reds && m.reds[p.id]) r -= 1.5;
    return Math.round(clamp(r, 3, 10) * 10) / 10;
  }
  // whole match in one go (Quick sim) for my fixture or cup tie
  function quickSim(career) {
    const nx = S.nextMatch(career); if (!nx) return null;
    const live = nx.kind === 'cup' ? S.startCup(career) : S.startWeek(career); if (!live) return null;
    live.headless = true; for (const s of ['H', 'A']) live[s].ai = true;
    while (!live.done) S.stepMatch(live);
    return live;
  }
  Object.assign(Sim, { liveRating, quickSim });
})();
