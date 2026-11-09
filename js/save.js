// Saves in localStorage under versioned keys (DATA.saveKey). Wrapped so a private window or blocked storage never breaks the game.
'use strict';
const Save = {
  load() { try { const s = localStorage.getItem(DATA.saveKey); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  store(career) { try { localStorage.setItem(DATA.saveKey, JSON.stringify(career)); return true; } catch (e) { return false; } },
  clear() { try { localStorage.removeItem(DATA.saveKey); } catch (e) {} },
  prefs() { try { return JSON.parse(localStorage.getItem(DATA.prefsKey) || '{}'); } catch (e) { return {}; } },
  setPrefs(p) { try { localStorage.setItem(DATA.prefsKey, JSON.stringify(p)); } catch (e) {} },
};
