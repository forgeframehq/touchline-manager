// Tactics at Football Manager depth: three tactic slots, the position grid (move any player to any legal
// grid cell), roles and duties per slot, team instructions in / out of possession and in transition,
// opposition instructions on the next opponent's players, set-piece takers and routines.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, I = Icons.svg, D = DATA;
  const T = { sub: 'formation', isub: 'ip', sel: null, move: false };

  function cyc(label, val, onStep, opts) {
    const row = el('div', 'cyc' + (opts && opts.cls ? ' ' + opts.cls : '')), pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›');
    pv.dataset.snd = nx.dataset.snd = 'swipe'; pv.onclick = () => onStep(-1); nx.onclick = () => onStep(1);
    row.append(el('span', '', label), pv, el('b', '', val), nx); return row;
  }
  const save = () => { G.save(); Nav.refresh(); };

  function view(car) {
    const t = Sim.tac(car), chem = Sim.chemistry(car);
    const tabs = Nav.subtabs([{ id: 'formation', label: 'Shape', icon: 'tactics' }, { id: 'instructions', label: 'Instructions', icon: 'sliders' }, { id: 'opposition', label: 'Opposition', icon: 'binoculars' }, { id: 'setp', label: 'Set Pieces', icon: 'flag' }], T.sub, id => { T.sub = id; T.sel = null; T.move = false; Nav.refresh(); }, true);
    const head = G.phead('tactics', 'Tactics', `${t.name} · ${t.shape} · ${DATA.mentality[t.mentality].label}`, `<span style="text-align:center"><small style="display:block;font-size:10.5px;color:#c9d3cb">Chemistry</small>${G.ring(chem, chem >= 70 ? '#5fcf6f' : chem >= 50 ? '#e7c25a' : '#ff6f61')}</span>`, 'compact');
    return Object.assign({ head, tabs }, VIEW[T.sub](car, t));
  }

  const VIEW = {
    // ---------- shape: pitch with grid editing, roles and duties ----------
    formation(car, t) {
      const box = el('div', 'stack grow'), shapes = Object.keys(D.shapes);
      const row = el('div', ''); row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:7px';
      const sel = (val, onStep) => { const s = el('div', 'selbox'), pv = el('button', '', '‹'), nx = el('button', '', '›'); pv.dataset.snd = nx.dataset.snd = 'swipe'; pv.onclick = () => onStep(-1); nx.onclick = () => onStep(1); s.append(pv, el('b', '', esc(val)), nx); return s; };
      row.append(
        sel(t.name, d => { car.tac.slot = (car.tac.slot + d + 3) % 3; T.sel = null; Sim.syncTactics(car); save(); }),
        sel(D.shapes[t.shape] && shapeIs(t) ? t.shape : 'Custom', d => { const i = shapes.indexOf(t.shape); const k = shapes[(i + d + shapes.length) % shapes.length]; applyShape(car, t, k); save(); }));
      box.appendChild(row);
      const pitch = el('div', 'pitch'); box.appendChild(pitch);
      const m7 = D.mentality7, mi = m7.indexOf(t.mentality), fam = Math.round((car.fam[t.shape] || .5) * 100);
      box.appendChild(cyc(`Mentality <small style="color:var(--muted);font-weight:500"> · familiarity ${fam}%</small>`, esc(D.mentality[t.mentality].label), d => { t.mentality = m7[Math.max(0, Math.min(6, mi + d))]; Sim.syncTactics(car); save(); }, { cls: 'm0' }));
      return { el: box, mount: () => drawPitch(car, t, pitch) };
    },
    // ---------- team instructions ----------
    instructions(car, t) {
      const box = el('div', 'stack grow');
      box.appendChild(Nav.subtabs([{ id: 'ip', label: 'In Possession' }, { id: 'op', label: 'Out of Possession' }, { id: 'tr', label: 'Transition' }], T.isub, id => { T.isub = id; Nav.refresh(); }, true));
      const grp = D.instr[T.isub === 'ip' ? 'inPossession' : T.isub === 'op' ? 'outPossession' : 'transition'], list = el('div', 'fill'); box.appendChild(list);
      const items = Object.entries(grp);
      return { el: box, mount: () => Nav.pager(list, { key: 'instr' + T.isub, items, cols: 1, itemH: 64, gap: 6, render: ([k, def]) => {
        const r = el('div', 'irow'), seg = el('div', 'seg'), cur = t[T.isub][k];
        r.innerHTML = `<small>${esc(def.label)}</small>`;
        def.opts.forEach(([lab], i) => { const b = el('button', i === cur ? 'on' : '', esc(lab)); b.onclick = () => { t[T.isub][k] = i; Sim.syncTactics(car); save(); }; seg.appendChild(b); });
        r.appendChild(seg); return r; } }) };
    },
    // ---------- opposition instructions ----------
    opposition(car, t) {
      const nx = Sim.nextMatch(car), box = el('div', 'stack grow');
      if (!nx) { box.appendChild(el('div', 'empty', 'No upcoming match.')); return { el: box }; }
      const opp = G.club(nx.home ? nx.a : nx.h), list = el('div', 'fill');
      box.appendChild(el('div', 'panel', `<div class="linkrow"><span class="crest" style="width:30px;height:34px">${Art.crest(opp)}</span><b>${esc(opp.name)}</b><span class="chip">${esc(car.tactics[opp.id].formation)}</span></div><p class="note" style="margin:4px 0 0">Instructions apply to the next match only. Tap a chip to switch it on.</p>`));
      box.appendChild(list);
      const items = Sim.squadOf(car, opp.id).filter(p => !p.injured).sort((a, b) => b.rating - a.rating).slice(0, 11);
      if (t.oppFor !== opp.id) { t.opp = {}; t.oppFor = opp.id; }
      return { el: box, mount: () => Nav.pager(list, { key: 'opp' + opp.id, items, cols: 1, itemH: 82, gap: 6, render: p => {
        const r = el('div', 'panel orow'), on = t.opp[p.id] || [];
        r.innerHTML = `<div class="ot"><span class="shirtmini">${G.shirtOf(p, null)}</span><b>${esc(p.name)}</b><small>${p.pos} · ${p.rating}</small></div>`;
        const chips = el('div', 'ochips');
        for (const [k, lab, tip] of D.oppInstr) { const b = el('button', 'chip' + (on.includes(k) ? ' good' : ''), esc(lab)); b.title = tip;
          b.onclick = () => { const cur = t.opp[p.id] || []; t.opp[p.id] = cur.includes(k) ? cur.filter(x => x !== k) : cur.concat(k); save(); }; chips.appendChild(b); }
        r.appendChild(chips); return r; } }) };
    },
    // ---------- set pieces ----------
    setp(car, t) {
      const list = el('div', 'fill'), { xi } = Sim.fmXI(car), field = xi.filter(p => p.grp !== 'GK');
      const takers = [['captain', 'Captain', xi, null], ['pens', 'Penalties', field, 'shooting'], ['fk', 'Free Kicks', field, 'passing'], ['corners', 'Corners', field, 'passing']];
      const items = takers.map(x => ['taker', x]).concat(Object.entries(D.setPiece).map(x => ['routine', x]));
      return { el: list, mount: () => Nav.pager(list, { key: 'sp', items, cols: 1, itemH: 50, gap: 6, render: ([kind, x]) => {
        if (kind === 'taker') { const [key, label, pool, attr] = x, sorted = pool.slice().sort((a, b) => attr ? b.attr[attr] - a.attr[attr] : b.rating - a.rating);
          const cur = key === 'captain' ? car.captain : car.setp[key]; let i = Math.max(0, sorted.findIndex(p => p.id === cur)); const p = sorted[i];
          return cyc(esc(label), p ? esc(G.surname(p.name)) + (attr ? ` <small class="gold" style="font-family:var(--sans)">${Math.round((p.attr[attr] - 18) / 4.1)}</small>` : '') : '—', d => { i = (i + d + sorted.length) % sorted.length; if (key === 'captain') car.captain = sorted[i].id; else car.setp[key] = sorted[i].id; save(); }, { cls: 'm0' }); }
        const [key, def] = x, cur = t.sp[key];
        return cyc(esc(def.label), esc(def.opts[cur]), d => { t.sp[key] = (cur + d + def.opts.length) % def.opts.length; save(); }, { cls: 'm0' }); } }) };
    },
  };
  function shapeIs(t) { const a = D.shapes[t.shape]; return a && a.every((x, i) => x[0] === t.pos[i][0] && x[1] === t.pos[i][1]); }
  function applyShape(car, t, key) {
    t.shape = key; t.pos = D.shapes[key].map(x => x.slice()); t.roles = t.pos.map(([r, c]) => Sim.defaultRole(D.grid.code(r, c))); t.ids = null; T.sel = null; T.move = false; Sim.syncTactics(car);
  }

  // ---------- the pitch ----------
  const X = c => 10 + c * 20;
  let Y = r => 90 - r * 15.2;
  // spread the rows actually used over the pitch so plates never collide (full grid while moving a player)
  function layoutRows(t) {
    if (T.move) { Y = r => 90 - r * 15.2; return; }
    const used = [...new Set(t.pos.map(([r]) => r))].filter(r => r > 0).sort((a, b) => a - b), n = used.length;
    Y = r => r === 0 ? 89 : 71 - used.indexOf(r) * (59 / Math.max(1, n - 1));
  }
  function drawPitch(car, t, pitch) {
    const { xi, bench } = Sim.fmXI(car), codes = Sim.slotCodes(t), c = G.me(), W = pitch.clientWidth, H = pitch.clientHeight;
    pitch.innerHTML = `<svg class="lines" viewBox="0 0 68 100" preserveAspectRatio="none"><g fill="none" stroke="#f4f1e6" stroke-opacity=".5" stroke-width=".45"><rect x=".5" y=".5" width="67" height="99"/><line x1=".5" y1="50" x2="67.5" y2="50"/><ellipse cx="34" cy="50" rx="9" ry="6.5"/><rect x="14" y="83" width="40" height="16.5"/><rect x="24" y="93" width="20" height="6.5"/><rect x="14" y=".5" width="40" height="16.5"/><rect x="24" y=".5" width="20" height="6.5"/></g></svg>`;
    pitch.classList.toggle('moving', !!T.move); layoutRows(t); const sw = Math.max(24, Math.min(38, H / 13)), pw = Math.min(78, W / 5 - 4);
    // move mode: show every free legal cell
    if (T.move && T.sel != null) {
      const taken = new Set(t.pos.map(([r, cc]) => r + ':' + cc));
      for (let r = 1; r < 6; r++) for (let cc = 0; cc < 5; cc++) { if (!D.grid.allowed(r, cc) || taken.has(r + ':' + cc)) continue;
        const d = el('button', 'gcell', `<span>${D.grid.code(r, cc)}</span>`); d.style.cssText = `left:${X(cc)}%;top:${Y(r)}%`;
        d.onclick = () => { t.pos[T.sel] = [r, cc]; t.roles[T.sel] = Sim.defaultRole(D.grid.code(r, cc)); t.shape = matchShape(t) || t.shape; T.move = false; T.sel = null; Sim.syncTactics(car); Sound.play('card'); save(); };
        pitch.appendChild(d); }
    }
    t.pos.forEach(([r, cc], i) => {
      const id = t.ids && t.ids[i], p = xi.find(q => q.id === id), code = codes[i], [rk, du] = t.roles[i];
      const d = el('button', 'pp' + (T.sel === i ? ' sel' : '') + (T.move && T.sel !== i ? ' dim' : ''));
      d.style.cssText = `left:${X(cc)}%;top:${Y(r)}%;--pw:${pw}px;--sw:${sw}px`;
      const fit = p ? Sim.posFit(p, code) : 1, stars = p ? Sim.roleStars(p, code, rk) : 0;
      d.innerHTML = `${p && car.captain === p.id ? '<span class="cap">C</span>' : ''}${Art.shirt(c.kit, i + 1, { gk: code === 'GK', pattern: Art.kitPattern(c.id) })}<div class="plate"><b>${p ? esc(G.surname(p.name)) : '—'}</b><span><em class="role du-${du}">${rk}-${du}</em>${p ? `<em>${p.rating}</em>` : ''}</span><div class="fit"><i style="width:${p ? Math.round(p.fitness) : 0}%;background:${!p ? '#555' : fit < .85 ? '#ff6f61' : stars < 2.5 ? '#ffb43a' : '#5fcf6f'}"></i></div></div>`;
      d.onclick = () => {
        if (T.move) { T.move = false; T.sel = null; drawPitch(car, t, pitch); return; }
        if (T.sel == null) { T.sel = i; Sound.play('tap'); slotCard(car, t, i, xi, bench, pitch); return; }
        if (T.sel === i) { slotCard(car, t, i, xi, bench, pitch); return; }
        // swap the two players between slots
        const a = t.ids[T.sel], b = t.ids[i]; t.ids[T.sel] = b; t.ids[i] = a; T.sel = null; Sound.play('card'); save();
      };
      pitch.appendChild(d);
    });
    if (T.move) { const hint = el('div', 'hint', 'Tap a gold circle to move him there');
      hint.style.cssText = 'position:absolute;left:0;right:0;top:3px;text-align:center;font:700 12px var(--sans);color:#fff3cc;pointer-events:none;text-shadow:0 1px 3px #000'; pitch.appendChild(hint); }
  }
  function matchShape(t) { return Object.keys(D.shapes).find(k => D.shapes[k].every(([r, c]) => t.pos.some(([a, b]) => a === r && b === c))); }

  // ---------- role / duty / move / swap card for one slot ----------
  function slotCard(car, t, i, xi, bench, pitch) {
    const code = Sim.slotCodes(t)[i], roles = Sim.rolesFor(code), id = t.ids && t.ids[i], p = xi.find(q => q.id === id);
    let ri = Math.max(0, roles.findIndex(r => r[0] === t.roles[i][0])), du = t.roles[i][1];
    const body = el('div', 'stack');
    const draw = () => {
      const R = roles[ri]; if (!R[2].includes(du)) du = R[2].includes('S') ? 'S' : R[2][0];
      body.innerHTML = `<div class="linkrow" style="margin-bottom:2px"><span class="chip">${code}</span><b>${p ? esc(p.name) : 'Empty'}</b>${p ? `<span class="rbadge ${G.rcls(p.rating)}" style="width:34px;height:34px;font-size:16px">${p.rating}</span>` : ''}</div>
        ${p ? `<p class="note" style="margin:0">Natural: ${esc(p.pos)} · Fit here: ${Math.round(Sim.posFit(p, code) * 100)}% · Role suitability ${G.stars(Sim.roleStars(p, code, R[0]))}</p>` : ''}`;
      body.appendChild(cyc('Role', esc(R[1]), d => { ri = (ri + d + roles.length) % roles.length; draw(); }, { cls: 'm0' }));
      const seg = el('div', 'seg'); for (const k of R[2]) { const b = el('button', k === du ? 'on' : '', D.duty[k].label); b.onclick = () => { du = k; draw(); }; seg.appendChild(b); }
      body.appendChild(seg);
      body.insertAdjacentHTML('beforeend', `<p class="note" style="margin:0">Key attributes: ${R[3].map(a => a[0].toUpperCase() + a.slice(1)).join(', ')}</p>`);
    };
    draw();
    const apply = () => { t.roles[i] = [roles[ri][0], du]; Sim.syncTactics(car); G.save(); };
    Nav.card({ title: 'Role & duty', body, buttons: [
      { label: 'Move', ghost: true, go: () => { apply(); T.sel = i; T.move = true; Nav.refresh(); } },
      { label: 'Swap', ghost: true, go: () => { apply(); benchCard(car, t, i, bench); } },
      { label: 'Done', go: () => { apply(); T.sel = null; Nav.refresh(); } }] });
  }
  function benchCard(car, t, i, bench) {
    const body = el('div', ''); body.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    const code = Sim.slotCodes(t)[i];
    bench.slice().sort((a, b) => b.rating * Sim.posFit(b, code) - a.rating * Sim.posFit(a, code)).slice(0, 6).forEach(p => {
      const r = G.prow(p, { sub: `fit ${Math.round(Sim.posFit(p, code) * 100)}%` }); r.style.height = '54px';
      r.onclick = () => { t.ids[i] = p.id; T.sel = null; G.save(); Nav.closeCard(); Sound.play('card'); Nav.refresh(); }; body.appendChild(r); });
    Nav.card({ title: 'Bring on', body, buttons: [{ label: 'Cancel', ghost: true, go: () => { T.sel = null; Nav.refresh(); } }] });
  }

  window.TacticsUI = { view, T };
})();
