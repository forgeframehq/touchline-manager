// Club area as a console menu: stadium banner + a 3×3 grid of rooms. Each room is its own screen:
// Stadium, Facilities, Training (team focus, intensity, individual training), Staff (hire / fire),
// Youth Academy, Finances (+ sponsors), Board Room (requests), History (seasons, records, hall of fame), Manager.
// Also the player comparison screen.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, I = Icons.svg, D = DATA, S = G.state;
  const ROOMS = [['stadium', 'Stadium', 'stadium'], ['facilities', 'Facilities', 'hammer'], ['training', 'Training', 'dumbbell'], ['staff', 'Staff', 'clipboard'], ['youth', 'Academy', 'youth'], ['finances', 'Finances', 'finances'], ['board', 'Board Room', 'handshake'], ['history', 'History', 'trophy'], ['manager', 'Manager', 'user']];

  function view(car) {
    const c = G.me(), box = el('div', 'stack grow');
    box.innerHTML = `<div class="stadhero clubban" style="background-image:url(${Art.stadiumImg(c.capacity)})"><span class="crest">${Art.crest(c)}</span><div><b>${esc(c.stadium)}</b><small>${c.capacity.toLocaleString()} seats · ${esc(Sim.repTier(c.rep))} reputation · board ${Math.round(car.board.confidence)}%</small></div></div>`;
    const grid = el('div', 'roomgrid');
    for (const [k, label, icon] of ROOMS) { const t = el('button', 'room', `${I(icon)}<b>${label}</b><small>${roomSub(car, k)}</small>`); t.onclick = () => Nav.push(k === 'manager' ? 'profile' : 'cl_' + k); grid.appendChild(t); }
    box.appendChild(grid);
    return { head: G.phead('club', 'Club', `${c.name} · ${WORLD.divisions[c.div].name}`, null, 'compact'), el: box };
  }
  function roomSub(car, k) {
    const f = car.facilities;
    return k === 'stadium' ? (car.build ? 'Building…' : `£${car.ticket || Sim.basePrice(car)} ticket`) : k === 'facilities' ? `Avg level ${Math.round((f.training + f.youth + f.scouting + f.medical) / 4)}` : k === 'training' ? D.training.focus[car.training.focus][0] + ' · ' + D.training.intensity[car.training.intensity][0]
      : k === 'staff' ? `${Object.values(car.staff).filter(Boolean).length}/5 hired` : k === 'youth' ? `${['', 'Local', 'National', 'International'][car.academy || 1]} scouting` : k === 'finances' ? G.money(car.balances[car.me]) : k === 'board' ? Sim.finState(car) : k === 'history' ? `${car.history.length} season${car.history.length === 1 ? '' : 's'}` : `Rep ${Sim.mgrRep(car)}`;
  }
  const room = (key, icon, title, sub, body, extra) => Object.assign({ header: G.header(icon, title, sub), body }, extra || {});

  Nav.define('cl_stadium', () => { const car = S.career, c = G.me(), v = HubUI.CLUB.stadium(car, c); return room('stadium', 'stadium', 'Stadium', c.stadium, v.el, { mount: v.mount }); });
  Nav.define('cl_facilities', () => { const car = S.career, v = HubUI.CLUB.facilities(car); return room('facilities', 'hammer', 'Facilities', 'Upgrade with the hold button', v.el); });
  Nav.define('cl_youth', () => { const car = S.career, v = HubUI.CLUB.youth(car); return room('youth', 'youth', 'Youth Academy', `${['', 'Local', 'National', 'International'][car.academy || 1]} recruitment · ask the board to widen it`, v.el, { mount: v.mount }); });
  Nav.define('cl_finances', () => { const car = S.career, v = HubUI.CLUB.finances(car), inc = car.lastIncome || { merch: 0, sponsor: 0, staff: Sim.staffWages(car) };
    v.el.insertAdjacentHTML('beforeend', `<div class="panel" style="padding:8px 12px"><div class="instrow"><small>Merchandise / wk</small><b>${G.money(inc.merch)}</b></div><div class="instrow"><small>Sponsor / wk</small><b>${car.sponsor ? G.money(car.sponsor.weekly) + ' · ' + esc(car.sponsor.name) : '<span class="warn">No shirt sponsor</span>'}</b></div><div class="instrow"><small>Staff wages / wk</small><b class="bad">${G.money(Sim.staffWages(car))}</b></div></div>`);
    return room('finances', 'finances', 'Finances', Sim.finState(car), v.el, { action: { label: 'Sponsors', icon: 'handshake', go: () => Nav.push('cl_sponsors') } }); });

  // ---------- training ----------
  const TR = { sel: null };
  Nav.define('cl_training', () => {
    const car = S.career, T = car.training, box = el('div', 'stack grow'), fk = Object.keys(D.training.focus);
    const cyc = (label, val, step) => { const r = el('div', 'cyc m0'), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›'); pv.dataset.snd = nx.dataset.snd = 'swipe'; pv.onclick = () => step(-1); nx.onclick = () => step(1); r.append(el('span', '', label), pv, el('b', '', val), nx); return r; };
    box.appendChild(cyc('Team focus', esc(D.training.focus[T.focus][0]), d => { T.focus = fk[(fk.indexOf(T.focus) + d + fk.length) % fk.length]; G.save(); Nav.refresh(); }));
    const seg = el('div', 'seg'); D.training.intensity.forEach(([lab], i) => { const b = el('button', i === T.intensity ? 'on' : '', lab); b.onclick = () => { T.intensity = i; G.save(); Nav.refresh(); }; seg.appendChild(b); });
    box.appendChild(seg);
    const I2 = D.training.intensity[T.intensity];
    box.appendChild(el('p', 'note center', `${focusNote(T.focus)} · ${T.intensity === 2 ? 'Faster growth, slower recovery, more injuries.' : T.intensity === 0 ? 'Fresh legs, slower growth.' : 'Balanced load.'} Coach ${G.stars(Sim.staffR(car, 'coach') / 4)}`));
    const list = el('div', 'fill'); box.appendChild(list);
    const sq = Sim.squadOf(car, car.me).slice().sort((a, b) => (b.pot - b.rating) - (a.pot - a.rating) || b.rating - a.rating);
    void I2;
    return { header: G.header('dumbbell', 'Training', 'Weekly focus and individual training'), body: box,
      mount: () => Nav.pager(list, { key: 'trn', items: sq, cols: 1, itemH: 50, gap: 5, render: p => {
        const up = p.up && p.up >= car.season * 100 + car.week - 3, r = G.prow(p, { sub: p.it ? `<b class="gold">${p.it[0].toUpperCase() + p.it.slice(1)}</b>` : 'no focus', right: `<b class="ask">${up ? '<span class="good">▲</span> ' : ''}${p.pot > p.rating ? '+' + (p.pot - p.rating) : '—'}</b><small>sharp ${Math.round(p.sharp == null ? 70 : p.sharp)}%</small>` });
        r.style.height = '50px'; r.onclick = () => indivCard(car, p); return r; } }) };
  });
  function focusNote(f) { return { balanced: 'All-round work', attacking: 'More chances in matches', defending: 'Concede fewer chances', fitness: 'Faster recovery', setpieces: 'Better at set pieces', tactics: 'Learns the shape faster', youth: 'Young players develop faster' }[f]; }
  function indivCard(car, p) {
    const opts = [null].concat(D.training.individual.filter(a => p.grp === 'GK' ? true : a !== 'handling' && a !== 'reflexes')); let i = Math.max(0, opts.indexOf(p.it || null));
    const body = el('div', 'stack'); const draw = () => { body.innerHTML = `<p class="note center" style="margin:0">Pick one area for ${esc(G.surname(p.name))} to work on. Progress: ${Math.round((p.itp || 0) * 100)}% to the next point.</p>`;
      const r = el('div', 'cyc m0'), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›'); pv.onclick = () => { i = (i - 1 + opts.length) % opts.length; draw(); }; nx.onclick = () => { i = (i + 1) % opts.length; draw(); };
      r.append(el('span', '', 'Focus'), pv, el('b', '', opts[i] ? opts[i][0].toUpperCase() + opts[i].slice(1) : 'None'), nx); body.appendChild(r);
      if (p.ib) body.insertAdjacentHTML('beforeend', `<p class="note center" style="margin:0">Gained so far: ${Object.entries(p.ib).map(([k, v]) => `${k} +${v}`).join(', ')}</p>`); };
    draw(); Nav.card({ title: 'Individual training', body, buttons: [{ label: 'Cancel', ghost: true }, { label: 'Set', go: () => { p.it = opts[i]; p.itp = 0; G.save(); Nav.refresh(); } }] });
  }

  // ---------- staff ----------
  Nav.define('cl_staff', () => {
    const car = S.career, list = el('div', 'fill'), roles = Object.keys(D.staffRoles);
    return { header: G.header('clipboard', 'Staff', `Wages ${G.money(Sim.staffWages(car))}/wk`), body: list,
      mount: () => Nav.pager(list, { key: 'staff', items: roles, cols: 1, itemH: 64, gap: 6, render: role => {
        const s = car.staff[role], [title, icon] = D.staffRoles[role];
        const r = el('button', 'lrow', `<span class="av">${I(icon).replace('class="ic ', 'style="width:18px;height:18px;color:#1c1405" class="ic ')}</span><span class="lt"><b>${s ? esc(s.name) : '<span class="bad">Vacant</span>'}</b><small>${title}${s ? ` · £${s.wage}K/wk · age ${s.age}` : ''}</small></span>${s ? G.stars(s.r / 4) : ''}`);
        r.style.height = '64px'; r.onclick = () => Nav.push('cl_hire', { role }); return r; } }) };
  });
  Nav.define('cl_hire', prm => {
    const car = S.career, role = prm.role, cur = car.staff[role], pool = Sim.staffPool(car).filter(s => s.role === role).sort((a, b) => b.r - a.r), list = el('div', 'fill'), box = el('div', 'stack grow');
    box.appendChild(el('div', 'panel', `<div class="instrow"><small>${esc(D.staffRoles[role][0])}</small><b>${cur ? esc(cur.name) : 'Vacant'}</b></div>${cur ? `<div class="instrow"><small>Ability</small><b>${G.stars(cur.r / 4)}</b></div><p class="note" style="margin:2px 0 0">Replacing him costs 10 weeks of his wages (£${cur.wage * 10}K).</p>` : ''}<p class="note" style="margin:2px 0 0">${roleNote(role)}</p>`));
    box.appendChild(list);
    return { header: G.header(D.staffRoles[role][1], 'Hire ' + D.staffRoles[role][0], 'Candidates available now'), body: box,
      extra: cur ? [{ label: 'Fire', hold: true, go: () => { Sim.fireStaff(car, role); G.save(); Nav.toast(`${cur.name} has left`); Nav.back(); } }] : [],
      mount: () => Nav.pager(list, { key: 'hire' + role, items: pool, cols: 1, itemH: 58, gap: 6, render: s => {
        const r = el('button', 'lrow', `<span class="av">${esc(s.name[0])}</span><span class="lt"><b>${esc(s.name)}</b><small>£${s.wage}K/wk · age ${s.age}</small></span>${G.stars(s.r / 4)}`); r.style.height = '58px';
        r.onclick = () => Nav.card({ title: 'Hire ' + s.name + '?', body: `<p class="center">${esc(D.staffRoles[role][0])}, ability ${G.stars(s.r / 4)}, £${s.wage}K a week.</p>`, buttons: [{ label: 'Cancel', ghost: true }, { label: 'Hire', hold: true, go: () => { const res = Sim.hireStaff(car, s); G.save(); if (res.ok) { Sound.play('stamp'); Nav.toast(`${s.name} joins the staff`); Nav.back(); } else Nav.toast(res.why, 'bad'); } }] });
        return r; } }) };
  });
  function roleNote(role) { return { assistant: 'Better team talks and sharper touchline advice.', coach: 'Faster player development in training.', gk: 'Faster development for goalkeepers.', scout: 'Scouting reports arrive quicker.', physio: 'Fewer training injuries.' }[role]; }

  // ---------- board room ----------
  Nav.define('cl_board', () => {
    const car = S.career, conf = Math.round(car.board.confidence), box = el('div', 'stack grow');
    box.innerHTML = `<div class="panel"><div class="instrow"><small>Board confidence</small><b class="${conf >= 50 ? 'good' : 'bad'}">${conf}%</b></div><div class="meter" style="margin:4px 0 6px"><i style="width:${conf}%"></i></div><div class="instrow"><small>The brief</small><b>${esc(car.brief.text)}</b></div><div class="instrow"><small>Finances</small><b>${esc(Sim.finState(car))}</b></div></div>`;
    const list = el('div', 'stack');
    for (const [k, label] of Object.entries(Sim.REQ)) list.appendChild(Nav.button({ label, go: () => { const r = Sim.boardRequest(car, k); G.save(); Sound.play(r.ok ? 'stamp' : 'error'); Nav.card({ title: r.ok ? 'Approved' : 'Not this time', body: `<p class="center">${esc(r.text)}</p>`, buttons: [{ label: 'OK', go: () => Nav.refresh() }] }); } }, 'mi'));
    box.appendChild(list); box.appendChild(el('p', 'note center', 'The board are more generous when confidence is high and the club is in the black. Each request can be made every 6 weeks.'));
    return { header: G.header('handshake', 'Board Room', 'Make your case to the chairman'), body: box, bg: 'bg_board' };
  });

  // ---------- sponsors ----------
  Nav.define('cl_sponsors', () => {
    const car = S.career, box = el('div', 'stack grow');
    if (car.sponsor) box.innerHTML = `<div class="panel center"><p class="note" style="margin:0">Shirt sponsor this season</p><h2 style="font-size:28px;margin:6px 0">${esc(car.sponsor.name)}</h2><p>${G.money(car.sponsor.weekly)} a week · bonus ${G.money(car.sponsor.bonus)} if: ${esc(car.sponsor.target)}</p></div>`;
    else Sim.sponsorOffers(car).forEach(o => { const b = el('button', 'offer', `<span class="av" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--goldgrad);color:#1c1405;font:800 20px var(--serif)">${esc(o.name[0])}</span><span class="who" style="min-width:0"><b>${esc(o.name)}</b><small>${G.money(o.weekly)}/wk · bonus ${G.money(o.bonus)}</small><small>${o.target === 'none' ? 'Guaranteed bonus' : 'Bonus if: ' + esc(o.target)}</small></span>`);
      b.onclick = () => Nav.card({ title: o.name, body: `<p class="center">Sign a one-season shirt deal with ${esc(o.name)}?</p>`, buttons: [{ label: 'Cancel', ghost: true }, { label: 'Sign', hold: true, go: () => { car.sponsor = o; G.save(); Sound.play('stamp'); Nav.refresh(); } }] }); box.appendChild(b); });
    return { header: G.header('handshake', 'Sponsors', car.sponsor ? 'Deal signed' : 'Choose this season\'s shirt sponsor'), body: box };
  });

  // ---------- history ----------
  const HI = { tab: 'seasons' };
  Nav.define('cl_history', () => {
    const car = S.career, box = el('div', 'fill');
    box.appendChild(Nav.subtabs([{ id: 'seasons', label: 'Seasons' }, { id: 'records', label: 'Records' }, { id: 'hof', label: 'Hall of Fame' }], HI.tab, id => { HI.tab = id; Nav.refresh(); }, true));
    const list = el('div', 'fill'); box.appendChild(list); let items = [], render;
    if (HI.tab === 'seasons') { items = car.history.slice().reverse(); render = h => el('div', 'lrow', `<span class="av">${h.myPos}</span><span class="lt"><b>${G.seasonLabel(h.season)} · ${esc(WORLD.divisions[h.myDiv].name)}</b><small>${h.record.w}W ${h.record.d}D ${h.record.l}L · ${h.record.gf}:${h.record.ga}${h.promoted.includes(car.me) ? ' · Promoted' : h.relegated.includes(car.me) ? ' · Relegated' : ''}${h.prize ? ' · prize ' + G.money(h.prize) : ''}</small></span><span class="chip ${h.beat ? 'good' : ''}">${h.beat ? 'Brief met' : h.missed ? 'Missed' : 'Close'}</span>`); }
    if (HI.tab === 'records') { const R = car.records || {}, L = { bigWin: 'Biggest win', bigLoss: 'Heaviest defeat', topScorer: 'Top scorer (your era)', bestFinish: 'Best finish', signing: 'Record signing', sale: 'Record sale' };
      const sig = car.transfers.filter(t => t.dir === 'in' && t.fee).sort((a, b) => b.fee - a.fee)[0], sale = car.transfers.filter(t => t.dir === 'out' && t.fee).sort((a, b) => b.fee - a.fee)[0];
      items = Object.entries(L).map(([k, l]) => [l, k === 'signing' ? (sig ? `${sig.name} · ${Sim.feeLabel(sig.fee)}` : '—') : k === 'sale' ? (sale ? `${sale.name} · ${Sim.feeLabel(sale.fee)}` : '—') : R[k] ? `${R[k].label} (${G.seasonLabel(R[k].season)})` : '—']);
      render = ([l, v]) => el('div', 'lrow', `<span class="lt"><small>${esc(l)}</small><b>${esc(v)}</b></span>`); }
    if (HI.tab === 'hof') { items = Sim.hallOfFame(car); render = p => el('div', 'lrow', `<span class="av">★</span><span class="lt"><b>${esc(p.name)}</b><small>${p.ca || 0} apps · ${p.cg || 0} goals for the club</small></span>`); }
    return { header: G.header('trophy', 'History', `${G.me().name} under ${car.manager.name}`), body: box, bg: 'bg_trophy',
      mount: () => Nav.pager(list, { key: 'hist' + HI.tab, items, cols: 1, itemH: 56, gap: 6, empty: HI.tab === 'hof' ? 'Legends are made over time: 60 apps or 25 goals for the club.' : 'History starts at the end of your first season.', render: x => { const r = render(x); r.style.height = '56px'; return r; } }) };
  });

  // ---------- player comparison ----------
  Nav.define('compare', prm => {
    const car = S.career, a = car.players.find(p => p.id === prm.a), b = prm.b && car.players.find(p => p.id === prm.b);
    const box = el('div', 'stack grow');
    if (!b) { const list = el('div', 'fill'), pool = Sim.squadOf(car, car.me).concat(car.shortlist.map(id => car.players.find(p => p.id === id)).filter(Boolean)).filter(p => p.id !== a.id && p.grp === a.grp);
      box.appendChild(el('p', 'note center', `Compare ${esc(a.name)} with…`)); box.appendChild(list);
      return { header: G.header('chart', 'Compare', 'Pick a player (your squad and shortlist)'), body: box, mount: () => Nav.pager(list, { key: 'cmp' + a.id, items: pool, cols: 1, itemH: 54, gap: 5, render: p => { const r = G.prow(p); r.style.height = '54px'; r.onclick = () => Nav.replace('compare', { a: a.id, b: p.id }); return r; } }) }; }
    const fa = Sim.fmAttrs(a), fb = Sim.fmAttrs(b), groups = Object.keys(fa), ka = Sim.knows(car, a), kb = Sim.knows(car, b);
    const head = `<div class="cmphead"><div><span class="shirtbox" style="width:46px;--sw:46px">${G.shirtOf(a, null)}</span><b>${esc(G.surname(a.name))}</b><small>${a.pos} · ${a.age} · ${a.rating}</small></div><b class="vs">VS</b><div><span class="shirtbox" style="width:46px;--sw:46px">${G.shirtOf(b, null)}</span><b>${esc(G.surname(b.name))}</b><small>${b.pos} · ${b.age} · ${b.rating}</small></div></div>`;
    box.innerHTML = head;
    const tabs = Nav.subtabs(groups.map((g, i) => ({ id: 'g' + i, label: g[0].toUpperCase() + g.slice(1) })), prm.g || 'g0', id => { prm.g = id; Nav.refresh(); }, true); box.appendChild(tabs);
    const g = groups[+(prm.g || 'g0').slice(1)], rows = el('div', 'cmprows');
    rows.innerHTML = Object.keys(fa[g]).map(k => { const x = fa[g][k], y = fb[g] ? fb[g][k] : null; return `<div class="cr"><b class="${ka ? (x > y ? 'good' : '') : 'dim'}">${ka ? x : '–'}</b><span>${esc(k)}</span><b class="${kb ? (y > x ? 'good' : '') : 'dim'}">${kb && y != null ? y : '–'}</b><i style="--a:${ka ? x * 5 : 0}%;--b:${kb && y != null ? y * 5 : 0}%"></i></div>`; }).join('');
    box.appendChild(rows);
    return { header: G.header('chart', 'Compare', `${G.surname(a.name)} vs ${G.surname(b.name)}`), body: box, action: { label: 'Swap', icon: 'loop', go: () => Nav.replace('compare', { a: b.id, b: a.id, g: prm.g }) } };
  });

  window.ClubUI = { view };
})();
