// The Touchline Manager logo, drawn as vector art to match the Forge Frame studio mark: a forged-gold laurel
// wreath around a dark metal shield with the painted trophy, heavy bevelled gold lettering, a ribbon plate,
// and an animated shine sweeping across the metal. Sharp at any size, no image generation needed.
'use strict';
const Logo = (() => {
  let n = 0;
  function svg(opts) {
    opts = opts || {}; const id = 'lg' + (++n), shine = opts.shine !== false, compact = !!opts.compact;
    const leaves = side => { let s = `<path d="M${200 + side * 18} 246 Q${200 + side * 120} 230 ${200 + side * 96} 70" fill="none" stroke="url(#${id}g)" stroke-width="3.5"/>`;
      for (let i = 0; i < 13; i++) { const t = i / 12, a = side < 0 ? 100 + t * 140 : 80 - t * 140, r = 96 + (i % 2) * 9, cx = 200 + Math.cos(a * Math.PI / 180) * r, cy = 158 + Math.sin(a * Math.PI / 180) * r;
        const rot = a + (side < 0 ? 90 : -90) + side * (i % 2 ? 28 : -18);
        s += `<path d="M0 0 C6 -6 16 -6 22 0 C16 6 6 6 0 0 Z" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(1)}) translate(-11 0)" fill="url(#${id}g)" stroke="#5a3a0c" stroke-width="1"/>`; } return s; };
    const shield = 'M200 62 L262 82 L262 150 C262 196 234 226 200 244 C166 226 138 196 138 150 L138 82 Z';
    return `<svg class="tlm-logo" viewBox="0 ${compact ? 40 : 30} 400 ${compact ? 330 : 370}" xmlns="http://www.w3.org/2000/svg" aria-label="Touchline Manager">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".28" stop-color="#f1c75a"/><stop offset=".55" stop-color="#b8821f"/><stop offset=".78" stop-color="#e9b94a"/><stop offset="1" stop-color="#7a4f12"/></linearGradient>
    <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8dc"/><stop offset=".35" stop-color="#f6d27a"/><stop offset=".52" stop-color="#c48a22"/><stop offset=".7" stop-color="#f0c55c"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>
    <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f3a"/><stop offset=".5" stop-color="#151a17"/><stop offset="1" stop-color="#2a2f2b"/></linearGradient>
    <radialGradient id="${id}glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d4a30"/><stop offset="1" stop-color="#0b2416"/></linearGradient>
    <linearGradient id="${id}sh" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      ${shine ? `<animateTransform attributeName="gradientTransform" type="translate" values="-500 0; 700 0; 700 0" keyTimes="0;.45;1" dur="4.5s" repeatCount="indefinite"/>` : ''}</linearGradient>
    <filter id="${id}ds" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity=".75"/></filter>
    <clipPath id="${id}clip"><path d="${shield}"/><text x="200" y="${compact ? 300 : 300}" text-anchor="middle" font-family="Cinzel, 'Playfair Display', Georgia, serif" font-weight="900" font-size="66" letter-spacing="1" textLength="326" lengthAdjust="spacingAndGlyphs">TOUCHLINE</text></clipPath>
  </defs>
  <ellipse cx="200" cy="160" rx="170" ry="130" fill="url(#${id}glow)"/>
  <g filter="url(#${id}ds)">
    ${leaves(-1)}${leaves(1)}
    <path d="${shield}" fill="url(#${id}m)" stroke="url(#${id}g)" stroke-width="7"/>
    <path d="M200 74 L252 91 L252 150 C252 189 228 214 200 230 C172 214 148 189 148 150 L148 91 Z" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="2"/>
    <path d="M200 74 L252 91" stroke="#fff6d0" stroke-opacity=".5" stroke-width="1.5"/>
    <image href="assets/art/trophy_league.png" x="158" y="84" width="84" height="132" preserveAspectRatio="xMidYMid meet"/>
    <g transform="translate(200 56)"><path d="M-14 0 L14 0 L10 -16 L4 -8 L0 -20 L-4 -8 L-10 -16 Z" fill="url(#${id}g)" stroke="#5a3a0c" stroke-width="1"/></g>
    <text x="200" y="300" text-anchor="middle" font-family="Cinzel, 'Playfair Display', Georgia, serif" font-weight="900" font-size="66" letter-spacing="1" textLength="326" lengthAdjust="spacingAndGlyphs" fill="#2a1a05" transform="translate(0 4)">TOUCHLINE</text>
    <text x="200" y="300" text-anchor="middle" font-family="Cinzel, 'Playfair Display', Georgia, serif" font-weight="900" font-size="66" letter-spacing="1" textLength="326" lengthAdjust="spacingAndGlyphs" fill="url(#${id}t)" stroke="#4a2d08" stroke-width="2.2" paint-order="stroke">TOUCHLINE</text>
    <text x="200" y="298.5" text-anchor="middle" font-family="Cinzel, 'Playfair Display', Georgia, serif" font-weight="900" font-size="66" letter-spacing="1" textLength="326" lengthAdjust="spacingAndGlyphs" fill="none" stroke="#fff8dc" stroke-opacity=".35" stroke-width=".8">TOUCHLINE</text>
    <path d="M92 318 L308 318 L326 332 L308 346 L92 346 L74 332 Z" fill="url(#${id}r)" stroke="url(#${id}g)" stroke-width="3"/>
    <path d="M74 332 L56 324 L64 332 L56 340 Z M326 332 L344 324 L336 332 L344 340 Z" fill="url(#${id}g)"/>
    <text x="200" y="339" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="19" letter-spacing="9" fill="url(#${id}g)">MANAGER</text>
  </g>
  ${shine ? `<g clip-path="url(#${id}clip)"><rect x="-200" y="40" width="300" height="320" fill="url(#${id}sh)" transform="skewX(-20)"/></g>` : ''}
</svg>`;
  }
  return { svg };
})();
