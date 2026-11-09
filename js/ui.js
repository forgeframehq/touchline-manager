// Screens and rendering: club colours run the UI, matchday materials for menus, floodlit nights for matches.
// One screen does one job; buttons stay where they are.
'use strict';
const UI = (() => {
  const $ = s => document.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const money = k => { const a = Math.abs(k), s = k < 0 ? '−' : ''; return s + '£' + (a >= 1000 ? (a / 1000).toFixed(a >= 100000 ? 0 : 1) + 'm' : Math.round(a) + 'k'); };
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const surname = n => { const parts = n.split(' '); return parts.length > 1 ? parts.slice(1).join(' ') : n; };
  const seasonLabel = y => y + '/' + String(y + 1).slice(2);
  function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }

  // ---------- club colours ----------
  function lum(hex) { const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255; return .2126 * r + .7152 * g + .0722 * b; }
  function sat(hex) { const h = hex.replace('#', ''), n = parseInt(h, 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (Math.max(r, g, b) - Math.min(r, g, b)) / 255; }
  function accentOf(kit) { const [a, b] = kit; const ok = c => sat(c) > .25 && lum(c) > .08 && lum(c) < .85; return ok(a) ? a : ok(b) ? b : lum(a) > .5 ? '#2f6fd6' : '#d9a520'; }
  function inkOn(c) { return lum(c) > .55 ? '#111111' : '#ffffff'; }
  function theme(club) {
    const r = document.documentElement.style, kit = club ? club.kit : ['#1f8a4c', '#f2c14e'], acc = accentOf(kit);
    r.setProperty('--c1', kit[0]); r.setProperty('--c2', kit[1]); r.setProperty('--acc', acc); r.setProperty('--acc-ink', inkOn(acc));
    r.setProperty('--acc-soft', acc + '38');
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = club ? acc : '#0b1210';
  }

  // ---------- crest (kit-dyed shield stand-in) and shirt ----------
  const PATTERNS = ['halves', 'stripes', 'hoops', 'sash', 'chevron', 'quarters', 'plain'];
  let crestN = 0;
  function crestSVG(c) {
    const pat = PATTERNS[Sim.hash(c.id) % PATTERNS.length], [a, b] = c.kit, id = 'cr' + (crestN++);
    const shield = 'M50 4 L92 14 V52 C92 80 72 98 50 112 C28 98 8 80 8 52 V14 Z';
    let fill = '';
    if (pat === 'halves') fill = `<rect x="50" y="0" width="50" height="120" fill="${b}"/>`;
    if (pat === 'stripes') fill = [22, 50, 78].map(x => `<rect x="${x - 7}" y="0" width="14" height="120" fill="${b}"/>`).join('');
    if (pat === 'hoops') fill = [30, 62, 94].map(y => `<rect x="0" y="${y - 8}" width="100" height="16" fill="${b}"/>`).join('');
    if (pat === 'sash') fill = `<path d="M0 30 L30 0 L100 80 L100 110 Z" fill="${b}"/>`;
    if (pat === 'chevron') fill = `<path d="M0 40 L50 70 L100 40 L100 62 L50 92 L0 62 Z" fill="${b}"/>`;
    if (pat === 'quarters') fill = `<rect x="50" y="0" width="50" height="58" fill="${b}"/><rect x="0" y="58" width="50" height="62" fill="${b}"/>`;
    if (pat === 'plain') fill = `<rect x="0" y="86" width="100" height="40" fill="${b}"/>`;
    return `<svg viewBox="0 0 100 116" width="100%" height="100%" aria-hidden="true"><defs><clipPath id="${id}"><path d="${shield}"/></clipPath>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
      <g clip-path="url(#${id})"><rect width="100" height="120" fill="${a}"/>${fill}<rect width="100" height="120" fill="url(#${id}s)"/></g>
      <path d="${shield}" fill="none" stroke="#f2f2f2" stroke-width="5"/><path d="${shield}" fill="none" stroke="#111" stroke-opacity=".35" stroke-width="1.5"/>
      <text x="50" y="66" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="30" fill="#fff" stroke="#111" stroke-width="3.5" paint-order="stroke">${c.short.replace(/\d/g, '')}</text></svg>`;
  }
  function shirtSVG(kit, num) {
    return `<svg class="shirt" viewBox="0 0 64 64"><path d="M22 6 L32 11 L42 6 L58 16 L52 28 L46 25 V58 H18 V25 L12 28 L6 16 Z" fill="${kit[0]}" stroke="rgba(0,0,0,.35)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M26 7 Q32 14 38 7" fill="none" stroke="${kit[1]}" stroke-width="3"/><path d="M6 16 L12 28 L18 25 M58 16 L52 28 L46 25" fill="none" stroke="${kit[1]}" stroke-width="2.5"/>
      ${num != null ? `<text x="32" y="45" text-anchor="middle" font-family="Bebas Neue, Impact" font-size="17" fill="${kit[1]}" stroke="rgba(0,0,0,.25)" stroke-width=".6">${num}</text>` : ''}</svg>`;
  }
  const clubOf = (career, id) => (career ? career.clubs : WORLD.clubs).find(c => c.id === id);

  // ---------- sticker ----------
  function sticker(career, p, opts) {
    opts = opts || {};
    const c = p.club ? clubOf(career, p.club) : { kit: p.legend ? ['#111111', '#f2c14e'] : ['#5b6b62', '#dfe6e1'] };
    const k1 = c.kit[0], ink = inkOn(k1);
    const s = el('button', 'stk' + (p.legend ? ' legend' : '') + (opts.xi ? ' xi' : ''));
    s.style.setProperty('--k1', k1); s.style.setProperty('--k1ink', ink);
    s.innerHTML = `<div class="band"></div><span class="r">${p.rating}</span><span class="p">${p.pos}</span><span class="flag">${esc(p.nat || '')}</span>
      ${shirtSVG(c.kit, opts.num)}${p.injured ? '<span class="inj">+</span>' : ''}<div class="nm">${esc(surname(p.name))}<small>${p.age} yrs${p.legend ? ' · ' + esc(p.known || '') : ''}</small></div>`;
    return s;
  }

  function show(id) { document.querySelectorAll('.screen').forEach(s => { if (s.id !== 'sheet') s.classList.add('hidden'); }); $('#' + id).classList.remove('hidden'); haptic(); }
  function scarf(text) { return el('div', 'scarf', `<span>${esc(text)}</span>`); }
  function panel(inner, cls) { const p = el('section', 'panel' + (cls ? ' ' + cls : '')); if (typeof inner === 'string') p.innerHTML = inner; else if (inner) p.appendChild(inner); return p; }

  // ---------- sheet (overlay card) ----------
  function sheet(html, buttons) {
    const card = $('#sheet-card'); card.innerHTML = html;
    const row = el('div', buttons && buttons.length > 1 ? 'row2' : '');
    (buttons || []).forEach(b => { const x = el('button', 'btn' + (b.ghost ? ' ghost' : '') + (buttons.length === 1 ? ' big' : ''), esc(b.label)); x.onclick = () => { if (!b.keep) closeSheet(); b.go && b.go(); }; row.appendChild(x); });
    card.appendChild(row); $('#sheet').classList.remove('hidden'); haptic(12);
  }
  function closeSheet() { $('#sheet').classList.add('hidden'); }

  // ================= New career =================
  const SOON = [['Spain', '🇪🇸'], ['Italy', '🇮🇹'], ['Germany', '🇩🇪'], ['France', '🇫🇷'], ['Scotland', '🏴'], ['Portugal', '🇵🇹'], ['Netherlands', '🇳🇱'], ['Belgium', '🇧🇪'], ['Turkey', '🇹🇷'], ['Greece', '🇬🇷'],
    ['Brazil', '🇧🇷'], ['Argentina', '🇦🇷'], ['USA', '🇺🇸'], ['Mexico', '🇲🇽'], ['Saudi Arabia', '🇸🇦'], ['South Korea', '🇰🇷'], ['Australia', '🇦🇺'], ['India', '🇮🇳'], ['China', '🇨🇳'], ['Rest of world', '🌍']];
  function previewBrief(club) {
    const div = WORLD.divisions[club.div], list = div.tier === 1 ? DATA.board.top : DATA.board.lower;
    const peers = WORLD.clubsIn(club.div).slice().sort((a, b) => b.rep - a.rep || a.id.localeCompare(b.id)), rank = peers.indexOf(club) + 1;
    return list.find(x => rank <= x.upTo).text;
  }
  function pick(state, onTake) {
    const body = $('#pick-body'); body.innerHTML = '';
    body.appendChild(scarf('Choose a league'));
    const cs = el('div', 'countries');
    for (const id in WORLD.countries) { const c = WORLD.countries[id]; const b = el('button', 'country' + (state.country === id ? ' on' : ''), `<span class="fl">${c.flag}</span><b>${esc(c.name)}</b><small>${WORLD.divisionsOf(id).length} divisions</small>`); b.onclick = () => { state.country = id; pick(state, onTake); }; cs.appendChild(b); }
    for (const [n, f] of SOON) cs.appendChild(el('div', 'country locked', `<span class="fl">${f}</span><b>${esc(n)}</b><small>Coming soon</small>`));
    body.appendChild(cs);
    const divs = WORLD.divisionsOf(state.country); if (!divs.find(d => d.id === state.div)) state.div = divs[0].id;
    const seg = el('div', 'seg'); seg.style.marginBottom = '12px';
    for (const d of divs) { const b = el('button', state.div === d.id ? 'on' : '', esc(d.name.replace('Premier League', 'Premier Lg'))); b.onclick = () => { state.div = d.id; state.club = null; pick(state, onTake); }; seg.appendChild(b); }
    body.appendChild(seg);
    const sel = state.club && WORLD.club(state.club);
    if (sel) {
      body.appendChild(panel(`<div style="display:flex;gap:12px;align-items:center"><span class="crest" style="width:58px;height:66px;flex:none">${crestSVG(sel)}</span>
        <div style="flex:1;min-width:0"><div class="big-num" style="font-size:30px">${esc(sel.name)}</div><div class="note" style="margin:2px 0 0">${esc(sel.stadium)} · ${sel.capacity.toLocaleString()} seats</div></div></div>
        <div class="kv" style="margin-top:10px"><span>Board's brief</span><b>${esc(previewBrief(sel))}</b><span>You replace</span><b>${esc(sel.manager || 'Caretaker')}</b><span>Rival</span><b>${esc((WORLD.club(sel.rival) || { name: '—' }).name)}</b><span>Reputation</span><b>${sel.rep}</b></div>`));
    }
    const list = el('div');
    for (const c of WORLD.clubsIn(state.div).slice().sort((a, b) => b.rep - a.rep || a.name.localeCompare(b.name))) {
      const b = el('button', 'clubrow' + (state.club === c.id ? ' on' : ''), `<span class="crest">${crestSVG(c)}</span><span class="who"><b>${esc(c.name)}</b><small>${esc(c.stadium)} · ${esc(c.manager || 'No manager')}</small></span><span class="rep">${c.rep}<small>REP</small></span>`);
      b.style.setProperty('--k1', c.kit[0]); b.style.setProperty('--k2', c.kit[1]);
      b.onclick = () => { state.club = c.id; theme(c); pick(state, onTake); body.scrollTop = 0; haptic(); };
      list.appendChild(b);
    }
    body.appendChild(list);
    const take = $('#btn-take'); take.disabled = !state.club; take.onclick = () => state.club && onTake(state.club, $('#legends-on').checked);
  }

  // ================= Hub =================
  function difficulty(career, opp) { const d = Sim.squadStrength(career, opp) - Sim.squadStrength(career, career.me); return Math.max(1, Math.min(5, Math.round(3 + d / 3))); }
  function hub(career, tab, h) {
    const me = clubOf(career, career.me), div = WORLD.divisions[me.div], body = $('#hub-body');
    theme(me);
    $('#hub-crest').innerHTML = crestSVG(me); $('#hub-club').textContent = me.name; $('#hub-sub').textContent = div.name + ' · ' + seasonLabel(career.season);
    const total = career.fixtures[me.div].length; $('#hub-week').textContent = career.week < total ? 'WK ' + (career.week + 1) + '/' + total : 'DONE';
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    // next match strip
    const nf = Sim.myFixture(career), strip = $('#next-strip');
    if (nf) { const opp = clubOf(career, nf.home ? nf.a : nf.h), dd = difficulty(career, opp.id), venue = clubOf(career, nf.h);
      strip.innerHTML = `<span class="crest">${crestSVG(opp)}</span><span class="who"><b>${nf.home ? 'vs' : 'at'} ${esc(opp.name)}${opp.id === me.rival ? ' · DERBY' : ''}</b><small>${esc(opp.manager || 'Caretaker')} · ${esc(venue.stadium)}</small></span><span class="diff" title="Difficulty">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= dd ? 'on' : ''}"></i>`).join('')}</span>`; }
    else strip.innerHTML = `<span class="who"><b>League season complete</b><small>Finish the season to see who goes up and down</small></span>`;
    const play = $('#btn-play'); play.textContent = nf ? 'Play Match' : 'Finish Season';
    body.innerHTML = ''; body.scrollTop = 0;
    ({ squad, tactics, fixtures, table, club })[tab](career, body, h);
  }

  function squad(career, body, h) {
    const sq = Sim.squadOf(career, career.me), { xi } = Sim.pickXI(sq, career.tactics[career.me].formation), inXI = new Set(xi.map(p => p.id));
    body.appendChild(scarf('First Team'));
    const order = ['GK', 'DF', 'MF', 'FW']; let num = 1;
    for (const g of order) {
      const ps = sq.filter(p => p.grp === g).sort((a, b) => b.rating - a.rating || a.id - b.id); if (!ps.length) continue;
      body.appendChild(el('div', 'group-label', DATA.groups[g] + ' · ' + ps.length));
      const grid = el('div', 'stickers');
      for (const p of ps) { const s = sticker(career, p, { xi: inXI.has(p.id), num: num++ }); s.onclick = () => h.player(p); grid.appendChild(s); }
      body.appendChild(grid);
    }
    body.appendChild(el('p', 'note', 'Gold edge = starting XI, picked by your formation and fitness. Tap a sticker for details.'));
  }

  function tactics(career, body, h) {
    const tac = career.tactics[career.me], me = clubOf(career, career.me), f = DATA.formations[tac.formation];
    const { xi } = Sim.pickXI(Sim.squadOf(career, career.me), tac.formation);
    const lines = [['GK', 1, 72], ['DF', f.DF, 58], ['MF', f.MF, 36], ['FW', f.FW, 15]];
    let svg = `<svg class="pitch" viewBox="0 0 68 80"><g fill="none" stroke="#f4f1e6" stroke-opacity=".55" stroke-width=".5" stroke-linecap="round">
      <rect x="2" y="2" width="64" height="76" rx="1"/><line x1="2" y1="40" x2="66" y2="40"/><circle cx="34" cy="40" r="8"/><rect x="16" y="64" width="36" height="14"/><rect x="25" y="72" width="18" height="6"/><rect x="16" y="2" width="36" height="14"/><path d="M28 64 A8 8 0 0 1 40 64"/></g>`;
    for (const [g, n, y] of lines) {
      const ps = xi.filter(p => p.grp === g);
      for (let i = 0; i < n; i++) { const x = 4 + (60 / (n + 1)) * (i + 1), p = ps[i];
        svg += `<g><circle cx="${x}" cy="${y}" r="3.6" fill="${me.kit[0]}" stroke="${me.kit[1]}" stroke-width="1"/><circle cx="${x - 1.1}" cy="${y - 1.2}" r="1" fill="#fff" opacity=".45"/>
          <text class="chalk" x="${x}" y="${y + 7.2 + (n >= 4 && i % 2 ? 3.2 : 0)}" text-anchor="middle" font-size="3.3">${esc(p ? surname(p.name).slice(0, 10) : '?')}</text></g>`; }
    }
    svg += '</svg>';
    const board = el('div', 'board', `<div class="title">${esc(tac.formation)} — ${esc(DATA.mentality[tac.mentality].label.toLowerCase())}</div>${svg}`);
    body.appendChild(board);
    const wrap = el('div');
    const group = (label, key, opts, sub) => { const d = el('div', 'opt', `<label>${label}</label>`), row = el('div', 'seg');
      for (const k in opts) { const b = el('button', tac[key] === k ? 'on' : '', esc(opts[k].label || k) + (sub ? `<small>${sub(opts[k], k)}</small>` : ''));
        b.onclick = () => { tac[key] = k; h.save(); h.go('tactics'); }; row.appendChild(b); }
      d.appendChild(row); return d; };
    wrap.appendChild(group('Formation', 'formation', DATA.formations, f => f.balance > 0 ? 'attacking' : f.balance < 0 ? 'solid' : 'balanced'));
    wrap.appendChild(group('Mentality', 'mentality', DATA.mentality));
    wrap.appendChild(group('Style of play', 'style', DATA.styles, (s, k) => k === career.brief.style ? 'board likes' : ''));
    body.appendChild(panel(wrap));
  }

  function fixtures(career, body) {
    body.appendChild(scarf('Fixtures'));
    const me = career.me, div = Sim.myDiv(career), list = el('div');
    career.fixtures[div].forEach((round, w) => {
      const f = round.find(([h, a]) => h === me || a === me); if (!f) return;
      const home = f[0] === me, opp = clubOf(career, home ? f[1] : f[0]), r = career.results.find(m => m.week === w && m.h === f[0] && m.a === f[1]);
      let score = '<span class="note" style="margin:0">' + (home ? 'Home' : 'Away') + '</span>';
      if (r) { const us = home ? r.gH : r.gA, them = home ? r.gA : r.gH; score = `<span class="flap ${us > them ? 'w' : us < them ? 'l' : ''}"><i>${us}</i><i>${them}</i></span>`; }
      list.appendChild(el('div', 'fx' + (w === career.week ? ' now' : ''), `<span class="wk">${String(w + 1).padStart(2, '0')}</span><span class="crest">${crestSVG(opp)}</span><span class="op"><b>${esc(opp.name)}</b><small>${home ? 'Home' : 'Away'}${opp.id === clubOf(career, me).rival ? ' · Derby' : ''}</small></span>${score}`));
    });
    body.appendChild(panel(list));
  }

  function table(career, body) {
    const divId = Sim.myDiv(career), d = WORLD.divisions[divId], t = Sim.table(career, divId), n = t.length;
    body.appendChild(scarf(d.name));
    const led = el('div', 'led');
    led.appendChild(el('div', 'row h', '<span class="n">#</span><span></span><span class="nm">CLUB</span><span class="n">P</span><span class="n">W</span><span class="n">D</span><span class="n">L</span><span class="n">GD</span><span class="n">PTS</span>'));
    const above = WORLD.divisionsOf(d.country).find(x => x.tier === d.tier - 1), below = WORLD.divisionsOf(d.country).find(x => x.tier === d.tier + 1);
    t.forEach((r, i) => {
      const pos = i + 1, c = clubOf(career, r.id);
      let zone = '';
      if (above && pos <= d.up) zone = 'up'; else if (above && d.playoff && pos >= d.playoff[0] && pos <= d.playoff[1]) zone = 'po'; else if (below && pos > n - d.down) zone = 'down';
      if (d.tier === 1 && pos <= 4) zone = 'up';
      led.appendChild(el('div', 'row ' + zone + (r.id === career.me ? ' me' : ''), `<span class="n">${pos}</span><span class="crest">${crestSVG(c)}</span><span class="nm">${esc(c.short.replace(/\d/g, ''))} ${esc(c.name.length > 14 ? '' : '')}</span><span class="n">${r.p}</span><span class="n">${r.w}</span><span class="n">${r.d}</span><span class="n">${r.l}</span><span class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</span><span class="n">${r.pts}</span>`));
    });
    const lg = d.tier === 1 ? '<span><i style="background:var(--good)"></i>Champions League</span><span><i style="background:var(--bad)"></i>Relegation</span>'
      : `<span><i style="background:var(--good)"></i>Promotion</span>${d.playoff ? '<span><i style="background:#6aa9ff"></i>Play-offs</span>' : ''}${below ? '<span><i style="background:var(--bad)"></i>Relegation</span>' : ''}`;
    led.appendChild(el('div', 'legend-row', lg));
    body.appendChild(led);
  }

  function club(career, body, h) {
    const me = clubOf(career, career.me), b = career.brief, conf = career.board.confidence, f = Sim.weekFinance(career, career.me, true);
    const pos = Sim.table(career, me.div).findIndex(r => r.id === me.id) + 1;
    body.appendChild(scarf('The Board'));
    body.appendChild(panel(`<div class="kv"><span>Brief</span><b>${esc(b.text)}</b><span>Target</span><b>${ord(b.target)} or better</b><span>Currently</span><b>${career.week ? ord(pos) : '—'}</b>
      <span>Style they want</span><b>${esc(DATA.styles[b.style].label)}${career.tactics[me.id].style === b.style ? ' ✓' : ''}</b></div>
      <div class="meter"><i style="width:${conf}%;background-position:${-300 + conf * 3}px 0"></i></div><div class="note" style="margin-top:4px">Board confidence ${Math.round(conf)}/100${conf < 30 ? ' — they are losing patience' : conf > 75 ? ' — they love what they see' : ''}</div>`));
    body.appendChild(scarf('Accounts'));
    body.appendChild(panel(`<div class="tiles"><div class="tile" style="grid-column:1/-1"><small>Balance</small><b>${money(career.balances[me.id])}</b></div>
      <div class="tile"><small>Wages / week</small><b style="color:var(--bad)">${money(f.wages)}</b></div><div class="tile"><small>Home gate</small><b>${money(f.gate)}</b></div>
      <div class="tile"><small>Commercial</small><b>${money(f.commercial)}</b></div><div class="tile"><small>TV / week</small><b>${money(f.tv)}</b></div></div>`));
    const mk = el('button', 'btn big', 'Market' + (career.legendsOn ? ' & Legends' : '')); mk.style.marginBottom = '14px'; mk.onclick = () => h.market(); body.appendChild(mk);
    body.appendChild(scarf('The Club'));
    body.appendChild(panel(`<div class="kv"><span>Stadium</span><b>${esc(me.stadium)}</b><span>Capacity</span><b>${me.capacity.toLocaleString()}</b><span>Rival</span><b>${esc((clubOf(career, me.rival) || { name: '—' }).name)}</b>
      <span>Reputation</span><b>${me.rep}</b><span>Squad size</span><b>${Sim.squadOf(career, me.id).length}</b><span>Seasons managed</span><b>${career.history.length}</b></div>`));
    if (career.history.length) {
      const hl = career.history.slice(-6).reverse().map(s => `<li><small>${seasonLabel(s.season)}</small>${ord(s.myPos)} — ${s.beat ? 'brief met' : s.missed ? 'brief missed' : 'close to the brief'}</li>`).join('');
      body.appendChild(scarf('History')); body.appendChild(panel(`<ul class="news">${hl}</ul>`));
    }
    body.appendChild(scarf('News'));
    body.appendChild(panel(`<ul class="news">${career.news.slice(0, 15).map(n => `<li class="${n.kind}"><small>${seasonLabel(n.season)} · WK ${n.week + 1}</small>${esc(n.text)}</li>`).join('')}</ul>`));
  }

  // ================= Market =================
  function market(career, h, filter) {
    filter = filter || (career.legendsOn ? 'legends' : 'all');
    const body = $('#market-body'); body.innerHTML = '';
    const f = Sim.weekFinance(career, career.me, true); $('#mk-budget').textContent = 'NET ' + money(f.net) + '/WK';
    const seg = el('div', 'seg'); seg.style.marginBottom = '12px';
    for (const [k, lab] of [['legends', 'Legends'], ['all', 'All free agents'], ['mine', 'My squad']]) { if (k === 'legends' && !career.legendsOn) continue; const b = el('button', filter === k ? 'on' : '', lab); b.onclick = () => market(career, h, k); seg.appendChild(b); }
    body.appendChild(seg);
    const list = filter === 'mine' ? Sim.squadOf(career, career.me).sort((a, b) => b.rating - a.rating) : Sim.freeAgents(career).filter(p => filter === 'all' || p.legend);
    if (!list.length) body.appendChild(el('p', 'note', 'Nobody available right now.'));
    for (const p of list.slice(0, 80)) {
      const row = el('div', 'mrow'), chk = filter === 'mine' ? null : Sim.canSign(career, p);
      row.appendChild(sticker(career, p));
      row.appendChild(el('div', 'who', `<b>${esc(p.name)}</b><small>${p.pos} · ${p.age} · ${esc(p.nat)}${p.legend ? ' · ' + esc(p.known) : ''}</small><small>£${p.wage}k/week · value ${money(Sim.value(p) * 1000)}</small>${chk && !chk.ok ? `<span class="why">${esc(chk.why)}</span>` : ''}`));
      const btn = el('button', 'btn small' + (filter === 'mine' ? ' ghost' : ''), filter === 'mine' ? 'View' : 'Sign');
      if (chk && !chk.ok) btn.disabled = true;
      btn.onclick = () => filter === 'mine' ? h.player(p) : h.sign(p);
      row.appendChild(btn); body.appendChild(row);
    }
    show('market');
  }

  // ================= Player =================
  function player(career, p, h) {
    const mine = p.club === career.me, c = p.club ? clubOf(career, p.club) : null;
    const attrs = DATA.attributes.filter(a => p.grp === 'GK' ? true : a !== 'handling' && a !== 'reflexes').map(a => `<div class="attr"><span>${a[0].toUpperCase() + a.slice(1)}</span><span class="bar"><i style="width:${p.attr[a]}%"></i></span><b>${p.attr[a]}</b></div>`).join('');
    const btns = [{ label: 'Close', ghost: true }];
    if (mine) btns.unshift({ label: 'Release', ghost: true, go: () => h.release(p) });
    sheet(`<h2>${esc(p.name)}</h2><div class="note" style="text-align:center;margin:-6px 0 10px">${esc(DATA.positions[p.pos].name)} · ${p.age} · ${esc(p.nat)}${c ? ' · ' + esc(c.name) : ' · Free agent'}${p.legend ? ' · Legend (' + esc(p.known) + ')' : ''}</div>
      <div class="tiles" style="margin-bottom:12px"><div class="tile"><small>Rating</small><b>${p.rating}</b></div><div class="tile"><small>Potential</small><b>${p.pot}</b></div><div class="tile"><small>Wage</small><b>£${p.wage}k</b></div><div class="tile"><small>Value</small><b>${money(Sim.value(p) * 1000)}</b></div>
      <div class="tile"><small>Season</small><b>${p.seasonApps} apps · ${p.seasonGoals} gls</b></div><div class="tile"><small>Fitness / morale</small><b>${Math.round(p.fitness)} / ${Math.round(p.morale)}</b></div></div>${attrs}`, btns);
  }

  // ================= Match (floodlit) =================
  function drawPitch(ctx, W, H, home, away, fH, fA, ball, push) {
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#2f7a3a' : '#368542'; ctx.fillRect(i * W / 12, 0, W / 12 + 1, H); }
    ctx.strokeStyle = 'rgba(245,250,240,.85)'; ctx.lineWidth = 2.5; const m = 18;
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m); ctx.beginPath(); ctx.moveTo(W / 2, m); ctx.lineTo(W / 2, H - m); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 50, 0, 7); ctx.stroke();
    ctx.strokeRect(m, H / 2 - 95, 80, 190); ctx.strokeRect(W - m - 80, H / 2 - 95, 80, 190); ctx.strokeRect(m, H / 2 - 42, 28, 84); ctx.strokeRect(W - m - 28, H / 2 - 42, 28, 84);
    // floodlight pools
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) { const g = ctx.createRadialGradient(x, y, 10, x, y, W * .55); g.addColorStop(0, 'rgba(255,245,210,.22)'); g.addColorStop(1, 'rgba(255,245,210,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .75); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    const dot = (x, y, kit) => { ctx.beginPath(); ctx.ellipse(x + 2, y + 9, 8, 3, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = kit[0]; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = kit[1]; ctx.stroke(); };
    const px = (x, y) => [m + x * (W - 2 * m), m + y * (H - 2 * m)];
    const shape = f => { const F = DATA.formations[f]; const line = (n, x) => Array.from({ length: n }, (_, i) => [x, (i + 1) / (n + 1)]); return [[.05, .5]].concat(line(F.DF, .2), line(F.MF, .42), line(F.FW, .62)); };
    shape(fH).forEach(([x, y], i) => { const [a, b] = px(Math.min(.95, x * .5 + (i ? push : 0)), y); dot(a, b, home.kit); });
    shape(fA).forEach(([x, y], i) => { const [a, b] = px(Math.max(.05, 1 - x * .5 + (i ? push : 0)), 1 - y); dot(a, b, away.kit); });
    ctx.beginPath(); ctx.arc(ball[0], ball[1], 6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111'; ctx.stroke();
  }
  function match(career, m, done) {
    const H = clubOf(career, m.h), A = clubOf(career, m.a);
    $('#m-home').textContent = H.name; $('#m-away').textContent = A.name; $('#m-hcrest').innerHTML = crestSVG(H); $('#m-acrest').innerHTML = crestSVG(A);
    $('#m-score').textContent = '0-0'; $('#m-clock').textContent = "00'";
    const feed = $('#m-feed'); feed.innerHTML = ''; show('match');
    const cv = $('#pitch-canvas'), ctx = cv.getContext('2d'), W = cv.width = 720, Hh = cv.height = 480;
    const fH = career.tactics[m.h].formation, fA = career.tactics[m.a].formation;
    const cosm = new RNG(m.gH * 31 + m.gA * 7 + career.week);   // cosmetic only
    let ball = [W / 2, Hh / 2], target = ball.slice(), push = 0, pushT = 0, raf;
    const loop = () => { ball[0] += (target[0] - ball[0]) * .12; ball[1] += (target[1] - ball[1]) * .12; push += (pushT - push) * .06; drawPitch(ctx, W, Hh, H, A, fH, fA, ball, push); raf = requestAnimationFrame(loop); };
    loop();
    const line = (min, html, cls) => feed.prepend(el('p', cls || '', `<b class="min">${String(min).padStart(2, '0')}'</b><span>${html}</span>`));
    let i = 0, min = 0, speed = 1, gH = 0, gA = 0, timer;
    if (career.matchesPlayed <= DATA.tipsForMatches) feed.appendChild(el('p', 'tip', '<b class="min">TIP</b><span>' + esc(DATA.tips[career.matchesPlayed % DATA.tips.length]) + '</span>'));
    line(0, `Kick-off at ${esc(H.stadium)}.`);
    const tick = () => {
      min++; $('#m-clock').textContent = String(min).padStart(2, '0') + "'";
      if (min % 3 === 0) { target = [W * (.3 + cosm.next() * .4), Hh * (.2 + cosm.next() * .6)]; pushT = (cosm.next() - .5) * .08; }
      while (i < m.events.length && m.events[i].min <= min) { const e = m.events[i++], side = e.side === 'H' ? H : A, toRight = e.side === 'H';
        if (e.type === 'goal') { if (toRight) gH++; else gA++; $('#m-score').textContent = gH + '-' + gA; line(e.min, `GOAL! ${esc(e.who)} scores for ${esc(side.name)}`, 'goal'); haptic(40);
          target = [toRight ? W - 26 : 26, Hh / 2 + (cosm.next() - .5) * 40]; pushT = toRight ? .1 : -.1; }
        else if (e.type === 'chance') { line(e.min, `${esc(e.who)} (${esc(side.short.replace(/\d/g, ''))}) goes close.`); target = [toRight ? W - 90 : 90, Hh / 2 + (cosm.next() - .5) * 120]; pushT = toRight ? .07 : -.07; }
        else if (e.type === 'injury') line(e.min, `${esc(e.who)} is hurt and limps off.`); }
      if (min === 45) line(45, 'Half-time.');
      if (min >= m.total) { clearInterval(timer); line(min, `Full-time: ${esc(H.short.replace(/\d/g, ''))} ${gH}-${gA} ${esc(A.short.replace(/\d/g, ''))}`); setTimeout(() => { cancelAnimationFrame(raf); done(); }, 900); }
    };
    timer = setInterval(tick, 300 / speed);
    $('#m-speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('#m-speed').textContent = speed + '×'; clearInterval(timer); timer = setInterval(tick, 300 / speed); haptic(); };
    $('#m-skip').onclick = () => { clearInterval(timer); while (min < m.total) tick(); };
    $('#m-shout').onclick = () => { line(min, 'Touchline shouts arrive with the match-day update.', 'shout'); haptic(); };
  }

  function result(career, m, before, onDone) {
    const H = clubOf(career, m.h), A = clubOf(career, m.a), mine = m.h === career.me;
    const won = mine ? m.gH > m.gA : m.gA > m.gH, draw = m.gH === m.gA, delta = Math.round((career.board.confidence - before) * 10) / 10;
    const scorers = m.events.filter(e => e.type === 'goal').map(e => `${e.min}' ${esc(e.who)}`).join('<br>') || 'No goals.';
    const pos = Sim.table(career, Sim.myDiv(career)).findIndex(r => r.id === career.me) + 1;
    sheet(`<h2>${draw ? 'Draw' : won ? 'Victory!' : 'Defeat'}</h2><div class="ft"><div><span class="crest">${crestSVG(H)}</span><small>${esc(H.name)}</small></div><div class="sb-led"><b>${m.gH}-${m.gA}</b></div><div><span class="crest">${crestSVG(A)}</span><small>${esc(A.name)}</small></div></div>
      <div class="lines">${scorers}</div><div class="note" style="text-align:center;margin-top:10px">Now ${ord(pos)} · Board ${delta >= 0 ? '+' : ''}${delta}</div>`, [{ label: 'Continue', go: onDone }]);
  }

  function seasonEnd(career, s, onDone) {
    const me = clubOf(career, career.me), champ = id => esc(clubOf(career, s.champions[id]).name);
    const divs = Object.keys(s.champions).map(id => `<b>${esc(WORLD.divisions[id].name)}</b>: ${champ(id)}`).join('<br>');
    const up = s.promoted.includes(me.id), down = s.relegated.includes(me.id);
    sheet(`<h2>${seasonLabel(s.season)} done</h2><div class="lines">You finished <b>${ord(s.myPos)}</b>. Brief: ${esc(s.brief)} — <b>${s.beat ? 'met' : s.missed ? 'missed' : 'close'}</b>.<br>${up ? '<b style="color:var(--good)">PROMOTED!</b><br>' : ''}${down ? '<b style="color:var(--bad)">Relegated.</b><br>' : ''}<br>${divs}</div>`, [{ label: 'Next season', go: onDone }]);
  }

  function sacked(career, offers, onTake) {
    const me = clubOf(career, career.me);
    const html = `<h2>Sacked</h2><div class="lines">The ${esc(me.name)} board have run out of patience. Three clubs want to talk.</div>`;
    sheet(html, []);
    const card = $('#sheet-card'), list = el('div'); list.style.marginTop = '12px';
    for (const c of offers) { const b = el('button', 'clubrow', `<span class="crest">${crestSVG(c)}</span><span class="who"><b>${esc(c.name)}</b><small>${esc(WORLD.divisions[c.div].name)} · rep ${c.rep}</small></span>`); b.style.setProperty('--k1', c.kit[0]); b.style.setProperty('--k2', c.kit[1]); b.onclick = () => { closeSheet(); onTake(c.id); }; list.appendChild(b); }
    card.appendChild(list);
  }

  return { $, show, theme, pick, hub, market, player, match, result, seasonEnd, sacked, sheet, closeSheet, money, crestSVG };
})();
