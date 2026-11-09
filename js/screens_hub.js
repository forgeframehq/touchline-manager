// The club hub, after the reference renders: gold top bar, page head, gold tabs and the bottom nav
// Office / Squad / Tactics / Market / Club. Every tab fits one screen (pagers and flexible panels, never scrolling).
// Sub screens: player, schedule, competitions, analyse, medical, inbox, manager profile, trophy cabinet.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, S = G.state, I = Icons.svg;
  const H = { tab: 'office', sub: { squad: 'GK', club: 'overview', market: 'legends', tactics: 'formation' }, sel: null };
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
    // ================= Office =================
    office(car) {
      const c = G.me(), d = WORLD.divisions[c.div], total = car.fixtures[c.div].length, fx = Sim.myFixture(car), b = car.brief, pos = car.week ? Sim.position(car, car.me) : 0;
      const box = el('div', 'stack grow');
      box.appendChild(el('div', 'panel objective', `<div class="ob-t"><small>Season objective</small><h2>${esc(b.text)}</h2><p>Target ${G.ord(b.target)} or better · Now ${pos ? G.ord(pos) : '—'}</p></div>
        <div class="mdshield"><small>Matchday</small><b>${Math.min(car.week + 1, total)}</b><em>of ${total}</em></div>`));
      // next match hero card
      const nc = el('div', 'panel hero nextcard');
      if (fx) {
        const opp = G.club(fx.home ? fx.a : fx.h), dd = Sim.difficulty(car, opp.id), danger = Sim.squadOf(car, opp.id).filter(p => !p.injured).sort((a, b) => b.rating - a.rating)[0];
        const L = fx.home ? c : opp, R = fx.home ? opp : c;
        nc.innerHTML = `<div class="comp">${I('trophy')}${esc(d.name)} · Week ${car.week + 1}${opp.id === c.rival ? ' · Derby' : ''}</div>
          <div class="vsrow"><div class="side"><span class="crest">${Art.crest(L)}</span><b>${esc(G.shortName(L))}</b></div><div class="mid"><em>${fx.home ? 'HOME' : 'AWAY'}</em><b>VS</b></div><div class="side r"><span class="crest">${Art.crest(R)}</span><b>${esc(G.shortName(R))}</b></div></div>
          <div class="tip hide-short">Assistant: ${danger ? `watch ${esc(danger.name)} (${danger.rating}).` : ''} Difficulty <span class="diff">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= dd ? 'on' : ''}"></i>`).join('')}</span></div>`;
        nc.appendChild(Nav.button({ label: 'Play the Match', icon: 'ball', snd: 'select', go: () => Nav.push('prematch') }, 'btn big'));
      } else {
        nc.innerHTML = `<div class="comp">${I('trophy')}${esc(d.name)}</div><div class="tip" style="margin:14px 0">The league season is complete. Awards night is waiting.</div>`;
        nc.appendChild(Nav.button({ label: 'Finish the Season', icon: 'trophy', go: () => Nav.push('awards') }, 'btn big'));
      }
      box.appendChild(nc);
      const f = Sim.weekFinance(car, car.me, true);
      box.appendChild(el('div', 'tiles t4keep hide-short', `<div class="tile">${I('cash')}<span class="tv"><small>Balance</small><b>${G.money(car.balances[car.me])}</b></span></div><div class="tile">${I('finances')}<span class="tv"><small>Wages</small><b>${G.money(f.wages)}</b></span></div>
        <div class="tile">${I('handshake')}<span class="tv"><small>Board</small><b>${Math.round(car.board.confidence)}%</b></span></div><div class="tile">${I('star')}<span class="tv"><small>Morale</small><b>${morale(car)}</b></span></div>`));
      const row = el('div', 'grow', ''); row.style.cssText = 'display:grid;grid-template-columns:1.25fr 1fr;gap:9px;min-height:0';
      const mt = el('button', 'panel', ''); mt.style.cssText = 'padding:8px 8px;display:flex;flex-direction:column;min-height:0;overflow:hidden;text-align:left'; mt.onclick = () => Nav.push('competitions');
      mt.innerHTML = `<div class="ptitle" style="font-size:15px;margin-bottom:2px">${I('chart')}League<span class="r">${I('chevron')}</span></div><div class="minitable grow"></div>`;
      const right = el('div', 'stack'); right.style.minHeight = '0';
      right.appendChild(el('div', 'panel', `<div class="ptitle" style="font-size:15px">Form</div>${formHTML(myForm(car))}`));
      const unread = car.inbox.filter(m => !m.read).length, last = car.inbox[0];
      const ib = el('button', 'panel grow', `<div class="linkrow">${I('mail')}<b>Inbox</b>${unread ? `<i>${unread}</i>` : ''}</div>${last ? `<small class="note" style="display:block;margin-top:4px;overflow:hidden;max-height:34px">${esc(last.from)}: ${esc(last.text)}</small>` : ''}`);
      ib.style.textAlign = 'left'; ib.style.overflow = 'hidden'; ib.onclick = () => Nav.push('inbox'); right.appendChild(ib);
      row.append(mt, right); box.appendChild(row);
      if (fx) { const opp = G.club(fx.home ? fx.a : fx.h), sq = Sim.squadOf(car, opp.id).filter(p => !p.injured).sort((a, b) => b.rating - a.rating), top = sq[0];
        const sc = el('div', 'panel scoutcard hide-short', `<div class="st"><div class="ptitle" style="font-size:15px;margin:0">${I('binoculars')}Scout Report</div><p>${esc(opp.name)} play ${esc(car.tactics[opp.id].formation)}. Key man: <b>${top ? esc(top.name) : '—'}</b>${top ? ` (${top.pos}, ${top.rating})` : ''}.</p></div><div class="sp"></div>`);
        box.appendChild(sc); }
      const q = el('div', 'qtiles');
      for (const [icon, label, go] of [['calendar', 'Schedule', 'schedule'], ['trophy', 'Competitions', 'competitions'], ['chart', 'Analyse', 'analyse'], ['medical', 'Medical', 'medical']]) { const t = el('button', 'qtile', `${I(icon)}<span>${label}</span>`); t.onclick = () => Nav.push(go); q.appendChild(t); }
      box.appendChild(q);
      return { el: box, mount: () => {
        const mtb = box.querySelector('.minitable'), t = Sim.table(car, c.div), rows = Math.max(1, Math.floor((mtb.clientHeight - 20) / 30)), i = t.findIndex(r => r.id === car.me);
        const s = Math.max(0, Math.min(t.length - rows, i - Math.floor(rows / 2)));
        mtb.innerHTML = '<div class="h"><span>#</span><span>Club</span><b style="text-align:right">Pts</b></div>' + t.slice(s, s + rows).map((r, k) => { const cc = G.club(r.id); return `<div class="r ${r.id === car.me ? 'me' : ''}"><span>${s + k + 1}</span><span class="nm"><span class="crest">${Art.crest(cc)}</span>${esc(cc.short.replace(/\d/g, ''))}</span><b>${r.pts}</b></div>`; }).join('');
      } };
    },

    // ================= Squad =================
    squad(car) {
      const sq = Sim.squadOf(car, car.me), xi = new Set(Sim.myXI(car).xi.map(p => p.id));
      const groups = [['GK', 'GK'], ['DF', 'DEF'], ['MF', 'MID'], ['FW', 'ATT']];
      const tabs = Nav.subtabs(groups.map(([g, l]) => ({ id: g, label: l, badge: sq.filter(p => p.grp === g).length })), H.sub.squad, id => { H.sub.squad = id; Nav.refresh(); });
      const list = sq.filter(p => p.grp === H.sub.squad).sort((a, b) => (xi.has(b.id) - xi.has(a.id)) || b.rating - a.rating || a.id - b.id);
      return { head: G.phead('squad', 'Squad', `${sq.length} players · avg ${Math.round(sq.reduce((s, p) => s + p.rating, 0) / sq.length)}`, null, 'compact'), tabs,
        mount: fill => Nav.pager(fill, { key: 'sq' + H.sub.squad, items: list, cols: 1, itemH: 58, gap: 6, render: p => {
          const r = G.prow(p, { xi: xi.has(p.id), sub: xi.has(p.id) ? '<span class="tag">XI</span>' : '' }); r.onclick = () => Nav.push('player', { id: p.id }); return r; } }) };
    },

    // ================= Tactics =================
    tactics(car) {
      const tac = car.tactics[car.me], chem = Sim.chemistry(car);
      car.instr = car.instr || { press: 3, line: 3, pass: 3, toggles: {} };
      const tabs = Nav.subtabs([{ id: 'formation', label: 'Formation', icon: 'tactics' }, { id: 'instructions', label: 'Instructions', icon: 'sliders' }, { id: 'setp', label: 'Set Pieces', icon: 'flag' }], H.sub.tactics, id => { H.sub.tactics = id; H.sel = null; Nav.refresh(); });
      const head = G.phead('tactics', 'Tactics', 'Set up your team and how they play', `<span style="text-align:center"><small style="display:block;font-size:10.5px;color:#c9d3cb">Chemistry</small>${G.ring(chem, chem >= 70 ? '#5fcf6f' : chem >= 50 ? '#e7c25a' : '#ff6f61')}</span>`, 'compact');
      return Object.assign({ head, tabs }, TAC[H.sub.tactics](car, tac));
    },

    // ================= Market =================
    market(car) {
      const filt = car.legendsOn ? H.sub.market : 'all';
      const tabs = car.legendsOn ? Nav.subtabs([{ id: 'legends', label: 'Legends', icon: 'star' }, { id: 'all', label: 'Free Agents', icon: 'handshake' }], filt, id => { H.sub.market = id; Nav.refresh(); }) : null;
      const items = Sim.freeAgents(car).filter(p => filt === 'all' || p.legend).sort((a, b) => b.rating - a.rating);
      return { head: G.phead('market', 'Transfer Market', `${items.length} available · ${Sim.squadOf(car, car.me).length}/${DATA.season.squadMax} in squad`, null, 'compact'), tabs,
        mount: fill => Nav.pager(fill, { key: 'mk' + filt, items, cols: 1, itemH: 58, gap: 6, empty: 'No free agents right now.', render: p => {
          const chk = Sim.canSign(car, p), r = G.prow(p, { sub: `£${p.wage}K/wk` + (p.legend ? ' · ' + esc(p.known) : '') }); if (!chk.ok) r.style.opacity = .6; r.onclick = () => Nav.push('player', { id: p.id }); return r; } }) };
    },

    // ================= Club =================
    club(car) {
      const tabs = Nav.subtabs([{ id: 'overview', label: 'Overview' }, { id: 'stadium', label: 'Stadium' }, { id: 'facilities', label: 'Facilities' }, { id: 'youth', label: 'Youth' }, { id: 'finances', label: 'Money' }], H.sub.club, id => { H.sub.club = id; Nav.refresh(); }, true);
      const c = G.me();
      return Object.assign({ head: G.phead('club', 'Club', `${c.name} · founded on ambition`, null, 'compact'), tabs }, CLUB[H.sub.club](car, c));
    },
  };

  // ---------- tactics tabs ----------
  const LINES = { GK: 86, DF: 66, MF: 43, FW: 18 };
  const TAC = {
    formation(car, tac) {
      const box = el('div', 'stack grow');
      const fkeys = Object.keys(DATA.formations), pkeys = Object.keys(DATA.presets);
      const row = el('div', ''); row.style.cssText = 'display:grid;grid-template-columns:1fr 1.25fr;gap:7px';
      const sel = (label, val, onStep) => { const s = el('div', 'selbox'), pv = el('button', '', '‹'), nx = el('button', '', '›'); pv.dataset.snd = nx.dataset.snd = 'swipe'; pv.onclick = () => onStep(-1); nx.onclick = () => onStep(1); s.append(pv, el('b', '', esc(val)), nx); s.title = label; return s; };
      row.append(
        sel('Formation', tac.formation, d => { tac.formation = fkeys[(fkeys.indexOf(tac.formation) + d + fkeys.length) % fkeys.length]; H.sel = null; G.save(); Nav.refresh(); }),
        sel('Preset', car.preset ? DATA.presets[car.preset].label : 'Custom tactic', d => { const i = car.preset ? pkeys.indexOf(car.preset) : -1; Sim.applyPreset(car, pkeys[(i + d + pkeys.length) % pkeys.length]); G.save(); Nav.refresh(); }));
      box.appendChild(row);
      const pitch = el('div', 'pitch'); box.appendChild(pitch);
      box.appendChild(mentality(car, tac));
      return { el: box, mount: () => drawPitch(car, tac, pitch) };
    },
    instructions(car, tac) {
      const box = el('div', 'stack grow'), ins = car.instr, panel = el('div', 'panel stack');
      for (const k of ['press', 'line', 'pass']) {
        const D = DATA.instructions[k], r = el('div', 'instrow', `<small>${esc(D.label)}</small><b>${esc(D.steps[ins[k] - 1])}</b>`), bars = el('div', 'bar5');
        for (let i = 1; i <= 5; i++) { const b = el('i', i <= ins[k] ? 'on' : ''); b.onclick = () => { ins[k] = i; car.preset = null; Sound.play('tap'); G.save(); Nav.refresh(); }; bars.appendChild(b); }
        r.appendChild(bars); panel.appendChild(r);
      }
      box.appendChild(panel);
      const tg = el('div', 'toggles');
      for (const k in DATA.toggles) { const T = DATA.toggles[k], on = !!(ins.toggles || {})[k], b = el('button', 'tgl' + (on ? ' on' : ''), `${I(T.icon)}<span>${esc(T.label)}</span>`);
        b.onclick = () => { ins.toggles = ins.toggles || {}; ins.toggles[k] = !on; car.preset = null; G.save(); Nav.refresh(); }; tg.appendChild(b); }
      box.appendChild(tg);
      const skeys = Object.keys(DATA.styles), srow = el('div', 'cyc'), spv = el('button', 'cb', '‹'), snx = el('button', 'cb', '›'); srow.style.marginBottom = '0';
      const sset = d => { tac.style = skeys[(skeys.indexOf(tac.style) + d + skeys.length) % skeys.length]; car.preset = null; G.save(); Nav.refresh(); }; spv.onclick = () => sset(-1); snx.onclick = () => sset(1); spv.dataset.snd = snx.dataset.snd = 'swipe';
      srow.append(el('span', '', 'Playing style'), spv, el('b', '', esc(DATA.styles[tac.style].label) + (tac.style === car.brief.style ? ' <span class="gold">★</span>' : '')), snx); box.appendChild(srow);
      box.appendChild(el('div', 'grow'));
      box.appendChild(mentality(car, tac));
      return { el: box };
    },
    setp(car) {
      const box = el('div', 'stack grow'), xi = Sim.myXI(car).xi.filter(p => p.grp !== 'GK'), all = Sim.myXI(car).xi;
      const roles = [['captain', 'Captain', 'star', all, null], ['pens', 'Penalties', 'ball', xi, 'shooting'], ['fk', 'Free kicks', 'flag', xi, 'passing'], ['corners', 'Corners', 'flag', xi, 'passing']];
      for (const [key, label, icon, pool, attr] of roles) {
        const list = attr ? pool.slice().sort((a, b) => b.attr[attr] - a.attr[attr]) : pool.slice().sort((a, b) => b.rating - a.rating);
        const cur = key === 'captain' ? car.captain : car.setp[key]; let i = Math.max(0, list.findIndex(p => p.id === cur));
        const p = list[i], row = el('div', 'cyc'), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›');
        const set = d => { i = (i + d + list.length) % list.length; const q = list[i]; if (key === 'captain') car.captain = q.id; else car.setp[key] = q.id; G.save(); Nav.refresh(); };
        pv.onclick = () => set(-1); nx.onclick = () => set(1); pv.dataset.snd = nx.dataset.snd = 'swipe';
        row.append(el('span', '', `${I(icon, 'gold')} `.replace('class="ic gold"', 'class="ic gold" style="display:inline;width:16px;height:16px;vertical-align:-3px;color:var(--gold)"') + esc(label)), pv, el('b', '', p ? esc(G.surname(p.name)) + (attr ? ` <small style="color:var(--gold);font-family:var(--sans)">${p.attr[attr]}</small>` : '') : '—'), nx);
        box.appendChild(row);
      }
      box.appendChild(el('p', 'note center', 'Your best taker is listed first. The captain lifts morale when the team is behind.'));
      return { el: box };
    },
  };
  function mentality(car, tac) {
    const m = el('div', 'panel ment', `${I('chart')}<span class="mt"><b>Mentality</b><small>${esc(DATA.mentality[tac.mentality].label)}</small></span>`), seg = el('div', 'seg');
    for (const k of Object.keys(DATA.mentality)) { const b = el('button', k === tac.mentality ? 'on' : '', esc(DATA.mentality[k].label.replace(/ .*/, ''))); b.onclick = () => { tac.mentality = k; car.preset = null; G.save(); Nav.refresh(); }; seg.appendChild(b); }
    m.appendChild(seg); return m;
  }
  function drawPitch(car, tac, pitch) {
    const f = DATA.formations[tac.formation], { xi, bench } = Sim.myXI(car), c = G.me(), W = pitch.clientWidth;
    pitch.innerHTML = `<svg class="lines" viewBox="0 0 68 100" preserveAspectRatio="none"><g fill="none" stroke="#f4f1e6" stroke-opacity=".5" stroke-width=".45"><rect x=".5" y=".5" width="67" height="99"/><line x1=".5" y1="50" x2="67.5" y2="50"/><ellipse cx="34" cy="50" rx="9" ry="6.5"/><rect x="14" y="83" width="40" height="16.5"/><rect x="24" y="93" width="20" height="6.5"/><rect x="14" y=".5" width="40" height="16.5"/><rect x="24" y=".5" width="20" height="6.5"/></g></svg>`;
    const slots = ['GK'].concat(Array(f.DF).fill('DF'), Array(f.MF).fill('MF'), Array(f.FW).fill('FW')), count = { GK: 1, DF: f.DF, MF: f.MF, FW: f.FW }, idx = { GK: 0, DF: 0, MF: 0, FW: 0 };
    const H2 = pitch.clientHeight, sw = Math.max(26, Math.min(40, H2 / 12));
    xi.forEach((p, i) => {
      const g = slots[i] || 'MF', n = count[g], k = idx[g]++, x = 6 + 88 * (k + .5) / n, y = LINES[g] + (n >= 5 && k % 2 ? -3 : 0);
      const pw = Math.min(82, W / n - 4), d = el('button', 'pp' + (H.sel === p.id ? ' sel' : ''));
      d.style.cssText = `left:${x}%;top:${y}%;--pw:${pw}px;--sw:${sw}px`;
      d.innerHTML = `${car.captain === p.id ? '<span class="cap">C</span>' : ''}${Art.shirt(c.kit, i + 1, { gk: g === 'GK', pattern: Art.kitPattern(c.id) })}<div class="plate"><b>${esc(G.surname(p.name))}</b><span>${p.pos}<em>${p.rating}</em></span><div class="fit"><i style="width:${Math.round(p.fitness)}%;background:${p.fitness < 70 ? '#ffb43a' : '#5fcf6f'}"></i></div></div>`;
      d.onclick = () => {
        if (!H.sel) { H.sel = p.id; Sound.play('tap'); drawPitch(car, tac, pitch); return; }
        if (H.sel === p.id) { benchCard(car, p, bench); return; }
        Sim.swapIntoXI(car, H.sel, p.id); H.sel = null; Sound.play('card'); G.save(); Nav.refresh();
      };
      pitch.appendChild(d);
    });
    if (!pitch.querySelector('.hint')) { const h = el('div', 'hint', H.sel ? 'Tap a team-mate to swap, or tap again for the bench' : 'Tap a player to move or replace him'); h.style.cssText = 'position:absolute;left:0;right:0;bottom:3px;text-align:center;font:600 11px var(--sans);color:rgba(255,255,255,.75);pointer-events:none'; pitch.appendChild(h); }
  }
  function benchCard(car, out, bench) {
    const body = el('div', ''); body.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    bench.slice(0, 6).forEach(p => { const r = G.prow(p); r.style.height = '54px'; r.onclick = () => { Sim.swapIntoXI(car, out.id, p.id); H.sel = null; G.save(); Nav.closeCard(); Sound.play('card'); Nav.refresh(); }; body.appendChild(r); });
    Nav.card({ title: `Replace ${G.surname(out.name)}`, body, buttons: [{ label: 'Cancel', ghost: true, go: () => { H.sel = null; Nav.refresh(); } }] });
  }

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
        <div class="tiles t2"><div class="tile">${I('finances')}<span class="tv"><small>Wages / week</small><b class="bad">${G.money(f.wages)}</b></span></div><div class="tile">${I('ticket')}<span class="tv"><small>Matchday gate</small><b>${G.money(f.gate)}</b></span></div><div class="tile">${I('handshake')}<span class="tv"><small>Commercial / week</small><b>${G.money(f.commercial)}</b></span></div><div class="tile">${I('globe')}<span class="tv"><small>TV / week</small><b>${G.money(f.tv)}</b></span></div></div>
        <div class="panel"><div class="ptitle">${I('clipboard')}The board's brief</div><p style="font:700 18px var(--serif);margin:0 0 4px">${esc(car.brief.text)}</p><p class="note">Target ${G.ord(car.brief.target)} or better · ${esc(DATA.styles[car.brief.style].label)} football</p></div>
        <div class="panel stack"><div class="instrow"><small>Board confidence</small><b>${conf}%</b></div><div class="meter"><i style="width:${conf}%"></i></div><div class="instrow"><small>Fan mood</small><b>${Math.round(car.fans)}</b></div><div class="meter"><i style="width:${car.fans}%"></i></div></div>`) };
    },
  };

  // ================= Player screen =================
  Nav.define('player', prm => {
    const car = S.career, p = car.players.find(x => x.id === prm.id), c = p.club ? G.club(p.club) : null, mine = p.club === car.me;
    const attrs = DATA.attributes.filter(a => p.grp === 'GK' ? true : (a !== 'handling' && a !== 'reflexes'));
    const b = el('div', 'pprof');
    b.innerHTML = `<div class="pp-top"><span class="shirtbox">${G.shirtOf(p, null)}</span><div style="min-width:0"><h2>${esc(p.name)}</h2><div class="meta">${p.legend ? '<span class="legendtag">LEGEND</span>' : ''}${esc(DATA.positions[p.pos].name)}</div><div class="meta">${p.nat ? Flags.svg(p.nat, 20, 13) : ''} ${esc(Flags.name(p.nat))} · ${p.age} yrs</div><div class="meta">${c ? `<span class="crest" style="width:20px;height:23px">${Art.crest(c)}</span> ${esc(c.name)}` : 'Free agent'}${p.legend ? ' · ' + esc(p.known) : ''}</div></div><span class="rbadge ${G.rcls(p.rating)}" style="width:54px;height:54px;font-size:26px;margin-left:auto">${p.rating}</span></div>
      <div class="tiles t3"><div class="tile"><span class="tv"><small>Potential</small><b>${p.pot}</b></span></div><div class="tile"><span class="tv"><small>Value</small><b>${G.money(Sim.value(p) * 1000)}</b></span></div><div class="tile"><span class="tv"><small>Wage</small><b>£${p.wage}K</b></span></div>
      <div class="tile"><span class="tv"><small>Season</small><b>${p.seasonApps}a · ${p.seasonGoals}g</b></span></div><div class="tile"><span class="tv"><small>Fitness</small><b>${p.injured ? `<span class="bad">Inj ${p.injured}w</span>` : Math.round(p.fitness) + '%'}</b></span></div><div class="tile"><span class="tv"><small>Morale</small><b>${Math.round(p.morale)}</b></span></div></div>
      <div class="panel attrs">${attrs.map(a => `<div class="attr"><span>${a[0].toUpperCase() + a.slice(1)}</span><b>${p.attr[a]}</b><div class="lvl"><i style="width:${p.attr[a]}%;${p.attr[a] >= 80 ? 'background:linear-gradient(90deg,#c0912d,#f6dc8a)' : ''}"></i></div></div>`).join('')}</div>`;
    const spec = { header: G.titleHeader(G.surname(p.name), mine ? 'Your player' : c ? c.name : 'Free agent', 'user'), body: b };
    if (mine) { spec.extra = [{ label: 'Release', hold: true, go: () => { if (Sim.release(car, p.id)) { G.save(); Nav.toast(`${p.name} released`); Nav.back(); } else Nav.toast(`You need at least ${DATA.season.squadMin} players`, 'bad'); } }];
      spec.action = car.captain === p.id ? { label: 'Captain', icon: 'star', disabled: true } : { label: 'Make captain', icon: 'star', go: () => { car.captain = p.id; G.save(); Sound.play('stamp'); Nav.toast(`${G.surname(p.name)} is your new captain`); Nav.refresh(); } }; }
    else if (!p.club) { const chk = Sim.canSign(car, p);
      if (chk.ok) spec.action = { label: 'Sign', icon: 'handshake', hold: true, go: () => { if (Sim.sign(car, p.id)) { G.save(); Nav.back(); setTimeout(() => signReveal(p), 320); } } };
      else { spec.action = { label: 'Sign', icon: 'lock', disabled: true }; b.insertAdjacentHTML('beforeend', `<p class="note center bad">${esc(chk.why)}</p>`); } }
    return spec;
  });
  function signReveal(p) {
    Sound.play('sting_signing'); setTimeout(() => Sound.play('camera'), 500); Sound.buzz(40); G.checkAchievements();
    const b = el('div', 'center'); b.innerHTML = `<div style="width:120px;margin:0 auto 10px;--sw:120px;animation:crestIn .8s both">${G.shirtOf(p, null)}</div><h2 style="font-size:28px">${esc(p.name)}</h2><p class="note">joins ${esc(G.me().name)}!</p>`;
    Nav.card({ body: b, buttons: [{ label: 'Brilliant', go: () => Nav.refresh() }] });
  }

  // ================= Office sub screens =================
  Nav.define('schedule', () => {
    const car = S.career, div = Sim.myDiv(car), me = car.me, rows = [], box = el('div', 'fill');
    car.fixtures[div].forEach((round, w) => { const f = round.find(([h, a]) => h === me || a === me); if (f) rows.push({ w, f, r: car.results.find(m => m.season === car.season && m.week === w && m.h === f[0] && m.a === f[1]) }); });
    return { header: G.header('calendar', 'Schedule', `${G.seasonLabel(car.season)} · ${rows.length} league games`), body: box,
      mount: () => Nav.pager(box, { key: 'fx', items: rows, cols: 1, itemH: 52, gap: 5, render: x => {
        const home = x.f[0] === me, opp = G.club(home ? x.f[1] : x.f[0]);
        let score = `<span class="ha">${home ? 'HOME' : 'AWAY'}</span>`;
        if (x.r) { const us = home ? x.r.gH : x.r.gA, them = home ? x.r.gA : x.r.gH; score = `<span class="score ${us > them ? 'W' : us < them ? 'L' : 'D'}">${us}-${them}</span>`; }
        return el('div', 'fxrow' + (x.w === car.week ? ' now' : ''), `<span class="wk">${String(x.w + 1).padStart(2, '0')}</span><span class="crest">${Art.crest(opp)}</span><span style="min-width:0"><b>${esc(opp.name)}</b><small>${home ? 'Home' : 'Away'}${opp.id === G.me().rival ? ' · Derby' : ''}</small></span>${score}`); } }) };
  });
  Nav.define('competitions', () => {
    const car = S.career, divId = Sim.myDiv(car), d = WORLD.divisions[divId], t = Sim.table(car, divId), n = t.length;
    const divs = WORLD.divisionsOf(d.country), above = divs.find(x => x.tier === d.tier - 1), below = divs.find(x => x.tier === d.tier + 1);
    const zone = pos => d.tier === 1 ? (pos <= 4 ? 'up' : pos > n - d.down ? 'down' : '') : (above && pos <= d.up ? 'up' : above && d.playoff && pos >= d.playoff[0] && pos <= d.playoff[1] ? 'po' : below && pos > n - d.down ? 'down' : '');
    const box = el('div', 'fill'), wrap = el('div', 'panel fill'); wrap.style.padding = '6px 4px';
    wrap.appendChild(el('div', 'thead', '<span>#</span><span></span><span>Club</span><span>P</span><span>GD</span><span>Pts</span><span>Form</span>')); wrap.appendChild(box);
    return { header: G.header('trophy', d.name, `${G.seasonLabel(car.season)} · ${n} clubs`), body: wrap,
      mount: () => { const rowH = Math.floor((box.clientHeight - 40) / n);
        Nav.pager(box, { key: 'tbl', items: t, cols: 1, itemH: rowH >= 22 ? Math.min(rowH, 34) : 26, gap: 0, render: (r, i) => { const pos = i + 1, c = G.club(r.id);
          return el('div', 'trow ' + zone(pos) + (r.id === car.me ? ' me' : ''), `<span>${pos}</span><span class="crest">${Art.crest(c)}</span><span class="nm">${esc(G.shortName(c))}</span><span>${r.p}</span><span>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</span><b>${r.pts}</b><span class="fm">${r.form.slice(-3).map(x => `<i class="${x}"></i>`).join('')}</span>`); } }); } };
  });
  Nav.define('analyse', () => {
    const car = S.career, t = Sim.table(car, Sim.myDiv(car)).find(r => r.id === car.me), sq = Sim.squadOf(car, car.me);
    const scorers = sq.filter(p => p.seasonGoals).sort((a, b) => b.seasonGoals - a.seasonGoals).slice(0, 5), box = el('div', 'stack grow');
    box.innerHTML = `<div class="tiles t3"><div class="tile"><span class="tv"><small>Played</small><b>${t.p}</b></span></div><div class="tile"><span class="tv"><small>W-D-L</small><b>${t.w}-${t.d}-${t.l}</b></span></div><div class="tile"><span class="tv"><small>Points</small><b>${t.pts}</b></span></div>
      <div class="tile"><span class="tv"><small>Scored</small><b>${t.gf}</b></span></div><div class="tile"><span class="tv"><small>Conceded</small><b>${t.ga}</b></span></div><div class="tile"><span class="tv"><small>Per game</small><b>${t.p ? (t.pts / t.p).toFixed(2) : '—'}</b></span></div></div>
      <div class="panel"><div class="ptitle">Form</div>${formHTML(myForm(car))}</div>
      <div class="panel grow" style="overflow:hidden"><div class="ptitle">${I('ball')}Top scorers</div>${scorers.length ? scorers.map((p, i) => `<div class="instrow" style="padding:4px 0"><small>${i + 1}. ${esc(p.name)}</small><b>${p.seasonGoals}</b></div>`).join('') : '<p class="note">No goals yet this season.</p>'}</div>`;
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
