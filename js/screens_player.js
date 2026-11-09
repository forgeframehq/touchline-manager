// Player profile, Football Manager style: gold player card with status, key facts (age, value, wage, contract),
// 1–20 attributes by group, an info page with the position map, form and season numbers, and context actions:
// your player (contract, transfer list, captain, release), another club's (shortlist, scout, bid), free agent (offer terms).
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, I = Icons.svg, D = DATA, S = G.state;
  const P = { tab: 'a0' };
  const fee = k => Sim.feeLabel(k);

  Nav.define('player', prm => {
    const car = S.career, p = car.players.find(x => x.id === prm.id), c = p.club ? G.club(p.club) : null, mine = p.club === car.me;
    const pr = Sim.profile(car, p), known = pr.known, fm = Sim.fmAttrs(p), groups = Object.keys(fm);
    const stars = Math.max(.5, Math.min(5, Math.round((p.rating - 50) / 8 * 2) / 2)), potStars = Math.max(.5, Math.min(5, Math.round((p.pot - 50) / 8 * 2) / 2));
    const b = el('div', 'pprof');
    const tag = p.legend ? 'Legend' : p.age <= 21 && p.pot >= 82 ? 'Wonderkid' : pr.status;
    b.innerHTML = `<div class="pcard-top">
        <div class="gcard"><span class="gnum">${p.rating}</span><span class="gflag">${p.nat ? Flags.svg(p.nat, 22, 14) : ''}</span><span class="gshirt">${G.shirtOf(p, null)}</span><b style="font-size:${Math.min(13, Math.max(9, 120 / Math.max(6, G.surname(p.name).length)))}px">${esc(G.surname(p.name).toUpperCase())}</b><em>${esc(tag)}</em><span class="stars">${known ? G.stars(stars).replace(/^<span class="stars">|<\/span>$/g, '') : '???'}</span></div>
        <div class="facts">
          <div><b>${p.age} yrs</b><small>${esc(Flags.name(p.nat) || 'International')}</small></div>
          <div><b>${known ? fee(Math.round(Sim.value(p) * 1000)) : '?'}</b><small>Value</small></div>
          <div><b>£${p.wage}K</b><small>Wage / week</small></div>
          <div><b>${p.club ? Sim.contractEnd(car, p) : '—'}</b><small>${p.club ? 'Contract expiry' : 'Free agent'}</small></div>
          <div class="wide"><b>${c ? `<span class="crest" style="width:18px;height:20px;vertical-align:-4px">${Art.crest(c)}</span> ${esc(G.shortName(c))}` : 'Unattached'}</b><small>${esc(pr.status)}${p.listed ? ' · Transfer listed' : ''}${p.injured ? ` · <span class="bad">Injured ${p.injured}w</span>` : ''}${p.ban ? ' · <span class="bad">Suspended</span>' : ''}</small></div>
        </div></div>
      <div class="rolebar"><b>${esc(D.positions[p.pos].name)}</b><span>${esc(pr.foot)} foot · ${esc(pr.personality)}</span></div>`;
    const labels = { technical: 'Technical', mental: 'Mental', physical: 'Physical', goalkeeping: 'Goalkeeping' };
    const tabs = Nav.subtabs(groups.map((g, i) => ({ id: 'a' + i, label: labels[g] })).concat([{ id: 'info', label: 'Info' }]), P.tab, id => { P.tab = id; Nav.refresh(); }, true);
    b.appendChild(tabs);
    const pane = el('div', 'fill');
    if (P.tab === 'info') pane.appendChild(infoPane(car, p, pr, potStars, known));
    else { const g = groups[+P.tab.slice(1)] || groups[0], grid = el('div', 'agrid');
      for (const [name, v] of Object.entries(fm[g])) grid.insertAdjacentHTML('beforeend', `<div class="arow"><span>${esc(name)}</span><b class="${known ? G.acol(v) : 'a-unk'}">${known ? v : '–'}</b></div>`);
      pane.appendChild(grid);
      if (!known) pane.insertAdjacentHTML('beforeend', '<p class="note center" style="margin-top:6px">Scout him to reveal his attributes.</p>'); }
    b.appendChild(pane);

    const spec = { header: G.titleHeader(p.name, c ? c.name : 'Free agent', 'user'), body: b };
    if (mine) {
      spec.extra = [{ label: 'Actions', go: () => actions(car, p) }];
      spec.action = { label: 'Contract', icon: 'clipboard', go: () => Nav.push('contract', { id: p.id }) };
    } else {
      const on = car.shortlist.includes(p.id);
      spec.extra = [{ label: on ? '★ Listed' : '☆ Shortlist', go: () => { car.shortlist = on ? car.shortlist.filter(x => x !== p.id) : car.shortlist.concat(p.id); G.save(); Nav.refresh(); } }];
      const agreed = car.neg[p.id] && car.neg[p.id].fee;
      if (!known) spec.action = { label: 'Scout', icon: 'binoculars', go: () => { const w = Sim.scout(car, p.id); G.save(); Sound.play('phone'); Nav.toast(w ? `Scout report in ${w} week${w > 1 ? 's' : ''}` : 'Scout report ready'); Nav.refresh(); } };
      else if (!p.club) spec.action = { label: 'Offer Terms', icon: 'handshake', go: () => { const j = Sim.willJoin(car, p); if (!j.ok) { Sound.play('error'); Nav.toast(j.why, 'bad'); return; } Nav.push('terms', { id: p.id, fee: 0 }); } };
      else if (agreed) spec.action = { label: 'Agree Terms', icon: 'handshake', go: () => Nav.push('terms', { id: p.id, fee: agreed }) };
      else spec.action = { label: 'Make Offer', icon: 'handshake', go: () => { const j = Sim.willJoin(car, p); if (!j.ok) { Sound.play('error'); Nav.toast(j.why, 'bad'); return; } Nav.push('bid', { id: p.id }); } };
    }
    return spec;
  });

  function infoPane(car, p, pr, potStars, known) {
    const w = el('div', 'info2');
    // position map: natural grid codes green, possible (fits list) amber
    const nat = new Set(), ok = new Set();
    for (const [code, list] of Object.entries(D.grid.fits)) { const i = list.indexOf(p.pos); if (i === 0) nat.add(code); else if (i > 0) ok.add(code); }
    let dots = '';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) { if (!D.grid.allowed(r, c) || (r === 0 && c !== 2)) continue; const code = D.grid.code(r, c); if ((c === 1 || c === 3) && ['DC', 'DM', 'MC', 'AMC'].includes(code)) continue;
      const cls = nat.has(code) ? 'n' : ok.has(code) ? 'o' : ''; dots += `<i class="${cls}" style="left:${10 + c * 20}%;top:${92 - r * 16.5}%"></i>`; }
    const form = (p.form || []).map(v => `<span class="${v >= 7.5 ? 'good' : v < 6.3 ? 'bad' : ''}">${v.toFixed(1)}</span>`).join(' ') || '—';
    w.innerHTML = `<div class="posmap">${dots}<small>${esc(pr.foot)} foot</small></div>
      <div class="ifacts">
        <div><small>Potential</small><b>${known ? G.stars(potStars) : '?'}</b></div>
        <div><small>Personality</small><b>${esc(pr.personality)}</b></div>
        <div><small>Season</small><b>${p.seasonApps} apps · ${p.seasonGoals} gls · ${p.ast || 0} ast</b></div>
        <div><small>Av. rating</small><b>${pr.avg != null ? pr.avg.toFixed(2) : '—'}</b></div>
        <div style="grid-column:1/-1"><small>Form (last 5)</small><b class="formnums">${form}</b></div>
        <div><small>Condition · Morale</small><b>${Math.round(p.fitness)}% · ${p.morale >= 80 ? 'Superb' : p.morale >= 65 ? 'Good' : p.morale >= 45 ? 'Okay' : 'Poor'}</b></div>
        <div><small>Cards</small><b>${p.yc || 0} yellow</b></div>
        <div><small>Career</small><b>${p.apps} apps · ${p.goals} gls</b></div>
      </div>`;
    return w;
  }

  function actions(car, p) {
    const list = el('div', 'menu-list');
    const add = (icon, label, go, opts) => list.appendChild(Nav.button(Object.assign({ icon, label, go: () => { if (!opts || !opts.hold) Nav.closeCard(); go(); } }, opts || {}), 'mi'));
    add('clipboard', 'Offer new contract', () => Nav.push('contract', { id: p.id }));
    add('market', p.listed ? 'Remove from transfer list' : 'Transfer list him', () => { Sim.listPlayer(car, p.id, !p.listed); G.save(); Nav.toast(p.listed ? `${G.surname(p.name)} is on the transfer list` : 'Removed from the list'); Nav.refresh(); });
    add('star', car.captain === p.id ? 'Already captain' : 'Make captain', () => { car.captain = p.id; G.save(); Sound.play('stamp'); Nav.refresh(); });
    add('exit', 'Release (hold)', () => { Nav.closeCard(); if (Sim.release(car, p.id)) { G.save(); Nav.toast(`${p.name} released`); Nav.back(); } else Nav.toast(`You need at least ${D.season.squadMin} players`, 'bad'); }, { hold: true });
    Nav.card({ title: G.surname(p.name), body: list, buttons: [{ label: 'Close', ghost: true }] });
  }
  window.PlayerUI = { P };
})();
