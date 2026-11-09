// Boot: start the console framework on the main menu. window.TLM is the test API for Playwright.
'use strict';
(() => {
  Nav.init({ quit: () => Nav.reset('title') });
  // paint crests and shirts from the sprite sheets before the first screen (falls back to drawn crests after 4 s)
  Promise.race([Art.preload(), new Promise(r => setTimeout(r, 4000))]).then(() => { Nav.reset(window.TLM_SKIP_INTRO ? 'title' : 'intro'); window.TLM_READY = true; });
  // keep the app silent in the background (Capacitor)
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (App && App.addListener) App.addListener('appStateChange', st => Sound.crowd(st.isActive ? .3 : 0));
  document.addEventListener('visibilitychange', () => Sound.crowd(document.hidden ? 0 : .3));
  window.TLM = { DATA, WORLD, Sim, Save, Nav, G,
    get career() { return G.state.career; },
    start(club, opts) { G.state.career = Sim.newCareer(opts && opts.seed || 7, club, Object.assign({ legends: true, name: 'Test Boss', nat: 'ENG' }, opts || {})); G.state.career.slot = 1; G.save(); HubUI.H.tab = 'office'; Nav.reset('hub'); },
    hubTab(t, sub) { HubUI.H.tab = t; if (sub) HubUI.H.sub[t] = sub; Nav.refresh(); },
    push(n, p) { Nav.push(n, p); },
  };
})();
