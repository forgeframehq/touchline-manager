// Console framework: a screen stack with slide transitions, a fixed bottom prompt bar (Back left, main action right),
// phone/browser back = one step back, pop-up cards that zoom in, toasts and achievement popups, hold-to-confirm,
// and a pager that sizes pages to the screen (swipe or arrows) so nothing ever scrolls.
'use strict';
const Nav = (() => {
  const $ = s => document.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const stack = [], pages = {};   // pages: remembered pager positions by key
  let root, cardOpen = null, busy = false, onQuit = null, ignorePop = 0;
  const SCREENS = {};

  function init(opts) {
    root = $('#app'); onQuit = opts && opts.quit;
    history.replaceState({ tlm: 0 }, '');
    window.addEventListener('popstate', () => { if (ignorePop) { ignorePop--; return; } if (cardOpen) { closeCard(); history.pushState({ tlm: stack.length }, ''); return; } const t = stack[stack.length - 1]; if (t && t.spec.onBack) { history.pushState({ tlm: stack.length }, ''); t.spec.onBack(); return; } if (stack.length > 1) back(true); else { history.pushState({ tlm: stack.length }, ''); askQuit(); } });
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.addListener) App.addListener('backButton', () => backKey());
    document.addEventListener('pointerdown', e => { Sound.unlock(); const b = e.target.closest('button'); if (b && !b.disabled && !b.classList.contains('hold')) { Sound.play(b.dataset.snd || 'tick'); Sound.buzz(6); } }, true);
  }
  function backKey() { if (cardOpen) { closeCard(); Sound.play('back'); return; } const t = stack[stack.length - 1]; if (t && t.spec.onBack) { t.spec.onBack(); return; } if (stack.length > 1) back(); else askQuit(); }
  function askQuit() {
    card({ title: 'Quit Touchline Manager?', body: '<p class="center">Your career is saved.</p>', buttons: [{ label: 'Stay', ghost: true }, { label: 'Quit', go: () => { const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (App && App.exitApp) App.exitApp(); else if (onQuit) onQuit(); } }] });
  }

  function define(name, fn) { SCREENS[name] = fn; }

  // Screen spec returned by SCREENS[name](params):
  // { cls, header (html|el), body (el), back: {label, go}|false, action: {label, go, hold, disabled}, extra: [buttons], mount(el), full: bool }
  function build(name, params) {
    const spec = SCREENS[name](params || {}) || {};
    const s = el('section', 'scr ' + (spec.cls || ''));
    if (!spec.full) {
      const hdr = el('header', 'hdr'); if (typeof spec.header === 'string') hdr.innerHTML = spec.header; else if (spec.header) hdr.appendChild(spec.header); s.appendChild(hdr);
      const main = el('main', 'content'); if (spec.body) main.appendChild(spec.body); s.appendChild(main);
      s.appendChild(bar(spec));
    } else if (spec.body) s.appendChild(spec.body);
    return { s, spec };
  }
  function bar(spec) {
    const f = el('footer', 'bar');
    const bk = spec.back === false ? el('span', 'bb spacer') : el('button', 'bb back', `<i>◀</i><span>${esc((spec.back && spec.back.label) || 'Back')}</span>`);
    if (spec.back !== false) { bk.dataset.snd = 'back'; bk.onclick = () => (spec.back && spec.back.go) ? spec.back.go() : back(); }
    f.appendChild(bk);
    const mid = el('div', 'mid'); (spec.extra || []).forEach(b => mid.appendChild(button(b, 'bb ghost'))); f.appendChild(mid);
    if (spec.action) f.appendChild(button(Object.assign({ cls: 'act' }, spec.action), 'bb act'));
    else f.appendChild(el('span', 'bb spacer'));
    return f;
  }
  function button(b, cls) {
    const x = el('button', (cls || 'btn') + (b.cls ? ' ' + b.cls : '') + (b.hold ? ' hold' : ''), `<span>${esc(b.label)}</span>${b.icon ? '<i>' + b.icon + '</i>' : (cls || '').includes('act') ? '<i>▶</i>' : ''}${b.sub ? `<small>${esc(b.sub)}</small>` : ''}`);
    if (b.disabled) x.disabled = true;
    if (b.id) x.id = b.id;
    if (b.hold) holdify(x, b.go); else if (b.go) { x.dataset.snd = b.snd || ((cls || '').includes('act') ? 'select' : 'tick'); x.onclick = b.go; }
    return x;
  }
  // hold-to-confirm: a ring fills while held (650 ms)
  function holdify(x, go) {
    x.insertAdjacentHTML('beforeend', '<b class="ring"></b>'); let t = null, start = 0, raf = 0;
    const ring = x.querySelector('.ring');
    const stop = () => { clearTimeout(t); cancelAnimationFrame(raf); x.classList.remove('holding'); ring.style.setProperty('--p', 0); };
    x.addEventListener('pointerdown', e => { if (x.disabled) return; e.preventDefault(); start = performance.now(); x.classList.add('holding'); Sound.play('move');
      const tickp = () => { const p = Math.min(1, (performance.now() - start) / 650); ring.style.setProperty('--p', p); if (p < 1) raf = requestAnimationFrame(tickp); }; tickp();
      t = setTimeout(() => { stop(); Sound.play('confirm'); Sound.buzz(30); go(); }, 650); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => x.addEventListener(ev, stop));
    x.title = 'Hold to confirm';
  }

  function show(entry, dir) {
    const old = root.querySelector('.scr.on'); const s = entry.s;
    s.classList.add(dir === 'back' ? 'from-left' : dir === 'none' ? 'on' : 'from-right'); root.appendChild(s);
    requestAnimationFrame(() => { if (entry.spec.mount) entry.spec.mount(s); requestAnimationFrame(() => { s.classList.remove('from-left', 'from-right'); s.classList.add('on'); }); });
    if (old) { old.classList.remove('on'); old.classList.add(dir === 'back' ? 'to-right' : 'to-left'); setTimeout(() => old.remove(), 340); }
  }
  function push(name, params) {
    if (busy) return; busy = true; setTimeout(() => busy = false, 280);
    const e = build(name, params); e.name = name; e.params = params; stack.push(e); show(e, stack.length === 1 ? 'none' : 'fwd');
    history.pushState({ tlm: stack.length }, '');
  }
  function replace(name, params) { const e = build(name, params); e.name = name; e.params = params; stack.pop(); stack.push(e); show(e, 'fwd'); }
  function reset(name, params) { if (stack.length > 1) { ignorePop++; history.go(-(stack.length - 1)); } stack.length = 0; const e = build(name, params); e.name = name; e.params = params; stack.push(e); show(e, 'none'); }
  function back(fromPop) {
    if (stack.length < 2 || busy) return; busy = true; setTimeout(() => busy = false, 280);
    stack.pop(); const top = stack[stack.length - 1], e = build(top.name, top.params); Object.assign(top, e); show(top, 'back');
    if (!fromPop) { ignorePop++; history.back(); }
  }
  function backTo(name) { let k = 0; while (stack.length > 1 && stack[stack.length - 1].name !== name) { stack.pop(); k++; } if (k) { ignorePop++; history.go(-k); } const top = stack[stack.length - 1], e = build(top.name, top.params); Object.assign(top, e); show(top, 'back'); }
  function refresh() { const top = stack[stack.length - 1]; if (!top) return; const e = build(top.name, top.params); const old = top.s; Object.assign(top, e); e.s.classList.add('on'); root.replaceChild(e.s, old); if (e.spec.mount) requestAnimationFrame(() => e.spec.mount(e.s)); }
  const top = () => stack[stack.length - 1];

  // ---------- pop-up card ----------
  function card(o) {
    closeCard(true);
    const ov = el('div', 'overlay'), c = el('div', 'card ' + (o.cls || ''));
    if (o.title) c.appendChild(el('h2', '', esc(o.title)));
    const body = el('div', 'card-body'); if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body); c.appendChild(body);
    const row = el('div', 'card-btns'); (o.buttons || [{ label: 'OK' }]).forEach(b => { const x = button(Object.assign({}, b, { go: () => { if (!b.keep) closeCard(); b.go && b.go(); } }), 'btn' + (b.ghost ? ' ghost' : '')); row.appendChild(x); });
    if ((o.buttons || [1]).length) c.appendChild(row);
    ov.appendChild(c); ov.onclick = e => { if (e.target === ov && !o.modal) { closeCard(); Sound.play('back'); } };
    document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add('on')); cardOpen = ov; Sound.play('flip'); Sound.buzz(10);
    if (o.mount) o.mount(c);
    return c;
  }
  function closeCard(instant) { if (!cardOpen) return; const ov = cardOpen; cardOpen = null; ov.classList.remove('on'); setTimeout(() => ov.remove(), instant ? 0 : 200); }

  // ---------- toasts, achievements, saving ----------
  function toast(text, kind) {
    const t = el('div', 'toast ' + (kind || ''), text); document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('on')); setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 300); }, 2600);
  }
  let achQ = [], achBusy = false;
  function achievement(a) {
    achQ.push(a); if (achBusy) return; achBusy = true;
    const next = () => { const x = achQ.shift(); if (!x) { achBusy = false; return; }
      const t = el('div', 'ach', `<b class="trophy-i">${Art.trophy('league', 1)}</b><span><small>Achievement unlocked</small><b>${esc(x.title)}</b><em>${esc(x.desc)}</em></span>`);
      document.body.appendChild(t); Sound.play('unlock'); Sound.buzz(25); requestAnimationFrame(() => t.classList.add('on'));
      setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.remove(); next(); }, 350); }, 3000); };
    next();
  }
  function saving() { let s = $('#saving'); if (!s) { s = el('div', '', Art.ball()); s.id = 'saving'; document.body.appendChild(s); } s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 900); }

  // ---------- pager: fit items to the box, flip with swipe or arrows ----------
  // opts: { key, items, cols, itemH (px), gap, render(item, i) -> el, cls, empty }
  function pager(box, opts) {
    box.innerHTML = ''; box.classList.add('pager');
    const grid = el('div', 'pg-grid ' + (opts.cls || '')), ctl = el('div', 'pg-ctl');
    box.appendChild(grid); box.appendChild(ctl);
    const W = box.clientWidth, Hh = box.clientHeight - 40, gap = opts.gap == null ? 8 : opts.gap;
    const cols = typeof opts.cols === 'function' ? opts.cols(W) : (opts.cols || 1);
    const itemH = typeof opts.itemH === 'function' ? opts.itemH((W - gap * (cols - 1)) / cols) : opts.itemH;
    const rows = Math.max(1, Math.floor((Hh + gap) / (itemH + gap))), per = rows * cols, total = Math.max(1, Math.ceil(opts.items.length / per));
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`; grid.style.gridAutoRows = itemH + 'px'; grid.style.gap = gap + 'px';
    let page = Math.min(pages[opts.key] || 0, total - 1);
    const draw = dir => {
      grid.classList.remove('slide-l', 'slide-r'); void grid.offsetWidth; if (dir) grid.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
      grid.innerHTML = '';
      const slice = opts.items.slice(page * per, page * per + per);
      if (!slice.length) grid.appendChild(el('div', 'empty', esc(opts.empty || 'Nothing here yet.')));
      slice.forEach((it, i) => grid.appendChild(opts.render(it, page * per + i)));
      ctl.innerHTML = '';
      if (total > 1) {
        const prev = el('button', 'pg-btn', '‹'), next = el('button', 'pg-btn', '›'), dots = el('span', 'pg-dots', Array.from({ length: total }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join(''));
        prev.disabled = page === 0; next.disabled = page === total - 1; prev.onclick = () => go(-1); next.onclick = () => go(1);
        ctl.append(prev, dots, next);
      }
      pages[opts.key] = page;
    };
    const go = d => { const np = Math.max(0, Math.min(total - 1, page + d)); if (np === page) return; page = np; Sound.play('move'); draw(d); };
    let sx = null, sy = null;
    grid.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    grid.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1); });
    draw(0);
    return { go, get page() { return page; }, total };
  }

  // ---------- sub-tabs (segmented, swipeable between) ----------
  function subtabs(tabs, active, onPick) {
    const s = el('div', 'subtabs');
    tabs.forEach(t => { const b = el('button', t.id === active ? 'on' : '', esc(t.label) + (t.badge ? `<i>${esc(t.badge)}</i>` : '')); b.onclick = () => { if (t.id !== active) { Sound.play('move'); onPick(t.id); } }; s.appendChild(b); });
    return s;
  }

  return { init, define, push, replace, reset, back, backTo, refresh, top, card, closeCard, toast, achievement, saving, pager, subtabs, button, holdify, el, esc, backKey, get stack() { return stack; } };
})();
