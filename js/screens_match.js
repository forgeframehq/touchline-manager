// Match day: travel card, walk-out with line-ups and scout report, press conference, the live floodlit match
// (pause, tactics, substitutions, touchline shouts, half-time team talk), full-time with player of the match,
// season awards night, and the sacking screen with job offers.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, S = G.state;
  const short = c => c.short.replace(/\d/g, '');

  // ================= Pre-match: walk-out + line-ups + scout report =================
  Nav.define('prematch', () => {
    const car = S.career, fx = Sim.myFixture(car), H = G.club(fx.h), A = G.club(fx.a), opp = fx.home ? A : H, me = G.me();
    const tH = Sim.teamFor(car, fx.h), tA = Sim.teamFor(car, fx.a), dd = Sim.difficulty(car, opp.id);
    const danger = Sim.squadOf(car, opp.id).filter(p => !p.injured).sort((a, b) => b.rating - a.rating)[0];
    Sound.crowd(.7);
    const b = el('div', 'walk');
    const col = (t, c) => `<div class="lu"><div class="lu-h">${esc(short(c))}<small>${esc(car.tactics[c.id].formation)}</small></div>${t.xi.map((p, i) => `<div class="lu-r"><span class="no">${i + 1}</span><span class="nm">${esc(G.surname(p.name))}</span><span class="ps">${p.pos}</span></div>`).join('')}</div>`;
    b.innerHTML = `<div class="panel hero vsbig"><div class="vc"><span class="crest">${Art.crest(H)}</span><b>${esc(G.shortName(H))}</b></div><div class="vm"><b>VS</b><small>${esc(WORLD.divisions[H.div].name)}<br>Week ${car.week + 1}</small></div><div class="vc"><span class="crest">${Art.crest(A)}</span><b>${esc(G.shortName(A))}</b></div></div>
      <div class="note center">${esc(H.stadium)} · ${H.capacity.toLocaleString()}${opp.id === me.rival ? ' · <b class="gold">DERBY DAY</b>' : ''}</div>
      <div class="lineups">${col(tH, H)}${col(tA, A)}</div>
      <div class="scout"><div><small>Danger man</small><b>${danger ? esc(danger.name) + ' ' + danger.rating : '—'}</b></div><div><small>Difficulty</small><b class="diff">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= dd ? 'on' : ''}"></i>`).join('')}</b></div><button class="boostbtn" ${car.boost || car.coins < DATA.coins.boostCost ? 'disabled' : ''}><small>Training boost</small><b class="${car.boost ? 'good' : 'gold'}">${car.boost ? 'Active +' + DATA.coins.boost : Icons.svg('coin').replace('class="ic ', 'style="width:15px;height:15px;display:inline;vertical-align:-2px" class="ic ') + ' ' + DATA.coins.boostCost}</b></button></div>`;
    const bb = b.querySelector('.boostbtn'); bb.dataset.snd = 'coin'; bb.onclick = () => { if (Sim.boostMatch(car)) { G.save(); Nav.toast(`Training boost: +${DATA.coins.boost} for this match`); Nav.refresh(); } };
    if (!fx.home) { const tr = el('div', 'travel', `<div>${Art.ball()}</div><b>Travelling to ${esc(H.stadium)}…</b><small>${esc(H.name)}</small>`); b.appendChild(tr); setTimeout(() => tr.classList.add('gone'), 1100); }
    return { header: G.titleHeader('Match Day', `${me.name} ${fx.home ? 'at home' : 'away'}`, 'whistle'), body: b, bg: 'bg_tunnel',
      extra: [{ label: 'Tactics', go: () => tacticsCard(null) }],
      action: { label: 'Kick Off', go: () => { const press = Sim.pressFor(car, fx); if (press && car.pressWeek !== car.season * 100 + car.week) Nav.push('press', { press }); else kickOff(); } } };
  });
  function kickOff() { S.live = Sim.startWeek(S.career); S.live.mine = S.live.h === S.career.me ? 'H' : 'A'; Nav.replace('match'); }

  // ================= Press conference =================
  Nav.define('press', p => {
    const car = S.career, b = el('div', 'press');
    b.className = 'stack grow'; b.style.justifyContent = 'flex-end';
    b.innerHTML = `<div class="journo"><small>${p.press.tag === 'derby' ? 'Derby week' : p.press.tag === 'slump' ? 'Under pressure' : p.press.tag === 'big' ? 'Big game' : 'Weekly press'}</small><b>“${esc(p.press.q)}”</b></div>`;
    const answers = el('div', 'answers');
    p.press.answers.forEach((a, i) => { const x = Nav.button({ label: a.text, go: () => {
      Sim.applyPress(car, a); car.pressWeek = car.season * 100 + car.week; G.save();
      const fx = [a.fans ? `Fans ${a.fans > 0 ? '+' : ''}${a.fans}` : '', a.morale ? `Morale ${a.morale > 0 ? '+' : ''}${a.morale}` : '', a.board ? `Board ${a.board > 0 ? '+' : ''}${a.board}` : ''].filter(Boolean).join(' · ');
      Nav.toast(fx || 'Noted.'); kickOff(); } }, 'ans'); x.style.setProperty('--d', i * 80 + 'ms'); answers.appendChild(x); });
    b.appendChild(answers);
    Sound.play('camera'); return { header: G.titleHeader('Press Conference', G.me().name, 'press'), body: b, bg: 'bg_press', back: { label: 'Skip', go: () => { car.pressWeek = car.season * 100 + car.week; kickOff(); } } };
  });

  // ================= Tactics card (pre-match or live) =================
  function tacticsCard(live) {
    const car = S.career, tac = live ? live[live.mine].tactics : car.tactics[car.me], box = el('div', 'settings');
    const cyc = (label, key, opts) => { const row = el('div', 'cyc'), keys = Object.keys(opts); let i = keys.indexOf(tac[key]);
      const val = el('b', '', esc(opts[keys[i]].label || keys[i]) + (key === 'style' && keys[i] === car.brief.style ? ' ★' : '')), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›');
      const set = d => { i = (i + d + keys.length) % keys.length; if (live) Sim.setTactic(live, live.mine, key, keys[i]); else tac[key] = keys[i];
        if (!live || key !== 'formation') { if (!live) G.save(); } val.textContent = (opts[keys[i]].label || keys[i]) + (key === 'style' && keys[i] === car.brief.style ? ' ★' : ''); Sound.play('move'); };
      pv.onclick = () => set(-1); nx.onclick = () => set(1); row.append(el('span', '', label), pv, val, nx); return row; };
    if (!live) box.appendChild(cyc('Formation', 'formation', DATA.formations));
    box.append(cyc('Mentality', 'mentality', DATA.mentality), cyc('Style', 'style', DATA.styles));
    if (live) box.appendChild(el('p', 'note center', 'Formation changes happen through substitutions.'));
    Nav.card({ title: 'Tactics', body: box, buttons: [{ label: 'Done', go: () => { if (!live) Nav.refresh(); } }] });
  }

  // ================= Live match =================
  function drawPitch(ctx, W, Hh, st) {
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#2f7a3a' : '#368542'; ctx.fillRect(i * W / 12, 0, W / 12 + 1, Hh); }
    ctx.strokeStyle = 'rgba(245,250,240,.85)'; ctx.lineWidth = 2.5; const m = 18;
    ctx.strokeRect(m, m, W - 2 * m, Hh - 2 * m); ctx.beginPath(); ctx.moveTo(W / 2, m); ctx.lineTo(W / 2, Hh - m); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, Hh / 2, 50, 0, 7); ctx.stroke();
    ctx.strokeRect(m, Hh / 2 - 95, 80, 190); ctx.strokeRect(W - m - 80, Hh / 2 - 95, 80, 190); ctx.strokeRect(m, Hh / 2 - 42, 28, 84); ctx.strokeRect(W - m - 28, Hh / 2 - 42, 28, 84);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y] of [[0, 0], [W, 0], [0, Hh], [W, Hh]]) { const g = ctx.createRadialGradient(x, y, 10, x, y, W * .55); g.addColorStop(0, 'rgba(255,245,210,.2)'); g.addColorStop(1, 'rgba(255,245,210,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); }
    ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, Hh / 2, Hh * .3, W / 2, Hh / 2, W * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);
    const dot = (x, y, kit) => { ctx.beginPath(); ctx.ellipse(x + 2, y + 9, 8, 3, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = kit[0]; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = kit[1]; ctx.stroke(); };
    const px = (x, y) => [m + x * (W - 2 * m), m + y * (Hh - 2 * m)];
    const shape = f => { const F = DATA.formations[f], line = (n, x) => Array.from({ length: n }, (_, i) => [x, (i + 1) / (n + 1)]); return [[.05, .5]].concat(line(F.DF, .2), line(F.MF, .42), line(F.FW, .62)); };
    shape(st.fH).forEach(([x, y], i) => { const [a, b] = px(Math.min(.95, x * .5 + (i ? st.push : 0)), y); dot(a, b, st.kH); });
    shape(st.fA).forEach(([x, y], i) => { const [a, b] = px(Math.max(.05, 1 - x * .5 + (i ? st.push : 0)), 1 - y); dot(a, b, st.kA); });
    ctx.beginPath(); ctx.arc(st.ball[0], st.ball[1], 6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111'; ctx.stroke();
  }

  Nav.define('match', () => {
    const car = S.career, live = S.live, H = G.club(live.h), A = G.club(live.a), mine = live.mine;
    let timer = null, raf = 0, paused = false, speed = S.prefs.speed || 1, htDone = false;
    const hdr = el('div', 'scoreboard', `<div class="sb-team"><span class="crest">${Art.crest(H)}</span><b>${esc(short(H))}</b></div><div class="sb-led"><b id="m-score">0-0</b><em id="m-clock">00'</em></div><div class="sb-team"><span class="crest">${Art.crest(A)}</span><b>${esc(short(A))}</b></div>`); hdr.style.paddingTop = 'calc(8px + var(--st))';
    const b = el('div', 'matchv');
    b.innerHTML = `<div class="pitch-wrap"><canvas id="pitch"></canvas></div><div class="mstats" id="mstats"></div><div class="feed" id="feed"></div>`;
    const st = { fH: car.tactics[live.h].formation, fA: car.tactics[live.a].formation, kH: H.kit, kA: A.kit, ball: [360, 240], target: [360, 240], push: 0, pushT: 0 };
    const cos = new RNG(live.total * 7 + car.week);
    const feedLine = (min, html, cls) => { const f = b.querySelector('#feed'); f.insertAdjacentHTML('afterbegin', `<p class="${cls || ''}"><b>${String(min).padStart(2, '0')}'</b><span>${html}</span></p>`); while (f.children.length > 5) f.lastChild.remove(); };
    const stats = () => {
      b.querySelector('#mstats').innerHTML = `<span>Shots <b>${live.shots.H}</b> – <b>${live.shots.A}</b></span><span>Subs <b>${live.subs[mine]}/${DATA.season.subsAllowed}</b></span><span>${esc(DATA.mentality[live[mine].tactics.mentality].label)}</span>`; };
    const handle = e => {
      const side = e.side === 'H' ? H : A, ours = e.side === mine, toRight = e.side === 'H';
      if (e.type === 'goal') {
        document.getElementById('m-score').textContent = live.gH + '-' + live.gA;
        feedLine(e.min, `<b>GOAL!</b> ${esc(e.who)} (${esc(short(side))})${e.assist ? ` <small>assist ${esc(G.surname(e.assist))}</small>` : ''}`, 'goal');
        Sound.play('net'); setTimeout(() => Sound.play(ours ? 'goal' : 'concede'), 120); Sound.swell(ours ? 2 : .5, 3); Sound.buzz(ours ? [60, 40, 90] : 30);
        st.target = [toRight ? 694 : 26, 240 + (cos.next() - .5) * 40]; st.pushT = toRight ? .1 : -.1;
        const fl = el('div', 'goalflash' + (ours ? '' : ' them'), `<b>GOAL!</b><span>${esc(e.who)}</span>`); b.appendChild(fl); setTimeout(() => fl.remove(), 1600);
      } else if (e.type === 'chance' || e.type === 'save') {
        feedLine(e.min, e.type === 'save' ? `${esc(G.surname(e.who))} shoots — saved by ${esc(G.surname(e.keeper || 'the keeper'))}` : `${esc(G.surname(e.who))} (${esc(short(side))}) goes close`);
        Sound.play(e.type === 'save' ? 'kick' : 'chance'); st.target = [toRight ? 630 : 90, 240 + (cos.next() - .5) * 120]; st.pushT = toRight ? .07 : -.07;
      } else if (e.type === 'sub' && !e.quiet) feedLine(e.min, `Sub ${esc(short(side))}: ${esc(G.surname(e.on))} on, ${esc(G.surname(e.off))} off`, 'sub');
      else if (e.type === 'sub') feedLine(e.min, `${esc(short(side))} sub: ${esc(G.surname(e.on))} for ${esc(G.surname(e.off))}`, 'sub');
      else if (e.type === 'shout' && ours) feedLine(e.min, `You: “${esc(DATA.shouts[e.key].label)}”`, 'shout');
      else if (e.type === 'ht') { feedLine(45, 'Half-time.'); Sound.play('whistle2'); }
      else if (e.type === 'ft') { feedLine(e.min, 'Full-time.'); Sound.play('whistle3'); }
    };
    const tick = () => {
      if (paused) return;
      const evs = Sim.stepMatch(live); document.getElementById('m-clock').textContent = String(live.min).padStart(2, '0') + "'";
      if (live.min % 3 === 0) { st.target = [720 * (.3 + cos.next() * .4), 480 * (.2 + cos.next() * .6)]; st.pushT = (cos.next() - .5) * .08; }
      evs.forEach(handle); if (live.min % 5 === 0) stats();
      if (live.min === 45 && !htDone) { htDone = true; halfTime(); }
      if (live.done) { stop(); setTimeout(fullTime, 1200); }
    };
    const start = () => { clearInterval(timer); timer = setInterval(tick, 280 / speed); };
    const stop = () => { clearInterval(timer); timer = null; };
    const fullTime = () => { cancelAnimationFrame(raf); const before = car.board.confidence, posBefore = car.week ? Sim.position(car, car.me) : 0; const m = Sim.finishWeek(car, live); S.live = null; G.save(); Nav.replace('fulltime', { m, before, posBefore }); };
    const pause = () => {
      if (live.done) return; paused = true; Sound.play('whistle1');
      const list = el('div', 'menu-list');
      const add = (label, go, dis) => { const x = Nav.button({ label, go: () => { Nav.closeCard(); go(); } }, 'mi'); if (dis) x.disabled = true; list.appendChild(x); };
      add('Resume', () => { paused = false; });
      add('Tactics', () => { tacticsCard(live); waitCard(() => { paused = false; stats(); }); });
      add(`Substitutions (${live.subs[mine]}/${DATA.season.subsAllowed})`, () => subsCard(() => { paused = false; stats(); }), live.subs[mine] >= DATA.season.subsAllowed);
      add(`Speed: ${speed}×`, () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; G.setPrefs({ speed }); start(); paused = false; Nav.toast(`Match speed ${speed}×`); });
      add('Simulate to full-time', () => { paused = false; stop(); live[mine].ai = true; while (!live.done) Sim.stepMatch(live).forEach(e => { if (e.type === 'goal') document.getElementById('m-score').textContent = live.gH + '-' + live.gA; }); setTimeout(fullTime, 300); });
      Nav.card({ title: `Paused · ${live.min}'`, body: list, buttons: [], modal: true });
    };
    const waitCard = fn => { const iv = setInterval(() => { if (!document.querySelector('.overlay')) { clearInterval(iv); fn(); } }, 150); };
    const subsCard = done => {
      const t = live[mine]; let out = null; const box = el('div', 'subs');
      const draw = () => {
        box.innerHTML = '<div class="sc-h"><span>On the pitch</span><span>Bench</span></div>';
        const cols = el('div', 'sc'); const L = el('div'), R = el('div');
        t.xi.forEach(p => { const x = el('button', 'sr' + (out === p.id ? ' sel' : ''), `<span class="ps">${p.pos}</span><span class="nm">${esc(G.surname(p.name))}</span><span class="ft ${p.fitness < 70 ? 'low' : ''}">${Math.round(p.fitness)}</span>`); x.onclick = () => { out = p.id; Sound.play('move'); draw(); }; L.appendChild(x); });
        t.bench.forEach(p => { const x = el('button', 'sr in', `<span class="ps">${p.pos}</span><span class="nm">${esc(G.surname(p.name))}</span><span class="rt">${p.rating}</span>`); x.disabled = !out;
          x.onclick = () => { if (Sim.makeSub(live, mine, out, p.id)) { Sound.play('confirm'); out = null; if (live.subs[mine] >= DATA.season.subsAllowed) { Nav.closeCard(); done(); return; } draw(); } }; R.appendChild(x); });
        cols.append(L, R); box.appendChild(cols); box.appendChild(el('p', 'note center', out ? 'Now tap a bench player' : 'Tap a player to take off (number = fitness)'));
      };
      draw(); Nav.card({ title: `Substitutions ${live.subs[mine]}/${DATA.season.subsAllowed}`, cls: 'wide', body: box, buttons: [{ label: 'Done', go: done }], modal: true });
    };
    const shoutCard = () => {
      if (live.done) return; const box = el('div', 'shouts');
      for (const k in DATA.shouts) { const s = DATA.shouts[k], cd = (live.cool[mine][k] || 0) - live.min;
        const x = Nav.button({ label: s.label, sub: cd > 0 ? `Ready in ${cd}'` : s.sub, go: () => { Nav.closeCard(); if (Sim.shout(live, mine, k)) { Sound.buzz(20); stats(); } } }, 'sh'); if (cd > 0) x.disabled = true; box.appendChild(x); }
      Nav.card({ title: 'Touchline shout', body: box, buttons: [{ label: 'Cancel', ghost: true }] });
    };
    const halfTime = () => {
      paused = true; const box = el('div', 'answers');
      const talks = [['Keep doing what you’re doing', { morale: 4 }], ['That’s not good enough!', { create: 1.12, morale: -2 }], ['Stay calm, stay organised', { concede: .88 }]];
      for (const [label, eff] of talks) box.appendChild(Nav.button({ label, go: () => { Nav.closeCard(); if (eff.morale) for (const p of live[mine].xi) p.morale = Math.max(20, Math.min(100, p.morale + eff.morale)); if (eff.create || eff.concede) live.mods[mine].push({ until: 90, create: eff.create, concede: eff.concede }); live.dirty = true; feedLine(45, `Team talk: “${esc(label)}”`, 'shout'); Sound.play('whistle1'); paused = false; } }, 'ans'));
      Nav.card({ title: `Half-time · ${live.gH}-${live.gA}`, body: box, buttons: [], modal: true });
    };
    return { header: hdr, cls: 'night match-scr', body: b,
      back: { label: 'Pause', go: pause }, onBack: pause,
      extra: [{ label: 'Tactics', go: () => { if (live.done) return; paused = true; tacticsCard(live); waitCard(() => { paused = false; stats(); }); } }],
      action: { label: 'Shout', go: shoutCard },
      mount: s => {
        const cv = s.querySelector('#pitch'), ctx = cv.getContext('2d'); cv.width = 720; cv.height = 480;
        const loop = () => { st.ball[0] += (st.target[0] - st.ball[0]) * .12; st.ball[1] += (st.target[1] - st.ball[1]) * .12; st.push += (st.pushT - st.push) * .06; drawPitch(ctx, 720, 480, st); raf = requestAnimationFrame(loop); };
        loop(); stats(); Sound.crowd(1); Sound.play('whistle1');
        feedLine(0, `Kick-off at ${esc(H.stadium)}.`);
        if (car.matchesPlayed < DATA.tipsForMatches) feedLine(0, esc(DATA.tips[car.matchesPlayed % DATA.tips.length]), 'tip');
        setTimeout(start, 700);
      } };
  });

  // ================= Full time =================
  Nav.define('fulltime', p => {
    const car = S.career, m = p.m, H = G.club(m.h), A = G.club(m.a), mine = m.h === car.me ? 'H' : 'A';
    const us = mine === 'H' ? m.gH : m.gA, them = mine === 'H' ? m.gA : m.gH, res = us > them ? 'win' : us < them ? 'loss' : 'draw';
    const potm = car.players.find(x => x.id === m.potm), pos = Sim.position(car, car.me), delta = Math.round((car.board.confidence - p.before) * 10) / 10;
    const goals = side => m.events.filter(e => e.type === 'goal' && e.side === side).map(e => `${esc(G.surname(e.who))} ${e.min}'`).join('<br>') || '&nbsp;';
    const coins = res === 'win' ? DATA.coins.win : res === 'draw' ? DATA.coins.draw : 0;
    const b = el('div', 'ftv');
    b.innerHTML = `<div class="ft-banner">Full Time</div>
      <div class="panel hero"><div class="ft-score"><div><span class="crest">${Art.crest(H)}</span><b>${esc(short(H))}</b></div><div class="sb-led"><b>${m.gH}-${m.gA}</b></div><div><span class="crest">${Art.crest(A)}</span><b>${esc(short(A))}</b></div></div>
      <div class="ft-goals" style="margin-top:6px"><div>${goals('H')}</div><div>${goals('A')}</div></div></div>
      <div class="panel potm"><span class="shirtbox">${potm ? G.shirtOf(potm, null) : ''}</span><div style="min-width:0"><small>Player of the match</small><b>${potm ? esc(potm.name) : '—'}</b><span class="rating">${potm ? m.ratings[potm.id].toFixed(1) : ''}</span></div></div>
      <div class="tiles t4keep"><div class="tile"><span class="tv"><small>Position</small><b>${G.ord(pos)}${p.posBefore ? (pos < p.posBefore ? ' <span class="good">▲</span>' : pos > p.posBefore ? ' <span class="bad">▼</span>' : '') : ''}</b></span></div><div class="tile"><span class="tv"><small>Board</small><b class="${delta >= 0 ? 'good' : 'bad'}">${delta >= 0 ? '+' : ''}${delta}</b></span></div><div class="tile"><span class="tv"><small>Fans</small><b>${Math.round(car.fans)}</b></span></div><div class="tile">${Icons.svg('coin')}<span class="tv"><small>Coins</small><b>+${coins}</b></span></div></div>`;
    return { header: G.titleHeader(res === 'win' ? 'Victory!' : res === 'loss' ? 'Defeat' : 'Draw', `${WORLD.divisions[H.div].name} · Week ${car.week}`, 'whistle'), body: b, bg: res === 'win' ? 'bg_dressing' : 'bg_tunnel', back: false,
      action: { label: 'Continue', go: () => { Sound.crowd(.25); Nav.backTo('hub'); } },
      mount: () => { Sound.crowd(res === 'win' ? .9 : .3); if (res === 'win') { Sound.swell(2, 2); Sound.play('applause'); } else if (res === 'loss') Sound.play('boo', { vol: .5 }); if (coins) setTimeout(() => Sound.play('coin'), 600); G.checkAchievements({ match: m }); } };
  });

  // ================= Awards night (end of season) =================
  Nav.define('awards', p => {
    const car = S.career; if (!p.s) { p.s = Sim.endSeason(car); G.save(); G.checkAchievements({ season: p.s }); }
    const s = p.s, d = WORLD.divisions[s.myDiv], champ = G.club(s.champions[s.myDiv]), ts = s.topScorer[s.myDiv];
    const steps = ['champ', 'scorer', 'me'], step = p.step || 0, b = el('div', 'cine'), last = step === steps.length - 1;
    b.style.setProperty('--bgimg', 'url(assets/art/bg_trophy.webp)');
    if (steps[step] === 'champ') { Sound.play('sting_trophy');
      b.innerHTML = `<div class="rays"></div><span class="trophyw">${Art.trophy('league')}</span><span class="crest" style="width:64px;height:72px;position:relative">${Art.crest(champ)}</span><div class="l1">${esc(d.name)} champions</div><div class="l2">${esc(champ.name)}</div>${champ.id === car.me ? '<div class="l3 gold">That’s you, boss!</div>' : ''}`; }
    if (steps[step] === 'scorer') { const pl = ts && car.players.find(x => x.id === ts.id); Sound.play('card');
      b.innerHTML = `<div class="rays"></div><span class="trophyw" style="width:110px;--sw:110px">${pl ? G.shirtOf(pl, null) : ''}</span><div class="l1">Golden Boot · ${esc(d.name)}</div>${ts ? `<div class="l2">${esc(ts.name)}</div><div class="l3">${ts.goals} goals · ${esc(G.club(ts.club).name)}</div>` : '<div class="l2">—</div>'}`; }
    if (steps[step] === 'me') { const up = s.promoted.includes(car.me), down = s.relegated.includes(car.me), r = s.record; Sound.play(up ? 'sting_trophy' : down ? 'groan' : 'applause');
      b.innerHTML = `<span class="crest big-crest">${Art.crest(G.me())}</span><div class="l1">Your season</div><div class="l2">${G.ord(s.myPos)} place</div>
        ${up ? '<div class="banner-up up">PROMOTED!</div>' : down ? '<div class="banner-up down">RELEGATED</div>' : ''}
        <div class="panel"><div class="tiles t3"><div class="tile"><span class="tv"><small>Record</small><b>${r.w}-${r.d}-${r.l}</b></span></div><div class="tile"><span class="tv"><small>Goals</small><b>${r.gf}:${r.ga}</b></span></div><div class="tile"><span class="tv"><small>Brief</small><b class="${s.beat ? 'good' : s.missed ? 'bad' : ''}">${s.beat ? 'Met' : s.missed ? 'Missed' : 'Close'}</b></span></div></div><p class="note center" style="margin:8px 0 0">${esc(s.brief)}${s.beat ? ` · +${DATA.coins.briefMet} coins` : ''}${s.intake && s.intake.length ? ` · ${s.intake.length} academy graduates joined` : ''}</p></div>`; }
    b.appendChild(Nav.button({ label: last ? 'Next season' : 'Next', icon: 'chevron', go: () => { if (last) { HubUI.H.tab = 'office'; Nav.reset(car.sacked ? 'sacked' : 'hub'); } else Nav.replace('awards', { s, step: step + 1 }); } }, 'btn big'));
    return { full: true, body: b, onBack: () => {} };
  });

  // ================= Sacked =================
  Nav.define('sacked', () => {
    const car = S.career, me = G.me(), offers = Sim.jobOffers(car); let sel = null;
    const b = el('div', 'stack grow'); b.style.justifyContent = 'flex-end'; Sound.play('sting_sacked');
    b.innerHTML = `<div class="sk" style="align-self:center">SACKED</div><p class="center">The ${esc(me.name)} board have run out of patience. Three clubs want to talk.</p>`;
    const list = el('div', 'stack');
    const draw = () => { list.innerHTML = ''; offers.forEach(c => { const x = el('button', 'offer' + (sel === c.id ? ' sel' : ''), `<span class="crest">${Art.crest(c)}</span><span class="who"><b>${esc(c.name)}</b><small>${esc(WORLD.divisions[c.div].name)} · Rep ${c.rep}</small><small>Brief: ${esc(Sim.brief(car, c.id).text)}</small></span>`); x.onclick = () => { sel = c.id; Sound.play('move'); draw(); }; list.appendChild(x); }); };
    draw(); b.appendChild(list);
    return { header: G.titleHeader('Career Over?', 'Not yet', 'exit'), body: b, bg: 'bg_board', back: false, onBack: () => {},
      action: { label: 'Accept job', hold: true, go: () => { if (!sel) { Nav.toast('Pick a club first'); return; } Sim.takeJob(car, sel); G.save(); Nav.reset('unveil'); } } };
  });
})();
