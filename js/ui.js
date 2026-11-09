// Screens and rendering. One screen does one job; buttons stay where they are.
'use strict';
const UI = (() => {
  const $ = s => document.querySelector(s), el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const money = k => (k < 0 ? '-' : '') + '£' + Math.abs(k).toLocaleString() + 'k';
  const crest = c => `<span class="crest" style="background:linear-gradient(135deg,${c.kit[0]} 50%,${c.kit[1]} 50%)"></span>`;

  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); $('#' + id).classList.remove('hidden'); haptic(); }
  function haptic() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }

  function clubList(onPick) {
    const box = $('#club-list'); box.innerHTML = '';
    for (const c of DATA.clubs) {
      const card = el('button', 'card', `${crest(c)}<div><b>${c.name}</b><small>${c.city} · Tier ${c.tier} · ${c.stadium.toLocaleString()} seats</small></div>`);
      card.onclick = () => onPick(c.id); box.appendChild(card);
    }
  }

  function hub(career, tab) {
    const me = career.clubs.find(c => c.id === career.me), body = $('#hub-body');
    $('#hub-club').textContent = me.name; $('#hub-week').textContent = 'Week ' + (career.week + 1) + ' / ' + career.fixtures.length;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    body.innerHTML = '';
    const squad = career.players.filter(p => p.club === career.me);
    if (tab === 'squad') {
      const { xi } = Sim.pickXI(squad, career.tactics[career.me].formation); const inXI = new Set(xi.map(p => p.id));
      const t = el('table', 'plain', '<tr><th>Pos</th><th>Name</th><th>Age</th><th>Rtg</th><th>Fit</th><th>Wage</th></tr>');
      for (const p of squad) t.appendChild(el('tr', inXI.has(p.id) ? 'me' : '', `<td>${p.pos}</td><td>${p.name}${p.injured ? ' 🩹' : ''}</td><td>${p.age}</td><td>${p.rating}</td><td>${Math.round(p.fitness)}</td><td>${money(Sim.wage(p))}</td>`));
      body.appendChild(el('p', '', 'Gold rows start the next match.')); body.appendChild(t);
    }
    if (tab === 'tactics') {
      const tac = career.tactics[career.me];
      const group = (label, key, opts) => { const d = el('div', 'list', `<p>${label}</p>`); const row = el('div', 'row');
        for (const k in opts) { const b = el('button', 'small' + (tac[key] === k ? ' on' : ''), opts[k].label || k); if (tac[key] === k) b.style.borderColor = 'var(--gold)'; b.onclick = () => { tac[key] = k; Save.store(career); hub(career, 'tactics'); }; row.appendChild(b); }
        d.appendChild(row); return d; };
      body.appendChild(group('Formation', 'formation', DATA.formations)); body.appendChild(group('Mentality', 'mentality', DATA.mentality)); body.appendChild(group('Style', 'style', DATA.styles));
    }
    if (tab === 'fixtures') {
      const t = el('table', 'plain', '<tr><th>Wk</th><th>Match</th><th>Result</th></tr>');
      career.fixtures.forEach((round, w) => { const f = round.find(([h, a]) => h === career.me || a === career.me); if (!f) return;
        const r = career.results.find(m => m.week === w && m.h === f[0]); const name = id => career.clubs.find(c => c.id === id).short;
        t.appendChild(el('tr', w === career.week ? 'me' : '', `<td>${w + 1}</td><td>${name(f[0])} v ${name(f[1])}</td><td>${r ? r.gH + '–' + r.gA : ''}</td>`)); });
      body.appendChild(t);
    }
    if (tab === 'table') {
      const t = el('table', 'plain', '<tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>');
      Sim.table(career).forEach((r, i) => { const c = career.clubs.find(k => k.id === r.id);
        t.appendChild(el('tr', r.id === career.me ? 'me' : '', `<td>${i + 1}</td><td>${c.short}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf - r.ga}</td><td><b>${r.pts}</b></td>`)); });
      body.appendChild(t);
    }
    if (tab === 'finance') {
      const f = Sim.weekFinance(career, career.me, true, false);
      body.appendChild(el('div', 'card', `<div><b>Balance ${money(career.balances[career.me])}</b><small>Per match week: gate ${money(f.gate)} · sponsor ${money(f.sponsor)} · TV ${money(f.tv)} · wages ${money(-f.wages)} → <b>${money(f.net)}</b></small></div>`));
      body.appendChild(el('div', 'card', `<div><b>Board patience ${career.boardPatience}/100</b><small>League position and money keep the board happy.</small></div>`));
    }
  }

  // Match playback: ticks through events at a speed, draws a simple pitch with the ball on the attacking half.
  function match(career, m, done) {
    const name = id => career.clubs.find(c => c.id === id).name;
    $('#m-home').textContent = name(m.h); $('#m-away').textContent = name(m.a); $('#m-score').textContent = '0 – 0'; $('#m-clock').textContent = "0'";
    const feed = $('#m-feed'); feed.innerHTML = ''; show('match');
    const cv = $('#pitch-canvas'), ctx = cv.getContext('2d'); cv.width = 600; cv.height = 400;
    const draw = (ballX) => { ctx.fillStyle = '#3f8a4b'; ctx.fillRect(0, 0, 600, 400); ctx.strokeStyle = '#e8f3e8'; ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 560, 360); ctx.beginPath(); ctx.moveTo(300, 20); ctx.lineTo(300, 380); ctx.stroke(); ctx.beginPath(); ctx.arc(300, 200, 55, 0, 7); ctx.stroke();
      ctx.strokeRect(20, 110, 90, 180); ctx.strokeRect(490, 110, 90, 180); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ballX, 200, 9, 0, 7); ctx.fill(); };
    draw(300);
    let i = 0, min = 0, speed = 1, gH = 0, gA = 0, timer, tips = career.matchesPlayed < DATA.tipsForMatches;
    if (tips) feed.appendChild(el('p', '', '💡 ' + DATA.tips[career.matchesPlayed % DATA.tips.length]));
    const tick = () => {
      min++; $('#m-clock').textContent = min + "'";
      while (i < m.events.length && m.events[i].min <= min) { const e = m.events[i++];
        if (e.type === 'goal') { if (e.side === 'H') gH++; else gA++; $('#m-score').textContent = gH + ' – ' + gA; feed.prepend(el('p', 'goal', `${e.min}' ⚽ GOAL! ${e.who} (${e.score})`)); haptic(); draw(e.side === 'H' ? 540 : 60); }
        else if (e.type === 'chance') { feed.prepend(el('p', '', `${e.min}' ${e.who} shoots… saved.`)); draw(e.side === 'H' ? 470 : 130); }
        else if (e.type === 'injury') feed.prepend(el('p', '', `${e.who} picks up an injury.`)); }
      if (min >= m.total) { clearInterval(timer); setTimeout(done, 600); }
    };
    timer = setInterval(tick, 350 / speed);
    $('#m-speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('#m-speed').textContent = speed + '×'; clearInterval(timer); timer = setInterval(tick, 350 / speed); };
    $('#m-skip').onclick = () => { clearInterval(timer); while (min < m.total) tick(); };
    $('#m-tactics').onclick = () => alert('In-match tactics: coming in the next round.');
  }

  function result(career, m) {
    const name = id => career.clubs.find(c => c.id === id).name; const mine = m.h === career.me;
    const won = mine ? m.gH > m.gA : m.gA > m.gH, draw = m.gH === m.gA;
    $('#r-head').textContent = draw ? 'Draw' : won ? 'Victory!' : 'Defeat';
    const goals = m.events.filter(e => e.type === 'goal').map(e => `<p>${e.min}' ${e.who} (${e.side === 'H' ? name(m.h) : name(m.a)})</p>`).join('') || '<p>No goals.</p>';
    $('#r-summary').innerHTML = `<div class="card"><div><b>${name(m.h)} ${m.gH} – ${m.gA} ${name(m.a)}</b>${goals}</div></div>`;
    show('result');
  }

  return { $, show, clubList, hub, match, result, money };
})();
