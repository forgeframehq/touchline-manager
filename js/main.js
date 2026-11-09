// Boot: start the console framework on the main menu. window.TLM is the test API for Playwright.
'use strict';
(() => {
  Nav.init({ quit: () => Nav.reset('title') });
  Nav.reset('title');
  // keep the app silent in the background (Capacitor)
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (App && App.addListener) App.addListener('appStateChange', st => Sound.crowd(st.isActive ? .3 : 0));
  document.addEventListener('visibilitychange', () => Sound.crowd(document.hidden ? 0 : .3));
  window.TLM = { DATA, WORLD, Sim, Save, Nav, G,
    get career() { return G.state.career; },
    start(club, opts) { G.state.career = Sim.newCareer(opts && opts.seed || 7, club, Object.assign({ legends: true, name: 'Test Boss', nat: 'ENG' }, opts || {})); G.state.career.slot = 1; G.save(); Nav.reset('hub'); },
    hubTab(t, sub) { HubUI.H.tab = t; if (sub) HubUI.H.sub[t] = sub; Nav.refresh(); },
  };
})();
