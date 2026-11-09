#!/usr/bin/env python3
"""Touchline Manager visual audit.

Walks every screen of the web build in headless Chromium at phone sizes and checks the layout:
  clip     text cut off (ellipsis or hidden overflow) — reported with the full text
  overlap  two pieces of text drawn on top of each other
  offscr   something visible sticking outside the screen
  align    items in the same row (tabs, tiles, nav, toggles) not lined up (top or height differ)
  tap      buttons smaller than 34 px (hard to hit on a phone)
  scroll   a page area that would need scrolling (breaks the console rule)
Each screen is saved with red boxes and labels on every problem, plus one contact sheet per size
and report.json / report.txt.

Usage:  python3 tools/ui_audit.py [--sizes 360x640,412x860] [--out audit] [--only office,tactics]
Serves the repo itself on a free port; needs playwright + pillow (both preinstalled here).
"""
import argparse, json, os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CHECK_JS = r"""
() => {
  const issues = [], scr = document.querySelector('.scr.on'), vw = innerWidth, vh = innerHeight;
  const roots = [scr, ...document.querySelectorAll('.overlay.on .card')].filter(Boolean);
  const visible = e => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const inOverlay = !!document.querySelector('.overlay.on');
  const box = r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  const label = e => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase());
  const txt = e => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  // skip the dimmed screen behind an open card
  const scope = inOverlay ? [...document.querySelectorAll('.overlay.on .card')] : roots;
  const all = scope.flatMap(r => [r, ...r.querySelectorAll('*')]).filter(e => !(e instanceof SVGElement) && visible(e));
  // text leaves: elements with their own text node
  const leaves = all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest('svg'));

  // visible part of a rect after every clipping ancestor (overflow != visible)
  const clipRect = (e, r) => { let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom; for (let a = e; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.overflowX !== 'visible' || c.overflowY !== 'visible') { const q = a.getBoundingClientRect(); if (c.overflowX !== 'visible') { x0 = Math.max(x0, q.left); x1 = Math.min(x1, q.right); } if (c.overflowY !== 'visible') { y0 = Math.max(y0, q.top); y1 = Math.min(y1, q.bottom); } } } return { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0 }; };
  const textRects = e => { const rg = document.createRange(); rg.selectNodeContents(e); return [...rg.getClientRects()].filter(r => r.width > 2 && r.height > 2); };
  // 1 text cut off: 'trunc' = deliberate ellipsis (shown grey), 'clip' = text cut by a box edge
  for (const e of leaves) {
    if (e.closest('.feed')) continue;
    const rs = textRects(e); if (!rs.length) continue;
    const ell = getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
    let lost = 0; for (const r of rs) { const v = clipRect(e, r); lost = Math.max(lost, r.width - Math.max(0, v.width), r.height - Math.max(0, v.height)); }
    if (ell) issues.push({ kind: 'trunc', el: label(e), text: txt(e), box: box(e.getBoundingClientRect()) });
    else if (lost > 3 && !e.closest('.clamp2')) issues.push({ kind: 'clip', el: label(e), text: txt(e) + ` (${Math.round(lost)}px hidden)`, box: box(e.getBoundingClientRect()) });
  }
  // 2 overlapping text: only the parts actually visible
  const R = leaves.filter(e => !e.closest('.feed,.toast,.ach')).map(e => ({ e, rs: textRects(e).map(r => clipRect(e, r)).filter(r => r.width > 2 && r.height > 2) }));
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const a = R[i], b = R[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    let hit = null;
    for (const p of a.rs) for (const q of b.rs) { const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top); if (w > 3 && h > 3) hit = [Math.max(p.left, q.left), Math.max(p.top, q.top), w, h]; }
    if (hit) issues.push({ kind: 'overlap', el: label(a.e) + ' × ' + label(b.e), text: txt(a.e) + ' | ' + txt(b.e), box: hit.map(Math.round) });
  }
  // 3 off-screen
  for (const e of all) { if (e.closest('.toast,.ach,.rays,.travel') || e.classList.contains('rays')) continue; const r = e.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1) && r.width < vw * 1.5 && getComputedStyle(e).position !== 'fixed') { const par = e.parentElement && e.parentElement.getBoundingClientRect(); if (par && (par.right > vw + 1 || par.left < -1 || par.bottom > vh + 1)) continue; issues.push({ kind: 'offscr', el: label(e), text: txt(e), box: box(r) }); } }
  // 4 row alignment: direct children of row containers
  for (const row of scope.flatMap(r => [...r.querySelectorAll('.gtabs,.bnav,.tiles,.qtiles,.toggles,.facs,.seg,.boardrow,.vsrow,.topbar,.bar,.scout,.instr')])) {
    if (!visible(row)) continue;
    const kids = [...row.children].filter(visible); if (kids.length < 2) continue;
    const lines = {}; for (const k of kids) { const r = k.getBoundingClientRect(); const key = Math.round(r.top / 12); (lines[key] = lines[key] || []).push(r); }
    for (const rs of Object.values(lines)) { if (rs.length < 2) continue;
      const tops = rs.map(r => r.top), hs = rs.map(r => r.height), dt = Math.max(...tops) - Math.min(...tops), dh = Math.max(...hs) - Math.min(...hs);
      const centered = row.matches('.topbar,.bar,.vsrow,.scout') ; // these align on centre, not top
      const cs = rs.map(r => r.top + r.height / 2), dc = Math.max(...cs) - Math.min(...cs);
      if (centered ? dc > 3 : (dt > 2 || (dh > 3 && !row.matches('.bar')))) issues.push({ kind: 'align', el: label(row), text: centered ? `centres differ by ${Math.round(dc)}px` : `tops differ ${Math.round(dt)}px, heights differ ${Math.round(dh)}px`, box: box(row.getBoundingClientRect()) }); }
  }
  // 5 small tap targets
  for (const e of all.filter(e => e.matches('button,[role=button]'))) { const r = e.getBoundingClientRect(); if ((r.width < 26 || r.height < 26) && !e.closest('.bar5,.pp')) issues.push({ kind: 'tap', el: label(e), text: txt(e) || '(icon)', box: box(r) }); }
  // 6 scroll areas
  for (const e of all) { const c = getComputedStyle(e); if ((c.overflowY === 'auto' || c.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 2) issues.push({ kind: 'scroll', el: label(e), text: '', box: box(e.getBoundingClientRect()) }); }
  if (scr && scr.scrollWidth > scr.clientWidth + 1) issues.push({ kind: 'offscr', el: 'screen', text: 'sideways scroll', box: [0, 0, vw, vh] });
  // de-duplicate
  const seen = new Set(); return issues.filter(i => { const k = i.kind + i.box.join() ; if (seen.has(k)) return false; seen.add(k); return true; });
}
"""

