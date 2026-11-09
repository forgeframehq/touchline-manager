// Drawn flags (no emoji: Android has no England/Scotland/Wales flags). Simplified so they read at 16–60 px.
'use strict';
const Flags = (() => {
  const H = (...c) => ({ t: 'h', c }), V = (...c) => ({ t: 'v', c });
  const D = {
    ENG: { t: 'cross', bg: '#fff', fg: '#ce1124' }, SCO: { t: 'saltire', bg: '#005eb8', fg: '#fff' }, NIR: { t: 'cross', bg: '#fff', fg: '#c8102e', dot: '#c8102e' },
    WAL: { t: 'wales' }, IRL: V('#169b62', '#fff', '#ff883e'), ESP: { t: 'h3', c: ['#aa151b', '#f1bf00', '#aa151b'], w: [1, 2, 1] },
    FRA: V('#0055a4', '#fff', '#ef4135'), GER: H('#000', '#dd0000', '#ffce00'), ITA: V('#009246', '#fff', '#ce2b37'), POR: { t: 'h3v', c: ['#006600', '#ff0000'], w: [2, 3] },
    NED: H('#ae1c28', '#fff', '#21468b'), BEL: V('#000', '#fdda24', '#ef3340'), BRA: { t: 'diamond', bg: '#009c3b', fg: '#ffdf00', dot: '#002776' },
    ARG: H('#74acdf', '#fff', '#74acdf'), USA: { t: 'usa' }, MEX: V('#006847', '#fff', '#ce1126'), JPN: { t: 'disc', bg: '#fff', fg: '#bc002d' },
    KOR: { t: 'disc', bg: '#fff', fg: '#cd2e3a', fg2: '#0047a0' }, AUS: { t: 'canton', bg: '#012169', fg: '#fff' }, NGA: V('#008751', '#fff', '#008751'),
    GHA: H('#ce1126', '#fcd116', '#006b3f'), CIV: V('#f77f00', '#fff', '#009e60'), SEN: V('#00853f', '#fdef42', '#e31b23'), CMR: V('#007a5e', '#ce1126', '#fcd116'),
    MAR: { t: 'disc', bg: '#c1272d', fg: '#006233', small: true }, EGY: H('#ce1126', '#fff', '#000'), ALG: V('#006233', '#fff'), TUN: { t: 'disc', bg: '#e70013', fg: '#fff' },
    SWE: { t: 'nordic', bg: '#006aa7', fg: '#fecc00' }, NOR: { t: 'nordic', bg: '#ba0c2f', fg: '#fff', in: '#00205b' }, DEN: { t: 'nordic', bg: '#c60c30', fg: '#fff' },
    FIN: { t: 'nordic', bg: '#fff', fg: '#002f6c' }, ISL: { t: 'nordic', bg: '#02529c', fg: '#fff', in: '#dc1e35' },
    SUI: { t: 'swiss' }, AUT: H('#ed2939', '#fff', '#ed2939'), CRO: { t: 'h', c: ['#ff0000', '#fff', '#171796'], dot: '#ff0000' }, SRB: H('#c6363c', '#0c4076', '#fff'),
    POL: H('#fff', '#dc143c'), CZE: { t: 'tri', c: ['#fff', '#d7141a'], fg: '#11457e' }, SVK: H('#fff', '#0b4ea2', '#ee1c25'), SVN: H('#fff', '#005da4', '#ed1c24'),
    UKR: H('#0057b7', '#ffd700'), RUS: H('#fff', '#0039a6', '#d52b1e'), ROU: V('#002b7f', '#fcd116', '#ce1126'), HUN: H('#ce2939', '#fff', '#477050'),
    BUL: H('#fff', '#00966e', '#d62612'), GRE: { t: 'greece' }, TUR: { t: 'disc', bg: '#e30a17', fg: '#fff', small: true }, GEO: { t: 'cross', bg: '#fff', fg: '#ff0000' },
    BIH: { t: 'tri', c: ['#002395', '#002395'], fg: '#fecb00' }, ALB: { t: 'disc', bg: '#e41e20', fg: '#000', small: true }, ISR: { t: 'h', c: ['#fff', '#0038b8', '#fff'], w: [1, 4, 1] },
    URU: { t: 'stripes', c: ['#fff', '#0038a8'], n: 9 }, COL: { t: 'h3', c: ['#fcd116', '#003893', '#ce1126'], w: [2, 1, 1] }, ECU: { t: 'h3', c: ['#ffdd00', '#034ea2', '#ed1c24'], w: [2, 1, 1] },
    PAR: H('#d52b1e', '#fff', '#0038a8'), CHI: { t: 'chile' }, CAN: { t: 'canada' }, JAM: { t: 'saltire', bg: '#009b3a', fg: '#fed100' }, TRI: { t: 'sash', bg: '#ce1126', fg: '#000' },
    NZL: { t: 'canton', bg: '#012169', fg: '#fff' }, RSA: { t: 'tri', c: ['#de3831', '#002395'], fg: '#007a4d' }, MLI: V('#14b53a', '#fcd116', '#ce1126'), GUI: V('#ce1126', '#fcd116', '#009460'),
    BUR: H('#ef2b2d', '#009e49'), COD: { t: 'sash', bg: '#007fff', fg: '#ce1021' }, GAM: { t: 'h', c: ['#ce1126', '#fff', '#0c1c8c', '#fff', '#3a7728'], w: [6, 1, 4, 1, 6] },
    ZIM: H('#006400', '#ffd200', '#d40000', '#000', '#d40000', '#ffd200', '#006400'), MOZ: H('#007168', '#000', '#fce100'), HAI: H('#00209f', '#d21034'), LBR: { t: 'stripes', c: ['#bf0a30', '#fff'], n: 11 },
    TOG: { t: 'stripes', c: ['#006a4e', '#ffce00'], n: 5 }, UZB: H('#0099b5', '#fff', '#1eb53a'), KSA: { t: 'h', c: ['#006c35'] }, IND: { t: 'disc', bg: '#fff', fg: '#000080', small: true, bands: ['#ff9933', '#138808'] },
    CHN: { t: 'disc', bg: '#de2910', fg: '#ffde00', small: true, corner: true }, BER: { t: 'canton', bg: '#c8102e', fg: '#fff' },
  };
  const NAMES = { ENG: 'England', SCO: 'Scotland', WAL: 'Wales', NIR: 'Northern Ireland', IRL: 'Ireland', ESP: 'Spain', FRA: 'France', GER: 'Germany', ITA: 'Italy', POR: 'Portugal', NED: 'Netherlands', BEL: 'Belgium', BRA: 'Brazil', ARG: 'Argentina', USA: 'USA', MEX: 'Mexico', JPN: 'Japan', KOR: 'South Korea', AUS: 'Australia', NGA: 'Nigeria', GHA: 'Ghana', BER: 'Bermuda', TUR: 'Turkey', GRE: 'Greece', KSA: 'Saudi Arabia', IND: 'India', CHN: 'China' };
  let fid = 0;
  function svg(code, w, h) {
    const id = 'fc' + (fid++);
    w = w || 30; h = h || 20; const f = D[code]; const W = 30, Hh = 20; let s = '';
    const rect = (x, y, ww, hh, c) => `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${c}"/>`;
    if (!f) s = rect(0, 0, W, Hh, '#7a8a80') + `<text x="15" y="13.5" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="8" fill="#fff">${(code || '?').slice(0, 3)}</text>`;
    else if (f.t === 'h' || f.t === 'h3' || f.t === 'v') {
      const c = f.c, ws = f.w || c.map(() => 1), tot = ws.reduce((a, b) => a + b, 0); let o = 0;
      c.forEach((col, i) => { const sz = (f.t === 'v' ? W : Hh) * ws[i] / tot; s += f.t === 'v' ? rect(o, 0, sz + .2, Hh, col) : rect(0, o, W, sz + .2, col); o += sz; });
      if (f.dot) s += `<rect x="12" y="6" width="6" height="8" fill="${f.dot}" opacity=".9"/>`;
    }
    else if (f.t === 'h3v') s = rect(0, 0, 12, Hh, f.c[0]) + rect(12, 0, 18, Hh, f.c[1]) + `<circle cx="12" cy="10" r="4" fill="#ffcc29"/>`;
    else if (f.t === 'cross') s = rect(0, 0, W, Hh, f.bg) + rect(12.5, 0, 5, Hh, f.fg) + rect(0, 7.5, W, 5, f.fg);
    else if (f.t === 'nordic') s = rect(0, 0, W, Hh, f.bg) + rect(8, 0, 6, Hh, f.fg) + rect(0, 7, W, 6, f.fg) + (f.in ? rect(9.5, 0, 3, Hh, f.in) + rect(0, 8.5, W, 3, f.in) : '');
    else if (f.t === 'saltire') s = rect(0, 0, W, Hh, f.bg) + `<path d="M0 0L30 20M30 0L0 20" stroke="${f.fg}" stroke-width="4"/>`;
    else if (f.t === 'disc') s = (f.bands ? rect(0, 0, W, 7, f.bands[0]) + rect(0, 7, W, 6, f.bg) + rect(0, 13, W, 7, f.bands[1]) : rect(0, 0, W, Hh, f.bg)) + (f.corner ? `<circle cx="7" cy="6" r="3" fill="${f.fg}"/>` : `<circle cx="15" cy="10" r="${f.small ? 3.5 : 5.5}" fill="${f.fg}"/>`) + (f.fg2 ? `<path d="M9.5 10a5.5 5.5 0 0 0 11 0z" fill="${f.fg2}"/>` : '');
    else if (f.t === 'diamond') s = rect(0, 0, W, Hh, f.bg) + `<path d="M15 2L28 10L15 18L2 10Z" fill="${f.fg}"/><circle cx="15" cy="10" r="4.5" fill="${f.dot}"/>`;
    else if (f.t === 'usa') { for (let i = 0; i < 7; i++) s += rect(0, i * 20 / 7, W, 10 / 7, '#b22234'); s = rect(0, 0, W, Hh, '#fff') + s + rect(0, 0, 13, 10.8, '#3c3b6e'); }
    else if (f.t === 'canton') s = rect(0, 0, W, Hh, f.bg) + `<g><rect width="13" height="10" fill="#012169"/><path d="M0 0L13 10M13 0L0 10" stroke="#fff" stroke-width="2"/><path d="M6.5 0V10M0 5H13" stroke="#fff" stroke-width="3"/><path d="M6.5 0V10M0 5H13" stroke="#c8102e" stroke-width="1.5"/></g><circle cx="22" cy="12" r="1.6" fill="${f.fg}"/>`;
    else if (f.t === 'swiss') s = rect(0, 0, W, Hh, '#da291c') + rect(13, 4, 4, 12, '#fff') + rect(9, 8, 12, 4, '#fff');
    else if (f.t === 'wales') s = rect(0, 0, W, 10, '#fff') + rect(0, 10, W, 10, '#00b140') + `<path d="M8 13l4-5 4 2 4-3 2 4-3 3h-8z" fill="#c8102e"/>`;
    else if (f.t === 'greece') { for (let i = 0; i < 9; i++) s += rect(0, i * 20 / 9, W, 20 / 9 + .1, i % 2 ? '#fff' : '#0d5eaf'); s += rect(0, 0, 11, 11.2, '#0d5eaf') + rect(4.4, 0, 2.2, 11.2, '#fff') + rect(0, 4.5, 11, 2.2, '#fff'); }
    else if (f.t === 'stripes') { for (let i = 0; i < f.n; i++) s += rect(0, i * 20 / f.n, W, 20 / f.n + .1, f.c[i % 2]); if (code === 'URU') s += rect(0, 0, 11, 11, '#fff') + `<circle cx="5.5" cy="5.5" r="3" fill="#fcd116"/>`; if (code === 'LBR') s += rect(0, 0, 11, 11, '#002868'); }
    else if (f.t === 'tri') s = rect(0, 0, W, 10, f.c[0]) + rect(0, 10, W, 10, f.c[1]) + `<path d="M0 0L14 10L0 20Z" fill="${f.fg}"/>`;
    else if (f.t === 'sash') s = rect(0, 0, W, Hh, f.bg) + `<path d="M0 20L30 0" stroke="${f.fg}" stroke-width="6"/>`;
    else if (f.t === 'chile') s = rect(0, 0, W, 10, '#fff') + rect(0, 10, W, 10, '#d52b1e') + rect(0, 0, 10, 10, '#0039a6') + `<circle cx="5" cy="5" r="1.8" fill="#fff"/>`;
    else if (f.t === 'canada') s = rect(0, 0, W, Hh, '#fff') + rect(0, 0, 7.5, Hh, '#d52b1e') + rect(22.5, 0, 7.5, Hh, '#d52b1e') + `<path d="M15 4l1.5 3 2-1-1 4 2 0-4 4-4-4 2 0-1-4 2 1z" fill="#d52b1e"/>`;
    return `<svg class="flag" viewBox="0 0 30 20" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="${id}"><rect width="30" height="20" rx="2"/></clipPath></defs><g clip-path="url(#${id})">${s}</g><rect width="30" height="20" rx="2" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"/></svg>`;
  }
  return { svg, name: c => NAMES[c] || c, has: c => !!D[c] };
})();
