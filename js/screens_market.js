// Transfer market: search every player in the world with filters, shortlist, incoming offers for your players,
// recent deals; the bid screen (fee talks with the selling club) and the contract screen (wage, length, squad
// status) used for signings, free agents and renewals. Windows open in summer and January, with deadline day.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, I = Icons.svg, D = DATA, S = G.state;
  const M = { sub: 'search', f: { grp: 'all', scope: 'all', sort: 'rating', maxAge: 0, minRating: 0, maxFee: 0 } };
  const fee = k => Sim.feeLabel(k);
  const GRPS = [['all', 'All'], ['GK', 'GK'], ['DF', 'DEF'], ['MF', 'MID'], ['FW', 'ATT']];
  const SCOPES = [['all', 'Everyone'], ['league', 'My league'], ['listed', 'Available'], ['free', 'Free agents'], ['legends', 'Legends']];
  const SORTS = [['rating', 'Rating'], ['potential', 'Potential'], ['value', 'Value'], ['age', 'Youngest']];
  const cycle = (list, cur, d) => list[(list.findIndex(x => x[0] === cur) + d + list.length) % list.length][0];

  function windowLine(car) {
    if (Sim.deadlineDay(car)) return '⚡ DEADLINE DAY · window shuts after this week';
    if (Sim.inWindow(car)) { const w = D.transfer.windows.find(([a, b]) => car.week >= a && car.week <= b); return `Window open · closes week ${w[1] + 1}`; }
    const n = Sim.nextWindow(car); return n != null ? `Window closed · opens week ${n + 1}` : 'Window closed until the summer';
  }
  function view(car) {
    const tabs = Nav.subtabs([{ id: 'search', label: 'Search', icon: 'binoculars' }, { id: 'shortlist', label: 'Shortlist', icon: 'star', badge: car.shortlist.length || '' },
      { id: 'offers', label: 'Offers', icon: 'mail', badge: car.offers.length || '' }, { id: 'activity', label: 'Deals', icon: 'market' }], M.sub, id => { M.sub = id; Nav.refresh(); }, true);
    const left = car.budget.wage - Sim.wageBill(car);
    const head = G.phead('market', 'Transfers', windowLine(car), `<span class="budget"><small>Budget</small><b>${fee(car.budget.transfer)}</b><small>${left >= 0 ? fee(left) + '/wk left' : 'over wage budget'}</small></span>`, 'compact' + (Sim.deadlineDay(car) ? ' deadline' : ''));
    return Object.assign({ head, tabs }, VIEW[M.sub](car));
  }
  function row(car, p, extra) {
    const known = Sim.knows(car, p), c = p.club ? G.club(p.club) : null, ask = Sim.asking(car, p);
    const right = `<b class="ask">${p.club ? fee(ask) : 'Free'}</b><small>${c ? esc(c.short.replace(/\d/g, '')) : (p.legend ? 'Legend' : 'No club')}${p.listed ? ' · listed' : ''}</small>`;
    const r = G.prow(p, { sub: extra || '', right, unknown: !known });
    r.onclick = () => Nav.push('player', { id: p.id }); return r;
  }
  const VIEW = {
    search(car) {
      const f = M.f, box = el('div', 'stack grow');
      const bar = el('div', 'fbar');
      const chip = (label, val, go) => { const b = el('button', 'fchip', `<small>${label}</small><b>${esc(val)}</b>`); b.dataset.snd = 'swipe'; b.onclick = go; return b; };
      bar.append(
        chip('Position', GRPS.find(x => x[0] === f.grp)[1], () => { f.grp = cycle(GRPS, f.grp, 1); Nav.refresh(); }),
        chip('Show', SCOPES.find(x => x[0] === f.scope)[1], () => { f.scope = cycle(SCOPES.filter(x => x[0] !== 'legends' || car.legendsOn), f.scope, 1); Nav.refresh(); }),
        chip('Sort', SORTS.find(x => x[0] === f.sort)[1], () => { f.sort = cycle(SORTS, f.sort, 1); Nav.refresh(); }),
        chip('Filters', (f.maxAge || f.minRating || f.maxFee) ? 'On' : 'Off', () => filtersCard(car)));
      box.appendChild(bar);
      const list = el('div', 'fill'); box.appendChild(list);
      const items = Sim.search(car, f).slice(0, 400);
      return { el: box, mount: () => Nav.pager(list, { key: 'ms' + JSON.stringify(f), items, cols: 1, itemH: 58, gap: 6, empty: 'Nobody matches these filters.', render: p => row(car, p) }) };
    },
    shortlist(car) {
      const list = el('div', 'fill'), items = car.shortlist.map(id => car.players.find(p => p.id === id)).filter(Boolean);
      return { el: list, mount: () => Nav.pager(list, { key: 'msl', items, cols: 1, itemH: 58, gap: 6, empty: 'Your shortlist is empty. Tap ☆ on a player profile to add him.', render: p => row(car, p) }) };
    },
    offers(car) {
      const box = el('div', 'stack grow'), list = el('div', 'fill');
      const listed = Sim.squadOf(car, car.me).filter(p => p.listed);
      box.appendChild(el('div', 'panel', `<div class="linkrow">${I('handshake')}<b>Selling</b><span class="chip">${listed.length} listed</span></div><p class="note" style="margin:4px 0 0">${Sim.inWindow(car) ? 'Clubs bid for listed players every week while the window is open. Top players attract offers too.' : 'Bids arrive while the window is open.'} List players from their profile.</p>`));
      box.appendChild(list);
      return { el: box, mount: () => Nav.pager(list, { key: 'mof', items: car.offers.map((o, i) => [o, i]), cols: 1, itemH: 64, gap: 6, empty: 'No offers for your players right now.', render: ([o, i]) => {
        const p = car.players.find(x => x.id === o.pid), c = G.club(o.club);
        const r = el('button', 'lrow', `<span class="crest">${Art.crest(c)}</span><span class="lt"><b>${esc(c.name)} bid ${fee(o.fee)}</b><small>for ${esc(p.name)} · value ${fee(Math.round(Sim.value(p) * 1000))}${o.countered ? ' · after your counter' : ''}</small></span>${I('chevron')}`);
        r.style.height = '64px'; r.onclick = () => offerCard(car, i); return r; } }) };
    },
    activity(car) {
      const list = el('div', 'fill'), items = car.transfers.filter(x => x.season === car.season);
      return { el: list, mount: () => Nav.pager(list, { key: 'mac', items, cols: 1, itemH: 54, gap: 5, empty: 'No deals yet this season.', render: x => {
        const from = x.from ? G.club(x.from) : null, to = x.dir === 'in' ? G.me() : x.to ? G.club(x.to) : null;
        const r = el('div', 'lrow' + (x.dir !== 'ai' ? ' mine' : ''), `<span class="crest">${to ? Art.crest(to) : ''}</span><span class="lt"><b>${esc(x.name)}</b><small>${from ? esc(G.shortName(from)) : 'Free'} → ${to ? esc(G.shortName(to)) : '—'} · Week ${x.week + 1}</small></span><b class="ask">${x.fee ? fee(x.fee) : 'Free'}</b>`);
        r.style.height = '54px'; return r; } }) };
    },
  };
  function filtersCard(car) {
    const f = M.f, body = el('div', 'stack');
    const ages = [0, 21, 23, 25, 28, 31], mins = [0, 60, 65, 70, 75, 80, 85], fees = [0, 500, 1000, 2500, 5000, 10000, 25000, 50000];
    const step = (arr, cur, d) => arr[(arr.indexOf(cur) + d + arr.length) % arr.length];
    const draw = () => { body.innerHTML = '';
      body.append(
        cyc('Max age', f.maxAge ? f.maxAge + '' : 'Any', d => { f.maxAge = step(ages, f.maxAge, d); draw(); }),
        cyc('Min rating', f.minRating ? f.minRating + '+' : 'Any', d => { f.minRating = step(mins, f.minRating, d); draw(); }),
        cyc('Max price', f.maxFee ? fee(f.maxFee) : 'Any', d => { f.maxFee = step(fees, f.maxFee, d); draw(); })); };
    draw();
    Nav.card({ title: 'Search filters', body, buttons: [{ label: 'Clear', ghost: true, go: () => { f.maxAge = 0; f.minRating = 0; f.maxFee = 0; Nav.refresh(); } }, { label: 'Apply', go: () => Nav.refresh() }] });
  }
  function cyc(label, val, onStep) {
    const r = el('div', 'cyc m0'), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›'); pv.dataset.snd = nx.dataset.snd = 'swipe';
    pv.onclick = () => onStep(-1); nx.onclick = () => onStep(1); r.append(el('span', '', label), pv, el('b', '', val), nx); return r;
  }
  function offerCard(car, i) {
    const o = car.offers[i], p = car.players.find(x => x.id === o.pid), c = G.club(o.club);
    Nav.card({ title: `${fee(o.fee)} for ${G.surname(p.name)}`, body: `<p class="center">${esc(c.name)} want to sign <b>${esc(p.name)}</b> (${p.pos}, ${p.rating}).<br>His value is around ${fee(Math.round(Sim.value(p) * 1000))}. 60% of a fee goes to your transfer budget.</p>`,
      buttons: [{ label: 'Reject', ghost: true, go: () => { Sim.rejectOffer(car, i); G.save(); Nav.refresh(); } },
        { label: 'Counter', ghost: true, go: () => { const r = Sim.counterOffer(car, i); G.save(); Nav.toast(r && r.ok ? `${c.short.replace(/\d/g, '')} raise their bid to ${fee(r.fee)}` : `${c.name} walk away`, r && r.ok ? '' : 'bad'); Nav.refresh(); } },
        { label: 'Accept', hold: true, go: () => { if (Sim.acceptOffer(car, i)) { Sound.play('stamp'); setTimeout(() => Sound.play('coin'), 300); G.save(); Nav.toast(`${p.name} sold for ${fee(o.fee)}`); } else Nav.toast('Deal could not go through', 'bad'); Nav.refresh(); } }] });
  }

  // ================= bid: fee talks with the selling club =================
  Nav.define('bid', prm => {
    const car = S.career, p = car.players.find(x => x.id === prm.id), c = G.club(p.club), ask = Sim.asking(car, p), n = car.neg[p.id] || {};
    const st = prm.st = prm.st || { fee: n.counter || Math.round(ask * .85 / 25) * 25 };
    const stepK = Math.max(25, Math.round(ask * .05 / 25) * 25);
    const body = el('div', 'stack grow');
    body.innerHTML = `<div class="panel" style="display:flex;align-items:center;gap:12px"><span class="shirtbox" style="width:60px;--sw:60px">${G.shirtOf(p, null)}</span><div style="min-width:0;flex:1"><b style="font:700 19px var(--serif);display:block">${esc(p.name)}</b><small class="note">${p.pos} · ${p.age} yrs · ${esc(c.name)}</small><small class="note" style="display:block">${esc(Sim.statusOf(car, p))} · contract to ${Sim.contractEnd(car, p)}</small></div><span class="rbadge ${G.rcls(p.rating)}">${p.rating}</span></div>
      <div class="tiles t3"><div class="tile"><span class="tv"><small>Value</small><b>${fee(Math.round(Sim.value(p) * 1000))}</b></span></div><div class="tile"><span class="tv"><small>Your budget</small><b>${fee(car.budget.transfer)}</b></span></div><div class="tile"><span class="tv"><small>Bids so far</small><b>${n.tries || 0}/3</b></span></div></div>`;
    const feeBox = el('div', 'panel feebox');
    feeBox.innerHTML = `<small>Your offer</small><b>${fee(st.fee)}</b><small class="${st.fee > car.budget.transfer ? 'bad' : ''}">${st.fee > car.budget.transfer ? 'Over your budget' : n.counter ? `They asked for ${fee(n.counter)}` : 'Clubs rarely sell below value'}</small>`;
    const steps = el('div', 'steps');
    for (const [lab, d] of [['−' + fee(stepK * 4), -4], ['−' + fee(stepK), -1], ['+' + fee(stepK), 1], ['+' + fee(stepK * 4), 4]]) { const b = el('button', 'btn ghost', lab); b.dataset.snd = 'tap'; b.onclick = () => { st.fee = Math.max(25, st.fee + d * stepK); Nav.refresh(); }; steps.appendChild(b); }
    body.append(feeBox, steps);
    body.appendChild(el('p', 'note center', Sim.inWindow(car) ? 'If the clubs agree a fee, you then agree personal terms with the player.' : `The window is closed. It opens in week ${(Sim.nextWindow(car) || 0) + 1}.`));
    return { header: G.titleHeader('Transfer Offer', `${G.surname(p.name)} · ${c.name}`, 'handshake'), body, bg: 'bg_office',
      action: { label: 'Submit Bid', icon: 'handshake', disabled: !Sim.inWindow(car), go: () => {
        const r = Sim.bid(car, p.id, st.fee); G.save();
        if (r.verdict === 'accept') { Sound.play('stamp'); Nav.card({ title: 'Bid accepted!', body: `<p class="center">${esc(c.name)} accept ${fee(r.fee)} for ${esc(p.name)}. Now agree his personal terms.</p>`, buttons: [{ label: 'Agree terms', go: () => Nav.replace('terms', { id: p.id, fee: r.fee }) }] }); }
        else if (r.verdict === 'counter') { Sound.play('phone'); st.fee = r.fee; Nav.card({ title: 'Counter-offer', body: `<p class="center">${esc(r.why)}</p>`, buttons: [{ label: 'Think again', ghost: true, go: () => Nav.refresh() }, { label: `Pay ${fee(r.fee)}`, go: () => { const r2 = Sim.bid(car, p.id, r.fee); G.save(); if (r2.verdict === 'accept') Nav.replace('terms', { id: p.id, fee: r2.fee }); else { Nav.toast(r2.why || 'They changed their mind', 'bad'); Nav.refresh(); } } }] }); }
        else { Sound.play('error'); Nav.card({ title: 'Bid rejected', body: `<p class="center">${esc(r.why)}</p>`, buttons: [{ label: 'OK', go: () => Nav.refresh() }] }); }
      } } };
  });

  // ================= contract: new signing (fee agreed or free) or renewal =================
  function contractScreen(prm, renew) {
    const car = S.career, p = car.players.find(x => x.id === prm.id), demand = Sim.wageDemand(car, p);
    const st = prm.st = prm.st || { wage: renew ? Math.max(p.wage, Math.round(demand * .92)) : Math.round(demand * .9), years: p.age >= 32 ? 1 : p.age >= 29 ? 2 : 3, status: Sim.expectedStatus(car, p), tries: 0 };
    const left = car.budget.wage - Sim.wageBill(car) + (renew ? p.wage : 0), stepW = Math.max(1, Math.round(demand * .05));
    const body = el('div', 'stack grow');
    body.innerHTML = `<div class="panel" style="display:flex;align-items:center;gap:12px"><span class="shirtbox" style="width:56px;--sw:56px">${G.shirtOf(p, null)}</span><div style="min-width:0;flex:1"><b style="font:700 19px var(--serif);display:block">${esc(p.name)}</b><small class="note">${p.pos} · ${p.age} yrs · ${esc(Sim.profile(car, p).personality)}</small><small class="note" style="display:block">${renew ? `Now £${p.wage}K/wk to ${Sim.contractEnd(car, p)}` : prm.fee ? `Fee agreed: ${fee(prm.fee)}` : 'Free transfer'}</small></div><span class="rbadge ${G.rcls(p.rating)}">${p.rating}</span></div>`;
    const wageBox = el('div', 'panel feebox');
    wageBox.innerHTML = `<small>Weekly wage</small><b>£${st.wage}K</b><small class="${st.wage > left ? 'bad' : ''}">${st.wage > left ? 'Over your wage budget' : `Wage budget left £${left}K/wk`}${st.tries ? ` · agent wants ~£${st.need}K` : ''}</small>`;
    const steps = el('div', 'steps');
    for (const [lab, d] of [['−' + stepW * 4, -4], ['−' + stepW, -1], ['+' + stepW, 1], ['+' + stepW * 4, 4]]) { const b = el('button', 'btn ghost', `${lab.startsWith('−') ? '−' : '+'}£${Math.abs(d * stepW)}K`); b.dataset.snd = 'tap'; b.onclick = () => { st.wage = Math.max(1, st.wage + d * stepW); Nav.refresh(); }; steps.appendChild(b); }
    body.append(wageBox, steps,
      cyc('Contract length', `${st.years} year${st.years > 1 ? 's' : ''}`, d => { st.years = Math.max(1, Math.min(5, st.years + d)); Nav.refresh(); }),
      cyc('Squad status', esc(st.status), d => { const L = D.squadStatus; st.status = L[(L.indexOf(st.status) + d + L.length) % L.length]; Nav.refresh(); }));
    body.appendChild(el('p', 'note center', `He expects to be "${esc(Sim.expectedStatus(car, p))}". Promising more than he expects lowers his wage demand; less raises it.`));
    return { header: G.titleHeader(renew ? 'New Contract' : 'Personal Terms', G.surname(p.name), 'clipboard'), body, bg: 'bg_office',
      action: { label: 'Offer', icon: 'handshake', hold: true, go: () => {
        const r = renew ? Sim.offerContract(car, p.id, st.wage, st.years, st.status) : Sim.signPlayer(car, p.id, prm.fee || 0, st.wage, st.years, st.status);
        G.save();
        if (r.ok) { if (renew) { Sound.play('stamp'); Nav.toast(`${p.name} signs a new contract`); Nav.back(); } else { Nav.back(); setTimeout(() => signReveal(p, prm.fee), 320); } }
        else { st.tries++; if (r.need) st.need = r.need; Sound.play('error'); Nav.toast(r.why, 'bad'); Nav.refresh(); }
      } } };
  }
  Nav.define('terms', prm => contractScreen(prm, false));
  Nav.define('contract', prm => contractScreen(prm, true));
  function signReveal(p, f) {
    Sound.play('sting_signing'); setTimeout(() => Sound.play('camera'), 500); Sound.buzz(40); G.checkAchievements();
    const b = el('div', 'center'); b.innerHTML = `<div style="width:120px;margin:0 auto 10px;--sw:120px;animation:crestIn .8s both">${G.shirtOf(p, null)}</div><h2 style="font-size:28px">${esc(p.name)}</h2><p class="note">joins ${esc(G.me().name)}${f ? ' for ' + fee(f) : ' on a free'}!</p>`;
    Nav.card({ body: b, buttons: [{ label: 'Brilliant', go: () => Nav.refresh() }] });
  }

  window.MarketUI = { view, M };
})();
