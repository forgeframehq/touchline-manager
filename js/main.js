// Wiring. Exposes window.TLM so Playwright tests and the balance harness can drive the game through its own API.
'use strict';
(() => {
  const $ = UI.$; let career = Save.load(); let tab = 'squad', quick = false;
  const toHub = t => { tab = t || tab; UI.hub(career, tab); UI.show('hub'); };

  if (career && career.version === DATA.version) { $('#btn-continue').disabled = false;
    const c = DATA.clubs.find(k => k.id === career.me); $('#continue-sub').textContent = (c ? c.name : '') + ' · Week ' + (career.week + 1); } else career = null;

  $('#btn-new').onclick = () => { UI.clubList(id => { career = Sim.newCareer((Date.now() & 0xffffffff) >>> 0, id, Save.prefs().difficulty); quick = false; Save.store(career); toHub('squad'); }); UI.show('pick'); };
  $('#btn-continue').onclick = () => { career = Save.load(); quick = false; toHub('squad'); };
  $('#btn-quick').onclick = () => { const seed = (Date.now() & 0xffffffff) >>> 0; career = Sim.newCareer(seed, DATA.clubs[seed % DATA.clubs.length].id); quick = true; playNext(false); };
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => UI.show(b.dataset.go));
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => toHub(b.dataset.tab));
  $('#btn-play').onclick = () => playNext(true);
  $('#btn-back-hub').onclick = () => { if (quick) { UI.show('title'); return; } toHub(career.week >= career.fixtures.length ? 'table' : tab); };

  function playNext(save) {
    const m = Sim.playWeek(career); if (!m) { toHub('table'); return; }
    if (save) Save.store(career);
    UI.match(career, m, () => UI.result(career, m));
  }

  // Test / automation API
  window.TLM = { DATA, Sim, Save, UI, get career() { return career; }, set career(c) { career = c; },
    newCareer(seed, club, diff) { career = Sim.newCareer(seed, club || DATA.clubs[0].id, diff); return career; },
    stepWeek() { return Sim.playWeek(career); }, table() { return Sim.table(career); }, show: UI.show, hub: toHub };
})();
