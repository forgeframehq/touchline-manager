// Wiring. Exposes window.TLM so Playwright tests can drive the game through its own API.
'use strict';
(() => {
  const $ = UI.$; let career = Save.load(); let tab = 'squad';
  if (career && career.version !== DATA.version) career = null;
  const save = () => Save.store(career);

  function refreshTitle() {
    const saved = Save.load(), ok = saved && saved.version === DATA.version;
    $('#btn-continue').disabled = !ok;
    if (ok) { const c = saved.clubs.find(k => k.id === saved.me); $('#continue-sub').textContent = (c ? c.name : '') + ' · ' + saved.season + '/' + String(saved.season + 1).slice(2) + ' · Week ' + (saved.week + 1); }
    UI.theme(null);
  }
  refreshTitle();

  const handlers = {
    go: t => toHub(t), save,
    player: p => UI.player(career, p, handlers),
    market: () => UI.market(career, handlers),
    sign: p => { if (Sim.sign(career, p.id)) { save(); UI.sheet(`<h2>Signed!</h2><div class="lines"><b>${p.name}</b> joins on £${p.wage}k a week.</div>`, [{ label: 'Great', go: () => UI.market(career, handlers) }]); } },
    release: p => { if (Sim.release(career, p.id)) { save(); toHub('squad'); } else UI.sheet('<h2>Not now</h2><div class="lines">You need at least ' + DATA.season.squadMin + ' players.</div>', [{ label: 'OK' }]); },
  };

  function toHub(t) { tab = t || tab; UI.hub(career, tab, handlers); UI.show('hub'); checkInbox(); }
  function checkInbox() {
    if (career.sacked) { UI.sacked(career, Sim.jobOffers(career), id => { Sim.takeJob(career, id); save(); toHub('squad'); }); return; }
    const msg = career.inbox.shift(); if (msg) { save(); UI.sheet(`<h2>${msg.kind === 'warning' ? 'Board meeting' : 'Message'}</h2><div class="lines">${msg.text}</div>`, [{ label: 'Understood' }]); }
  }

  $('#btn-new').onclick = () => { const state = { country: 'ENG', div: 'eng1', club: null }; UI.pick(state, (id, legends) => {
    career = Sim.newCareer((Date.now() & 0xffffffff) >>> 0, id, { legends, difficulty: Save.prefs().difficulty }); save(); toHub('squad'); }); UI.show('pick'); };
  $('#btn-continue').onclick = () => { career = Save.load(); toHub('squad'); };
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (b.dataset.go === 'title') refreshTitle(); UI.show(b.dataset.go); });
  document.querySelectorAll('[data-hub]').forEach(b => b.onclick = () => toHub());
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => toHub(b.dataset.tab));
  $('#btn-play').onclick = () => playNext();

  function playNext() {
    if (!Sim.myFixture(career)) { const s = Sim.endSeason(career); save(); UI.seasonEnd(career, s, () => toHub('squad')); return; }
    const before = career.board.confidence;
    let m = null; while (!m && Sim.myFixture(career)) m = Sim.playWeek(career);
    save();
    if (!m) { toHub('table'); return; }
    UI.match(career, m, () => UI.result(career, m, before, () => toHub(tab)));
  }

  window.TLM = { DATA, WORLD, Sim, Save, UI, get career() { return career; }, set career(c) { career = c; },
    newCareer(seed, club, legends) { career = Sim.newCareer(seed, club, { legends }); return career; }, hub: toHub };
})();
