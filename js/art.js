// Drawn art: kit-dyed crests (stand-ins until painted crests), shirts, trophies, ball, manager badge, stadium.
'use strict';
const Art = (() => {
  const PATTERNS = ['halves', 'stripes', 'hoops', 'sash', 'chevron', 'quarters', 'plain'];
  let n = 0;
  const uid = p => p + (n++);
  function lum(hex) { const h = (hex || '#888').replace('#', ''), v = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); return (.2126 * (v >> 16 & 255) + .7152 * (v >> 8 & 255) + .0722 * (v & 255)) / 255; }
  function sat(hex) { const v = parseInt((hex || '#888').replace('#', ''), 16), r = v >> 16 & 255, g = v >> 8 & 255, b = v & 255; return (Math.max(r, g, b) - Math.min(r, g, b)) / 255; }
  const accentOf = kit => { const ok = c => sat(c) > .25 && lum(c) > .08 && lum(c) < .85; return ok(kit[0]) ? kit[0] : ok(kit[1]) ? kit[1] : lum(kit[0]) > .5 ? '#2f6fd6' : '#d9a520'; };
  const inkOn = c => lum(c) > .55 ? '#111111' : '#ffffff';
  function crest(c) {
    const pat = PATTERNS[Sim.hash(c.id) % PATTERNS.length], [a, b] = c.kit, id = uid('cr');
    const shield = 'M50 4 L92 14 V52 C92 80 72 98 50 112 C28 98 8 80 8 52 V14 Z';
    const fill = {
      halves: `<rect x="50" y="0" width="50" height="120" fill="${b}"/>`,
      stripes: [22, 50, 78].map(x => `<rect x="${x - 7}" y="0" width="14" height="120" fill="${b}"/>`).join(''),
      hoops: [30, 62, 94].map(y => `<rect x="0" y="${y - 8}" width="100" height="16" fill="${b}"/>`).join(''),
      sash: `<path d="M0 30 L30 0 L100 80 L100 110 Z" fill="${b}"/>`,
      chevron: `<path d="M0 40 L50 70 L100 40 L100 62 L50 92 L0 62 Z" fill="${b}"/>`,
      quarters: `<rect x="50" y="0" width="50" height="58" fill="${b}"/><rect x="0" y="58" width="50" height="62" fill="${b}"/>`,
      plain: `<rect x="0" y="86" width="100" height="40" fill="${b}"/>`,
    }[pat];
    return `<svg viewBox="0 0 100 116" width="100%" height="100%" aria-hidden="true"><defs><clipPath id="${id}"><path d="${shield}"/></clipPath>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
      <g clip-path="url(#${id})"><rect width="100" height="120" fill="${a}"/>${fill}<rect width="100" height="120" fill="url(#${id}s)"/></g>
      <path d="${shield}" fill="none" stroke="#f2f2f2" stroke-width="5"/><path d="${shield}" fill="none" stroke="#111" stroke-opacity=".35" stroke-width="1.5"/>
      <text x="50" y="66" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="30" fill="#fff" stroke="#111" stroke-width="3.5" paint-order="stroke">${c.short.replace(/\d/g, '')}</text></svg>`;
  }
  function shirt(kit, num) {
    return `<svg class="shirt" viewBox="0 0 64 64" aria-hidden="true"><path d="M22 6 L32 11 L42 6 L58 16 L52 28 L46 25 V58 H18 V25 L12 28 L6 16 Z" fill="${kit[0]}" stroke="rgba(0,0,0,.35)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M26 7 Q32 14 38 7" fill="none" stroke="${kit[1]}" stroke-width="3"/><path d="M6 16 L12 28 L18 25 M58 16 L52 28 L46 25" fill="none" stroke="${kit[1]}" stroke-width="2.5"/>
      ${num != null ? `<text x="32" y="45" text-anchor="middle" font-family="Bebas Neue, Impact" font-size="17" fill="${kit[1]}" stroke="rgba(0,0,0,.25)" stroke-width=".6">${num}</text>` : ''}</svg>`;
  }
  // trophy shapes: league title = big cup, promotion = plate/shield, play-off = small cup
  function trophy(kind, tier) {
    const id = uid('tr'), gold = tier <= 2 || kind === 'league';
    const g = `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${gold ? '#fff2b0' : '#f2f2f2'}"/><stop offset=".45" stop-color="${gold ? '#e3b23c' : '#b9c0c6'}"/><stop offset="1" stop-color="${gold ? '#8a6214' : '#6a737b'}"/></linearGradient>`;
    if (kind === 'promotion') return `<svg viewBox="0 0 80 100" aria-hidden="true"><defs>${g}</defs><circle cx="40" cy="44" r="30" fill="url(#${id})" stroke="#5a420e" stroke-width="2"/><circle cx="40" cy="44" r="21" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/><path d="M40 30l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="rgba(0,0,0,.25)"/><rect x="26" y="80" width="28" height="14" rx="2" fill="#3a2a16"/></svg>`;
    return `<svg viewBox="0 0 80 100" aria-hidden="true"><defs>${g}</defs>
      <path d="M20 8 H60 V30 C60 48 50 58 40 60 C30 58 20 48 20 30 Z" fill="url(#${id})" stroke="#5a420e" stroke-width="1.5"/>
      <path d="M20 14 C6 14 6 34 22 38 M60 14 C74 14 74 34 58 38" fill="none" stroke="url(#${id})" stroke-width="4"/>
      <rect x="36" y="60" width="8" height="14" fill="url(#${id})"/><rect x="26" y="74" width="28" height="7" rx="2" fill="url(#${id})"/><rect x="22" y="81" width="36" height="13" rx="2" fill="#3a2a16"/>
      <path d="M28 12 C28 30 32 44 38 52" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  const ball = () => `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="M20 11l7 5-3 8h-8l-3-8z" fill="#111"/><path d="M20 11V3M27 16l7-3M24 24l5 7M16 24l-5 7M13 16l-7-3" stroke="#111" stroke-width="1.5"/></svg>`;
  function badge(name, kit) {
    const ini = (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(), acc = accentOf(kit);
    return `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28" fill="${acc}" stroke="#fff" stroke-width="3"/><circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/><text x="30" y="39" text-anchor="middle" font-family="Bebas Neue, Impact" font-size="26" fill="${inkOn(acc)}">${ini}</text></svg>`;
  }
  return { crest, shirt, trophy, ball, badge, accentOf, inkOn, lum };
})();
