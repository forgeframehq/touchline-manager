// The club hub, after the reference renders: gold top bar, page head, gold tabs and the bottom nav
// Office / Squad / Tactics / Market / Club. Every tab fits one screen (pagers and flexible panels, never scrolling).
// Sub screens: player, schedule, competitions, analyse, medical, inbox, manager profile, trophy cabinet.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, S = G.state, I = Icons.svg;
  const H = { tab: 'office', sub: { squad: 'GK', club: 'overview' }, view: 'overview', sel: null };
  const NAV = [['office', 'Office'], ['squad', 'Squad'], ['tactics', 'Tactics'], ['market', 'Market'], ['club', 'Club']];

  function bottomNav() {
    const car = S.career, n = el('nav', 'bnav'), unread = car.inbox.filter(m => !m.read).length;
    for (const [id, label] of NAV) {
      const b = el('button', H.tab === id ? 'on' : '', `${I(id)}<span>${label}</span>${id === 'office' && unread ? `<i>${unread > 9 ? '9+' : unread}</i>` : ''}`);
      b.dataset.snd = 'swipe'; b.onclick = () => { if (H.tab !== id) { H.tab = id; H.sel = null; Nav.swap(); } }; n.appendChild(b);
    }
    return n;
  }

  Nav.define('hub', () => {
    const car = S.career; Sound.crowd(.3);
    if (!car.setp || !car.setp.pens) Sim.autoRoles(car);
    const v = VIEWS[H.tab](car);
    const hdr = el('div'); hdr.appendChild(G.topbar(hubMenu)); if (v.head) hdr.appendChild(v.head);
    const body = el('div', 'fill'); if (v.tabs) body.appendChild(v.tabs);
    const fill = el('div', 'fill'); body.appendChild(fill); if (v.el) fill.appendChild(v.el);
    return { header: hdr, body, footer: bottomNav(), back: false, onBack: H.tab !== 'office' ? () => { H.tab = 'office'; Nav.swap(); } : null,
      mount: () => { v.mount && v.mount(fill); alerts(); } };
  });

  function alerts() {
    const car = S.career;
    if (car.sacked) { Nav.push('sacked'); return; }
    if (car.alert === 'warning') { car.alert = null; G.save(); Nav.card({ title: 'Board meeting', body: `<p class="center">${esc(car.inbox[0] ? car.inbox[0].text : 'The board want better results.')}</p>`, buttons: [{ label: 'Understood' }] }); return; }
    if (!S.prefs.tutorial) { G.setPrefs({ tutorial: true });
      Nav.card({ title: 'Your office', body: `<p>Five areas along the bottom: <b>Office, Squad, Tactics, Market</b> and <b>Club</b>.</p><p>Your next match is always on the Office. Swipe or use the arrows to flip pages; tap anything for details.</p><p>Win matches to earn <b>coins</b> for training boosts.</p>`, buttons: [{ label: 'Got it' }] }); }
  }

  function hubMenu() {
    const list = el('div', 'menu-list');
    const items = [['user', 'Manager profile', () => Nav.push('profile')], ['trophy', 'Trophy cabinet', () => Nav.push('cabinet')], ['star', 'Achievements', () => Nav.push('achievements')], ['gear', 'Settings', () => Nav.push('settings')],
      ['exit', 'Save & quit to title', () => { G.save(); S.career = null; Nav.reset('title'); }]];
    for (const [icon, label, go] of items) list.appendChild(Nav.button({ icon, label, go: () => { Nav.closeCard(); go(); } }, 'mi'));
    Nav.card({ title: 'Menu', body: list, buttons: [{ label: 'Resume', ghost: true }] });
  }

  const morale = car => { const sq = Sim.squadOf(car, car.me); return Math.round(sq.reduce((s, p) => s + p.morale, 0) / sq.length); };
  const myForm = car => car.results.filter(r => r.season === car.season && (r.h === car.me || r.a === car.me)).slice(-5).map(r => { const us = r.h === car.me ? r.gH : r.gA, th = r.h === car.me ? r.gA : r.gH; return us > th ? 'W' : us < th ? 'L' : 'D'; });
  const formHTML = f => `<div class="form">${f.length ? f.map(x => `<i class="${x}">${x}</i>`).join('') : '<span class="note">No games yet</span>'}</div>`;
  const boardWord = v => v >= 75 ? 'Secure' : v >= 50 ? 'Stable' : v >= 30 ? 'Uneasy' : 'Under pressure';

  const VIEWS = {
    // ================= Office: next match + dashboard =================
    office(car) {
      const c = G.me(), nx = Sim.nextMatch(car), box = el('div', 'stack grow');
      const nc = el('div', 'panel hero nextcard');
      if (nx) {
        const opp = G.club(nx.home ? nx.a : nx.h), L = G.club(nx.h), R = G.club(nx.a), od = Sim.odds(car, nx.h, nx.a);
        const oForm = car.results.filter(r => r.season === car.season && (r.h === opp.id || r.a === opp.id)).slice(-5).map(r => { const u = r.h === opp.id ? r.gH : r.gA, t = r.h === opp.id ? r.gA : r.gH; return u > t ? 'W' : u < t ? 'L' : 'D'; });
        nc.innerHTML = `<div class="comp">${I(nx.kind === 'cup' ? 'trophy' : 'calendar')}${esc(nx.kind === 'cup' ? nx.comp + ' · ' + nx.round : nx.comp + ' · Week ' + (car.week + 1))}${opp.id === c.rival ? ' · Derby' : ''}</div>
          <div class="vsrow"><div class="side"><span class="crest">${Art.crest(L)}</span><b>${esc(G.shortName(L))}</b></div><div class="mid"><em>${nx.home ? 'HOME' : 'AWAY'}</em><b>VS</b></div><div class="side r"><span class="crest">${Art.crest(R)}</span><b>${esc(G.shortName(R))}</b></div></div>
          <div class="oddsrow"><span><small>${esc(L.short.replace(/\d/g, ''))}</small><b>${od.h}</b></span><span><small>Draw</small><b>${od.d}</b></span><span><small>${esc(R.short.replace(/\d/g, ''))}</small><b>${od.a}</b></span><span class="hide-short"><small>${esc(opp.short.replace(/\d/g, ''))} form</small><span class="fm">${oForm.map(x => `<i class="${x}"></i>`).join('') || '—'}</span></span></div>`;
        nc.appendChild(Nav.button({ label: nx.kind === 'cup' ? 'Play the Tie' : 'Play the Match', icon: 'ball', snd: 'select', go: () => Nav.push('prematch') }, 'btn big'));
      } else {
        nc.innerHTML = `<div class="comp">${I('trophy')}${esc(WORLD.divisions[c.div].name)}</div><div class="tip" style="margin:12px 0">The season is complete. Awards night is waiting.</div>`;
        nc.appendChild(Nav.button({ label: 'Finish the Season', icon: 'trophy', go: () => Nav.push('awards') }, 'btn big'));
      }
      box.appendChild(nc);
      const conf = Math.round(car.board.confidence);
      const quote = conf >= 80 ? 'The board are delighted with your work.' : conf >= 60 ? 'The board are pleased with progress.' : conf >= 40 ? 'The board expect better results.' : conf >= 25 ? 'The board are unhappy with your leadership.' : 'The board are deeply saddened by your leadership.';
      const bb = el('button', 'panel boardbanner ' + (conf < 40 ? 'bad' : conf >= 70 ? 'good' : ''), `<span>${esc(quote)}</span><span class="meter"><i style="width:${conf}%"></i></span>`); bb.onclick = () => { H.tab = 'club'; H.sub.club = 'finances'; Nav.swap(); };
      box.appendChild(bb);
      const dash = el('div', 'fill'); box.appendChild(dash);
      return { el: box, mount: () => { const rows = dash.clientHeight > 330 ? 2 : 1, ih = Math.floor((dash.clientHeight - 40 - (rows - 1) * 8) / rows);
        Nav.pager(dash, { key: 'dash', items: DASH, cols: 2, itemH: ih, gap: 8, render: d => dashCard(car, d, ih) }); } };
    },
    // ================= Squad: overview / contracts / stats =================
    squad(car) {
      const sq = Sim.squadOf(car, car.me), xi = new Set(Sim.fmXI(car).xi.map(p => p.id));
      const groups = [['GK', 'GK'], ['DF', 'DEF'], ['MF', 'MID'], ['FW', 'ATT']], VIEWS = [['overview', 'Overview'], ['contract', 'Contracts'], ['stats', 'Stats']];
      const tabs = Nav.subtabs(groups.map(([g, l]) => ({ id: g, label: l, badge: sq.filter(p => p.grp === g).length })), H.sub.squad, id => { H.sub.squad = id; Nav.refresh(); });
      const vb = el('button', 'fchip', `<small>View</small><b>${VIEWS.find(v => v[0] === H.view)[1]}</b>`); vb.dataset.snd = 'swipe';
      vb.onclick = () => { H.view = VIEWS[(VIEWS.findIndex(v => v[0] === H.view) + 1) % VIEWS.length][0]; Nav.refresh(); };
      const list = sq.filter(p => p.grp === H.sub.squad).sort((a, b) => (xi.has(b.id) - xi.has(a.id)) || b.rating - a.rating || a.id - b.id);
      const wages = Sim.wageBill(car);
      return { head: G.phead('squad', 'Squad', `${sq.length} players · wages ${G.money(wages)}/wk`, vb, 'compact'), tabs,
        mount: fill => Nav.pager(fill, { key: 'sq' + H.sub.squad + H.view, items: list, cols: 1, itemH: 58, gap: 6, render: p => {
          let opts = { xi: xi.has(p.id), sub: xi.has(p.id) ? '<span class="tag">XI</span>' : '' };
          if (H.view === 'contract') { const y = Sim.yearsLeft(car, p); opts = { xi: opts.xi, sub: esc(Sim.statusOf(car, p)), right: `<b class="ask">£${p.wage}K</b><small class="${y <= 0 ? 'bad' : ''}">${y <= 0 ? 'Expires!' : 'to ' + (p.con || car.season + 1)}${p.listed ? ' · listed' : ''}</small>` }; }
          if (H.view === 'stats') opts = { xi: opts.xi, sub: `${p.seasonApps} apps`, right: `<b class="ask">${p.seasonGoals}G ${p.ast || 0}A</b><small>avg ${p.rn ? (p.rs / p.rn).toFixed(2) : '—'}</small>` };
          const r = G.prow(p, opts); r.onclick = () => Nav.push('player', { id: p.id }); return r; } }) };
    },
    tactics(car) { return TacticsUI.view(car); },
    market(car) { return MarketUI.view(car); },
    // ================= Club =================
    club(car) {
      const tabs = Nav.subtabs([{ id: 'overview', label: 'Overview' }, { id: 'stadium', label: 'Stadium' }, { id: 'facilities', label: 'Facilities' }, { id: 'youth', label: 'Youth' }, { id: 'finances', label: 'Money' }], H.sub.club, id => { H.sub.club = id; Nav.refresh(); }, true);
      const c = G.me();
      return Object.assign({ head: G.phead('club', 'Club', `${c.name} · founded on ambition`, null, 'compact'), tabs }, CLUB[H.sub.club](car, c));
    },
  };


  // ---------- Office dashboard cards ----------
  const DASH = ['fixtures', 'league', 'comps', 'finance', 'stats', 'inbox', 'medical', 'scout'];
  function dashCard(car, kind, ih) {
    const c = G.me(), d = el('button', 'panel dcard'), lines = Math.max(2, Math.floor((ih - 40) / 21));
    const title = (icon, t, go) => { d.onclick = go; return `<div class="ptitle">${I(icon)}${t}</div>`; };
    const li = (a, b, cls) => `<div class="dl ${cls || ''}"><span>${a}</span><b>${b}</b></div>`;
    if (kind === 'fixtures') {
      const div = Sim.myDiv(car), items = [];
      car.results.filter(r => r.season === car.season && (r.h === car.me || r.a === car.me)).slice(-2).forEach(r => { const home = r.h === car.me, us = home ? r.gH : r.gA, th = home ? r.gA : r.gH; items.push(li(`${esc(G.club(home ? r.a : r.h).short.replace(/\d/g, ''))} ${home ? 'H' : 'A'}`, `<span class="score ${us > th ? 'W' : us < th ? 'L' : 'D'}">${us}-${th}</span>`)); });
      for (let w = car.week; w < car.fixtures[div].length && items.length < lines; w++) { const f = car.fixtures[div][w].find(([h, a]) => h === car.me || a === car.me); if (f) items.push(li(`${esc(G.club(f[0] === car.me ? f[1] : f[0]).short.replace(/\d/g, ''))} ${f[0] === car.me ? 'H' : 'A'}`, `Wk ${w + 1}`)); }
      d.innerHTML = title('calendar', 'Fixtures & Results', () => Nav.push('schedule')) + items.slice(0, lines).join('');
    } else if (kind === 'league') {
      const t = Sim.table(car, c.div), i = t.findIndex(r => r.id === car.me), s0 = Math.max(0, Math.min(t.length - lines, i - Math.floor(lines / 2)));
      d.innerHTML = title('chart', esc(WORLD.divisions[c.div].name.replace('Premier League', 'League')), () => Nav.push('competitions')) + t.slice(s0, s0 + lines).map((r, k) => li(`${G.ord(s0 + k + 1)} ${esc(G.club(r.id).short.replace(/\d/g, ''))}`, r.pts, r.id === car.me ? 'me' : '')).join('');
    } else if (kind === 'comps') {
      const pos = car.week ? G.ord(Sim.position(car, car.me)) : '—', out = [li(esc(WORLD.divisions[c.div].name.replace('Premier ', 'Prem ')), pos)];
      for (const cup of Object.values(car.cups || {})) { const st = cup.winner === car.me ? '<span class="good">Winners</span>' : cup.out[car.me] ? `<span class="bad">Out (${esc(shortRound(cup.out[car.me]))})</span>` : !cup.alive.includes(car.me) ? '—' : cup.winner ? '—' : `<span class="good">${esc(shortRound(Sim.cupRoundName(cup)))}</span>`; out.push(li(esc(cup.name), st)); }
      d.innerHTML = title('trophy', 'Competitions', () => Nav.push('competitions')) + out.slice(0, lines).join('');
    } else if (kind === 'finance') {
      const left = car.budget.wage - Sim.wageBill(car);
      d.innerHTML = title('cash', 'Finances', () => { H.tab = 'club'; H.sub.club = 'finances'; Nav.swap(); }) + [li('State', esc(Sim.finState(car))), li('Transfer budget', Sim.feeLabel(car.budget.transfer)), li('Wage left', `<span class="${left < 0 ? 'bad' : 'good'}">£${left}K</span>`), li('Balance', G.money(car.balances[car.me]))].slice(0, lines).join('');
    } else if (kind === 'stats') {
      const L = Sim.leaders(car), nm = p => p ? esc(G.surname(p.name)) : '—';
      d.innerHTML = title('star', 'Player Stats', () => Nav.push('analyse')) + [li('⚽ ' + nm(L.goals), L.goals ? L.goals.seasonGoals : 0), li('🅰 ' + nm(L.assists), L.assists ? L.assists.ast || 0 : 0), li('★ ' + nm(L.rating), L.rating ? (L.rating.rs / L.rating.rn).toFixed(2) : '—'), li('🟨 ' + nm(L.cards), L.cards ? L.cards.yc || 0 : 0)].slice(0, lines).join('');
    } else if (kind === 'inbox') {
      const un = car.inbox.filter(m => !m.read).length;
      d.innerHTML = title('mail', `Inbox${un ? ` <i class="badge">${un}</i>` : ''}`, () => Nav.push('inbox')) + car.inbox.slice(0, lines).map(m => `<div class="dl msg${m.read ? '' : ' unread'}"><span>${esc(m.from)}: ${esc(m.text)}</span></div>`).join('');
    } else if (kind === 'medical') {
      const inj = Sim.squadOf(car, car.me).filter(p => p.injured || p.ban);
      d.innerHTML = title('medical', 'Medical Centre', () => Nav.push('medical')) + (inj.length ? inj.slice(0, lines).map(p => li(esc(G.surname(p.name)), p.ban ? '<span class="bad">Ban</span>' : `<span class="bad">${p.injured}w</span>`)).join('') : '<div class="dl"><span>Everyone is fit.</span></div>');
    } else if (kind === 'scout') {
      const nx = Sim.nextMatch(car), opp = nx && G.club(nx.home ? nx.a : nx.h), top = opp ? Sim.squadOf(car, opp.id).filter(p => !p.injured).sort((a, b) => b.rating - a.rating).slice(0, lines - 1) : [];
      d.innerHTML = title('binoculars', 'Scout Report', () => { H.tab = 'tactics'; TacticsUI.T.sub = 'opposition'; Nav.swap(); }) + (opp ? li(esc(opp.short.replace(/\d/g, '')), esc(car.tactics[opp.id].formation)) + top.map(p => li(esc(G.surname(p.name)) + ' ' + p.pos, p.rating)).join('') : '<div class="dl"><span>No match.</span></div>');
    }
    return d;
  }
  const shortRound = r => r.replace(' Round', ' Rd').replace('Quarter-Final', 'QF').replace('Semi-Final', 'SF');

  // ---------- club tabs ----------
  const facCard = (car, key) => { const F = DATA.facilities[key], l = car.facilities[key]; return `<div class="fac"><div class="fi" style="background-image:url(assets/art/${F.img}.webp)"></div><div class="ft"><b>${I(F.icon)}${esc(F.name.replace(' Facilities', '').replace(' Network', ''))}</b><small>Level ${l}</small><div class="lvl"><i style="width:${l * 10}%"></i></div></div></div>`; };
  const stadHero = c => `<div class="stadhero grow" style="background-image:url(${Art.stadiumImg(c.capacity)});min-height:90px"><span class="banner" style="background:${c.kit[0]};color:${Art.inkOn(c.kit[0])}">${esc(c.short.replace(/\d/g, ''))}</span></div>`;
  const plate = (car, c) => `<div class="panel stadplate" style="padding:9px 12px">${I('stadium')}<span class="sp"><b>${esc(c.stadium)}</b><small>Home of ${esc(G.shortName(c))}</small></span><span class="rate"><small>Stadium rating</small>${G.stars(Sim.stadiumRating(car))}</span></div>`;
  const CLUB = {
    overview(car, c) {
      const f = Sim.weekFinance(car, car.me, true), att = Sim.attendance(car), conf = Math.round(car.board.confidence), price = car.ticket || Sim.basePrice(car);
      const box = el('div', 'stack grow', `${stadHero(c)}${plate(car, c)}
        <div class="tiles t4keep"><div class="tile">${I('seat')}<span class="tv"><small>Capacity</small><b>${(c.capacity / 1000).toFixed(1)}K</b></span></div><div class="tile">${I('ticket')}<span class="tv"><small>Ticket</small><b>£${price}</b></span></div><div class="tile">${I('crowd')}<span class="tv"><small>Crowd</small><b>${Math.round(att * 100)}%</b></span></div><div class="tile">${I('cash')}<span class="tv"><small>Gate</small><b>${G.money(f.gate)}</b></span></div></div>
        <div class="facs hide-short">${facCard(car, 'training')}${facCard(car, 'youth')}${facCard(car, 'scouting')}</div>
        <div class="boardrow"><div class="panel boardc" style="padding:9px 12px">${I('handshake')}<span class="bt"><b>Board confidence</b><span class="bv"><span class="meter"><i style="width:${conf}%"></i></span><strong class="${conf >= 50 ? 'good' : 'bad'}">${boardWord(conf)}</strong></span></span></div>
        <div class="panel repc" style="padding:9px 12px"><b>Reputation</b><strong>${esc(Sim.repTier(c.rep))}</strong></div></div>`);
      return { el: box };
    },
    stadium(car, c) {
      const e = Sim.expansionInfo(car), box = el('div', 'stack grow', `${stadHero(c)}${plate(car, c)}`);
      const ex = el('div', 'panel expand');
      if (car.build) { const done = Math.min(1, (car.week - car.build.started) / Math.max(1, car.build.ready - car.build.started));
        ex.innerHTML = `<div class="ei"></div><div class="et"><b>Construction under way</b><small>+${car.build.seats.toLocaleString()} seats · ready week ${car.build.ready + 1}</small><div class="lvl" style="margin-top:6px"><i style="width:${Math.round(done * 100)}%"></i></div></div><span></span>`; }
      else { ex.innerHTML = `<div class="ei"></div><div class="et"><b>Stadium Expansion</b><small>${e.weeks} weeks of building work</small><div class="arrow">${(e.from / 1000).toFixed(1)}K ${I('arrow')} ${(e.to / 1000).toFixed(1)}K</div></div>`;
        const b = Nav.button({ label: G.money(e.cost), hold: true, go: () => { if (Sim.startExpansion(car)) { Sound.play('stamp'); G.save(); Nav.toast('Work begins on the new stand'); Nav.refresh(); } else { Sound.play('error'); Nav.toast('Not enough money for the expansion', 'bad'); } } }, 'btn'); ex.appendChild(b); }
      box.appendChild(ex);
      const base = Sim.basePrice(car), price = car.ticket || base, row = el('div', 'cyc'), pv = el('button', 'cb', '−'), nx = el('button', 'cb', '+');
      const set = d => { car.ticket = Math.max(Math.round(base * .5), Math.min(Math.round(base * 2), price + d)); Sound.play('tap'); G.save(); Nav.refresh(); };
      pv.onclick = () => set(-1); nx.onclick = () => set(1);
      row.append(el('span', '', `Ticket price · crowd ${Math.round(Sim.attendance(car) * 100)}%`), pv, el('b', '', `£${price}`), nx); row.style.marginBottom = '0';
      box.appendChild(row);
      return { el: box };
    },
    facilities(car) {
      const box = el('div', 'grow'); box.style.cssText = 'display:grid;grid-template-rows:repeat(4,minmax(0,1fr));gap:8px;min-height:0';
      for (const key of Object.keys(DATA.facilities)) {
        const F = DATA.facilities[key], l = car.facilities[key], cost = Sim.facilityCost(car, key);
        const r = el('div', 'panel facrow', `<div class="fi" style="background-image:url(assets/art/${F.img}.webp)"></div><div class="ft"><b>${I(F.icon)}${esc(F.name)}</b><small>${esc(F.desc)}</small><div class="fb"><span class="lvl"><i style="width:${l * 10}%"></i></span><span class="chip">Lv ${l}</span></div></div>`);
        r.style.minHeight = '0';
        if (cost != null) { const b = Nav.button({ label: G.money(cost), hold: true, go: () => { if (Sim.upgradeFacility(car, key)) { Sound.play('stamp'); G.save(); Nav.toast(`${F.name} upgraded`); Nav.refresh(); } else { Sound.play('error'); Nav.toast('Not enough money', 'bad'); } } }, 'btn'); r.querySelector('.fb').appendChild(b); }
        box.appendChild(r);
      }
      return { el: box };
    },
    youth(car) {
      const box = el('div', 'stack grow'), l = car.facilities.youth;
      box.appendChild(el('div', 'panel facrow', `<div class="fi" style="background-image:url(assets/art/f_academy.webp)"></div><div class="ft"><b>${I('youth')}Youth Academy · Lv ${l}</b><small>${2 + Math.floor(l / 3)} graduates every summer. Upgrade it in Facilities.</small></div>`));
      const list = el('div', 'fill'); box.appendChild(list);
      const items = Sim.squadOf(car, car.me).filter(p => p.youth || p.age <= 20).sort((a, b) => b.pot - a.pot);
      return { el: box, mount: () => Nav.pager(list, { key: 'youth', items, cols: 1, itemH: 58, gap: 6, empty: 'No young players yet. Intake day is at the end of the season.', render: p => { const r = G.prow(p, { sub: `Pot ${p.pot}` }); r.onclick = () => Nav.push('player', { id: p.id }); return r; } }) };
    },
    finances(car) {
      const f = Sim.weekFinance(car, car.me, true), conf = Math.round(car.board.confidence);
      return { el: el('div', 'stack grow', `<div class="tiles t2 big"><div class="tile">${I('cash')}<span class="tv"><small>Club balance</small><b>${G.money(car.balances[car.me])}</b></span></div><div class="tile">${I('chart')}<span class="tv"><small>Net, home week</small><b class="${f.net >= 0 ? 'good' : 'bad'}">${G.money(f.net)}</b></span></div></div>
        <div class="tiles t2"><div class="tile">${I('market')}<span class="tv"><small>Transfer budget</small><b>${Sim.feeLabel(car.budget.transfer)}</b></span></div><div class="tile">${I('clipboard')}<span class="tv"><small>Wage budget</small><b>£${car.budget.wage}K <span style="font-size:12px" class="${car.budget.wage - Sim.wageBill(car) < 0 ? 'bad' : 'good'}">(${car.budget.wage - Sim.wageBill(car)} left)</span></b></span></div></div>
        <div class="tiles t2"><div class="tile">${I('finances')}<span class="tv"><small>Wages / week</small><b class="bad">${G.money(f.wages)}</b></span></div><div class="tile">${I('ticket')}<span class="tv"><small>Matchday gate</small><b>${G.money(f.gate)}</b></span></div><div class="tile">${I('handshake')}<span class="tv"><small>Commercial / week</small><b>${G.money(f.commercial)}</b></span></div><div class="tile">${I('globe')}<span class="tv"><small>TV / week</small><b>${G.money(f.tv)}</b></span></div></div>
        <div class="panel"><div class="ptitle">${I('clipboard')}The board's brief</div><p style="font:700 18px var(--serif);margin:0 0 4px">${esc(car.brief.text)}</p><p class="note">Target ${G.ord(car.brief.target)} or better · ${esc(DATA.styles[car.brief.style].label)} football</p></div>
        <div class="panel stack"><div class="instrow"><small>Board confidence</small><b>${conf}%</b></div><div class="meter"><i style="width:${conf}%"></i></div><div class="instrow"><small>Fan mood</small><b>${Math.round(car.fans)}</b></div><div class="meter"><i style="width:${car.fans}%"></i></div></div>`) };
    },
  };

  // ================= Office sub screens =================
  Nav.define('schedule', () => {
    const car = S.career, div = Sim.myDiv(car), me = car.me, rows = [], box = el('div', 'fill');
    car.fixtures[div].forEach((round, w) => { const f = round.find(([h, a]) => h === me || a === me); if (f) rows.push({ w, f, r: car.results.find(m => m.season === car.season && m.week === w && m.h === f[0] && m.a === f[1]) }); });
    for (const cup of Object.values(car.cups || {})) { cup.results.filter(r => r.h === me || r.a === me).forEach(r => rows.push({ w: DATA.cups[cup.id].weeks[r.round] - .5, f: [r.h, r.a], r, cup }));
      if (cup.alive.includes(me) && !cup.winner) { const wk = DATA.cups[cup.id].weeks[cup.round]; if (wk != null) rows.push({ w: wk - .5, cup, pending: Sim.cupRoundName(cup) }); } }
    rows.sort((a, b) => a.w - b.w);
    return { header: G.header('calendar', 'Schedule', `${G.seasonLabel(car.season)} · league and cups`), body: box,
      mount: () => Nav.pager(box, { key: 'fx', items: rows, cols: 1, itemH: 52, gap: 5, render: x => {
        if (x.pending) return el('div', 'fxrow cup', `<span class="wk">${String(Math.ceil(x.w)).padStart(2, '0')}</span><span class="crest">${I('trophy')}</span><span style="min-width:0"><b>${esc(x.cup.name)}</b><small>${esc(x.pending)} · draw on the day</small></span><span class="ha">CUP</span>`);
        const home = x.f[0] === me, opp = G.club(home ? x.f[1] : x.f[0]);
        let score = `<span class="ha">${home ? 'HOME' : 'AWAY'}</span>`;
        if (x.r) { const us = home ? x.r.gH : x.r.gA, them = home ? x.r.gA : x.r.gH, w = x.cup ? x.r.w === me : us > them; score = `<span class="score ${w ? 'W' : (x.cup ? 'L' : us < them ? 'L' : 'D')}">${us}-${them}${x.r.pens ? ' p' : ''}</span>`; }
        return el('div', 'fxrow' + (!x.cup && x.w === car.week ? ' now' : '') + (x.cup ? ' cup' : ''), `<span class="wk">${String(Math.ceil(x.w + (x.cup ? .5 : 1))).padStart(2, '0')}</span><span class="crest">${Art.crest(opp)}</span><span style="min-width:0"><b>${esc(opp.name)}</b><small>${x.cup ? esc(x.cup.name) + ' · ' : ''}${home ? 'Home' : 'Away'}${opp.id === G.me().rival ? ' · Derby' : ''}</small></span>${score}`); } }) };
  });
  const CT = { tab: 'league' };
  Nav.define('competitions', () => {
    const car = S.career, divId = Sim.myDiv(car), d = WORLD.divisions[divId];
    const tabs = Nav.subtabs([{ id: 'league', label: 'League' }].concat(Object.values(car.cups || {}).map(c => ({ id: c.id, label: c.name }))), CT.tab, id => { CT.tab = id; Nav.refresh(); }, true);
    const body = el('div', 'fill'); body.appendChild(tabs); const inner = el('div', 'fill'); body.appendChild(inner);
    let mount;
    if (CT.tab === 'league') {
      const t = Sim.table(car, divId), n = t.length, divs = WORLD.divisionsOf(d.country), above = divs.find(x => x.tier === d.tier - 1), below = divs.find(x => x.tier === d.tier + 1);
      const zone = pos => d.tier === 1 ? (pos <= 4 ? 'up' : pos > n - d.down ? 'down' : '') : (above && pos <= d.up ? 'up' : above && d.playoff && pos >= d.playoff[0] && pos <= d.playoff[1] ? 'po' : below && pos > n - d.down ? 'down' : '');
      const wrap = el('div', 'panel fill'); wrap.style.padding = '6px 4px'; const box = el('div', 'fill');
      wrap.appendChild(el('div', 'thead', '<span>#</span><span></span><span>Club</span><span>P</span><span>GD</span><span>Pts</span><span>Form</span>')); wrap.appendChild(box); inner.appendChild(wrap);
      mount = () => { const rowH = Math.floor((box.clientHeight - 40) / n);
        Nav.pager(box, { key: 'tbl', items: t, cols: 1, itemH: rowH >= 22 ? Math.min(rowH, 34) : 26, gap: 0, render: (r, i) => { const pos = i + 1, c = G.club(r.id);
          return el('div', 'trow ' + zone(pos) + (r.id === car.me ? ' me' : ''), `<span>${pos}</span><span class="crest">${Art.crest(c)}</span><span class="nm">${esc(G.shortName(c))}</span><span>${r.p}</span><span>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</span><b>${r.pts}</b><span class="fm">${r.form.slice(-3).map(x => `<i class="${x}"></i>`).join('')}</span>`); } }); };
    } else {
      const cup = car.cups[CT.tab], me = car.me, inCup = cup.alive.includes(me) || cup.out[me] || cup.winner === me;
      const status = cup.winner ? `${esc(G.club(cup.winner).name)} won the ${esc(cup.name)}${cup.winner === me ? ' — that’s you!' : '.'}` : cup.out[me] ? `Knocked out in the ${esc(cup.out[me])}.` : !inCup ? `Your club is not in the ${esc(cup.name)} this season.` : `Into the ${esc(Sim.cupRoundName(cup))} · week ${DATA.cups[cup.id].weeks[cup.round] + 1}${cup.round === 0 && cup.byes.includes(me) ? ' (bye)' : ''}.`;
      inner.appendChild(el('div', 'panel', `<div class="linkrow">${I('trophy')}<b>${esc(cup.name)}</b><span class="chip">${cup.alive.length} left</span></div><p class="note" style="margin:4px 0 0">${status}</p>`));
      const list = el('div', 'fill'); list.style.marginTop = '8px'; inner.appendChild(list);
      const last = cup.results.length ? Math.max(...cup.results.map(r => r.round)) : -1;
      const items = cup.results.filter(r => r.round === last).sort((a, b) => ((b.h === me || b.a === me) - (a.h === me || a.a === me)));
      mount = () => Nav.pager(list, { key: 'cup' + cup.id + last, items, cols: 1, itemH: 40, gap: 4, empty: 'No ties played yet.', render: r => {
        const h = G.club(r.h), a = G.club(r.a);
        return el('div', 'cuprow' + (r.h === me || r.a === me ? ' me' : ''), `<span class="${r.w === r.h ? 'w' : ''}">${esc(G.shortName(h))}</span><b>${r.gH}-${r.gA}${r.pens ? `<small> (${r.pens[0]}-${r.pens[1]} p)</small>` : ''}</b><span class="${r.w === r.a ? 'w' : ''}">${esc(G.shortName(a))}</span>`); } });
      if (last >= 0) inner.insertBefore(el('p', 'note center', esc(DATA.cups.roundNames[DATA.cups.roundNames.length - (DATA.cups[cup.id].weeks.length - last)]) + ' results'), list);
    }
    return { header: G.header('trophy', 'Competitions', `${G.seasonLabel(car.season)}`), body, mount };
  });
  Nav.define('analyse', () => {
    const car = S.career, t = Sim.table(car, Sim.myDiv(car)).find(r => r.id === car.me), sq = Sim.squadOf(car, car.me), box = el('div', 'stack grow');
    const top = (k, f) => sq.filter(p => f(p) > 0).sort((a, b) => f(b) - f(a)).slice(0, 4);
    const block = (title, list, f, fmt) => `<div class="panel" style="overflow:hidden"><div class="ptitle" style="font-size:15px">${title}</div>${list.length ? list.map((p, i) => `<div class="dl"><span>${i + 1}. ${esc(p.name)}</span><b>${fmt ? fmt(f(p)) : f(p)}</b></div>`).join('') : '<p class="note">None yet.</p>'}</div>`;
    box.innerHTML = `<div class="tiles t3"><div class="tile"><span class="tv"><small>W-D-L</small><b>${t.w}-${t.d}-${t.l}</b></span></div><div class="tile"><span class="tv"><small>Goals</small><b>${t.gf}:${t.ga}</b></span></div><div class="tile"><span class="tv"><small>Points/game</small><b>${t.p ? (t.pts / t.p).toFixed(2) : '—'}</b></span></div></div>
      <div class="panel"><div class="ptitle" style="font-size:15px">Form</div>${formHTML(myForm(car))}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;min-height:0" class="grow">${block('⚽ Goals', top('g', p => p.seasonGoals), p => p.seasonGoals)}${block('🅰 Assists', top('a', p => p.ast || 0), p => p.ast || 0)}${block('★ Av. rating', sq.filter(p => p.rn >= 3).sort((a, b) => b.rs / b.rn - a.rs / a.rn).slice(0, 4), p => p.rs / p.rn, v => v.toFixed(2))}${block('🟨 Cards', top('y', p => p.yc || 0), p => p.yc || 0)}</div>`;
    return { header: G.header('chart', 'Analyse', 'Your season in numbers'), body: box };
  });
  Nav.define('medical', () => {
    const car = S.career, inj = Sim.squadOf(car, car.me).filter(p => p.injured || p.fitness < 75).sort((a, b) => b.injured - a.injured || a.fitness - b.fitness), box = el('div', 'stack grow');
    box.appendChild(el('div', 'panel facrow', `<div class="fi" style="background-image:url(assets/art/f_medical.webp)"></div><div class="ft"><b>${I('medical')}Medical Centre · Lv ${car.facilities.medical}</b><small>Higher levels shorten injuries. ${inj.filter(p => p.injured).length} injured, ${inj.filter(p => !p.injured).length} tired.</small></div>`));
    const list = el('div', 'fill'); box.appendChild(list);
    return { header: G.header('medical', 'Medical Centre', 'Injuries and fitness'), body: box,
      mount: () => Nav.pager(list, { key: 'med', items: inj, cols: 1, itemH: 58, gap: 6, empty: 'Everyone is fit. Good work, physio.', render: p => { const r = G.prow(p); r.onclick = () => Nav.push('player', { id: p.id }); return r; } }) };
  });
  Nav.define('inbox', () => {
    const car = S.career, list = el('div', 'fill');
    const items = car.inbox.concat(car.news.filter(n => n.kind !== 'board').map(n => ({ from: n.kind === 'transfer' ? 'Transfer News' : n.kind === 'derby' ? 'Match Report' : n.kind === 'press' ? 'Press Office' : 'Club News', text: n.text, week: n.week, season: n.season, kind: n.kind, read: true })));
    return { header: G.header('mail', 'Inbox', `${car.inbox.filter(m => !m.read).length} unread`), body: list,
      mount: () => Nav.pager(list, { key: 'inbox', items, cols: 1, itemH: 58, gap: 6, render: m => {
        const r = el('button', 'lrow' + (m.read ? '' : ' unread'), `<span class="av">${esc((m.from || '?')[0])}</span><span class="lt"><b>${esc(m.from)}</b><small>${esc(m.text)}</small></span><span class="wk">W${m.week + 1}</span>`);
        r.onclick = () => { m.read = true; G.save(); Sound.play('phone'); Nav.card({ title: m.from, body: `<p>${esc(m.text)}</p><p class="note">${G.seasonLabel(m.season)} · Week ${m.week + 1}</p>`, buttons: [{ label: 'Close', go: () => Nav.refresh() }] }); };
        return r; } }) };
  });

  // ================= Manager profile =================
  Nav.define('profile', () => {
    const m = S.career.manager, c = G.me(), pct = m.games ? Math.round(m.w / m.games * 100) : 0;
    const b = el('div', 'stack grow', `<div class="panel" style="display:flex;align-items:center;gap:14px"><span class="mbadge" style="width:84px;height:84px;margin:0">${Art.badge(m.name)}</span><div><h2>${esc(m.name)}</h2><small class="note">${Flags.svg(m.nat, 20, 13)} ${esc(Flags.name(m.nat))} · Manager of ${esc(c.name)}</small></div></div>
      <div class="tiles t3 big"><div class="tile"><span class="tv"><small>Matches</small><b>${m.games}</b></span></div><div class="tile"><span class="tv"><small>Win rate</small><b>${pct}%</b></span></div><div class="tile"><span class="tv"><small>Trophies</small><b>${m.trophies.length}</b></span></div>
      <div class="tile"><span class="tv"><small>W-D-L</small><b>${m.w}-${m.d}-${m.l}</b></span></div><div class="tile"><span class="tv"><small>Sackings</small><b>${m.sackings}</b></span></div><div class="tile"><span class="tv"><small>Clubs</small><b>${m.clubs.length}</b></span></div></div>
      <div class="panel grow" style="overflow:hidden"><div class="ptitle">${I('clipboard')}Career</div>${m.clubs.slice(-6).reverse().map(x => `<div class="instrow" style="padding:3px 0"><small>${esc(x.name)}</small><b>${x.from}–</b></div>`).join('')}</div>`);
    return { header: G.titleHeader('Manager Profile', 'Your record follows you', 'user'), body: b, action: { label: 'Trophies', icon: 'trophy', go: () => Nav.push('cabinet') } };
  });
  Nav.define('cabinet', () => {
    const t = S.career.manager.trophies, box = el('div', 'fill');
    return { header: G.titleHeader('Trophy Cabinet', `${t.length} honour${t.length === 1 ? '' : 's'}`, 'trophy'), body: box, bg: 'bg_trophy',
      mount: () => Nav.pager(box, { key: 'cab', items: t, cols: 3, itemH: w => Math.round(w * 1.35), gap: 8, empty: 'Empty shelves. Win something!', render: x => el('div', 'gtile', `<span style="width:70%;height:55%">${Art.trophy(x.kind)}</span><b style="font-size:13px">${esc(x.label)}</b><small>${G.seasonLabel(x.season)}</small>`) }) };
  });

  window.HubUI = { H };
})();
