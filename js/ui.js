// Screens and rendering in the Forge Frame house style (frames, ribbons, laurel buttons).
// One screen does one job; buttons stay where they are.
'use strict';
const UI = (() => {
  const $ = s => document.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const money = k => (k < 0 ? '−' : '') + '£' + (Math.abs(k) >= 1000 ? (Math.abs(k) / 1000).toFixed(1) + 'm' : Math.abs(k) + 'k');
  const clubOf = (career, id) => (career ? career.clubs : DATA.clubs).find(c => c.id === id);
  function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }

  // ---- kit-dyed shield crest (stand-in until the painted Kie crests): pattern varies per club ----
  const PATTERNS = ['halves', 'stripes', 'hoops', 'sash', 'chevron', 'quarters']; let crestN = 0;
  function crestSVG(c) {
    const i = DATA.clubs.findIndex(k => k.id === c.id), pat = PATTERNS[(i < 0 ? 0 : i) % PATTERNS.length], [a, b] = c.kit, id = 'cr' + c.id + (crestN++);
    const shield = 'M50 4 L92 14 V52 C92 80 72 98 50 112 C28 98 8 80 8 52 V14 Z';
    let fill = '';
    if (pat === 'halves') fill = `<rect x="50" y="0" width="50" height="120" fill="${b}"/>`;
    if (pat === 'stripes') fill = [22, 50, 78].map(x => `<rect x="${x - 7}" y="0" width="14" height="120" fill="${b}"/>`).join('');
    if (pat === 'hoops') fill = [30, 62, 94].map(y => `<rect x="0" y="${y - 8}" width="100" height="16" fill="${b}"/>`).join('');
    if (pat === 'sash') fill = `<path d="M0 30 L30 0 L100 80 L100 110 Z" fill="${b}"/>`;
    if (pat === 'chevron') fill = `<path d="M0 40 L50 70 L100 40 L100 62 L50 92 L0 62 Z" fill="${b}"/>`;
    if (pat === 'quarters') fill = `<rect x="50" y="0" width="50" height="58" fill="${b}"/><rect x="0" y="58" width="50" height="62" fill="${b}"/>`;
    return `<svg viewBox="0 0 100 116" width="100%" height="100%" aria-hidden="true">
      <defs><clipPath id="${id}"><path d="${shield}"/></clipPath>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c0"/><stop offset=".45" stop-color="#c99a3d"/><stop offset="1" stop-color="#6e4d1a"/></linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
      <g clip-path="url(#${id})"><rect width="100" height="120" fill="${a}"/>${fill}<rect width="100" height="120" fill="url(#${id}s)"/></g>
      <path d="${shield}" fill="none" stroke="url(#${id}g)" stroke-width="6"/>
      <text x="50" y="66" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="800" font-size="22" fill="#fff6d6" stroke="#2a1806" stroke-width="3" paint-order="stroke">${c.short}</text>
    </svg>`;
  }
  function shirtURL(c) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M22 6 L32 11 L42 6 L58 16 L52 28 L46 25 V58 H18 V25 L12 28 L6 16 Z" fill="${c.kit[0]}" stroke="#e9c46a" stroke-width="3" stroke-linejoin="round"/><path d="M26 7 Q32 14 38 7" fill="none" stroke="${c.kit[1]}" stroke-width="3"/><rect x="18" y="30" width="28" height="5" fill="${c.kit[1]}" opacity=".9"/></svg>`;
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  const stars = t => '★'.repeat(4 - t) + '<span style="opacity:.25">' + '★'.repeat(t - 1) + '</span>';

  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); $('#' + id).classList.remove('hidden'); haptic(); }

  function frame(ribbon, inner) { const s = el('section', 'frame'); if (ribbon) s.appendChild(el('h3', 'ribbon', ribbon)); if (inner) s.appendChild(inner); return s; }

  // ---------------- club picker ----------------
  function clubList(onPick) {
    const box = $('#club-list'); box.innerHTML = ''; let chosen = null;
    const take = $('#btn-take'); take.disabled = true;
    const banner = el('div', 'banner', '<b>New Career</b><small>Choose a club to manage · 22 match weeks</small>'); box.appendChild(banner);
    const groups = { 1: 'Title Contenders', 2: 'Mid-Table Hopefuls', 3: 'Underdogs' };
    for (const t of [1, 2, 3]) {
      const list = el('div', 'list');
      for (const c of DATA.clubs.filter(k => k.tier === t)) {
        const b = el('button', 'slot', `<span class="crest">${crestSVG(c)}</span><span class="who"><span class="kick">${c.nick}</span><b>${c.name}</b><small>${c.city} · ${c.stadium.toLocaleString()} seats · est. ${c.founded}</small></span><span class="stars">${stars(t)}</span>`);
        b.onclick = () => { box.querySelectorAll('.slot').forEach(s => s.classList.remove('on')); b.classList.add('on'); chosen = c.id; take.disabled = false;
          banner.innerHTML = `<b>${c.name}</b><small>${t === 1 ? 'Big budget, big expectations' : t === 2 ? 'Push for Europe on a sensible budget' : 'Survive first, then dream'}</small>`; haptic(); };
        list.appendChild(b);
      }
      const f = frame(groups[t], list); box.appendChild(f);
    }
    take.onclick = () => { if (chosen) onPick(chosen); };
  }

  // ---------------- hub ----------------
  function nextFixture(career) {
    const round = career.fixtures[career.week]; if (!round) return null;
    const f = round.find(([h, a]) => h === career.me || a === career.me); return f ? { h: f[0], a: f[1], home: f[0] === career.me } : null;
  }
  function position(career) { return Sim.table(career).findIndex(r => r.id === career.me) + 1; }
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

  function hub(career, tab) {
    const me = clubOf(career, career.me), body = $('#hub-body');
    $('#hub-crest').innerHTML = crestSVG(me); $('#hub-club').textContent = me.name;
    $('#hub-week').textContent = career.week < career.fixtures.length ? 'Week ' + (career.week + 1) + '/' + career.fixtures.length : 'Season over';
    document.querySelector('.tabs .shirt').style.backgroundImage = shirtURL(me);
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('#btn-play').disabled = career.week >= career.fixtures.length;
    body.innerHTML = ''; body.scrollTop = 0;

    // next-match banner on every tab, like the DoD Quick Match bar
    const nf = nextFixture(career);
    if (nf) { const opp = clubOf(career, nf.home ? nf.a : nf.h);
      body.appendChild(el('div', 'banner', `<b>${nf.home ? 'vs' : 'at'} ${opp.name}</b><small>${nf.home ? 'Home' : 'Away'} · Week ${career.week + 1}${career.week ? ' · You are ' + ord(position(career)) : ''}</small>`)); }
    else body.appendChild(el('div', 'banner', `<b>Season complete</b><small>Finished ${ord(position(career))} of ${career.clubs.length}</small>`));

    const squad = career.players.filter(p => p.club === career.me);
    if (tab === 'squad') {
      const { xi } = Sim.pickXI(squad, career.tactics[career.me].formation); const inXI = new Set(xi.map(p => p.id));
      const t = el('table', 'plain', '<tr><th>Pos</th><th>Name</th><th class="n">Age</th><th class="n">Rtg</th><th>Fit</th></tr>');
      for (const p of squad) t.appendChild(el('tr', inXI.has(p.id) ? 'xi' : '',
        `<td><span class="pos ${p.pos}">${p.pos}</span></td><td>${p.name}${p.injured ? ' <img src="assets/ui/icons/heal.png" style="width:16px;vertical-align:-3px" alt="injured">' : ''}</td><td class="n">${p.age}</td><td class="n"><span class="rtg">${p.rating}</span></td><td><span class="bar"><i style="width:${Math.round(p.fitness)}%"></i></span></td>`));
      const f = frame('First Team', t); f.appendChild(el('p', 'note', 'Gold edge = starting XI for the next match, picked by your formation.')); body.appendChild(f);
    }
    if (tab === 'tactics') {
      const tac = career.tactics[career.me], wrap = el('div');
      const group = (label, key, opts, sub) => { const d = el('div', 'opt', `<label>${label}</label>`), row = el('div', 'seg');
        for (const k in opts) { const b = el('button', tac[key] === k ? 'on' : '', (opts[k].label || k) + (sub ? `<small>${sub(opts[k])}</small>` : ''));
          b.onclick = () => { tac[key] = k; Save.store(career); hub(career, 'tactics'); }; row.appendChild(b); }
        d.appendChild(row); return d; };
      wrap.appendChild(group('Formation', 'formation', DATA.formations, f => f.balance > 0 ? 'attacking' : f.balance < 0 ? 'solid' : 'balanced'));
      wrap.appendChild(group('Mentality', 'mentality', DATA.mentality));
      wrap.appendChild(group('Style of Play', 'style', DATA.styles));
      const f = frame('Match Plan', wrap); f.appendChild(el('p', 'note', 'Attacking makes more chances and gives more away. Possession suits good passers, Counter suits pace.')); body.appendChild(f);
    }
    if (tab === 'fixtures') {
      const t = el('table', 'plain', '<tr><th>Wk</th><th>Opponent</th><th></th><th class="n">Result</th></tr>');
      career.fixtures.forEach((round, w) => { const f = round.find(([h, a]) => h === career.me || a === career.me); if (!f) return;
        const home = f[0] === career.me, opp = clubOf(career, home ? f[1] : f[0]), r = career.results.find(m => m.week === w && m.h === f[0]);
        let res = ''; if (r) { const us = home ? r.gH : r.gA, them = home ? r.gA : r.gH; res = `<span class="${us > them ? 'res-w' : us < them ? 'res-l' : 'res-d'}">${us > them ? 'W' : us < them ? 'L' : 'D'} ${us}–${them}</span>`; }
        t.appendChild(el('tr', w === career.week ? 'me' : '', `<td>${w + 1}</td><td><span class="mini" style="display:inline-block">${crestSVG(opp)}</span>${opp.name}</td><td>${home ? 'H' : 'A'}</td><td class="n">${res}</td>`)); });
      body.appendChild(frame('Fixtures', t));
    }
    if (tab === 'table') {
      const t = el('table', 'plain', '<tr><th>#</th><th>Club</th><th class="n">P</th><th class="n">W</th><th class="n">D</th><th class="n">L</th><th class="n">GD</th><th class="n">Pts</th></tr>');
      Sim.table(career).forEach((r, i) => { const c = clubOf(career, r.id);
        t.appendChild(el('tr', r.id === career.me ? 'me' : '', `<td>${i + 1}</td><td><span class="mini" style="display:inline-block">${crestSVG(c)}</span>${c.short}</td><td class="n">${r.p}</td><td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td><td class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="n"><span class="rtg">${r.pts}</span></td>`)); });
      body.appendChild(frame('League Table', t));
    }
    if (tab === 'finance') {
      const f = Sim.weekFinance(career, career.me, true, false), tiles = el('div', 'tiles');
      tiles.innerHTML = `<div class="tile span2"><img src="assets/ui/icons/gold.png" alt=""><div><small>Club balance</small><b>${money(career.balances[career.me])}</b></div></div>
        <div class="tile"><small>Gate / match</small><b>${money(f.gate)}</b></div><div class="tile"><small>Wages / week</small><b style="color:var(--bad)">${money(-f.wages)}</b></div>
        <div class="tile"><small>Sponsors</small><b>${money(f.sponsor)}</b></div><div class="tile"><small>TV money</small><b>${money(f.tv)}</b></div>
        <div class="tile span2"><div style="flex:1"><small>Weekly net (home win)</small><b style="color:${f.net >= 0 ? 'var(--ok)' : 'var(--bad)'}">${money(f.net)}</b></div></div>`;
      body.appendChild(frame('Club Accounts', tiles));
      const board = el('div', 'tile', `<small>Board confidence</small><b>${career.boardPatience}/100</b><div class="meter"><i style="width:${career.boardPatience}%"></i></div>`);
      const fb = frame('The Board', board); fb.appendChild(el('p', 'note', 'League position and a healthy balance keep the board on your side.')); body.appendChild(fb);
    }
  }

  // ---------------- match ----------------
  const SHAPES = {   // x (0 own goal → 1 opp goal), y (0..1) per outfield line
    DF: n => Array.from({ length: n }, (_, i) => [.2, (i + 1) / (n + 1)]),
    MF: n => Array.from({ length: n }, (_, i) => [.42, (i + 1) / (n + 1)]),
    FW: n => Array.from({ length: n }, (_, i) => [.62, (i + 1) / (n + 1)]),
  };
  function shape(formation) { const f = DATA.formations[formation]; return [[.05, .5]].concat(SHAPES.DF(f.DF), SHAPES.MF(f.MF), SHAPES.FW(f.FW)); }

  function drawPitch(ctx, W, H, home, away, fH, fA, ball, push) {
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#3f8a4b' : '#47944f'; ctx.fillRect(i * W / 10, 0, W / 10 + 1, H); }
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * .7); g.addColorStop(0, 'rgba(255,240,200,.08)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(245,250,240,.85)'; ctx.lineWidth = 2.5; const m = 18;
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m); ctx.beginPath(); ctx.moveTo(W / 2, m); ctx.lineTo(W / 2, H - m); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 50, 0, 7); ctx.stroke();
    ctx.strokeRect(m, H / 2 - 95, 80, 190); ctx.strokeRect(W - m - 80, H / 2 - 95, 80, 190); ctx.strokeRect(m, H / 2 - 42, 28, 84); ctx.strokeRect(W - m - 28, H / 2 - 42, 28, 84);
    const dot = (x, y, kit) => { ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = kit[0]; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = kit[1]; ctx.stroke(); };
    const px = (x, y) => [m + x * (W - 2 * m), m + y * (H - 2 * m)];
    shape(fH).forEach(([x, y], i) => { const [a, b] = px(Math.min(.95, x * .5 + (i ? push : 0)), y); dot(a, b, home.kit); });
    shape(fA).forEach(([x, y], i) => { const [a, b] = px(Math.max(.05, 1 - x * .5 + (i ? push : 0)), 1 - y); dot(a, b, away.kit); });
    ctx.beginPath(); ctx.arc(ball[0], ball[1], 6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111'; ctx.stroke();
  }

  function match(career, m, done) {
    const H = clubOf(career, m.h), A = clubOf(career, m.a);
    $('#m-home').textContent = H.name; $('#m-away').textContent = A.name; $('#m-hcrest').innerHTML = crestSVG(H); $('#m-acrest').innerHTML = crestSVG(A);
    $('#m-score').textContent = '0 – 0'; $('#m-clock').textContent = "0'";
    const feed = $('#m-feed'); feed.innerHTML = ''; show('match');
    const cv = $('#pitch-canvas'), ctx = cv.getContext('2d'), W = cv.width = 720, Hh = cv.height = 480;
    const fH = career.tactics[m.h].formation, fA = career.tactics[m.a].formation;
    let ball = [W / 2, Hh / 2], target = ball.slice(), push = 0, pushT = 0, raf;
    const loop = () => { ball[0] += (target[0] - ball[0]) * .12; ball[1] += (target[1] - ball[1]) * .12; push += (pushT - push) * .06; drawPitch(ctx, W, Hh, H, A, fH, fA, ball, push); raf = requestAnimationFrame(loop); };
    loop();
    const line = (min, html, cls) => { const p = el('p', cls || '', `<b class="min">${min}'</b>${html}`); feed.prepend(p); };
    let i = 0, min = 0, speed = 1, gH = 0, gA = 0, timer;
    if (career.matchesPlayed < DATA.tipsForMatches) feed.appendChild(el('p', 'tip', 'Tip: ' + DATA.tips[career.matchesPlayed % DATA.tips.length]));
    line(0, 'Kick-off!');
    const tick = () => {
      min++; $('#m-clock').textContent = min + "'";
      if (min % 3 === 0) { target = [W * (.3 + Math.random() * .4), Hh * (.2 + Math.random() * .6)]; pushT = (Math.random() - .5) * .08; }
      while (i < m.events.length && m.events[i].min <= min) { const e = m.events[i++], side = e.side === 'H' ? H : A, toRight = e.side === 'H';
        if (e.type === 'goal') { if (toRight) gH++; else gA++; $('#m-score').textContent = gH + ' – ' + gA; line(e.min, `⚽ GOAL! ${e.who} scores for ${side.short}`, 'goal'); haptic(40);
          target = [toRight ? W - 26 : 26, Hh / 2 + (Math.random() - .5) * 40]; pushT = toRight ? .1 : -.1; }
        else if (e.type === 'chance') { line(e.min, `${e.who} (${side.short}) shoots… saved.`); target = [toRight ? W - 90 : 90, Hh / 2 + (Math.random() - .5) * 120]; pushT = toRight ? .07 : -.07; }
        else if (e.type === 'injury') line(e.min, `${e.who} goes down injured.`); }
      if (min === 45) line(45, 'Half-time.');
      if (min >= m.total) { clearInterval(timer); line(min, `Full-time: ${H.short} ${gH}–${gA} ${A.short}`); setTimeout(() => { cancelAnimationFrame(raf); done(); }, 900); }
    };
    timer = setInterval(tick, 330 / speed);
    $('#m-speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('#m-speed').textContent = speed + '×'; clearInterval(timer); timer = setInterval(tick, 330 / speed); haptic(); };
    $('#m-skip').onclick = () => { clearInterval(timer); while (min < m.total) tick(); };
    $('#m-tactics').onclick = () => { line(min, 'In-match tactics arrive in the next update.', 'tip'); haptic(); };
  }

  function result(career, m) {
    const H = clubOf(career, m.h), A = clubOf(career, m.a), mine = m.h === career.me;
    const won = mine ? m.gH > m.gA : m.gA > m.gH, draw = m.gH === m.gA;
    $('#r-head').textContent = draw ? 'Draw' : won ? 'Victory!' : 'Defeat';
    const scorers = m.events.filter(e => e.type === 'goal').map(e => `${e.min}' ${e.who} <span style="opacity:.6">(${e.side === 'H' ? H.short : A.short})</span>`).join('<br>') || 'No goals.';
    $('#r-summary').innerHTML = `<div class="final"><div><span class="c">${crestSVG(H)}</span><small>${H.name}</small></div><b class="s">${m.gH} – ${m.gA}</b><div><span class="c">${crestSVG(A)}</span><small>${A.name}</small></div></div>
      <div class="scorers">${scorers}</div>`;
    show('result');
  }

  return { $, show, clubList, hub, match, result, money, crestSVG };
})();
