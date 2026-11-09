// Shared game state and helpers used by every screen: the loaded career, prefs, the gold top bar and page heads,
// player rows, saving with the auto-save ball, achievement checks.
'use strict';
const G = (() => {
  const el = Nav.el, esc = Nav.esc, I = Icons.svg;
  const state = { career: null, prefs: Save.prefs() };
  Sound.setPrefs(state.prefs);
  const money = k => { const a = Math.abs(k), s = k < 0 ? '−' : ''; return s + '£' + (a >= 1000 ? (a / 1000).toFixed(a >= 100000 ? 0 : 1) + 'M' : Math.round(a) + 'K'); };
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const surname = n => { const p = n.split(' '); return p.length > 1 ? p.slice(1).join(' ') : n; };
  const seasonLabel = y => y + '/' + String(y + 1).slice(2);
  const club = id => (state.career ? state.career.clubs : WORLD.clubs).find(c => c.id === id);
  const me = () => club(state.career.me);
  const theme = () => {};   // the look is fixed: dark green and gold (club colours only on crests and shirts)
  function save() { if (state.career && Save.store(state.career)) Nav.saving(); }
  function setPrefs(p) { Object.assign(state.prefs, p); Save.setPrefs(state.prefs); Sound.setPrefs(state.prefs); }
  function checkAchievements(ctx) {
    if (!state.career) return;
    for (const id of Sim.achievements(state.career, ctx)) if (!state.prefs.ach[id]) { state.prefs.ach[id] = Date.now(); state.career.coins = (state.career.coins || 0) + DATA.coins.achievement; const a = DATA.achievements.find(x => x.id === id); Nav.achievement(a); }
    Save.setPrefs(state.prefs);
  }
  function crestEl(c, cls) { return el('span', 'crest ' + (cls || ''), Art.crest(c)); }
  const shirtOf = (p, num) => { const c = p.club ? club(p.club) : null, kit = c ? c.kit : (p.legend ? ['#111111', '#e7c25a'] : ['#5b6b62', '#dfe6e1']); return Art.shirt(kit, num, { gk: p.grp === 'GK', pattern: c ? Art.kitPattern(c.id) : 'plain' }); };
  const shortName = c => c.name.replace(' & Hove Albion', '').replace('Wolverhampton Wanderers', 'Wolves').replace(' Football Club', '');

  // ---------- top bar: crest, club, flag + league, money, coins, settings ----------
  function topbar(onGear) {
    const car = state.career, h = el('div', 'topbar');
    if (car) {
      const c = me(), d = WORLD.divisions[c.div];
      h.innerHTML = `<span class="crest">${Art.crest(c)}</span><span class="tb-name"><b>${esc(shortName(c))}</b><small>${Flags.svg(d.country, 18, 12)} ${esc(d.name)}</small></span>
        <span class="pill cash">${I('cash')}${money(car.balances[car.me])}</span><span class="pill coins">${I('coin')}${car.coins || 0}</span>`;
    } else h.innerHTML = `<span class="gametitle">Touchline Manager</span>`;
    const g = el('button', 'gearbtn', I('gear')); g.onclick = onGear || (() => Nav.push('settings')); h.appendChild(g);
    return h;
  }
  function phead(icon, title, sub, right, cls) {
    const h = el('div', 'phead ' + (cls || ''), `<span class="pic">${I(icon)}</span><span class="pt"><h1>${esc(title)}</h1>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`);
    if (right) { if (typeof right === 'string') h.insertAdjacentHTML('beforeend', right); else h.appendChild(right); }
    return h;
  }
  // header for a screen: top bar (when a career is loaded) + page head
  function header(icon, title, sub, right, opts) {
    const w = el('div'); if (state.career && !(opts && opts.noBar)) w.appendChild(topbar(opts && opts.gear)); w.appendChild(phead(icon, title, sub, right, (opts && opts.compact) || (state.career ? 'compact' : '')));
    return w;
  }
  const titleHeader = (title, sub, icon) => header(icon || 'star', title, sub, null, { noBar: true });

  // ---------- player rows and profile ----------
  const rcls = r => r >= 80 ? '' : r >= 70 ? 'mid' : 'lo';
  function prow(p, opts) {
    opts = opts || {};
    const r = el('button', 'prow' + (opts.xi ? ' xi' : ''));
    r.innerHTML = `${shirtOf(p, opts.num)}<span class="nm"><b>${esc(p.name)}</b><small>${p.legend ? '<span class="legendtag">LEGEND</span>' : ''}${esc(p.pos)} · ${p.age} yrs · ${p.nat ? Flags.svg(p.nat, 15, 10) : ''}${opts.sub ? ' · ' + opts.sub : ''}</small></span>
      <span class="fitc">${p.injured ? `<small class="inj">INJ ${p.injured}w</small>` : `<div class="meter"><i style="width:${Math.round(p.fitness)}%"></i></div><small>Fitness</small>`}</span><span class="rbadge ${rcls(p.rating)}">${p.rating}</span>`;
    return r;
  }
  function stars(v) { let s = ''; for (let i = 1; i <= 5; i++) s += v >= i ? '★' : v >= i - .5 ? '⯪' : '<span class="off">★</span>'; return `<span class="stars">${s}</span>`; }
  function pips(n, max) { return `<div class="bar5">${Array.from({ length: max || 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`; }
  function ring(v, col) { const r = 24, c = 2 * Math.PI * r; return `<span class="cring"><svg viewBox="0 0 58 58"><circle cx="29" cy="29" r="${r}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/><circle cx="29" cy="29" r="${r}" fill="none" stroke="${col || '#5fcf6f'}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c * v / 100} ${c}"/></svg><b>${v}</b></span>`; }

  // legacy name used by older call sites: open the player screen
  function playerCard(p, actions) { Nav.push('player', { id: p.id, actions }); }
  const sticker = (p, opts) => prow(p, opts);

  return { state, money, ord, surname, seasonLabel, club, me, theme, save, setPrefs, checkAchievements, crestEl, shirtOf, shortName, topbar, phead, header, titleHeader, prow, rcls, stars, pips, ring, playerCard, sticker };
})();