COLORS = {'trunc': (150, 150, 150), 'clip': (255, 70, 70), 'overlap': (255, 0, 200), 'offscr': (255, 140, 0), 'align': (60, 170, 255), 'tap': (255, 230, 0), 'scroll': (160, 90, 255)}


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def annotate(path, issues, scale):
    im = Image.open(path).convert('RGB'); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 11 * scale)
    except Exception: f = ImageFont.load_default()
    for n, i in enumerate(issues, 1):
        x, y, w, h = [v * scale for v in i['box']]; c = COLORS[i['kind']]
        d.rectangle([x, y, x + w, y + h], outline=c, width=2 * scale)
        tag = f"{n}"; tw = d.textlength(tag, font=f)
        d.rectangle([x, y - 13 * scale, x + tw + 6 * scale, y], fill=c); d.text((x + 3 * scale, y - 13 * scale), tag, fill=(0, 0, 0), font=f)
    im.save(path)


def flows(pg, shot):
    """Drive the game through every screen; shot(name) audits whatever is showing."""
    def click(sel, i=0): pg.locator(sel).nth(i).click(); pg.wait_for_timeout(450)
    def ev(js, wait=550): pg.evaluate(js); pg.wait_for_timeout(wait)
    shot('title')
    click('.mi', 0); shot('nc_region'); click('.gtile', 0); shot('nc_country'); click('.gtile', 0); shot('nc_league')
    click('.lrow', 0); shot('nc_club'); click('.cg', 3); shot('nc_clubcard'); click('.card-btns .btn', 1); shot('nc_manager')
    pg.fill('.tinput', 'Sudhi'); click('.bb.act'); shot('nc_confirm'); click('.bb.act'); pg.wait_for_timeout(1700); shot('unveil')
    ev("TLM.G.setPrefs({tutorial:true}); const c=TLM.career; for(let i=0;i<5;i++) TLM.Sim.playWeek(c); TLM.G.save(); TLM.HubUI = HubUI; Nav.reset('hub')", 900)
    shot('office')
    for v in ['coach', 'general', 'condition', 'contract', 'stats', 'development']: ev(f"SquadUI.Q.view='{v}'; TLM.hubTab('squad')"); shot(f'squad_{v}')
    ev("SquadUI.Q.view='coach'; SquadUI.Q.pick='x3'; Nav.refresh()"); shot('squad_pick'); ev("SquadUI.Q.pick=null; SquadUI.Q.mode='select'; Nav.refresh()"); shot('squad_select'); ev("SquadUI.Q.mode=null; SquadUI.Q.strip='subs'; Nav.refresh()"); shot('squad_subs'); ev("SquadUI.Q.strip='xi'; Nav.refresh()")
    for sub in ['formation', 'instructions', 'opposition', 'setp']:
        ev(f"TacticsUI.T.sub='{sub}'; TLM.hubTab('tactics')"); shot(f'tactics_{sub}')
    for isub in ['op', 'tr']: ev(f"TacticsUI.T.sub='instructions'; TacticsUI.T.isub='{isub}'; TLM.hubTab('tactics')"); shot(f'tactics_instr_{isub}')
    ev("TacticsUI.T.sub='formation'; TLM.hubTab('tactics')"); click('.pp', 6); shot('tactics_role_card')
    click('.card-btns .btn', 0); pg.wait_for_timeout(400); shot('tactics_move_mode'); ev("TacticsUI.T.move=false; TacticsUI.T.sel=null; Nav.refresh()", 400)
    for sub in ['search', 'shortlist', 'offers', 'activity']: ev(f"MarketUI.M.sub='{sub}'; TLM.hubTab('market')"); shot(f'market_{sub}')
    ev("MarketUI.M.sub='search'; TLM.hubTab('market')"); click('.prow', 0); shot('player_target'); ev("Nav.backTo('hub')")
    ev("const p=TLM.career.players.find(x=>x.club&&x.club!==TLM.career.me&&TLM.Sim.knows(TLM.career,x)&&x.rating>70); Nav.push('bid',{id:p.id})", 700); shot('bid'); ev("Nav.backTo('hub')")
    ev("const p=TLM.career.players.find(x=>!x.club); Nav.push('terms',{id:p.id,fee:0})", 700); shot('terms'); ev("Nav.backTo('hub')")
    for s in ['overview', 'stadium', 'facilities', 'youth', 'finances']: ev(f"TLM.hubTab('club','{s}')"); shot(f'club_{s}')
    ev("TLM.hubTab('squad')"); click('.sqrow:not(.head)', 0); shot('player_own')
    ev("PlayerUI.P.tab='a1'; Nav.refresh()"); shot('player_mental'); ev("PlayerUI.P.tab='info'; Nav.refresh()"); shot('player_info'); ev("PlayerUI.P.tab='a0'")
    ev("const p=TLM.career.players.find(x=>x.club===TLM.career.me); Nav.push('contract',{id:p.id})", 700); shot('contract'); ev("Nav.backTo('hub')")
    ev("const p=TLM.career.players.find(x=>x.club&&x.club!==TLM.career.me&&!TLM.Sim.knows(TLM.career,x)); Nav.push('player',{id:p.id})", 700); shot('player_unknown'); ev("Nav.backTo('hub')")
    ev("TLM.hubTab('office')")
    for s in ['schedule', 'competitions', 'analyse', 'medical', 'inbox', 'profile', 'cabinet', 'achievements', 'settings', 'credits']:
        if s == 'competitions':
            for ct in ['fa', 'lc']: ev(f"Nav.push('competitions')"); ev(f"Nav.backTo('hub')", 300)
        ev(f"TLM.push('{s}')"); shot(s); ev("Nav.backTo('hub')", 400)
    click('.gearbtn'); shot('hub_menu'); ev("Nav.closeCard()", 400)
    ev("Nav.closeCard()", 400); click('.nextcard .btn'); pg.wait_for_timeout(1400); shot('prematch')
    ev("const fx=TLM.Sim.myFixture(TLM.career); Nav.push('press',{press:TLM.Sim.pressFor(TLM.career,fx)||{tag:'general',q:'How are you feeling about the game?',answers:[{text:'Confident.'},{text:'One game at a time.'},{text:'No comment.'}]}})", 800); shot('press')
    ev("Nav.back()", 500); ev("TLM.G.setPrefs({mode:'full', speed:2})"); click('.bb.act'); shot('mode_card'); click('.card-btns .btn', 1); pg.wait_for_timeout(700)
    if pg.locator('.journo').count(): click('.ans', 0); pg.wait_for_timeout(600)
    pg.wait_for_timeout(5000); ev("Nav.closeCard()", 300); shot('match')
    for i, nm in [(1, 'match_stats'), (2, 'match_ratings'), (3, 'match_lineups')]: click('.mtabs button', i); shot(nm)
    click('.mtabs button', 0)
    click('.bb.back'); shot('match_pause'); click('.mi', 2); shot('match_subs'); ev("Nav.closeCard()", 400)
    click('.bb.act'); shot('match_shout'); ev("Nav.closeCard()", 400)
    click('.bb.back'); click('.mi', 3); pg.wait_for_timeout(1800); shot('fulltime')
    for i, nm in [(1, 'fulltime_stats'), (2, 'fulltime_ratings'), (3, 'fulltime_analysis')]: click('.gtabs button', i); shot(nm)
    click('.gtabs button', 0)
    click('.bb.act'); pg.wait_for_timeout(600)
    ev("const c=TLM.career; while(TLM.Sim.myFixture(c)) TLM.Sim.playWeek(c); TLM.G.save(); TLM.hubTab('office')", 700); shot('office_season_end')
    ev("TLM.career.sacked=false; TLM.career.alert=null; Nav.closeCard(); Nav.backTo('hub')", 700)
    for ct in ['league', 'fa', 'lc']: ev("Nav.push('competitions')", 500); ev(f"document.querySelectorAll('.gtabs button')[{['league','fa','lc'].index(ct)}].click()", 500); shot(f'competitions_{ct}'); ev("Nav.backTo('hub')", 400)
    click('.nextcard .btn'); pg.wait_for_timeout(1000); shot('awards_champion'); click('.cine .btn'); shot('awards_boot'); click('.cine .btn'); shot('awards_you')
    click('.cine .btn'); pg.wait_for_timeout(700)
    ev("TLM.career.sacked=true; Nav.reset('sacked')", 900); shot('sacked')
    ev("TLM.career.sacked=false; Nav.reset('title')", 700); shot('title_continue'); click('.mi', 2); shot('load')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--sizes', default='360x640,412x860'); ap.add_argument('--out', default=os.path.join(ROOT, 'audit')); ap.add_argument('--only', default=''); ap.add_argument('--scale', type=int, default=1)
    a = ap.parse_args(); only = set(filter(None, a.only.split(','))); os.makedirs(a.out, exist_ok=True)
    port = free_port(); srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.8)
    report = {}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            for size in a.sizes.split(','):
                W, H = map(int, size.split('x')); pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=a.scale)
                errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                # hide transient popups so they don't mask the screen underneath
                pg.add_init_script("window.addEventListener('load',()=>{const s=document.createElement('style');s.textContent='.toast,.ach,#saving,.travel{display:none!important} *{animation-duration:0s!important;transition-duration:0s!important}';document.head.appendChild(s)})")
                pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_function('window.TLM_READY', timeout=20000); pg.wait_for_timeout(2300)
                shots = []; rep = report[size] = {'errors': errs, 'screens': {}}
                def shot(name):
                    if only and name not in only: return
                    pg.wait_for_timeout(450); path = os.path.join(a.out, f'{size}_{len(shots) + 1:02d}_{name}.png'); pg.screenshot(path=path)
                    iss = pg.evaluate(CHECK_JS); rep['screens'][name] = iss; annotate(path, iss, a.scale); shots.append(path)
                try: flows(pg, shot)
                except Exception as e: errs.append('flow stopped: ' + str(e).split('\n')[0])
                pg.close()
                if shots:   # contact sheet
                    ims = [Image.open(s) for s in shots]; w, h = ims[0].size; cols = 6; t = .5; tw, th = int(w * t), int(h * t); rows = (len(ims) + cols - 1) // cols
                    sh = Image.new('RGB', (cols * tw, rows * th), 'black'); [sh.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th)) for i, im in enumerate(ims)]; sh.save(os.path.join(a.out, f'sheet_{size}.png'))
            b.close()
    finally: srv.terminate()
    json.dump(report, open(os.path.join(a.out, 'report.json'), 'w'), indent=1)
    lines = []
    for size, r in report.items():
        n = sum(1 for v in r['screens'].values() for i in v if i['kind'] != 'trunc'); t = sum(1 for v in r['screens'].values() for i in v if i['kind'] == 'trunc'); lines.append(f'== {size}: {len(r["screens"])} screens, {n} problems, {t} ellipsis truncations, {len(r["errors"])} errors')
        for e in r['errors']: lines.append('  ERROR ' + e)
        for name, iss in r['screens'].items():
            if not iss: continue
            lines.append(f'  {name}')
            for k, i in enumerate(iss, 1): lines.append(f'    {k:>2} {i["kind"]:<7} {i["el"]}  {i["text"]}')
    open(os.path.join(a.out, 'report.txt'), 'w').write('\n'.join(lines)); print('\n'.join(lines))


if __name__ == '__main__': main()
