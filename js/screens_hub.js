// The club hub: five tabs with sub-pages, everything sized to one screen (pagers, never scrolling).
// Also the hub menu, manager profile and trophy cabinet.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, S = G.state;
  const H = { tab: 'squad', sub: { squad: 'GK', fixtures: 'next', club: 'board', market: 'legends' } };
  const TABS = [
    ['squad', 'Squad', '<path d="M11 4l5 3 5-3 8 5-3 6-3-1.5V28H9V13.5L6 15 3 9z"/>'],
    ['tactics', 'Tactics', '<rect x="5" y="4" width="22" height="25" rx="2"/><path d="M10 10l4 4m0-4l-4 4M22 20a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M13 22c3-6 6-8 9-9" fill="none" stroke-width="2"/>'],
    ['fixtures', 'Fixtures', '<rect x="4" y="7" width="24" height="21" rx="3"/><path d="M4 13h24M10 4v6M22 4v6" fill="none" stroke-width="2.4"/>'],
    ['table', 'Table', '<path d="M9 4h14v6a7 7 0 0 1-14 0zM9 6H4c0 5 2 7 5 7M23 6h5c0 5-2 7-5 7M13 20h6v4h-6zM10 28h12" fill="none" stroke-width="2.4"/>'],
    ['club', 'Club', '<path d="M3 27h26M5 27V13l11-7 11 7v14M11 27v-8h10v8" fill="none" stroke-width="2.4"/>'],
  ];

  Nav.define('hub', () => {
    const car = S.career, c = G.me(), d = WORLD.divisions[c.div]; G.theme(c.kit); Sound.crowd(.25);
    const total = car.fixtures[c.div].length, fx = Sim.myFixture(car);
    const wrap = el('div', 'hub');
    // next match strip
    const strip = el('div', 'next-strip');
    if (fx) { const opp = G.club(fx.home ? fx.a : fx.h), dd = Sim.difficulty(car, opp.id), venue = G.club(fx.h);
      strip.innerHTML = `<span class="crest">${Art.crest(opp)}</span><span class="who"><b>${fx.home ? 'vs' : 'at'} ${esc(opp.name)}${opp.id === c.rival ? ' <em>DERBY</em>' : ''}</b><small>${esc(opp.manager || 'Caretaker')} · ${esc(venue.stadium)}</small></span><span class="diff">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= dd ? 'on' : ''}"></i>`).join('')}</span>`; }
    else strip.innerHTML = `<span class="who"><b>League season complete</b><small>Finish the season for awards night</small></span>`;
    wrap.appendChild(strip);
    const tb = el('div', 'tabbody'); wrap.appendChild(tb);
    const tabs = el('nav', 'tabs');
    for (const [id, label, icon] of TABS) { const b = el('button', H.tab === id ? 'on' : '', `<svg viewBox="0 0 32 32">${icon}</svg><span>${label}</span>`); b.onclick = () => { if (H.tab !== id) { H.tab = id; Sound.play('move'); Nav.refresh(); } }; tabs.appendChild(b); }
    wrap.appendChild(tabs);
    const view = VIEWS[H.tab](car);
    if (view.sub) tb.appendChild(view.sub);
    const fill = el('div', 'fill'); tb.appendChild(fill); if (view.el) fill.appendChild(view.el);
    return { header: G.clubHeader(`${d.name} · ${G.seasonLabel(car.season)}`, car.week < total ? `WK ${car.week + 1}/${total}` : 'DONE'), body: wrap,
      back: { label: 'Menu', go: hubMenu },
      action: { label: fx ? 'Play Match' : 'Finish Season', go: () => fx ? Nav.push('prematch') : Nav.push('awards') },
      mount: () => { view.mount && view.mount(fill); alerts(); } };
  });

  function alerts() {
    const car = S.career;
    if (car.sacked) { Nav.push('sacked'); return; }
    if (car.alert === 'warning') { car.alert = null; G.save(); Nav.card({ title: 'Board meeting', body: `<p class="center">${esc(car.inbox[0] ? car.inbox[0].text : 'The board want better results.')}</p>`, buttons: [{ label: 'Understood' }] }); return; }
    if (!S.prefs.tutorial) { S.prefs.tutorial = true; G.setPrefs({ tutorial: true });
      Nav.card({ title: 'Your office', body: `<div class="tut"><p><b>Tabs</b> along the bottom: Squad, Tactics, Fixtures, Table, Club.</p><p><b>Play Match</b> is always bottom right. <b>Menu</b> is bottom left.</p><p>Swipe or use the arrows to flip pages. Tap anything for details.</p></div>`, buttons: [{ label: 'Got it' }] }); }
  }

  function hubMenu() {
    const list = el('div', 'menu-list');
    const items = [['Manager profile', () => Nav.push('profile')], ['Trophy cabinet', () => Nav.push('cabinet')], ['Achievements', () => Nav.push('achievements')], ['Settings', () => Nav.push('settings')],
      ['Save & quit to title', () => { G.save(); S.career = null; Nav.reset('title'); }]];
    for (const [label, go] of items) { const b = Nav.button({ label, go: () => { Nav.closeCard(); go(); } }, 'mi'); list.appendChild(b); }
    Nav.card({ title: 'Menu', body: list, buttons: [{ label: 'Resume', ghost: true }] });
  }

  const VIEWS = {
    // ---------- squad ----------
    squad(car) {
      const sq = Sim.squadOf(car, car.me), xi = new Set(Sim.pickXI(sq, car.tactics[car.me].formation).xi.map(p => p.id));
      const groups = [['GK', 'GK'], ['DF', 'DEF'], ['MF', 'MID'], ['FW', 'ATT']];
      const sub = Nav.subtabs(groups.map(([g, l]) => ({ id: g, label: l, badge: sq.filter(p => p.grp === g).length })), H.sub.squad, id => { H.sub.squad = id; Nav.refresh(); });
      const list = sq.filter(p => p.grp === H.sub.squad).sort((a, b) => (xi.has(b.id) - xi.has(a.id)) || b.rating - a.rating || a.id - b.id);
      return { sub, mount: fill => Nav.pager(fill, { key: 'sq' + H.sub.squad, items: list, cols: w => w > 520 ? 5 : 4, itemH: w => Math.round(w * 1.36), gap: 8, render: p => {
        const s = G.sticker(p, { xi: xi.has(p.id), sub: xi.has(p.id) ? 'Starting XI' : p.injured ? `Injured ${p.injured}w` : `${p.age} yrs` });
        s.onclick = () => G.playerCard(p, [{ label: 'Release', ghost: true, hold: true, go: () => { if (Sim.release(car, p.id)) { G.save(); Nav.toast(`${p.name} released`); Nav.refresh(); } else Nav.toast(`You need at least ${DATA.season.squadMin} players`, 'bad'); } }, { label: 'Close' }]);
        return s; } }) };
    },
    // ---------- tactics: chalkboard + cyclers ----------
    tactics(car) {
      const tac = car.tactics[car.me], c = G.me(), f = DATA.formations[tac.formation], { xi } = Sim.pickXI(Sim.squadOf(car, car.me), tac.formation);
      const lines = [['GK', 1, 72], ['DF', f.DF, 57], ['MF', f.MF, 37], ['FW', f.FW, 16]];
      let svg = `<svg class="pitch" viewBox="0 0 68 80" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="#f4f1e6" stroke-opacity=".55" stroke-width=".5" stroke-linecap="round"><rect x="2" y="2" width="64" height="76" rx="1"/><line x1="2" y1="40" x2="66" y2="40"/><circle cx="34" cy="40" r="8"/><rect x="16" y="64" width="36" height="14"/><rect x="25" y="72" width="18" height="6"/><rect x="16" y="2" width="36" height="14"/></g>`;
      for (const [g, n, y] of lines) { const ps = xi.filter(p => p.grp === g); for (let i = 0; i < n; i++) { const x = 4 + (60 / (n + 1)) * (i + 1), p = ps[i];
        svg += `<circle cx="${x}" cy="${y}" r="3.6" fill="${c.kit[0]}" stroke="${c.kit[1]}" stroke-width="1"/><circle cx="${x - 1.1}" cy="${y - 1.2}" r="1" fill="#fff" opacity=".45"/><text class="chalk" x="${x}" y="${y + 7.2 + (n >= 4 && i % 2 ? 3.2 : 0)}" text-anchor="middle" font-size="3.3">${esc(p ? G.surname(p.name).slice(0, 10) : '?')}</text>`; } }
      svg += '</svg>';
      const box = el('div', 'tactics');
      box.appendChild(el('div', 'board', `<div class="title">${esc(tac.formation)} · ${esc(DATA.mentality[tac.mentality].label.toLowerCase())}</div>${svg}`));
      const cyc = (label, key, opts, note) => { const row = el('div', 'cyc'), keys = Object.keys(opts); let i = keys.indexOf(tac[key]);
        const val = el('b', '', esc(opts[keys[i]].label || keys[i]) + (note ? note(keys[i]) : '')), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›');
        const set = d => { i = (i + d + keys.length) % keys.length; tac[key] = keys[i]; G.save(); Sound.play('move'); Nav.refresh(); };
        pv.onclick = () => set(-1); nx.onclick = () => set(1); row.append(el('span', '', label), pv, val, nx); return row; };
      box.append(cyc('Formation', 'formation', DATA.formations), cyc('Mentality', 'mentality', DATA.mentality), cyc('Style', 'style', DATA.styles, k => k === car.brief.style ? ' ★ board' : ''));
      
      return { el: box };
    },
    // ---------- fixtures ----------
    fixtures(car) {
      const div = Sim.myDiv(car), me = car.me, rows = [];
      car.fixtures[div].forEach((round, w) => { const f = round.find(([h, a]) => h === me || a === me); if (f) rows.push({ w, f, r: car.results.find(m => m.week === w && m.h === f[0] && m.a === f[1]) }); });
      const sub = Nav.subtabs([{ id: 'next', label: 'Recent & next' }, { id: 'all', label: 'Full calendar' }], H.sub.fixtures, id => { H.sub.fixtures = id; Nav.refresh(); });
      let items = rows;
      if (H.sub.fixtures === 'next') { const played = rows.filter(x => x.r), next = rows.filter(x => !x.r); items = played.slice(-3).concat(next.slice(0, 5)); }
      return { sub, mount: fill => Nav.pager(fill, { key: 'fx' + H.sub.fixtures, items, cols: 1, itemH: 48, gap: 4, render: x => {
        const home = x.f[0] === me, opp = G.club(home ? x.f[1] : x.f[0]);
        let score = `<span class="ha">${home ? 'HOME' : 'AWAY'}</span>`;
        if (x.r) { const us = home ? x.r.gH : x.r.gA, them = home ? x.r.gA : x.r.gH; score = `<span class="flap ${us > them ? 'w' : us < them ? 'l' : ''}"><i>${us}</i><i>${them}</i></span>`; }
        return el('div', 'fx' + (x.w === car.week ? ' now' : ''), `<span class="wk">${String(x.w + 1).padStart(2, '0')}</span><span class="crest">${Art.crest(opp)}</span><span class="op"><b>${esc(opp.name)}</b><small>${home ? 'Home' : 'Away'}${opp.id === G.me().rival ? ' · Derby' : ''}</small></span>${score}`); } }) };
    },
    // ---------- table (auto-fit, two pages for big leagues on small phones) ----------
    table(car) {
      const divId = Sim.myDiv(car), d = WORLD.divisions[divId], t = Sim.table(car, divId), n = t.length;
      const divs = WORLD.divisionsOf(d.country), above = divs.find(x => x.tier === d.tier - 1), below = divs.find(x => x.tier === d.tier + 1);
      const zone = pos => d.tier === 1 ? (pos <= 4 ? 'up' : pos > n - d.down ? 'down' : '') : (above && pos <= d.up ? 'up' : above && d.playoff && pos >= d.playoff[0] && pos <= d.playoff[1] ? 'po' : below && pos > n - d.down ? 'down' : '');
      const sub = el('div', 'tbl-head', `<span>#</span><span></span><span>Club</span><span>P</span><span>GD</span><span>Pts</span><span>Form</span>`);
      return { sub, mount: fill => {
        fill.classList.add('led');
        const rowH = Math.floor((fill.clientHeight - 30) / n);
        Nav.pager(fill, { key: 'tbl', items: t, cols: 1, itemH: rowH >= 22 ? Math.min(rowH, 34) : 26, gap: 0, render: (r, i) => {
          const pos = i + 1, c = G.club(r.id);
          return el('div', 'trow ' + zone(pos) + (r.id === car.me ? ' me' : ''), `<span>${pos}</span><span class="crest">${Art.crest(c)}</span><span class="nm">${esc(c.name.replace(' & Hove Albion', '').replace('Wolverhampton Wanderers', 'Wolves'))}</span><span>${r.p}</span><span>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</span><span class="pts">${r.pts}</span><span class="form">${r.form.slice(-3).map(x => `<i class="${x}"></i>`).join('')}</span>`); } });
      } };
    },
    // ---------- club ----------
    club(car) {
      const sub = Nav.subtabs([{ id: 'board', label: 'Board' }, { id: 'money', label: 'Money' }, { id: 'market', label: 'Market' }, { id: 'info', label: 'Club' }, { id: 'inbox', label: 'Inbox', badge: car.inbox.filter(m => !m.read).length || '' }], H.sub.club, id => { H.sub.club = id; Nav.refresh(); });
      return Object.assign({ sub }, CLUB[H.sub.club](car));
    },
  };

  const CLUB = {
    board(car) {
      const c = G.me(), b = car.brief, conf = car.board.confidence, pos = car.week ? Sim.position(car, car.me) : 0;
      const meter = (label, v) => `<div class="mt"><div class="mt-l"><span>${label}</span><b>${Math.round(v)}</b></div><div class="meter"><i style="width:${v}%;background-position:${-300 + v * 3}px 0"></i></div></div>`;
      return { el: el('div', 'panel-stack', `<div class="brief big"><small>The board's brief</small><b>${esc(b.text)}</b></div>
        <div class="kv"><span>Target</span><b>${G.ord(b.target)} or better</b><span>Right now</span><b>${pos ? G.ord(pos) : '—'}</b><span>Style they want</span><b>${esc(DATA.styles[b.style].label)}${car.tactics[c.id].style === b.style ? ' ✓' : ''}</b></div>
        ${meter('Board confidence', conf)}${meter('Fan mood', car.fans)}
        <p class="note center">${conf < 30 ? 'The board are losing patience.' : conf > 75 ? 'The board love what they see.' : 'Keep meeting the brief.'}</p>`) };
    },
    money(car) {
      const f = Sim.weekFinance(car, car.me, true);
      return { el: el('div', 'tiles', `<div class="tile span2"><small>Club balance</small><b>${G.money(car.balances[car.me])}</b></div><div class="tile"><small>Wages / week</small><b class="bad">${G.money(f.wages)}</b></div><div class="tile"><small>Home gate</small><b>${G.money(f.gate)}</b></div><div class="tile"><small>Commercial / wk</small><b>${G.money(f.commercial)}</b></div><div class="tile"><small>TV / week</small><b>${G.money(f.tv)}</b></div><div class="tile span2"><small>Net, home week</small><b class="${f.net >= 0 ? 'good' : 'bad'}">${G.money(f.net)}</b></div>`) };
    },
    market(car) {
      const filt = car.legendsOn ? H.sub.market : 'all', box = el('div', 'mk');
      const toggle = car.legendsOn ? Nav.subtabs([{ id: 'legends', label: 'Legends' }, { id: 'all', label: 'All free agents' }], filt, id => { H.sub.market = id; Nav.refresh(); }) : null;
      if (toggle) { toggle.classList.add('mini'); box.appendChild(toggle); }
      const list = el('div', 'fill'); box.appendChild(list);
      const items = Sim.freeAgents(car).filter(p => filt === 'all' || p.legend);
      return { el: box, mount: () => Nav.pager(list, { key: 'mk' + filt, items, cols: 1, itemH: 60, gap: 6, empty: 'No free agents right now.', render: p => {
        const chk = Sim.canSign(car, p), row = el('button', 'mrow' + (chk.ok ? '' : ' no'), `<span class="mr">${p.rating}</span><span class="who"><b>${esc(p.name)}${p.legend ? ' <em>★</em>' : ''}</b><small>${p.pos} · ${p.age} · ${p.legend ? esc(p.known) : esc(Flags.name(p.nat))} · £${p.wage}k/wk</small>${chk.ok ? '' : `<small class="why">${esc(chk.why)}</small>`}</span>${p.nat ? Flags.svg(p.nat, 27, 18) : ''}`);
        row.onclick = () => G.playerCard(p, [{ label: 'Close', ghost: true }].concat(chk.ok ? [{ label: 'Sign', hold: true, go: () => { if (Sim.sign(car, p.id)) { G.save(); signReveal(p); } } }] : []));
        return row; } }) };
    },
    info(car) {
      const c = G.me(), hist = car.history.slice(-3).reverse();
      return { el: el('div', 'panel-stack', `<div class="kv"><span>Stadium</span><b>${esc(c.stadium)}</b><span>Capacity</span><b>${c.capacity.toLocaleString()}</b><span>Rival</span><b>${esc((G.club(c.rival) || { name: '—' }).name)}</b><span>Reputation</span><b>${c.rep}</b><span>Squad</span><b>${Sim.squadOf(car, c.id).length} players</b></div>
        <div class="hist">${hist.length ? hist.map(s => `<div><small>${G.seasonLabel(s.season)}</small><b>${G.ord(s.myPos)}</b><span>${s.beat ? 'Brief met' : s.missed ? 'Brief missed' : 'Close'}</span></div>`).join('') : '<p class="note center">Your history starts this season.</p>'}</div>`) };
    },
    inbox(car) {
      const box = el('div', 'phone'); box.innerHTML = '<div class="ph-top"><span>Messages</span><b>●●●</b></div>'; const list = el('div', 'fill'); box.appendChild(list);
      const items = car.inbox.concat(car.news.filter(n => n.kind !== 'board').map(n => ({ from: n.kind === 'transfer' ? 'Transfer News' : n.kind === 'derby' ? 'Match Report' : n.kind === 'press' ? 'Press Office' : 'Club News', text: n.text, week: n.week, season: n.season, kind: n.kind, read: true })));
      return { el: box, mount: () => Nav.pager(list, { key: 'inbox', items, cols: 1, itemH: 56, gap: 4, render: m => {
        const r = el('button', 'msg' + (m.read ? '' : ' unread') + ' k-' + (m.kind || 'news'), `<span class="av">${esc((m.from || '?')[0])}</span><span class="who"><b>${esc(m.from)}</b><small>${esc(m.text)}</small></span><span class="wk">W${m.week + 1}</span>`);
        r.onclick = () => { m.read = true; G.save(); Nav.card({ title: m.from, body: `<p>${esc(m.text)}</p><p class="note">${G.seasonLabel(m.season)} · Week ${m.week + 1}</p>`, buttons: [{ label: 'Close', go: () => Nav.refresh() }] }); };
        return r; } }) };
    },
  };

  // sticker-flip signing reveal
  function signReveal(p) {
    Sound.play('sting'); Sound.buzz(40); G.checkAchievements();
    const b = el('div', 'reveal'); const s = G.sticker(p, { sub: p.legend ? p.known : p.pos }); s.classList.add('flipin'); b.appendChild(s);
    b.appendChild(el('div', 'rv-t', `<b>${esc(p.name)}</b><span>joins ${esc(G.me().name)}!</span>`));
    Nav.card({ cls: 'reveal-card', body: b, buttons: [{ label: 'Brilliant', go: () => Nav.refresh() }] });
  }

  // ================= Manager profile =================
  Nav.define('profile', () => {
    const m = S.career.manager, c = G.me(), pct = m.games ? Math.round(m.w / m.games * 100) : 0;
    const b = el('div', 'profile', `<div class="pf-top"><span class="mbadge">${Art.badge(m.name, c.kit)}</span><div><h2>${esc(m.name)}</h2><small>${Flags.svg(m.nat, 22, 15)} ${esc(Flags.name(m.nat))} · Manager of ${esc(c.name)}</small></div></div>
      <div class="tiles"><div class="tile"><small>Matches</small><b>${m.games}</b></div><div class="tile"><small>Win rate</small><b>${pct}%</b></div><div class="tile"><small>W · D · L</small><b>${m.w} · ${m.d} · ${m.l}</b></div><div class="tile"><small>Trophies</small><b>${m.trophies.length}</b></div><div class="tile"><small>Sackings</small><b>${m.sackings}</b></div><div class="tile"><small>Clubs</small><b>${m.clubs.length}</b></div></div>
      <div class="clubs-line">${m.clubs.map(x => `<span>${esc(x.name)} <small>${x.from}–</small></span>`).join('')}</div>`);
    return { header: G.titleHeader('Manager Profile'), body: b, action: { label: 'Trophy cabinet', go: () => Nav.push('cabinet') } };
  });
  // ================= Trophy cabinet =================
  Nav.define('cabinet', () => {
    const t = S.career.manager.trophies, box = el('div', 'cabinet fill');
    return { header: G.titleHeader('Trophy Cabinet', `${t.length} honour${t.length === 1 ? '' : 's'}`), body: box,
      mount: () => Nav.pager(box, { key: 'cab', items: t, cols: 3, itemH: w => Math.round(w * 1.25), gap: 0, cls: 'shelves', empty: 'Empty shelves. Win something!', render: x => el('div', 'tr', `<span class="trs">${Art.trophy(x.kind, x.tier)}</span><b>${esc(x.label)}</b><small>${G.seasonLabel(x.season)} · ${esc(x.club)}</small>`) }) };
  });

  window.HubUI = { H };
})();
