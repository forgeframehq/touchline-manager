// Main menu, load, settings, achievements, credits, the step-by-step New Career and the unveiling.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, S = G.state;

  const REGIONS = [
    { id: 'eu', name: 'Europe', flags: ['ENG', 'ESP', 'ITA', 'GER'], countries: [['ENG', 'England'], ['ESP', 'Spain'], ['ITA', 'Italy'], ['GER', 'Germany'], ['FRA', 'France'], ['SCO', 'Scotland'], ['POR', 'Portugal'], ['NED', 'Netherlands'], ['BEL', 'Belgium'], ['TUR', 'Turkey'], ['GRE', 'Greece']] },
    { id: 'sa', name: 'South America', flags: ['BRA', 'ARG'], countries: [['BRA', 'Brazil'], ['ARG', 'Argentina']] },
    { id: 'na', name: 'North America', flags: ['USA', 'MEX'], countries: [['USA', 'USA'], ['MEX', 'Mexico']] },
    { id: 'as', name: 'Asia & Oceania', flags: ['KSA', 'KOR', 'AUS', 'IND'], countries: [['KSA', 'Saudi Arabia'], ['KOR', 'South Korea'], ['AUS', 'Australia'], ['IND', 'India'], ['CHN', 'China']] },
    { id: 'rw', name: 'Rest of World', flags: [], countries: [] },
  ];
  const ready = code => !!WORLD.countries[code];
  const stepHdr = (n, title) => G.titleHeader('New Career', `Step ${n} of 5 · ${title}`);

  // ================= Title / main menu =================
  Nav.define('title', () => {
    G.theme(null); Sound.crowd(.35);
    const latest = Save.latest(), meta = latest && Save.slots()[latest];
    const b = el('div', 'title-scr');
    b.innerHTML = document.getElementById('stadium-art').innerHTML + `<div class="title-wrap"><div id="logo"><span class="l1">Touchline</span><span class="l2">Manager</span></div><div class="menu"></div>
      <div class="studio-credit"><img src="assets/ui/studio_mark.png" alt=""><span>A Forge Frame game</span></div></div>`;
    const menu = b.querySelector('.menu');
    const items = [];
    if (meta) items.push({ label: 'Continue', sub: `${meta.name} · ${G.seasonLabel(meta.season)} · Wk ${meta.week + 1}`, big: true, go: () => loadSlot(latest) });
    items.push({ label: 'New Career', big: !meta, go: () => Nav.push('nc_region') });
    items.push({ label: 'Load Career', go: () => Nav.push('load'), disabled: !Object.keys(Save.slots()).length });
    items.push({ label: 'Achievements', go: () => Nav.push('achievements') });
    items.push({ label: 'Settings', go: () => Nav.push('settings') });
    items.push({ label: 'Credits', go: () => Nav.push('credits') });
    items.forEach((it, i) => { const x = Nav.button(it, 'mi' + (it.big ? ' big' : '')); x.style.setProperty('--d', i * 60 + 'ms'); if (it.disabled) x.disabled = true; menu.appendChild(x); });
    return { full: true, cls: 'night', body: b };
  });
  function loadSlot(n) {
    const c = Save.load(n); if (!c) { Nav.toast('That save could not be loaded.', 'bad'); return; }
    S.career = Sim.rebuild(c); S.career.slot = +n; Nav.reset('hub');
  }

  // ================= Load =================
  Nav.define('load', () => {
    let sel = Save.latest();
    const body = el('div', 'slots');
    const draw = () => {
      body.innerHTML = ''; const slots = Save.slots();
      for (let i = 1; i <= DATA.slotCount; i++) {
        const m = slots[i], b = el('button', 'slot' + (String(sel) === String(i) ? ' sel' : '') + (m ? '' : ' empty'));
        b.innerHTML = m ? `<span class="crest">${Art.crest({ id: m.club, short: m.short, kit: m.kit })}</span><span class="who"><b>${esc(m.name)}</b><small>${esc(m.manager)} · ${esc(WORLD.divisions[m.div] ? WORLD.divisions[m.div].name : '')}</small><small>${G.seasonLabel(m.season)} · Week ${m.week + 1} · ${m.pos ? G.ord(m.pos) : '—'}</small></span><span class="slotn">${i}</span>`
          : `<span class="who"><b>Empty slot</b><small>Start a New Career to use it</small></span><span class="slotn">${i}</span>`;
        if (m) b.onclick = () => { sel = i; draw(); }; else b.disabled = true;
        body.appendChild(b);
      }
    };
    draw();
    return { header: G.titleHeader('Load Career', 'Three save slots'), body,
      extra: [{ label: 'Delete', hold: true, go: () => { if (sel) { Save.remove(sel); sel = Save.latest(); Nav.toast('Save deleted'); Nav.refresh(); } } }],
      action: { label: 'Load', go: () => sel && loadSlot(sel) } };
  });

  // ================= Settings =================
  function cycler(label, opts, cur, onChange) {
    const row = el('div', 'cyc'); let i = Math.max(0, opts.findIndex(o => o[0] === cur));
    const val = el('b', '', esc(opts[i][1])), prev = el('button', 'cb', '‹'), next = el('button', 'cb', '›');
    const set = d => { i = (i + d + opts.length) % opts.length; val.textContent = opts[i][1]; onChange(opts[i][0]); Sound.play('move'); };
    prev.onclick = () => set(-1); next.onclick = () => set(1);
    row.append(el('span', '', esc(label)), prev, val, next); return row;
  }
  Nav.define('settings', () => {
    const p = S.prefs, body = el('div', 'settings');
    body.append(
      cycler('Match speed', [[1, 'Normal'], [2, 'Fast'], [4, 'Very fast']], p.speed, v => G.setPrefs({ speed: v })),
      cycler('Sound effects', [[0, 'Off'], [.4, 'Low'], [.8, 'High']], p.sfx, v => G.setPrefs({ sfx: v })),
      cycler('Crowd ambience', [[0, 'Off'], [.3, 'Low'], [.6, 'High']], p.crowd, v => { G.setPrefs({ crowd: v }); Sound.crowd(.35); }),
      cycler('Haptics', [[true, 'On'], [false, 'Off']], p.haptics, v => G.setPrefs({ haptics: v })),
      cycler('Difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], p.difficulty, v => { G.setPrefs({ difficulty: v }); if (S.career) { S.career.difficulty = v; G.save(); } }),
    );
    body.appendChild(el('p', 'note center', 'Difficulty changes how strong rival clubs play. Settings save automatically.'));
    return { header: G.titleHeader('Settings'), body };
  });

  // ================= Achievements =================
  Nav.define('achievements', () => {
    const box = el('div', 'fill'), got = S.prefs.ach, n = DATA.achievements.filter(a => got[a.id]).length;
    return { header: G.titleHeader('Achievements', `${n} of ${DATA.achievements.length} unlocked`), body: box,
      mount: () => Nav.pager(box, { key: 'ach', items: DATA.achievements, cols: 1, itemH: 62, gap: 8, render: a => el('div', 'achrow' + (got[a.id] ? ' got' : ''), `<span class="ai">${got[a.id] ? Art.trophy('league', 1) : '<b>?</b>'}</span><span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></span>`) }) };
  });

  // ================= Credits =================
  Nav.define('credits', () => ({ header: G.titleHeader('Credits'), body: el('div', 'credits center', `
    <img src="assets/ui/studio_logo.png" alt="Forge Frame" style="width:min(70%,300px)">
    <p><b>Touchline Manager</b><br>A Forge Frame game</p>
    <p>Designed and directed by <b>Sudhi</b><br>Built with Claude</p>
    <p class="note">Real clubs and players appear in this private build for personal play. Ratings are Touchline's own estimates. Club lists and managers from official league and news sources, November 2026.</p>`) }));

  // ================= New career: 1 region =================
  Nav.define('nc_region', () => {
    G.theme(null);
    const box = el('div', 'tiles2');
    REGIONS.forEach((r, i) => {
      const n = r.countries.filter(c => ready(c[0])).length, t = el('button', 'rtile' + (n ? '' : ' locked') + (i === REGIONS.length - 1 ? ' span2' : ''));
      t.innerHTML = `<span class="fls">${r.flags.map(f => Flags.svg(f, 30, 20)).join('') || '<b class="globe">🌍</b>'}</span><b>${esc(r.name)}</b><small>${n ? `${n} of ${r.countries.length} countries ready` : 'Coming soon'}</small>`;
      t.onclick = () => n ? Nav.push('nc_country', { region: r.id }) : (Sound.play('error'), Nav.toast(`${r.name} arrives in a future update.`));
      box.appendChild(t);
    });
    return { header: stepHdr(1, 'Region'), body: box };
  });
  // ================= 2 country =================
  Nav.define('nc_country', p => {
    const r = REGIONS.find(x => x.id === p.region), box = el('div', 'tiles3');
    for (const [code, name] of r.countries) {
      const ok = ready(code), t = el('button', 'ctile' + (ok ? '' : ' locked'));
      t.innerHTML = `${Flags.svg(code, 54, 36)}<b>${esc(name)}</b><small>${ok ? WORLD.divisionsOf(code).length + ' divisions' : 'Soon'}</small>`;
      t.onclick = () => ok ? Nav.push('nc_league', { country: code }) : (Sound.play('error'), Nav.toast(`${name} arrives in a future update.`));
      box.appendChild(t);
    }
    return { header: stepHdr(2, r.name), body: box };
  });
  // ================= 3 league =================
  Nav.define('nc_league', p => {
    const box = el('div', 'leagues');
    for (const d of WORLD.divisionsOf(p.country)) {
      const n = WORLD.clubsIn(d.id).length, rules = [d.tier > 1 ? `${d.up} up${d.playoff ? ' + play-offs' : ''}` : 'Title & Europe', d.down ? `${d.down} down` : ''].filter(Boolean).join(' · ');
      const t = el('button', 'ltile', `<span class="tier">${d.tier}</span><span class="who"><b>${esc(d.name)}</b><small>${n} clubs · ${rules}</small></span><i>▶</i>`);
      t.onclick = () => Nav.push('nc_club', { div: d.id }); box.appendChild(t);
    }
    return { header: stepHdr(3, WORLD.countries[p.country].name), body: box };
  });
  // ================= 4 club grid + detail card =================
  function clubCard(c, onChoose) {
    G.theme(c.kit);
    const top = (WORLD.squads[c.id] || []).slice().sort((a, b) => b.rating - a.rating).slice(0, 3);
    const body = el('div', 'clubcard');
    body.innerHTML = `<div class="cc-top"><span class="crest">${Art.crest(c)}</span><div><h3>${esc(c.name)}</h3><small>${esc(WORLD.divisions[c.div].name)}</small></div></div>
      <div class="kv"><span>Stadium</span><b>${esc(c.stadium)}</b><span>Capacity</span><b>${c.capacity.toLocaleString()}</b><span>You replace</span><b>${esc(c.manager || 'Caretaker')}</b><span>Rival</span><b>${esc((WORLD.club(c.rival) || { name: '—' }).name)}</b><span>Reputation</span><b>${c.rep}</b></div>
      <div class="brief"><small>The board's brief</small><b>${esc(Sim.previewBrief(c.id))}</b></div>
      ${top.length ? `<div class="stars3">${top.map(p => `<span><b>${p.rating}</b>${esc(G.surname(p.name))}</span>`).join('')}</div>` : '<div class="note center">Squad: generated players</div>'}`;
    Nav.card({ body, buttons: [{ label: 'Back', ghost: true, go: () => G.theme(null) }, { label: 'Choose Club', go: onChoose }] });
  }
  Nav.define('nc_club', p => {
    G.theme(null);
    const d = WORLD.divisions[p.div], clubs = WORLD.clubsIn(p.div).slice().sort((a, b) => a.name.localeCompare(b.name)), box = el('div', 'fill');
    return { header: stepHdr(4, d.name), body: box,
      mount: () => Nav.pager(box, { key: 'clubs' + p.div, items: clubs, cols: 4, itemH: w => Math.round(w * 1.05), gap: 8, cls: 'crestgrid', render: c => {
        const t = el('button', 'cgtile', `<span class="crest">${Art.crest(c)}</span><b>${esc(c.short.replace(/\d/g, ''))}</b>`);
        t.style.setProperty('--k1', c.kit[0]); t.style.setProperty('--k2', c.kit[1]);
        t.onclick = () => clubCard(c, () => Nav.push('nc_manager', { club: c.id })); return t; } }) };
  });
  // ================= 5a manager profile =================
  Nav.define('nc_manager', p => {
    const c = WORLD.club(p.club); G.theme(c.kit);
    const draft = Object.assign({ name: S.prefs.lastName || '', nat: S.prefs.lastNat || 'ENG' }, p.draft || {});
    const body = el('div', 'mgr');
    const badge = el('div', 'mbadge', Art.badge(draft.name || 'Boss', c.kit));
    const inp = el('input', 'tinput'); inp.placeholder = 'Your name'; inp.maxLength = 22; inp.value = draft.name; inp.autocomplete = 'off';
    inp.oninput = () => { draft.name = inp.value.trim(); badge.innerHTML = Art.badge(draft.name || 'Boss', c.kit); };
    const nats = DATA.nations; let ni = Math.max(0, nats.indexOf(draft.nat));
    const natRow = el('div', 'cyc'), val = el('b', '', `${Flags.svg(nats[ni], 30, 20)} ${esc(Flags.name(nats[ni]))}`);
    const setN = d => { ni = (ni + d + nats.length) % nats.length; draft.nat = nats[ni]; val.innerHTML = `${Flags.svg(nats[ni], 30, 20)} ${esc(Flags.name(nats[ni]))}`; Sound.play('move'); };
    const pv = el('button', 'cb', '‹'), nx = el('button', 'cb', '›'); pv.onclick = () => setN(-1); nx.onclick = () => setN(1);
    natRow.append(el('span', '', 'Nationality'), pv, val, nx);
    body.append(badge, el('label', 'lbl', 'Manager name'), inp, natRow, el('p', 'note center', 'Your profile follows you from club to club: trophies, sackings, win rate.'));
    return { header: G.titleHeader('New Career', 'Step 5 of 5 · Your profile'), body,
      action: { label: 'Next', go: () => { draft.name = draft.name || 'The Boss'; G.setPrefs({ lastName: draft.name, lastNat: draft.nat }); Nav.push('nc_confirm', { club: p.club, draft }); } } };
  });
  // ================= 5b confirm =================
  Nav.define('nc_confirm', p => {
    const c = WORLD.club(p.club); G.theme(c.kit);
    const opts = { legends: S.prefs.legends !== false, difficulty: S.prefs.difficulty };
    const body = el('div', 'confirm');
    body.innerHTML = `<div class="cf-crest"><span class="crest">${Art.crest(c)}</span></div><h2>${esc(c.name)}</h2><div class="note center">${esc(c.stadium)} · ${esc(WORLD.divisions[c.div].name)}</div>
      <div class="brief"><small>Manager</small><b>${Flags.svg(p.draft.nat, 24, 16)} ${esc(p.draft.name)}</b></div><div class="brief"><small>The board's brief</small><b>${esc(Sim.previewBrief(c.id))}</b></div>`;
    const sw = el('label', 'switch', `<input type="checkbox" ${opts.legends ? 'checked' : ''}><i></i><span><b>Include legends</b><small>${WORLD.legends.length} greats at their peak join the world</small></span>`);
    sw.querySelector('input').onchange = e => { opts.legends = e.target.checked; G.setPrefs({ legends: opts.legends }); Sound.play('move'); };
    body.appendChild(sw);
    body.appendChild(cycler('Difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], opts.difficulty, v => { opts.difficulty = v; G.setPrefs({ difficulty: v }); }));
    const take = slot => {
      Nav.toast('Building the world…');
      setTimeout(() => {
        S.career = Sim.newCareer((Date.now() & 0xffffffff) >>> 0, c.id, { legends: opts.legends, difficulty: opts.difficulty, name: p.draft.name, nat: p.draft.nat });
        S.career.slot = slot; G.save(); Nav.reset('unveil');
      }, 30);
    };
    return { header: G.titleHeader('Ready?', 'Confirm your new career'), body,
      action: { label: 'Take Charge', go: () => { const free = Save.freeSlot(); if (free) return take(free);
        const pick = el('div', 'slots'); const slots = Save.slots();
        for (let i = 1; i <= DATA.slotCount; i++) { const m = slots[i], b = el('button', 'slot', `<span class="who"><b>Slot ${i}: ${esc(m.name)}</b><small>${G.seasonLabel(m.season)} · ${esc(m.manager)}</small></span>`); b.onclick = () => { Nav.closeCard(); take(i); }; pick.appendChild(b); }
        Nav.card({ title: 'All slots are full', body: pick, buttons: [{ label: 'Cancel', ghost: true }] }); } } };
  });

  // ================= Unveiling =================
  Nav.define('unveil', () => {
    const car = S.career, c = G.me(); G.theme(c.kit); Sound.play('sting'); Sound.crowd(.6); Sound.swell(2, 2.5);
    const b = el('div', 'unveil');
    b.innerHTML = `<div class="rays"></div><div class="uv-crest"><span class="crest">${Art.crest(c)}</span></div>
      <div class="uv-l1">Welcome to</div><div class="uv-l2">${esc(c.name)}</div><div class="uv-l3">${Flags.svg(car.manager.nat, 24, 16)} ${esc(car.manager.name)} · Manager</div>
      <div class="uv-brief"><small>The board's brief</small><b>${esc(car.brief.text)}</b><small>They want ${esc(DATA.styles[car.brief.style].label.toLowerCase())} football · ${esc(c.stadium)}</small></div>`;
    const go = Nav.button({ label: "Let's go", go: () => { G.checkAchievements(); Nav.reset('hub'); } }, 'btn big uv-go');
    b.appendChild(go);
    return { full: true, cls: 'night', body: b };
  });
})();
