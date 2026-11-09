// Shared game state and helpers used by every screen: the loaded career, prefs, club-colour theming,
// sticker cards, saving with the auto-save ball, achievement checks.
'use strict';
const G = (() => {
  const el = Nav.el, esc = Nav.esc;
  const state = { career: null, prefs: Save.prefs() };
  Sound.setPrefs(state.prefs);
  const money = k => { const a = Math.abs(k), s = k < 0 ? '−' : ''; return s + '£' + (a >= 1000 ? (a / 1000).toFixed(a >= 100000 ? 0 : 1) + 'm' : Math.round(a) + 'k'); };
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const surname = n => { const p = n.split(' '); return p.length > 1 ? p.slice(1).join(' ') : n; };
  const seasonLabel = y => y + '/' + String(y + 1).slice(2);
  const club = id => (state.career ? state.career.clubs : WORLD.clubs).find(c => c.id === id);
  const me = () => club(state.career.me);

  // One fixed colour for the whole game: football-pitch green (Sudhi's call). Club colours live only on
  // crests, shirts and stickers, so the `kit` argument is accepted but no longer recolours the UI.
  const PITCH = { c1: '#2e8b3e', c2: '#3fa34f', acc: '#2f9a44', ink: '#ffffff', soft: 'rgba(47,154,68,.28)' };
  function theme() {
    const r = document.documentElement.style;
    r.setProperty('--c1', PITCH.c1); r.setProperty('--c2', PITCH.c2); r.setProperty('--acc', PITCH.acc); r.setProperty('--acc-ink', PITCH.ink); r.setProperty('--acc-soft', PITCH.soft);
  }
  function save() { if (state.career && Save.store(state.career)) Nav.saving(); }
  function setPrefs(p) { Object.assign(state.prefs, p); Save.setPrefs(state.prefs); Sound.setPrefs(state.prefs); }
  function checkAchievements(ctx) {
    if (!state.career) return;
    for (const id of Sim.achievements(state.career, ctx)) if (!state.prefs.ach[id]) { state.prefs.ach[id] = Date.now(); const a = DATA.achievements.find(x => x.id === id); Nav.achievement(a); }
    Save.setPrefs(state.prefs);
  }

  function sticker(p, opts) {
    opts = opts || {};
    const c = p.club ? club(p.club) : { kit: p.legend ? ['#111111', '#f2c14e'] : ['#5b6b62', '#dfe6e1'] };
    const k1 = c.kit[0], s = el('button', 'stk' + (p.legend ? ' legend' : '') + (opts.xi ? ' xi' : '') + (opts.sel ? ' sel' : ''));
    s.style.setProperty('--k1', k1); s.style.setProperty('--k1ink', Art.inkOn(k1));
    s.innerHTML = `<div class="band"></div><span class="r">${p.rating}</span><span class="p">${p.pos}</span><span class="fl">${p.nat ? Flags.svg(p.nat, 18, 12) : ''}</span>
      ${Art.shirt(c.kit, opts.num)}${p.injured ? '<span class="inj">+</span>' : ''}<div class="nm">${esc(surname(p.name))}${opts.sub ? `<small>${esc(opts.sub)}</small>` : ''}</div>`;
    return s;
  }
  function crestEl(c, cls) { return el('span', 'crest ' + (cls || ''), Art.crest(c)); }

  function playerCard(p, actions) {
    const c = p.club ? club(p.club) : null;
    const attrs = DATA.attributes.filter(a => p.grp === 'GK' || (a !== 'handling' && a !== 'reflexes'));
    const body = el('div', 'pcard');
    const left = el('div', 'pc-left'); left.appendChild(sticker(p, { sub: p.age + ' yrs' })); body.appendChild(left);
    body.appendChild(el('div', 'pc-right', `<div class="pc-name">${esc(p.name)}</div><div class="pc-meta">${esc(DATA.positions[p.pos].name)} · ${p.nat ? Flags.svg(p.nat, 16, 11) + ' ' : ''}${esc(Flags.name(p.nat))}</div>
      <div class="pc-meta">${c ? esc(c.name) : 'Free agent'}${p.legend ? ' · Legend (' + esc(p.known) + ')' : ''}</div>
      <div class="kv tight"><span>Potential</span><b>${p.pot}</b><span>Wage</span><b>£${p.wage}k/wk</b><span>Value</span><b>${money(Sim.value(p) * 1000)}</b><span>Season</span><b>${p.seasonApps} apps · ${p.seasonGoals} gls</b><span>Fitness</span><b>${Math.round(p.fitness)}%</b><span>Morale</span><b>${Math.round(p.morale)}</b></div>`));
    const at = el('div', 'attrs'); at.innerHTML = attrs.map(a => `<div class="attr"><span>${a.slice(0, 3).toUpperCase()}</span><b>${p.attr[a]}</b><i style="--v:${p.attr[a]}%"></i></div>`).join('');
    const wrap = el('div'); wrap.append(body, at);
    Nav.card({ cls: 'wide', body: wrap, buttons: actions || [{ label: 'Close', ghost: true }] });
  }

  // standard club header (crest, name, sub line, chip)
  function clubHeader(sub, chip) {
    const c = me(), h = el('div', 'clubhdr');
    h.appendChild(crestEl(c)); h.appendChild(el('div', 'tt', `<h1>${esc(c.name)}</h1><small>${esc(sub)}</small>`));
    if (chip) h.appendChild(el('span', 'chip', esc(chip)));
    return h;
  }
  function titleHeader(title, sub) { return el('div', 'titlehdr', `<h1>${esc(title)}</h1>${sub ? `<small>${esc(sub)}</small>` : ''}`); }
  function scarf(text) { return el('div', 'scarf', `<span>${esc(text)}</span>`); }

  return { state, money, ord, surname, seasonLabel, club, me, theme, save, setPrefs, checkAchievements, sticker, crestEl, playerCard, clubHeader, titleHeader, scarf };
})();
