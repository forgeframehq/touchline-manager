// Match day: travel card, walk-out with line-ups and scout report, press conference, the live floodlit match
// (pause, tactics, substitutions, touchline shouts, half-time team talk), full-time with player of the match,
// season awards night, and the sacking screen with job offers.
'use strict';
(() => {
  const el = Nav.el, esc = Nav.esc, S = G.state;
  const short = c => c.short.replace(/\d/g, '');

  const kickOff = () => MatchUI.kickOff();

  // ================= Press conference =================
  Nav.define('press', p => {
    const car = S.career, b = el('div', 'press');
    b.className = 'stack grow'; b.style.justifyContent = 'flex-end';
    b.innerHTML = `<div class="journo"><small>${p.press.tag === 'derby' ? 'Derby week' : p.press.tag === 'slump' ? 'Under pressure' : p.press.tag === 'big' ? 'Big game' : 'Weekly press'}</small><b>“${esc(p.press.q)}”</b></div>`;
    const answers = el('div', 'answers');
    p.press.answers.forEach((a, i) => { const x = Nav.button({ label: a.text, go: () => {
      Sim.applyPress(car, a); car.pressWeek = car.season * 100 + car.week; G.save();
      const fx = [a.fans ? `Fans ${a.fans > 0 ? '+' : ''}${a.fans}` : '', a.morale ? `Morale ${a.morale > 0 ? '+' : ''}${a.morale}` : '', a.board ? `Board ${a.board > 0 ? '+' : ''}${a.board}` : ''].filter(Boolean).join(' · ');
      Nav.toast(fx || 'Noted.'); kickOff(); } }, 'ans'); x.style.setProperty('--d', i * 80 + 'ms'); answers.appendChild(x); });
    b.appendChild(answers);
    Sound.play('camera'); return { header: G.titleHeader('Press Conference', G.me().name, 'press'), body: b, bg: 'bg_press', back: { label: 'Skip', go: () => { car.pressWeek = car.season * 100 + car.week; kickOff(); } } };
  });

  // ================= Awards night (end of season) =================
  Nav.define('awards', p => {
    const car = S.career; if (!p.s) { p.s = Sim.endSeason(car); G.save(); G.checkAchievements({ season: p.s }); }
    const s = p.s, d = WORLD.divisions[s.myDiv], champ = G.club(s.champions[s.myDiv]), ts = s.topScorer[s.myDiv];
    const steps = ['champ', 'scorer', 'me', 'review'].concat(s.intake && s.intake.length ? ['youth'] : []), step = p.step || 0, b = el('div', 'cine'), last = step === steps.length - 1;
    b.style.setProperty('--bgimg', 'url(assets/art/bg_trophy.webp)');
    if (steps[step] === 'champ') { Sound.play('sting_trophy');
      b.innerHTML = `<div class="rays"></div><span class="trophyw">${Art.trophy('league')}</span><span class="crest" style="width:64px;height:72px;position:relative">${Art.crest(champ)}</span><div class="l1">${esc(d.name)} champions</div><div class="l2">${esc(champ.name)}</div>${champ.id === car.me ? '<div class="l3 gold">That’s you, boss!</div>' : ''}`; }
    if (steps[step] === 'scorer') { const pl = ts && car.players.find(x => x.id === ts.id); Sound.play('card');
      b.innerHTML = `<div class="rays"></div><span class="trophyw" style="width:110px;--sw:110px">${pl ? G.shirtOf(pl, null) : ''}</span><div class="l1">Golden Boot · ${esc(d.name)}</div>${ts ? `<div class="l2">${esc(ts.name)}</div><div class="l3">${ts.goals} goals · ${esc(G.club(ts.club).name)}</div>` : '<div class="l2">—</div>'}`; }
    if (steps[step] === 'me') { const up = s.promoted.includes(car.me), down = s.relegated.includes(car.me), r = s.record; Sound.play(up ? 'sting_trophy' : down ? 'groan' : 'applause');
      b.innerHTML = `<span class="crest big-crest">${Art.crest(G.me())}</span><div class="l1">Your season</div><div class="l2">${G.ord(s.myPos)} place</div>
        ${up ? '<div class="banner-up up">PROMOTED!</div>' : down ? '<div class="banner-up down">RELEGATED</div>' : ''}
        <div class="panel"><div class="tiles t3"><div class="tile"><span class="tv"><small>Record</small><b>${r.w}-${r.d}-${r.l}</b></span></div><div class="tile"><span class="tv"><small>Goals</small><b>${r.gf}:${r.ga}</b></span></div><div class="tile"><span class="tv"><small>Brief</small><b class="${s.beat ? 'good' : s.missed ? 'bad' : ''}">${s.beat ? 'Met' : s.missed ? 'Missed' : 'Close'}</b></span></div></div><p class="note center" style="margin:8px 0 0">${esc(s.brief)}${s.beat ? ` · +${DATA.coins.briefMet} coins` : ''}${s.intake && s.intake.length ? ` · ${s.intake.length} academy graduates joined` : ''}</p></div>`; }
    if (steps[step] === 'review') { const conf = Math.round(car.board.confidence); Sound.play(s.beat ? 'applause' : 'phone');
      b.innerHTML = `<div class="l1">Board review</div><div class="l2" style="font-size:34px">${s.beat ? 'Brief met' : s.missed ? 'Brief missed' : 'Close enough'}</div>
        <div class="panel"><div class="dl"><span>Board confidence</span><b>${conf}%</b></div><div class="dl"><span>Prize money</span><b>${G.money(s.prize || 0)}</b></div>${s.sponsorBonus ? `<div class="dl"><span>Sponsor bonus</span><b>${G.money(s.sponsorBonus)}</b></div>` : ''}<div class="dl"><span>Next season's brief</span><b>${esc(car.brief.text)}</b></div><div class="dl"><span>Transfer budget</span><b>${Sim.feeLabel(car.budget.transfer)}</b></div><div class="dl"><span>Manager reputation</span><b>${s.mgrRep || Sim.mgrRep(car)}</b></div></div>`; }
    if (steps[step] === 'youth') { const kids = s.intake.map(id => car.players.find(x => x.id === id)).filter(Boolean).sort((a, b) => b.pot - a.pot); Sound.play(s.wonderkid ? 'sting_signing' : 'card');
      b.innerHTML = `<div class="l1">Youth intake day</div><div class="l2" style="font-size:32px">${kids.length} graduates${s.wonderkid ? ' · a wonderkid!' : ''}</div><div class="panel">${kids.slice(0, 6).map(k => `<div class="dl"><span>${esc(k.name)} · ${k.pos} · ${k.age}</span><b class="${k.pot >= 85 ? 'gold' : ''}">Pot ${'★'.repeat(Math.max(1, Math.min(5, Math.round((k.pot - 55) / 7))))}</b></div>`).join('')}</div><p class="note center">They start in the reserves. Find them in Club › Academy.</p>`; }
    b.appendChild(Nav.button({ label: last ? 'Next season' : 'Next', icon: 'chevron', go: () => { if (last) { HubUI.H.tab = 'office'; Nav.reset(car.sacked ? 'sacked' : 'hub'); } else Nav.replace('awards', { s, step: step + 1 }); } }, 'btn big'));
    return { full: true, body: b, onBack: () => {} };
  });

  // ================= Sacked =================
  Nav.define('sacked', () => {
    const car = S.career, me = G.me(), offers = Sim.jobOffers(car); let sel = null;
    const b = el('div', 'stack grow'); b.style.justifyContent = 'flex-end'; Sound.play('sting_sacked');
    b.innerHTML = `<div class="sk" style="align-self:center">SACKED</div><p class="center">The ${esc(me.name)} board have run out of patience. Three clubs want to talk.</p>`;
    const list = el('div', 'stack');
    const draw = () => { list.innerHTML = ''; offers.forEach(c => { const x = el('button', 'offer' + (sel === c.id ? ' sel' : ''), `<span class="crest">${Art.crest(c)}</span><span class="who"><b>${esc(c.name)}</b><small>${esc(WORLD.divisions[c.div].name)} · Rep ${c.rep}</small><small>Brief: ${esc(Sim.brief(car, c.id).text)}</small></span>`); x.onclick = () => { sel = c.id; Sound.play('move'); draw(); }; list.appendChild(x); }); };
    draw(); b.appendChild(list);
    return { header: G.titleHeader('Career Over?', 'Not yet', 'exit'), body: b, bg: 'bg_board', back: false, onBack: () => {},
      action: { label: 'Accept job', hold: true, go: () => { if (!sel) { Nav.toast('Pick a club first'); return; } Sim.takeJob(car, sel); G.save(); Nav.reset('unveil'); } } };
  });
})();
