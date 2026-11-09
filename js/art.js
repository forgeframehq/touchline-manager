// Art: painted sprites from assets/art composed in canvas and cached.
// Crests = painted gold frame (rim) + centre mask dyed in the club's colours + an original emblem (no real logos).
// Shirts = one painted white shirt multiplied with the club's kit colours (stripes/hoops/halves/sleeves).
'use strict';
const Art = (() => {
  const FRAMES = ['crown', 'star', 'pointed', 'round', 'winged', 'crown2'];
  const EMBLEMS = ['lion', 'wings', 'tower', 'ship', 'star', 'crown', 'tree', 'horse', 'wolf', 'rose', 'anchor', 'bull', 'stag', 'ball', 'owl', 'fox', 'bee', 'dragon', 'keys'];
  const PATTERNS = ['plain', 'halves', 'stripes', 'plain', 'quarters', 'sash', 'plain', 'chevron'];
  const img = {}, cache = {};
  let ready = false;
  const load = (k, src) => new Promise(res => { const i = new Image(); i.onload = () => { img[k] = i; res(); }; i.onerror = () => res(); i.src = src; });
  function preload() {
    const jobs = [load('shirt', 'assets/art/shirt.png')];
    for (const f of FRAMES) { jobs.push(load('rim_' + f, `assets/art/crest_${f}_rim.png`), load('mask_' + f, `assets/art/crest_${f}_mask.png`)); }
    for (const e of EMBLEMS) jobs.push(load('em_' + e, `assets/art/em_${e}.png`));
    return Promise.all(jobs).then(() => { ready = true; });
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function lum(hex) { const v = parseInt((hex || '#888').replace('#', ''), 16); return (.2126 * (v >> 16 & 255) + .7152 * (v >> 8 & 255) + .0722 * (v & 255)) / 255; }
  const inkOn = c => lum(c) > .55 ? '#111111' : '#ffffff';

  function paintPattern(ctx, W, H, pat, a, b) {
    ctx.fillStyle = a; ctx.fillRect(0, 0, W, H); ctx.fillStyle = b;
    if (pat === 'halves') ctx.fillRect(W / 2, 0, W / 2, H);
    if (pat === 'stripes') for (let x = W / 9; x < W; x += W * 2 / 9) ctx.fillRect(x, 0, W / 9, H);
    if (pat === 'hoops') for (let y = H / 8; y < H; y += H / 4) ctx.fillRect(0, y, W, H / 8);
    if (pat === 'quarters') { ctx.fillRect(W / 2, 0, W / 2, H / 2); ctx.fillRect(0, H / 2, W / 2, H / 2); }
    if (pat === 'sash') { ctx.beginPath(); ctx.moveTo(0, H * .15); ctx.lineTo(W * .2, 0); ctx.lineTo(W, H * .8); ctx.lineTo(W, H); ctx.lineTo(W * .85, H); ctx.closePath(); ctx.fill(); }
    if (pat === 'chevron') { ctx.beginPath(); ctx.moveTo(0, H * .3); ctx.lineTo(W / 2, H * .55); ctx.lineTo(W, H * .3); ctx.lineTo(W, H * .45); ctx.lineTo(W / 2, H * .7); ctx.lineTo(0, H * .45); ctx.closePath(); ctx.fill(); }
  }
  function crestURL(c) {
    if (cache['c' + c.id]) return cache['c' + c.id];
    const h = hash(c.id), f = FRAMES[h % FRAMES.length], rim = img['rim_' + f], mask = img['mask_' + f];
    if (!ready || !rim || !mask) return null;
    const W = rim.width, H = rim.height, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const [a, b] = c.kit, pat = PATTERNS[(h >>> 4) % PATTERNS.length];
    paintPattern(ctx, W, H, pat, a, b);
    // soft lighting over the field
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // emblem: white (or the second colour on plain light fields), centred in the mask's box
    const em = img['em_' + EMBLEMS[(h >>> 9) % EMBLEMS.length]];
    if (em) {
      const box = maskBox(f, mask), s = Math.min(box.w * .6 / em.width, box.h * .58 / em.height), ew = em.width * s, eh = em.height * s;
      const col = pat === 'plain' && lum(a) > .7 ? b : (pat === 'plain' ? (lum(b) > .3 ? b : '#ffffff') : '#ffffff');
      const ec = document.createElement('canvas'); ec.width = Math.ceil(ew); ec.height = Math.ceil(eh); const ex = ec.getContext('2d');
      ex.drawImage(em, 0, 0, ew, eh); ex.globalCompositeOperation = 'source-in'; ex.fillStyle = col; ex.fillRect(0, 0, ew, eh);
      const x = box.x + (box.w - ew) / 2, y = box.y + (box.h - eh) / 2;
      ctx.globalAlpha = .45; ctx.filter = 'blur(2px)'; ctx.drawImage(ec, x + 3, y + 4); ctx.filter = 'none'; ctx.globalAlpha = 1;
      if (col === '#ffffff' || lum(col) > .8) { ctx.globalAlpha = .9; } ctx.drawImage(ec, x, y); ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0); ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(rim, 0, 0);
    return (cache['c' + c.id] = cv.toDataURL('image/png'));
  }
  const boxes = {};
  function maskBox(f, mask) {
    if (boxes[f]) return boxes[f];
    const cv = document.createElement('canvas'); cv.width = mask.width; cv.height = mask.height; const x = cv.getContext('2d'); x.drawImage(mask, 0, 0);
    const d = x.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
    for (let y = 0; y < cv.height; y += 2) for (let i = 0; i < cv.width; i += 2) if (d[(y * cv.width + i) * 4 + 3] > 128) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return (boxes[f] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  function shirtURL(kit, pattern) {
    const key = 's' + kit.join() + pattern; if (cache[key]) return cache[key];
    const s = img.shirt; if (!ready || !s) return null;
    const W = s.width, H = s.height, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    if (pattern === 'sleeves') { ctx.fillStyle = kit[1] || '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = kit[0]; ctx.fillRect(W * .25, 0, W * .5, H); }
    else paintPattern(ctx, W, H, pattern || 'plain', kit[0], kit[1]);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(s, 0, 0);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(s, 0, 0);
    return (cache[key] = cv.toDataURL('image/png'));
  }

  // ---------- public helpers returning HTML ----------
  const crest = c => { const u = crestURL(c); return u ? `<img class="crest-img" src="${u}" alt="">` : fallbackCrest(c); };
  function shirt(kit, num, opts) {
    opts = opts || {}; const pattern = opts.gk ? 'plain' : (opts.pattern || 'plain'), k = opts.gk ? DATA.gkKit : kit, u = shirtURL(k, pattern);
    const ink = pattern === 'plain' || pattern === 'sleeves' ? inkOn(k[0]) : (lum(k[0]) > .5 ? '#111' : '#fff');
    return `<span class="shirt-sp">${u ? `<img src="${u}" alt="">` : ''}${num != null ? `<b style="color:${ink}">${num}</b>` : ''}</span>`;
  }
  const kitPattern = clubId => DATA.kitPattern[clubId] || 'plain';
  function fallbackCrest(c) { return `<svg viewBox="0 0 100 116" width="100%" height="100%"><path d="M50 4 L92 14 V52 C92 80 72 98 50 112 C28 98 8 80 8 52 V14 Z" fill="${c.kit[0]}" stroke="#e7c25a" stroke-width="5"/></svg>`; }
  const trophy = kind => `<img class="trophy-img" src="assets/art/${kind === 'promotion' ? 'trophy_medal' : kind === 'cup' ? 'trophy_cup' : 'trophy_league'}.png" alt="">`;
  const ball = () => `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="M20 11l7 5-3 8h-8l-3-8z" fill="#111"/><path d="M20 11V3M27 16l7-3M24 24l5 7M16 24l-5 7M13 16l-7-3" stroke="#111" stroke-width="1.5"/></svg>`;
  function badge(name, kit) {
    const ini = (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<svg viewBox="0 0 60 60" aria-hidden="true"><defs><linearGradient id="mbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dc8a"/><stop offset=".5" stop-color="#d4a73a"/><stop offset="1" stop-color="#8c6a1c"/></linearGradient></defs><circle cx="30" cy="30" r="28" fill="#0f2419" stroke="url(#mbg)" stroke-width="3"/><text x="30" y="39" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-weight="700" font-size="24" fill="#e7c25a">${ini}</text></svg>`;
  }
  const stadiumImg = cap => 'assets/art/' + (cap >= 55000 ? 'st_giant' : cap >= 38000 ? 'st_large' : cap >= 25000 ? 'st_mid' : cap >= 15000 ? 'st_compact' : cap >= 7000 ? 'st_small' : 'st_nonleague') + '.webp';
  const accentOf = () => '#e7c25a';
  // away kit when the colours clash: try the club's second colour, then white, then near-black
  const rgb = h => { const v = parseInt((h || '#888').replace('#', ''), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  function awayKit(home, away) {
    if (dist(home[0], away[0]) > 120) return away;
    if (dist(home[0], away[1]) > 120) return [away[1], away[0]];
    return dist(home[0], '#f4f4f4') > 140 ? ['#f4f4f4', away[0]] : ['#1d1d1f', away[1] === '#1d1d1f' ? '#e7c25a' : away[1]];
  }
  return { awayKit, preload, crest, crestURL, shirt, shirtURL, kitPattern, trophy, ball, badge, stadiumImg, inkOn, lum, accentOf };
})();
