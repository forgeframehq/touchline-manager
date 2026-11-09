// Squad table, Football Manager Mobile style, in portrait: dense rows (picked slot, number, name, FM position string
// and four columns that change with the view), tap a header to sort, a picking strip to put anyone into any XI slot
// or the bench, filters, squad numbers and multi-select bulk actions. Swipe the table sideways to change view.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, I = Icons.svg, D = DATA, S = G.state;
  const Q = { view: 'coach', filter: 'all', sort: null, dir: -1, pick: null, strip: 'xi', mode: null, sel: new Set() };
  const VIEWS = ['coach', 'general', 'condition', 'contract', 'stats', 'development'];
  const VNAME = { coach: 'Coach Report', general: 'General', condition: 'Condition', contract: 'Contract', stats: 'Stats', development: 'Development' };
  const FILTERS = [['all', 'All players'], ['GK', 'Goalkeepers'], ['DF', 'Defenders'], ['MF', 'Midfielders'], ['FW', 'Forwards'], ['picked', 'Picked'], ['out', 'Unavailable'], ['res', 'Reserves'], ['listed', 'Listed'], ['expiring', 'Expiring'], ['youth', 'Youth (21-)']];
  const fee = k => Sim.feeLabel(k);

  function band(car) { const d = WORLD.divisions[G.me().div], b = d.band || [62, 72]; return [b[0] - 14, b[1] + 8]; }
  function starsOf(v, car) { const [lo, hi] = band(car); return Math.max(.5, Math.min(5, Math.round((v - lo) / (hi - lo) * 10) / 2)); }
  function miniStars(v) { return `<span class="mbar" title="${v} stars"><i style="width:${v * 20}%"></i></span>`; }
  const avg = p => p.rn ? p.rs / p.rn : 0;
  const mood = m => m >= 80 ? ['Top', 'good'] : m >= 65 ? ['Good', 'good'] : m >= 45 ? ['Okay', ''] : ['Low', 'bad'];
  // columns per view: [label, getter(for sort), render html]
  function cols(car) {
    return {
      coach: [['Abi', p => p.rating, p => miniStars(starsOf(p.rating, car))], ['Pot', p => p.pot, p => miniStars(starsOf(p.pot, car))], ['Av R', avg, p => p.rn ? avg(p).toFixed(2) : '–'], ['Value', p => Sim.value(p), p => fee(Math.round(Sim.value(p) * 1000))]],
      general: [['Age', p => p.age, p => p.age], ['Nat', p => p.nat || 'ZZZ', p => p.nat ? Flags.svg(p.nat, 20, 13) : '–'], ['Happy', p => p.happy == null ? 70 : p.happy, p => { const h = p.happy == null ? 70 : p.happy; return `<span class="${h < 40 ? 'bad' : h >= 70 ? 'good' : ''}">${h >= 80 ? 'Great' : h >= 60 ? 'Fine' : h >= 40 ? 'Meh' : 'Upset'}</span>`; }], ['Morale', p => p.morale, p => { const [t, c] = mood(p.morale); return `<span class="${c}">${t}</span>`; }]],
      condition: [['Cond', p => p.fitness, p => `<span class="${p.fitness < 70 ? 'bad' : p.fitness < 85 ? 'warn' : 'good'}">${Math.round(p.fitness)}%</span>`], ['Sharp', p => p.sharp == null ? 70 : p.sharp, p => `${Math.round(p.sharp == null ? 70 : p.sharp)}%`],
        ['Status', p => (p.injured ? 2 : 0) + (p.ban ? 1 : 0), p => p.injured ? `<span class="bad">Inj ${p.injured}w</span>` : p.ban ? '<span class="bad">Ban</span>' : '<span class="good">Fit</span>'], ['Morale', p => p.morale, p => { const [t, c] = mood(p.morale); return `<span class="${c}">${t}</span>`; }]],
      contract: [['Wage', p => p.wage, p => `£${p.wage}K`], ['Expires', p => p.con || 0, p => { const y = Sim.yearsLeft(car, p); return `<span class="${y <= 0 ? 'bad' : y === 1 ? 'warn' : ''}">${p.con || '—'}</span>`; }],
        ['Status', p => D.squadStatus.indexOf(Sim.statusOf(car, p)), p => esc({ 'Star Player': 'Star', 'Key Player': 'Key', 'First Team': '1st XI', Rotation: 'Rot.', Backup: 'Back.', 'Hot Prospect': 'Prosp.', Youngster: 'Youth' }[Sim.statusOf(car, p)] || '')], ['TL', p => p.listed ? 1 : 0, p => p.listed ? '<span class="warn">Listed</span>' : '–']],
      stats: [['Apps', p => p.seasonApps, p => p.seasonApps], ['Gls', p => p.seasonGoals, p => p.seasonGoals], ['Ast', p => p.ast || 0, p => p.ast || 0], ['Av R', avg, p => p.rn ? avg(p).toFixed(2) : '–']],
      development: [['Age', p => p.age, p => p.age], ['Pot', p => p.pot, p => miniStars(starsOf(p.pot, car))], ['Gap', p => p.pot - p.rating, p => p.pot > p.rating ? `<span class="good">+${p.pot - p.rating}</span>` : '–'], ['+/–', p => p.rating - (p.r0 || p.rating), p => { const d = p.rating - (p.r0 || p.rating); return d > 0 ? `<span class="good">▲${d}</span>` : d < 0 ? `<span class="bad">▼${-d}</span>` : '–'; }]],
    };
  }
  const short = n => { const p = n.split(' '); return p.length > 1 ? p[0][0] + '. ' + p.slice(1).join(' ') : n; };

  function view(car) {
    const t = Sim.tac(car), { xi, bench, codes } = Sim.fmXI(car), sq = Sim.squadOf(car, car.me);
    const slotOf = new Map(); t.ids.forEach((id, i) => id != null && slotOf.set(id, ['x', i])); t.bench.forEach((id, i) => slotOf.set(id, ['s', i]));
    const box = el('div', 'stack grow sq2');
    // picking strip: XI slots or S1..S7
    const strip = el('div', 'pstrip');
    const flip = el('button', 'pchip flip', Q.strip === 'xi' ? 'Subs' : 'XI'); flip.dataset.snd = 'swipe'; flip.onclick = () => { Q.strip = Q.strip === 'xi' ? 'subs' : 'xi'; Q.pick = null; Nav.refresh(); };
    const slots = Q.strip === 'xi' ? codes.map((c, i) => ['x' + i, c.replace('DC', 'DC').replace('AMC', 'AMC')]) : Array.from({ length: D.season.subsOnBench }, (_, i) => ['s' + i, 'S' + (i + 1)]);
    for (const [k, lab] of slots) { const filled = k[0] === 'x' ? t.ids[+k.slice(1)] != null : t.bench[+k.slice(1)] != null;
      const b = el('button', 'pchip' + (Q.pick === k ? ' on' : '') + (filled ? '' : ' empty'), esc(lab)); b.onclick = () => { Q.pick = Q.pick === k ? null : k; Q.mode = null; Nav.refresh(); }; strip.appendChild(b); }
    box.appendChild(strip);
    // toolbar
    const tb = el('div', 'sqbar');
    const chip = (label, val, go, on) => { const b = el('button', 'fchip' + (on ? ' on' : ''), `<small>${label}</small><b>${val}</b>`); b.dataset.snd = 'swipe'; b.onclick = go; return b; };
    tb.append(
      chip('Pick', Q.strip === 'xi' ? 'XI' : 'Subs', () => { Q.strip = Q.strip === 'xi' ? 'subs' : 'xi'; Q.pick = null; Nav.refresh(); }),
      chip('Filter', FILTERS.find(f => f[0] === Q.filter)[1], () => { Q.filter = FILTERS[(FILTERS.findIndex(f => f[0] === Q.filter) + 1) % FILTERS.length][0]; Nav.refresh(); }),
      chip('View', VNAME[Q.view], () => { Q.view = VIEWS[(VIEWS.indexOf(Q.view) + 1) % VIEWS.length]; Q.sort = null; Nav.refresh(); }),
      chip('Select', Q.mode === 'select' ? `${Q.sel.size} ✓` : 'Off', () => { Q.mode = Q.mode === 'select' ? null : 'select'; Q.sel.clear(); Q.pick = null; Nav.refresh(); }, Q.mode === 'select'),
      chip('Numbers', Q.mode === 'num' ? 'Editing' : 'Off', () => { Q.mode = Q.mode === 'num' ? null : 'num'; Q.pick = null; Nav.refresh(); }, Q.mode === 'num'));
    box.appendChild(tb);
    if (Q.pick || Q.mode) box.appendChild(el('div', 'sqhint', Q.pick ? `Tap a player to put him in ${Q.pick[0] === 'x' ? codes[+Q.pick.slice(1)] : 'S' + (+Q.pick.slice(1) + 1)}` : Q.mode === 'num' ? 'Tap a player to change his squad number' : `${Q.sel.size} selected · <b class="gold">tap here for actions</b>`));
    if (Q.mode === 'select') box.lastChild.onclick = () => bulkCard(car);
    // table
    const C = cols(car)[Q.view], head = el('div', 'sqrow head');
    head.innerHTML = `<span class="pk">Pkd</span><span class="nm">Name</span><span class="ps">Pos</span>`;
    const sortBtn = (label, key) => { const b = el('button', 'hc' + (Q.sort === key ? ' on' : ''), esc(label) + (Q.sort === key ? (Q.dir < 0 ? ' ▼' : ' ▲') : '')); b.onclick = () => { if (Q.sort === key) Q.dir = -Q.dir; else { Q.sort = key; Q.dir = key === 'name' || key === 'pos' ? 1 : -1; } Nav.refresh(); }; return b; };
    head.replaceChildren(el('span', 'pk', 'Pkd'), sortBtn('Name', 'name'), sortBtn('Pos', 'pos'), ...C.map((c, i) => sortBtn(c[0], 'c' + i)));
    head.children[1].classList.add('nm'); head.children[2].classList.add('ps');
    box.appendChild(head);
    let list = sq.filter(p => Q.filter === 'all' ? true : ['GK', 'DF', 'MF', 'FW'].includes(Q.filter) ? p.grp === Q.filter : Q.filter === 'picked' ? slotOf.has(p.id) : Q.filter === 'out' ? (p.injured || p.ban) : Q.filter === 'res' ? p.res : Q.filter === 'listed' ? p.listed : Q.filter === 'expiring' ? Sim.yearsLeft(car, p) <= 1 : p.age <= 21);
    const gi = { GK: 0, DF: 1, MF: 2, FW: 3 };
    const keyF = Q.sort === 'name' ? p => G.surname(p.name) : Q.sort === 'pos' ? p => gi[p.grp] * 10 + ['CB', 'LB', 'RB', 'CDM', 'CM', 'LM', 'RM', 'CAM', 'LW', 'RW', 'ST'].indexOf(p.pos) : Q.sort ? C[+Q.sort.slice(1)][1] : null;
    list.sort((a, b) => { if (keyF) { const x = keyF(a), y = keyF(b); if (x !== y) return (x > y ? 1 : -1) * Q.dir; }
      const sa = slotOf.get(a.id), sb = slotOf.get(b.id); const ra = sa ? (sa[0] === 'x' ? sa[1] : 20 + sa[1]) : 99, rb = sb ? (sb[0] === 'x' ? sb[1] : 20 + sb[1]) : 99; return ra - rb || b.rating - a.rating || a.id - b.id; });
    const tbl = el('div', 'fill'); box.appendChild(tbl);
    // swipe sideways on the table to change view
    let sx = null; tbl.addEventListener('pointerdown', e => { sx = e.clientX; }); tbl.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 70 && e.target.closest('.pg-grid') == null) { Q.view = VIEWS[(VIEWS.indexOf(Q.view) + (dx < 0 ? 1 : VIEWS.length - 1)) % VIEWS.length]; Q.sort = null; Sound.play('swipe'); Nav.refresh(); } });
    const narrow = innerWidth < 390;
    return { el: box, mount: () => Nav.pager(tbl, { key: 'sq2' + Q.filter + Q.sort + Q.dir, items: list, cols: 1, itemH: 33, gap: 2, empty: 'No players match this filter.', render: p => {
      const sl = slotOf.get(p.id), tag = sl ? (sl[0] === 'x' ? codes[sl[1]] : 'S' + (sl[1] + 1)) : p.res ? 'RES' : '';
      const r = el('button', 'sqrow' + (sl ? (sl[0] === 'x' ? ' xi' : ' sub') : '') + (Q.sel.has(p.id) ? ' sel' : '') + (p.injured || p.ban ? ' out' : ''));
      r.innerHTML = `<span class="pk">${Q.mode === 'select' ? `<i class="ck">${Q.sel.has(p.id) ? '✓' : ''}</i>` : tag ? `<i class="tg ${sl ? sl[0] : 'r'}">${tag}</i>` : ''}</span><span class="nm"><em>${p.num || ''}</em>${esc(narrow ? short(p.name) : p.name)}${p.legend ? ' <b class="gold">★</b>' : ''}${p.injured ? ' <b class="bad">+</b>' : ''}</span><span class="ps">${esc(Sim.posString(p))}</span>${C.map(c => `<span class="c">${c[2](p)}</span>`).join('')}`;
      r.onclick = () => {
        if (Q.pick) { if (p.injured || p.ban) { Sound.play('error'); Nav.toast(`${G.surname(p.name)} is unavailable`, 'bad'); return; } Sim.pickSlot(car, Q.pick, p.id); Sound.play('card'); Q.pick = null; G.save(); Nav.refresh(); return; }
        if (Q.mode === 'select') { if (Q.sel.has(p.id)) Q.sel.delete(p.id); else Q.sel.add(p.id); Sound.play('tap'); Nav.refresh(); return; }
        if (Q.mode === 'num') { numberCard(car, p); return; }
        Nav.push('player', { id: p.id });
      };
      return r; } }) };
  }
  function numberCard(car, p) {
    let n = p.num || 1; const body = el('div', 'stack');
    const draw = () => { const owner = Sim.squadOf(car, car.me).find(q => q.num === n && q.id !== p.id);
      body.innerHTML = `<div class="feebox" style="padding:4px"><b>${n}</b><small>${owner ? `Swaps with ${esc(owner.name)}` : 'Free number'}</small></div>`;
      const st = el('div', 'steps'); for (const d of [-10, -1, 1, 10]) { const b = el('button', 'btn ghost', (d > 0 ? '+' : '−') + Math.abs(d)); b.onclick = () => { n = Math.max(1, Math.min(99, n + d)); draw(); }; st.appendChild(b); } body.appendChild(st); };
    draw();
    Nav.card({ title: `${G.surname(p.name)}'s number`, body, buttons: [{ label: 'Cancel', ghost: true }, { label: 'Set', go: () => { Sim.setNumber(car, p.id, n); G.save(); Sound.play('stamp'); Nav.refresh(); } }] });
  }
  function bulkCard(car) {
    const ids = [...Q.sel]; if (!ids.length) { Nav.toast('Tap players to select them first'); return; }
    const list = el('div', 'menu-list'), ps = ids.map(id => car.players.find(p => p.id === id));
    const add = (icon, label, go, hold) => list.appendChild(Nav.button({ icon, label, hold, go: () => { Nav.closeCard(); go(); } }, 'mi'));
    add('market', `Transfer list (${ids.length})`, () => { ps.forEach(p => Sim.listPlayer(car, p.id, true)); done(`${ids.length} listed`); });
    add('check', 'Remove from transfer list', () => { ps.forEach(p => Sim.listPlayer(car, p.id, false)); done('Removed from the list'); });
    add('youth', 'Move to reserves', () => { ps.forEach(p => Sim.setReserve(car, p.id, true)); done(`${ids.length} moved to the reserves`); });
    add('squad', 'Recall to first team', () => { ps.forEach(p => Sim.setReserve(car, p.id, false)); done('Recalled'); });
    add('exit', 'Release (hold)', () => { let n = 0; for (const p of ps) if (Sim.release(car, p.id)) n++; done(n ? `${n} released` : `Squad minimum is ${D.season.squadMin}`); }, true);
    const done = msg => { Q.sel.clear(); Q.mode = null; G.save(); Nav.toast(msg); Nav.refresh(); };
    Nav.card({ title: `${ids.length} player${ids.length > 1 ? 's' : ''}`, body: list, buttons: [{ label: 'Cancel', ghost: true }] });
  }
  window.SquadUI = { view, Q };
})();
