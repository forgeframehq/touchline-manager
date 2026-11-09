// Match day: walk-out with line-ups → choose how to play (full match, key moments, quick sim) and speed →
// the live match: animated 2D pitch with all 22 players and the ball moving through named players, scoreboard
// with scorers and a timeline, momentum, tabs for Commentary / Stats / Ratings / Line-ups, text commentary with
// voiced key calls (and optional read-aloud), assistant tips, forced substitutions for injuries, a half-time
// screen with team talk, then full time with Summary / Stats / Ratings / Analysis.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, S = G.state, I = Icons.svg, D = DATA;
  const short = c => c.short.replace(/\d/g, '');
  const SPEEDS = [1, 2, 4, 8], MSPM = { 1: 900, 2: 450, 4: 220, 8: 105 };   // ms per match minute

  // ================= Pre-match =================
  Nav.define('prematch', () => {
    const car = S.career, fx = Sim.nextMatch(car), H = G.club(fx.h), A = G.club(fx.a), opp = fx.home ? A : H, me = G.me();
    const tH = Sim.teamFor(car, fx.h), tA = Sim.teamFor(car, fx.a), dd = Sim.difficulty(car, opp.id);
    const danger = Sim.squadOf(car, opp.id).filter(p => !p.injured).sort((a, b) => b.rating - a.rating)[0];
    Sound.crowd(.7);
    const b = el('div', 'walk');
    const col = (t, c) => `<div class="lu"><div class="lu-h">${esc(short(c))}<small>${esc(c.id === car.me ? Sim.tac(car).shape : car.tactics[c.id].formation)}</small></div>${t.xi.map((p, i) => `<div class="lu-r"><span class="no">${c.id === car.me ? (p.num || i + 1) : i + 1}</span><span class="nm">${esc(G.surname(p.name))}</span><span class="ps">${p.pos}</span></div>`).join('')}</div>`;
    b.innerHTML = `<div class="panel hero vsbig"><div class="vc"><span class="crest">${Art.crest(H)}</span><b>${esc(G.shortName(H))}</b></div><div class="vm"><b>VS</b><small>${esc(fx.comp)}<br>${fx.kind === 'cup' ? esc(fx.round) : 'Week ' + (car.week + 1)}</small></div><div class="vc"><span class="crest">${Art.crest(A)}</span><b>${esc(G.shortName(A))}</b></div></div>
      <div class="note center">${esc(H.stadium)} · ${H.capacity.toLocaleString()}${opp.id === me.rival ? ' · <b class="gold">DERBY DAY</b>' : ''}</div>
      <div class="lineups">${col(tH, H)}${col(tA, A)}</div>
      <div class="scout"><div><small>Danger man</small><b>${danger ? esc(danger.name) + ' ' + danger.rating : '—'}</b></div><div><small>Difficulty</small><b class="diff">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= dd ? 'on' : ''}"></i>`).join('')}</b></div><button class="boostbtn" ${car.boost || car.coins < D.coins.boostCost ? 'disabled' : ''}><small>Training boost</small><b class="${car.boost ? 'good' : 'gold'}">${car.boost ? 'Active +' + D.coins.boost : I('coin').replace('class="ic ', 'style="width:15px;height:15px;display:inline;vertical-align:-2px" class="ic ') + ' ' + D.coins.boostCost}</b></button></div>`;
    const bb = b.querySelector('.boostbtn'); bb.dataset.snd = 'coin'; bb.onclick = () => { if (Sim.boostMatch(car)) { G.save(); Nav.toast(`Training boost: +${D.coins.boost} for this match`); Nav.refresh(); } };
    if (!fx.home) { const tr = el('div', 'travel', `<div>${Art.ball()}</div><b>Travelling to ${esc(H.stadium)}…</b><small>${esc(H.name)}</small>`); b.appendChild(tr); setTimeout(() => tr.classList.add('gone'), 1100); }
    return { header: G.titleHeader('Match Day', `${me.name} ${fx.home ? 'at home' : 'away'}`, 'whistle'), body: b, bg: 'bg_tunnel',
      extra: [{ label: 'Tactics', go: () => tacticsCard(null) }],
      action: { label: 'Play', go: () => modeCard(fx) } };
  });
  function modeCard(fx) {
    const car = S.career, p = S.prefs, body = el('div', 'stack');
    const modes = [['full', 'Play full match', 'Every minute live, with all your touchline options', 'whistle'], ['key', 'Key moments', 'Skips to the chances, goals and cards (about 1 minute)', 'speed'], ['quick', 'Quick sim', 'Straight to the result, ratings and stats', 'play']];
    let mode = p.mode || 'full', speed = SPEEDS.includes(p.speed) ? p.speed : 2;
    const draw = () => { body.innerHTML = '';
      for (const [k, t, sub, icon] of modes) { const b = el('button', 'modebtn' + (mode === k ? ' on' : ''), `${I(icon)}<span><b>${t}</b><small>${sub}</small></span>`); b.onclick = () => { mode = k; Sound.play('tap'); draw(); }; body.appendChild(b); }
      const sp = el('div', 'seg'); SPEEDS.forEach(v => { const b = el('button', v === speed ? 'on' : '', v + '×'); b.onclick = () => { speed = v; draw(); }; sp.appendChild(b); });
      if (mode === 'full') { body.appendChild(el('small', 'note', 'Match speed (change it any time during the match)')); body.appendChild(sp); } };
    draw();
    Nav.card({ title: 'How do you want to play?', body, buttons: [{ label: 'Back', ghost: true }, { label: 'Kick Off', go: () => { G.setPrefs({ mode, speed }); const press = fx.kind === 'league' && Sim.pressFor(car, fx); if (press && car.pressWeek !== car.season * 100 + car.week) Nav.push('press', { press }); else kickOff(); } }] });
  }
  function kickOff() {
    const car = S.career, mode = S.prefs.mode || 'full';
    if (mode === 'quick') { const live = Sim.quickSim(car); if (!live) { Nav.backTo('hub'); return; } finish(car, live, true); return; }
    const nx = Sim.nextMatch(car);
    S.live = nx && nx.kind === 'cup' ? Sim.startCup(car) : Sim.startWeek(car);
    if (!S.live) { Nav.toast('No match to play', 'bad'); Nav.backTo('hub'); return; }
    S.live.mine = S.live.h === car.me ? 'H' : 'A'; Nav.replace('match');
  }
  function finish(car, live, replace) {
    const before = car.board.confidence, posBefore = car.week ? Sim.position(car, car.me) : 0;
    const m = live.cup ? Sim.finishCup(car, live) : Sim.finishWeek(car, live); S.live = null; G.save();
    (replace ? Nav.replace : Nav.replace)('fulltime', { m, before, posBefore });
  }

  // ================= Tactics card (pre-match or live) =================
  function tacticsCard(live) {
    const car = S.career, box = el('div', 'stack'), m7 = D.mentality7;
    const draw = () => {
      const t = Sim.tac(car), cur = live ? live[live.mine].tactics.mentality : t.mentality;
      box.innerHTML = '';
      const row = (label, val, step) => { const r = el('div', 'cyc m0'), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›'); pv.dataset.snd = nx.dataset.snd = 'swipe'; pv.onclick = () => step(-1); nx.onclick = () => step(1); r.append(el('span', '', label), pv, el('b', '', val), nx); box.appendChild(r); };
      row('Tactic', esc(t.name + ' · ' + t.shape), d => { car.tac.slot = (car.tac.slot + d + 3) % 3; Sim.syncTactics(car); if (live) { const T2 = Sim.tac(car); live[live.mine].tm = Sim.tmods(car); Sim.setTactic(live, live.mine, 'mentality', T2.mentality); } G.save(); draw(); });
      row('Mentality', esc(D.mentality[cur].label), d => { const k = m7[Math.max(0, Math.min(6, m7.indexOf(cur) + d))]; if (live) Sim.setTactic(live, live.mine, 'mentality', k); else { t.mentality = k; Sim.syncTactics(car); G.save(); } draw(); });
      for (const [g, key] of [['ip', 'tempo'], ['op', 'press'], ['op', 'line']]) { const def = D.instr[g === 'ip' ? 'inPossession' : 'outPossession'][key];
        row(def.label, esc(def.opts[t[g][key]][0]), d => { t[g][key] = Math.max(0, Math.min(def.opts.length - 1, t[g][key] + d)); if (live) { live[live.mine].tm = Sim.tmods(car); live.dirty = true; } G.save(); draw(); }); }
      if (live) box.appendChild(el('p', 'note center', 'Roles, positions and every instruction live in the Tactics tab.'));
    };
    draw();
    Nav.card({ title: 'Tactics', body: box, buttons: [{ label: 'Done', go: () => { if (!live) Nav.refresh(); } }] });
  }

  // ================= the 2D match view =================
  function shapeOf(car, clubId) {
    if (clubId === car.me) return Sim.tac(car).pos.map(([r, c]) => [r, c]);
    const f = car.tactics[clubId].formation; if (D.shapes[f]) return D.shapes[f];
    const F = D.formations[f] || D.formations['4-4-2'], line = (n, r) => Array.from({ length: n }, (_, i) => [r, n === 1 ? 2 : Math.round(i * 4 / (n - 1))]);
    return [[0, 2]].concat(line(F.DF, 1), line(F.MF, 3), line(F.FW, 5));
  }
  function makeView(cv, car, live, H, A) {
    const ctx = cv.getContext('2d'), W = cv.width, Hh = cv.height, M = 14;
    const dots = { H: [], A: [] };
    const base = (side, r, c) => { const x = .05 + r * .085 + (r === 0 ? 0 : .03), y = .1 + c * .2; return side === 'H' ? [x, y] : [1 - x, 1 - y]; };
    const setup = () => { for (const s of ['H', 'A']) { const shp = shapeOf(car, s === 'H' ? live.h : live.a); dots[s] = live[s].xi.map((p, i) => { const [r, c] = shp[i] || [3, 2]; const [x, y] = base(s, r, c); return { p, bx: x, by: y, x, y, gk: p.grp === 'GK' }; }); } };
    setup();
    const st = { ball: [.5, .5], target: [.5, .5], q: [], carrier: null, side: 'H', label: '', flash: null, shot: null };
    const px = (x, y) => [M + x * (W - 2 * M), M + y * (Hh - 2 * M)];
    function feed(items) { for (const f of items) st.q.push(f); }
    function toWorld(f) { const x = f.side === 'H' ? f.x : 1 - f.x, y = f.side === 'H' ? f.y : 1 - f.y; return [x, y]; }
    function shotAt(side, goal) { const gx = side === 'H' ? 1 : 0, gy = .5 + (Math.random() - .5) * (goal ? .08 : .3); st.shot = { from: st.ball.slice(), to: [gx, gy], t: 0, goal }; }
    let last = performance.now(), qT = 0;
    function frame(now, msPerMin) {
      const dt = Math.min(64, now - last); last = now;
      // next touch from the flow queue
      qT -= dt; if (qT <= 0 && st.q.length && !st.shot) { const f = st.q.shift(); st.target = toWorld(f); st.side = f.side; st.label = Comm.sn(f.name); st.carrierId = f.pid; qT = Math.max(120, msPerMin / 2.2); }
      if (st.shot) { st.shot.t += dt / 520; const k = Math.min(1, st.shot.t); st.ball = [st.shot.from[0] + (st.shot.to[0] - st.shot.from[0]) * k, st.shot.from[1] + (st.shot.to[1] - st.shot.from[1]) * k]; if (k >= 1) { st.shot = null; st.target = [.5, .5]; } }
      else { st.ball[0] += (st.target[0] - st.ball[0]) * Math.min(1, dt / 160); st.ball[1] += (st.target[1] - st.ball[1]) * Math.min(1, dt / 160); }
      // players: shape + push with possession and ball position
      const att = st.side, bxw = st.ball[0];
      for (const s of ['H', 'A']) { const dir = s === 'H' ? 1 : -1, poss = s === att;
        for (const d of dots[s]) { if (!live[s].xi.includes(d.p)) continue;
          let tx = d.bx + (d.gk ? 0 : dir * (poss ? .1 : -.04) + (bxw - .5) * .35), ty = d.by + (d.gk ? (st.ball[1] - .5) * .2 : (st.ball[1] - d.by) * .18);
          if (d.p.id === st.carrierId && !st.shot) { tx = st.ball[0] - dir * .012; ty = st.ball[1]; }
          tx += Math.sin(now / 900 + d.p.id) * .006; ty += Math.cos(now / 1100 + d.p.id) * .008;
          d.x += (Math.max(.02, Math.min(.98, tx)) - d.x) * Math.min(1, dt / 380); d.y += (Math.max(.04, Math.min(.96, ty)) - d.y) * Math.min(1, dt / 380); } }
      draw();
    }
    function draw() {
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#2f7a3a' : '#368542'; ctx.fillRect(i * W / 12, 0, W / 12 + 1, Hh); }
      ctx.strokeStyle = 'rgba(245,250,240,.8)'; ctx.lineWidth = 2;
      ctx.strokeRect(M, M, W - 2 * M, Hh - 2 * M); ctx.beginPath(); ctx.moveTo(W / 2, M); ctx.lineTo(W / 2, Hh - M); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, Hh / 2, Hh * .14, 0, 7); ctx.stroke();
      const bw = (W - 2 * M) * .14, bh = (Hh - 2 * M) * .5, sw = (W - 2 * M) * .05, sh = (Hh - 2 * M) * .24;
      ctx.strokeRect(M, Hh / 2 - bh / 2, bw, bh); ctx.strokeRect(W - M - bw, Hh / 2 - bh / 2, bw, bh); ctx.strokeRect(M, Hh / 2 - sh / 2, sw, sh); ctx.strokeRect(W - M - sw, Hh / 2 - sh / 2, sw, sh);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(M - 5, Hh / 2 - sh * .3, 5, sh * .6); ctx.fillRect(W - M, Hh / 2 - sh * .3, 5, sh * .6);
      const vg = ctx.createRadialGradient(W / 2, Hh / 2, Hh * .3, W / 2, Hh / 2, W * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);
      const r = Math.max(7, W / 62);
      for (const s of ['H', 'A']) { const club = s === 'H' ? H : A, kit = s === 'H' ? H.kit : Art.awayKit(H.kit, A.kit);
        dots[s].forEach((d, i) => { if (!live[s].xi.includes(d.p)) return; const [x, y] = px(d.x, d.y), k = d.gk ? D.gkKit : kit;
          ctx.beginPath(); ctx.ellipse(x + 2, y + r * .9, r * .9, r * .35, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = k[0]; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = k[1]; ctx.stroke();
          ctx.fillStyle = Art.inkOn(k[0]); ctx.font = `700 ${Math.round(r * 1.05)}px Barlow, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(club.id === car.me ? (d.p.num || i + 1) : i + 1, x, y + .5); }); }
      const [bx, by] = px(st.ball[0], st.ball[1]);
      ctx.beginPath(); ctx.arc(bx, by, r * .55, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#111'; ctx.stroke();
      if (st.label && !st.shot) { ctx.font = `700 ${Math.round(r * 1.25)}px Barlow, sans-serif`; const tw = ctx.measureText(st.label).width + 12, lx = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, bx)), ly = Math.max(16, by - r * 2.4);
        ctx.fillStyle = 'rgba(5,14,9,.82)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(lx - tw / 2, ly - 11, tw, 22, 6); else ctx.rect(lx - tw / 2, ly - 11, tw, 22); ctx.fill(); ctx.strokeStyle = 'rgba(231,194,90,.7)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#fff3cc'; ctx.textAlign = 'center'; ctx.fillText(st.label, lx, ly + 1); }
    }
    return { frame, feed, shotAt, setup, st, draw };
  }

  // ================= Live match =================
  Nav.define('match', () => {
    const car = S.career, live = S.live, H = G.club(live.h), A = G.club(live.a), mine = live.mine, theirs = mine === 'H' ? 'A' : 'H';
    let timer = null, raf = 0, paused = false, speed = SPEEDS.includes(S.prefs.speed) ? S.prefs.speed : 2, htDone = false, view = null, tab = 'comm', lastKey = false, tipAt = 0;
    const keyMode = (S.prefs.mode || 'full') === 'key';
    const ctx = { m: live, H, A, derby: H.rival === A.id || A.rival === H.id, venue: H.stadium, goalsBy: {} };
    const hdr = el('div', 'msb');
    hdr.innerHTML = `<div class="scoreboard"><div class="sb-team"><span class="crest">${Art.crest(H)}</span><b>${esc(short(H))}</b></div><div class="sb-led"><b id="m-score">0-0</b><em id="m-clock">00'</em></div><div class="sb-team"><span class="crest">${Art.crest(A)}</span><b>${esc(short(A))}</b></div></div>
      <div class="scorers"><div id="sc-H" class="clamp2"></div><div id="sc-A" class="clamp2"></div></div><div class="tline" id="tline"><i class="ht"></i></div>`;
    hdr.style.paddingTop = 'calc(6px + var(--st))';
    const b = el('div', 'matchv');
    b.innerHTML = `<div class="pitch-wrap"><canvas id="pitch"></canvas><button class="speedchip" id="spd">${keyMode ? 'KEY' : speed + '×'}</button><div class="bigmo" id="bigmo"></div></div>
      <div class="mombar"><i id="mom"></i></div><div id="tipbar"></div>`;
    const tabs = el('div', 'gtabs small mtabs'); b.appendChild(tabs);
    const pane = el('div', 'mpane'); b.appendChild(pane);
    const feedBox = el('div', 'feed'); const lines = [];
    const drawTabs = () => { tabs.innerHTML = ''; [['comm', 'Commentary'], ['stats', 'Stats'], ['ratings', 'Ratings'], ['lineups', 'Line-ups']].forEach(([k, l]) => { const t = el('button', tab === k ? 'on' : '', l); t.dataset.snd = 'swipe'; t.onclick = () => { tab = k; drawTabs(); drawPane(); }; tabs.appendChild(t); }); };
    const drawPane = () => {
      pane.innerHTML = '';
      if (tab === 'comm') { pane.appendChild(feedBox); return; }
      if (tab === 'stats') pane.appendChild(statsBlock(live, H, A));
      if (tab === 'ratings') pane.appendChild(ratingsBlock(car, live, H, A));
      if (tab === 'lineups') pane.appendChild(lineupsBlock(car, live, H, A));
    };
    const say = (min, html, cls) => { lines.unshift(`<p class="${cls || ''}"><b>${String(min).padStart(2, '0')}'</b><span>${html}</span></p>`); if (lines.length > 30) lines.length = 30; feedBox.innerHTML = lines.slice(0, 9).join('');
      if (S.prefs.tts && window.speechSynthesis && (cls === 'goal' || cls === 'red' || cls === 'key' || speed === 1)) { try { const u = new SpeechSynthesisUtterance(html.replace(/<[^>]+>/g, '')); u.rate = 1.1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} } };
    const voice = (call, force) => { if (S.prefs.voice === false) return; if (!force && speed >= 4 && !['goal', 'red', 'penalty', 'ft'].includes(call)) return; Sound.play('vc_' + call, { vol: 1.1 }); };
    const big = (txt, cls) => { const bm = b.querySelector('#bigmo'); bm.className = 'bigmo on ' + (cls || ''); bm.innerHTML = txt; clearTimeout(bm._t); bm._t = setTimeout(() => bm.className = 'bigmo', 1600); };
    const scorers = () => { for (const s of ['H', 'A']) { const g = {}, order = [];
        for (const e of live.events) if ((e.type === 'goal' || e.type === 'red') && e.side === s) { const k = (e.type === 'red' ? '🟥 ' : '') + Comm.sn(e.who); if (!g[k]) { g[k] = []; order.push(k); } g[k].push(e.min + "'" + (e.pen ? ' p' : '')); }
        hdr.querySelector('#sc-' + s).innerHTML = order.map(k => `${esc(k)} ${g[k].join(', ')}`).join(' · '); } };
    const mark = (e, cls) => { const t = hdr.querySelector('#tline'); t.insertAdjacentHTML('beforeend', `<i class="${cls} ${e.side}" style="left:${Math.min(98, e.min / Math.max(90, live.total) * 100)}%"></i>`); };
    const updLed = () => { hdr.querySelector('#m-score').textContent = live.gH + '-' + live.gA; };
    const handle = e => {
      const side = e.side, ours = side === mine;
      if (e.type === 'goal') { updLed(); say(e.min, Comm.line(e, ctx), 'goal'); scorers(); mark(e, 'g');
        Sound.play('net'); setTimeout(() => Sound.play(ours ? 'goal' : 'concede'), 120); Sound.swell(ours ? 2 : .5, 3); Sound.buzz(ours ? [60, 40, 90] : 30); voice('goal', true);
        view && view.shotAt(side, true); big(`GOAL!<small>${esc(Comm.sn(e.who))}</small>`, ours ? 'us' : 'them');
        if (e.var === 'check') setTimeout(() => { say(e.min, 'VAR checks the goal… <b>it stands!</b>', 'key'); }, 900); lastKey = true; }
      else if (e.type === 'disallowed') { updLed(); say(e.min, Comm.line(e, ctx), 'key'); voice('var'); setTimeout(() => voice('nogoal', true), 1400); big('VAR<small>NO GOAL</small>', 'var'); scorers(); lastKey = true; }
      else if (e.type === 'chance' || e.type === 'save') { say(e.min, Comm.line(e, ctx), e.kind === 'post' ? 'key' : ''); Sound.play(e.type === 'save' ? 'kick' : 'chance'); Sound.swell(.6, 1.2);
        view && view.shotAt(side, false); if (e.kind === 'post') { voice('post'); big('OFF THE POST!', 'var'); } else if (e.type === 'save' && Math.random() < .45) voice('save'); else if (Math.random() < .15) voice('chance'); lastKey = true; }
      else if (e.type === 'penalty') { say(e.min, Comm.line(e, ctx), 'key'); voice('penalty', true); big('PENALTY!', 'var'); Sound.play('whistle1'); lastKey = true; }
      else if (e.type === 'penmiss') { say(e.min, Comm.line(e, ctx), 'key'); voice(e.saved ? 'save' : 'penmiss', true); lastKey = true; }
      else if (e.type === 'yellow') { say(e.min, '🟨 ' + Comm.line(e, ctx), 'yc'); mark(e, 'y'); Sound.play('whistle1', { vol: .6 }); }
      else if (e.type === 'red') { say(e.min, '🟥 ' + Comm.line(e, ctx), 'red'); mark(e, 'r'); scorers(); Sound.play('whistle1'); voice('red', true); big('RED CARD!', 'red'); lastKey = true; }
      else if (e.type === 'injury') { say(e.min, '🩹 ' + Comm.line(e, ctx), 'key'); lastKey = true; }
      else if (e.type === 'sub') { say(e.min, Comm.line(e, Object.assign({}, ctx)), 'sub'); }
      else if (e.type === 'offside' && Math.random() < .5) say(e.min, Comm.line(e, ctx), 'dim');
      else if (e.type === 'foul') say(e.min, Comm.line(e, ctx), 'dim');
      else if (e.type === 'shout' && ours) say(e.min, `You: “${esc(D.shouts[e.key].label)}”`, 'shout');
      else if (e.type === 'ht') { say(45, Comm.line(e, ctx)); Sound.play('whistle2'); voice('ht', true); }
      else if (e.type === 'ft') { say(e.min, Comm.line(e, ctx)); Sound.play('whistle3'); voice('ft', true); }
    };
    const flowOut = n0 => { const items = live.flow.slice(n0); view && view.feed(items);
      if (!keyMode && speed <= 2 && items.length && Math.random() < (speed === 1 ? .55 : .3)) { const f = items[items.length - 1]; say(live.min, Comm.line({ type: 'play', kind: f.kind, who: f.name, side: f.side }, ctx), 'dim'); } };
    const tick = () => {
      timer = null; if (paused || live.done) return;
      const n0 = live.flow ? live.flow.length : 0; lastKey = false;
      const evs = Sim.stepMatch(live); hdr.querySelector('#m-clock').textContent = String(live.min).padStart(2, '0') + "'";
      flowOut(n0); evs.forEach(handle);
      b.querySelector('#mom').style.cssText = `left:${50 - Math.max(0, live.mom) * 50}%;right:${50 + Math.min(0, live.mom) * 50}%;background:${live.mom >= 0 ? H.kit[0] : Art.awayKit(H.kit, A.kit)[0]}`;
      if (tab !== 'comm' && live.min % 3 === 0) drawPane();
      if (live.forced && live.forced.side === mine) { const f = live.forced; live.forced = null; forcedSub(f); return; }
      if (live.min === 45 && !htDone) { htDone = true; setTimeout(halfTime, 900); return; }
      if (live.min - tipAt >= 12 && live.min > 10) { const tip = assistantTip(car, live, mine); if (tip) { tipAt = live.min; showTip(tip); } }
      if (live.done) { setTimeout(fullTime, 1600); return; }
      schedule();
    };
    const schedule = () => { clearTimeout(timer); const d = keyMode ? (lastKey ? 1900 : 45) : MSPM[speed] * (lastKey ? 1.6 : 1); timer = setTimeout(tick, d); };
    const stop = () => { clearTimeout(timer); timer = null; };
    const fullTime = () => { cancelAnimationFrame(raf); stop(); finish(car, live, true); };
    const resume = () => { paused = false; schedule(); };
    const pause = () => {
      if (live.done) return; paused = true; stop(); Sound.play('whistle1');
      const list = el('div', 'menu-list');
      const add = (label, go, dis) => { const x = Nav.button({ label, go: () => { Nav.closeCard(); go(); } }, 'mi'); if (dis) x.disabled = true; list.appendChild(x); };
      add('Resume', resume);
      add('Tactics', () => { tacticsCard(live); waitCard(resume); });
      add(`Substitutions (${live.subs[mine]}/${D.season.subsAllowed})`, () => subsCard(null, resume), live.subs[mine] >= D.season.subsAllowed);
      add('Simulate to full-time', () => { live[mine].ai = true; live.headless = true; while (!live.done) Sim.stepMatch(live); updLed(); setTimeout(fullTime, 200); });
      Nav.card({ title: `Paused · ${live.min}'`, body: list, buttons: [], modal: true });
    };
    const waitCard = fn => { const iv = setInterval(() => { if (!document.querySelector('.overlay')) { clearInterval(iv); fn(); } }, 150); };
    const subsCard = (forcedOut, done) => {
      const t = live[mine]; let out = forcedOut; const box = el('div', 'subs');
      const draw = () => {
        box.innerHTML = forcedOut ? `<p class="center bad" style="margin:0 0 6px">${esc(G.surname(t.xi.concat(t.bench).find(p => p.id === forcedOut).name))} can't continue. Pick a replacement.</p>` : '';
        box.insertAdjacentHTML('beforeend', '<div class="sc-h"><span>On the pitch</span><span>Bench</span></div>');
        const cols = el('div', 'sc'); const L = el('div'), R = el('div');
        t.xi.forEach(p => { const lr = Sim.liveRating(live, p, mine); const x = el('button', 'sr' + (out === p.id ? ' sel' : ''), `<span class="ps">${p.pos}</span><span class="nm">${esc(G.surname(p.name))}</span><span class="ft ${p.fitness < 70 ? 'low' : ''}">${Math.round(p.fitness)}</span>`); x.title = lr ? 'Rating ' + lr : ''; x.onclick = () => { if (forcedOut) return; out = p.id; Sound.play('tap'); draw(); }; L.appendChild(x); });
        t.bench.forEach(p => { const x = el('button', 'sr in', `<span class="ps">${p.pos}</span><span class="nm">${esc(G.surname(p.name))}</span><span class="rt">${p.rating}</span>`); x.disabled = !out;
          x.onclick = () => { if (Sim.makeSub(live, mine, out, p.id)) { Sound.play('card'); handle(live.events[live.events.length - 1]); out = null; if (forcedOut || live.subs[mine] >= D.season.subsAllowed) { Nav.closeCard(); done(); return; } draw(); } }; R.appendChild(x); });
        cols.append(L, R); box.appendChild(cols); box.appendChild(el('p', 'note center', out ? 'Now tap a bench player' : 'Tap a player to take off (number = condition)'));
      };
      draw(); Nav.card({ title: `Substitutions ${live.subs[mine]}/${D.season.subsAllowed}`, cls: 'wide', body: box, buttons: forcedOut ? [{ label: 'Play with ten', ghost: true, go: () => { const p = t.xi.find(q => q.id === forcedOut); if (p) { t.xi = t.xi.filter(q => q !== p); live.mods[mine].push({ until: 999, create: .9, concede: 1.1 }); live.dirty = true; } done(); } }] : [{ label: 'Done', go: done }], modal: true });
    };
    const forcedSub = f => { paused = true; stop(); Sound.play('whistle1'); big('INJURY', 'var');
      if (live.subs[mine] >= D.season.subsAllowed || !live[mine].bench.length) { const p = live[mine].xi.find(q => q.id === f.pid); if (p) { live[mine].xi = live[mine].xi.filter(q => q !== p); live.mods[mine].push({ until: 999, create: .9, concede: 1.1 }); } Nav.toast('No substitutions left: you play on with ten', 'bad'); resume(); return; }
      setTimeout(() => subsCard(f.pid, () => { paused = false; schedule(); }), 500); };
    const shoutCard = () => {
      if (live.done) return; const box = el('div', 'shouts');
      for (const k in D.shouts) { const s = D.shouts[k], cd = (live.cool[mine][k] || 0) - live.min;
        const x = Nav.button({ label: s.label, sub: cd > 0 ? `Ready in ${cd}'` : s.sub, go: () => { Nav.closeCard(); if (Sim.shout(live, mine, k)) { Sound.buzz(20); handle({ type: 'shout', side: mine, key: k, min: live.min }); } } }, 'sh'); if (cd > 0) x.disabled = true; box.appendChild(x); }
      Nav.card({ title: 'Touchline shout', body: box, buttons: [{ label: 'Cancel', ghost: true }] });
    };
    const halfTime = () => {
      paused = true; stop();
      const s = live.st, box = el('div', 'stack');
      box.innerHTML = `<div class="htscore"><span class="crest">${Art.crest(H)}</span><b>${live.gH}-${live.gA}</b><span class="crest">${Art.crest(A)}</span></div>
        <div class="htstats">${[['Possession', Math.round(s.H.poss / live.min * 100) + '%', Math.round(s.A.poss / live.min * 100) + '%'], ['Shots', s.H.shots, s.A.shots], ['xG', s.H.xg.toFixed(2), s.A.xg.toFixed(2)]].map(([l, a, c]) => `<div><b>${a}</b><small>${l}</small><b>${c}</b></div>`).join('')}</div>
        <p class="note center" style="margin:0">“${esc(Comm.punditLine('ht', mine, live))}”</p>`;
      const talks = el('div', 'answers');
      const opts = [['Keep doing what you’re doing', { morale: 4 }, 'Calm faces. They believe in the plan.'], ['That’s not good enough!', { create: 1.12, morale: -2 }, 'A few heads drop, but they look fired up.'], ['Stay calm, stay organised', { concede: .88 }, 'Nods all round. Focused.'], ['Go out and enjoy it', { morale: 6, concede: 1.04 }, 'Smiles in the dressing room. Loose and confident.']];
      for (const [label, eff, react] of opts) talks.appendChild(Nav.button({ label, go: () => {
        if (eff.morale) for (const p of live[mine].xi) p.morale = Math.max(20, Math.min(100, p.morale + eff.morale));
        if (eff.create || eff.concede) live.mods[mine].push({ until: 90, create: eff.create, concede: eff.concede }); live.dirty = true;
        say(45, `Team talk: “${esc(label)}”. <i>${esc(react)}</i>`, 'shout'); Nav.closeCard(); Nav.toast(react); setTimeout(() => { Sound.play('whistle1'); resume(); }, 300); } }, 'ans'));
      box.appendChild(talks);
      Nav.card({ title: 'Half-time', body: box, buttons: [{ label: 'Tactics', ghost: true, keep: true, go: () => tacticsCard(live) }], modal: true });
    };
    const showTip = tip => { const tb = b.querySelector('#tipbar'); tb.innerHTML = ''; const d = el('div', 'tipbar', `${I('megaphone')}<span>${esc(tip.text)}</span>`);
      if (tip.apply) { const ap = el('button', 'chip good', 'Apply'); ap.onclick = () => { tip.apply(); say(live.min, `Assistant's idea applied: ${esc(tip.short)}`, 'shout'); tb.innerHTML = ''; }; d.appendChild(ap); }
      const x = el('button', 'chip', '✕'); x.onclick = () => tb.innerHTML = ''; d.appendChild(x); tb.appendChild(d); say(live.min, '💬 ' + esc(tip.text), 'tip'); setTimeout(() => { if (tb.firstChild === d) tb.innerHTML = ''; }, 9000); };
    drawTabs(); drawPane();
    return { header: hdr, cls: 'match-scr', body: b,
      back: { label: 'Pause', go: pause }, onBack: pause,
      extra: [{ label: 'Tactics', go: () => { if (live.done) return; paused = true; stop(); tacticsCard(live); waitCard(resume); } }],
      action: { label: 'Shout', go: shoutCard },
      mount: s => {
        const cv = s.querySelector('#pitch'), wrap = s.querySelector('.pitch-wrap'); cv.width = Math.round(wrap.clientWidth * 2); cv.height = Math.round(wrap.clientHeight * 2);
        view = makeView(cv, car, live, H, A);
        const loop = now => { view.frame(now, keyMode ? 400 : MSPM[speed]); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
        s.querySelector('#spd').onclick = () => { if (keyMode) return; speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; G.setPrefs({ speed }); s.querySelector('#spd').textContent = speed + '×'; Sound.play('tap'); if (!paused) schedule(); };
        Sound.crowd(1); Sound.play('whistle1'); voice('kickoff', true);
        say(0, Comm.line({ type: 'kickoff', side: 'H' }, ctx));
        if (car.matchesPlayed < D.tipsForMatches) say(0, esc(D.tips[car.matchesPlayed % D.tips.length]), 'tip');
        setTimeout(schedule, 800);
      } };
  });
  // ---------- match panes ----------
  function statsRows(st, mins) {
    const pc = s => Math.round(s.poss / Math.max(1, mins) * 100);
    return [['Possession', pc(st.H) + '%', pc(st.A) + '%', pc(st.H), pc(st.A)], ['Shots', st.H.shots, st.A.shots], ['On target', st.H.on, st.A.on], ['xG', st.H.xg.toFixed(2), st.A.xg.toFixed(2), st.H.xg, st.A.xg],
      ['Corners', st.H.corners, st.A.corners], ['Fouls', st.H.fouls, st.A.fouls], ['Offsides', st.H.off, st.A.off], ['Cards', st.H.yc + (st.H.rc ? '+' + st.H.rc + '🟥' : ''), st.A.yc + (st.A.rc ? '+' + st.A.rc + '🟥' : ''), st.H.yc, st.A.yc], ['Passes', st.H.passes, st.A.passes]];
  }
  function statsBlock(m, H, A) {
    const box = el('div', 'mstats2'), st = m.st || { H: {}, A: {} }; if (!m.st) return box;
    box.innerHTML = statsRows(st, m.min || m.total).map(([l, a, b, x, y]) => { x = x == null ? +a : x; y = y == null ? +b : y; const t = (x + y) || 1;
      return `<div class="srow"><b>${a}</b><span><small>${l}</small><i class="bar"><em style="width:${x / t * 100}%;background:${H.kit[0]}"></em><em style="width:${y / t * 100}%;background:${Art.awayKit(H.kit, A.kit)[0]}"></em></i></span><b>${b}</b></div>`; }).join('');
    return box;
  }
  function ratingsBlock(car, m, H, A) {
    const box = el('div', 'mrates');
    for (const s of ['H', 'A']) { const t = m[s], col = el('div', 'rcol'), list = t.xi.concat((t.squad || []).filter(p => m.played && m.played.has(p.id) && !t.xi.includes(p)));
      col.innerHTML = `<b class="rh">${esc(short(s === 'H' ? H : A))}</b>` + list.slice(0, 13).map(p => { const r = Sim.liveRating(m, p, s); return `<div class="rr${t.xi.includes(p) ? '' : ' off'}"><span>${esc(G.surname(p.name))}</span><b class="${r >= 7.5 ? 'good' : r < 6 ? 'bad' : ''}">${r != null ? r.toFixed(1) : '–'}</b></div>`; }).join('');
      box.appendChild(col); }
    return box;
  }
  function lineupsBlock(car, m, H, A) {
    const box = el('div', 'mrates');
    for (const s of ['H', 'A']) { const t = m[s], c = s === 'H' ? H : A, col = el('div', 'rcol');
      col.innerHTML = `<b class="rh">${esc(short(c))} <small>${esc(c.id === car.me ? Sim.tac(car).shape : t.tactics.formation)}</small></b>` + t.xi.map((p, i) => `<div class="rr"><span><em>${c.id === car.me ? (p.num || i + 1) : i + 1}</em> ${esc(G.surname(p.name))}</span><b class="dim">${p.pos}</b></div>`).join('');
      box.appendChild(col); }
    return box;
  }
  function assistantTip(car, m, mine) {
    const o = mine === 'H' ? 'A' : 'H', us = mine === 'H' ? m.gH : m.gA, them = mine === 'H' ? m.gA : m.gH, st = m.st;
    const tired = m[o].xi.filter(p => p.grp === 'DF' && p.fitness < 66)[0];
    const possUs = st ? st[mine].poss / Math.max(1, m.min) : .5;
    if (m.min >= 70 && us < them && m[mine].tactics.mentality !== 'attacking' && m[mine].tactics.mentality !== 'overload') return { text: 'We need a goal. Switch to an Attacking mentality?', short: 'Attacking mentality', apply: () => Sim.setTactic(m, mine, 'mentality', 'attacking') };
    if (m.min >= 75 && us > them && !['defensive', 'contain'].includes(m[mine].tactics.mentality)) return { text: 'Protect the lead. Go Defensive for the last minutes?', short: 'Defensive mentality', apply: () => Sim.setTactic(m, mine, 'mentality', 'defensive') };
    if (st && st[o].xg - st[mine].xg > .7) return { text: 'They are creating too much. Drop the defensive line deeper?', short: 'Deeper line', apply: () => { const t = Sim.tac(car); t.op.line = 0; m[mine].tm = Sim.tmods(car); m.dirty = true; } };
    if (possUs < .4) return { text: `We are losing the midfield (${Math.round(possUs * 100)}% possession). Try a Control mentality?`, short: 'Control mentality', apply: () => Sim.setTactic(m, mine, 'mentality', 'control') };
    if (tired) return { text: `Their ${Comm.sn(tired.name)} (${tired.pos}) is tiring. Get at him with pace and width.`, short: 'Wide play', apply: () => { const t = Sim.tac(car); t.ip.width = 2; m[mine].tm = Sim.tmods(car); m.dirty = true; } };
    const booked = m[mine].xi.find(p => m.cards && m.cards[p.id] === 1 && p.grp !== 'GK' && p.fitness < 75);
    if (booked) return { text: `${Comm.sn(booked.name)} is on a yellow and tiring. Consider taking him off.`, short: '' };
    return null;
  }

  // ================= Full time =================
  const FT = { tab: 'summary' };
  Nav.define('fulltime', p => {
    const car = S.career, m = p.m, H = G.club(m.h), A = G.club(m.a), mine = m.h === car.me ? 'H' : 'A';
    const us = mine === 'H' ? m.gH : m.gA, them = mine === 'H' ? m.gA : m.gH, res = m.cup ? (m.winner === car.me ? 'win' : 'loss') : us > them ? 'win' : us < them ? 'loss' : 'draw';
    const potm = car.players.find(x => x.id === m.potm), pos = Sim.position(car, car.me), delta = Math.round((car.board.confidence - p.before) * 10) / 10;
    const goals = side => { const g = {}, o = []; for (const e of m.events) if (e.type === 'goal' && e.side === side) { const k = G.surname(e.who); if (!g[k]) { g[k] = []; o.push(k); } g[k].push(e.min + "'" + (e.pen ? ' p' : '')); } return o.map(k => `${esc(k)} ${g[k].join(', ')}`).join(' · ') || '&nbsp;'; };
    const reds = side => m.events.filter(e => e.type === 'red' && e.side === side).map(e => `🟥 ${esc(G.surname(e.who))} ${e.min}'`).join(' · ');
    const coins = res === 'win' ? D.coins.win : res === 'draw' ? D.coins.draw : 0;
    const b = el('div', 'ftv');
    b.innerHTML = `<div class="panel hero"><div class="ft-score"><div><span class="crest">${Art.crest(H)}</span><b>${esc(short(H))}</b></div><div class="sb-led"><b>${m.gH}-${m.gA}</b></div><div><span class="crest">${Art.crest(A)}</span><b>${esc(short(A))}</b></div></div>
      <div class="ft-goals" style="margin-top:6px"><div class="clamp2">${goals('H')}${reds('H') ? ' · ' + reds('H') : ''}</div><div class="clamp2">${goals('A')}${reds('A') ? ' · ' + reds('A') : ''}</div></div>${m.pens ? `<p class="center gold" style="margin:6px 0 0;font:700 15px var(--serif)">${esc(short(G.club(m.winner)))} win ${Math.max(...m.pens)}-${Math.min(...m.pens)} on penalties</p>` : ''}</div>`;
    b.appendChild(Nav.subtabs([{ id: 'summary', label: 'Summary' }, { id: 'stats', label: 'Stats' }, { id: 'ratings', label: 'Ratings' }, { id: 'analysis', label: 'Analysis' }], FT.tab, id => { FT.tab = id; Nav.refresh(); }, true));
    const pane = el('div', 'fill'); b.appendChild(pane);
    const fake = { st: m.st, min: m.total, total: m.total, H: {}, A: {} };
    if (FT.tab === 'summary') pane.innerHTML = `<div class="panel potm"><span class="shirtbox">${potm ? G.shirtOf(potm, null) : ''}</span><div style="min-width:0"><small>Player of the match</small><b>${potm ? esc(potm.name) : '—'}</b><span class="rating">${potm ? m.ratings[potm.id].toFixed(1) : ''}</span></div></div>
      <p class="note center" style="margin:6px 0">“${esc(Comm.punditLine('ft', mine, m))}”</p>
      <div class="tiles t4keep"><div class="tile"><span class="tv"><small>${m.cup ? 'Cup' : 'Position'}</small><b>${m.cup ? (m.winner === car.me ? (car.cups[m.cup].winner === car.me ? 'Winners!' : 'Through') : 'Out') : G.ord(pos)}${!m.cup && p.posBefore ? (pos < p.posBefore ? ' <span class="good">▲</span>' : pos > p.posBefore ? ' <span class="bad">▼</span>' : '') : ''}</b></span></div><div class="tile"><span class="tv"><small>Board</small><b class="${delta >= 0 ? 'good' : 'bad'}">${delta >= 0 ? '+' : ''}${delta}</b></span></div><div class="tile"><span class="tv"><small>Fans</small><b>${Math.round(car.fans)}</b></span></div><div class="tile"><span class="tv"><small>Coins</small><b>+${coins}</b></span></div></div>`;
    if (FT.tab === 'stats') pane.appendChild(statsBlock(fake, H, A));
    if (FT.tab === 'ratings') { const box = el('div', 'mrates');
      for (const s of ['H', 'A']) { const cid = s === 'H' ? m.h : m.a, col = el('div', 'rcol'), list = car.players.filter(q => m.ratings[q.id] != null && q.club === cid).sort((a, b) => m.ratings[b.id] - m.ratings[a.id]);
        col.innerHTML = `<b class="rh">${esc(short(G.club(cid)))}</b>` + list.slice(0, 14).map(q => { const r = m.ratings[q.id]; return `<div class="rr"><span>${q.id === m.potm ? '★ ' : ''}${esc(G.surname(q.name))}</span><b class="${r >= 7.5 ? 'good' : r < 6 ? 'bad' : ''}">${r.toFixed(1)}</b></div>`; }).join(''); box.appendChild(col); }
      pane.appendChild(box); }
    if (FT.tab === 'analysis') pane.appendChild(analysis(m, H, A));
    return { header: G.titleHeader(res === 'win' ? 'Victory!' : res === 'loss' ? 'Defeat' : 'Draw', m.comp || `${WORLD.divisions[H.div].name} · Week ${car.week}`, 'whistle'), body: b, bg: res === 'win' ? 'bg_dressing' : 'bg_tunnel', back: false,
      action: { label: 'Continue', go: () => { FT.tab = 'summary'; Sound.crowd(.25); Nav.backTo('hub'); } },
      mount: () => { if (p.done) return; p.done = true; Sound.crowd(res === 'win' ? .9 : .3); if (res === 'win') { Sound.swell(2, 2); Sound.play('applause'); } else if (res === 'loss') Sound.play('boo', { vol: .5 }); if (coins) setTimeout(() => Sound.play('coin'), 600); G.checkAchievements({ match: m }); } };
  });
  // xG timeline (cumulative) and key moments
  function analysis(m, H, A) {
    const box = el('div', 'stack grow'), W = 320, Hh = 120, T = Math.max(90, m.total);
    const pts = { H: [[0, 0]], A: [[0, 0]] }, acc = { H: 0, A: 0 };
    for (const e of m.events) if (e.xg && e.side) { acc[e.side] += e.xg; pts[e.side].push([e.min, acc[e.side]]); }
    for (const s of ['H', 'A']) pts[s].push([T, acc[s]]);
    const maxY = Math.max(1, acc.H, acc.A) * 1.1, X = v => v / T * W, Y = v => Hh - v / maxY * Hh;
    const path = s => pts[s].map(([x, y], i) => (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(i ? pts[s][i - 1][1] : y).toFixed(1) + ' L' + X(x).toFixed(1) + ' ' + Y(y).toFixed(1)).join(' ');
    const goals = m.events.filter(e => e.type === 'goal');
    box.innerHTML = `<div class="panel" style="padding:8px 10px"><div class="ptitle" style="font-size:15px">xG timeline <span class="r" style="font:600 12px var(--sans)">${esc(short(H))} ${acc.H.toFixed(2)} · ${acc.A.toFixed(2)} ${esc(short(A))}</span></div>
      <svg viewBox="-4 -4 ${W + 8} ${Hh + 18}" style="width:100%;height:auto;display:block"><line x1="${X(45)}" y1="0" x2="${X(45)}" y2="${Hh}" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 3"/><line x1="0" y1="${Hh}" x2="${W}" y2="${Hh}" stroke="rgba(255,255,255,.2)"/>
      <path d="${path('H')}" fill="none" stroke="${H.kit[0]}" stroke-width="2.5"/><path d="${path('A')}" fill="none" stroke="${Art.awayKit(H.kit, A.kit)[0]}" stroke-width="2.5"/>
      ${goals.map(e => `<circle cx="${X(e.min)}" cy="${Y(pts[e.side].find(p => p[0] === e.min) ? pts[e.side].find(p => p[0] === e.min)[1] : acc[e.side])}" r="4" fill="#fff" stroke="#111"/>`).join('')}
      <text x="0" y="${Hh + 13}" fill="#a7b6ab" font-size="9">0'</text><text x="${X(45) - 6}" y="${Hh + 13}" fill="#a7b6ab" font-size="9">45'</text><text x="${W - 14}" y="${Hh + 13}" fill="#a7b6ab" font-size="9">90'</text></svg></div>`;
    const km = m.events.filter(e => ['goal', 'red', 'penmiss', 'disallowed'].includes(e.type) || (e.type === 'chance' && e.kind === 'post'));
    const list = el('div', 'panel grow'); list.style.overflow = 'hidden'; list.style.padding = '8px 10px';
    list.innerHTML = `<div class="ptitle" style="font-size:15px">Key moments</div>` + (km.length ? km.slice(0, innerHeight < 700 ? 3 : 7).map(e => `<div class="dl"><span>${e.min}' ${e.type === 'goal' ? '⚽' : e.type === 'red' ? '🟥' : e.type === 'disallowed' ? '🚫' : e.type === 'penmiss' ? '✋' : '🥅'} ${esc(Comm.sn(e.who))} <small class="dim">${esc(short(e.side === 'H' ? H : A))}</small></span><b>${e.type === 'goal' ? (e.xg ? `xG ${e.xg.toFixed(2)}` : 'Goal') : e.type === 'red' ? 'Red' : e.type === 'disallowed' ? 'VAR' : e.type === 'penmiss' ? 'Missed' : 'Post'}</b></div>`).join('') : '<p class="note">A quiet game.</p>');
    box.appendChild(list); return box;
  }

  window.MatchUI = { kickOff, tacticsCard };
})();
