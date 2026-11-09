// Save slots in localStorage. Saves are compact: player attributes are rebuilt on load (Sim.rebuild),
// so a whole-world career fits comfortably three times over. Every read/write is wrapped so blocked storage never breaks the game.
'use strict';
const Save = {
  key: n => DATA.saveKey + '.' + n,
  slots() { try { return JSON.parse(localStorage.getItem(DATA.slotsKey) || '{}'); } catch (e) { return {}; } },
  meta(career) {
    const c = career.clubs.find(k => k.id === career.me), pos = (typeof Sim !== 'undefined') ? Sim.position(career, career.me) : 0;
    let next = ''; try { const nx = Sim.nextMatch(career); if (nx) { const o = career.clubs.find(k => k.id === (nx.home ? nx.a : nx.h)); next = (o ? o.short.replace(/\d/g, '') : '') + (nx.home ? ' (H)' : ' (A)'); } } catch (e) {}
    return { club: c.id, name: c.name, kit: c.kit, short: c.short, div: c.div, season: career.season, week: career.week, pos, manager: career.manager.name, at: Date.now(), cap: c.capacity, next };
  },
  store(career) {
    if (!career || !career.slot) return false;
    try {
      const json = JSON.stringify(career, (k, v) => k === 'attr' ? undefined : v);
      localStorage.setItem(Save.key(career.slot), json);
      const s = Save.slots(); s[career.slot] = Save.meta(career); localStorage.setItem(DATA.slotsKey, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  },
  load(n) { try { const s = localStorage.getItem(Save.key(n)); if (!s) return null; const c = JSON.parse(s); return c.version === DATA.version ? c : null; } catch (e) { return null; } },
  remove(n) { try { localStorage.removeItem(Save.key(n)); const s = Save.slots(); delete s[n]; localStorage.setItem(DATA.slotsKey, JSON.stringify(s)); } catch (e) {} },
  latest() { const s = Save.slots(); let best = null; for (const n in s) if (!best || s[n].at > s[best].at) best = n; return best; },
  freeSlot() { const s = Save.slots(); for (let i = 1; i <= DATA.slotCount; i++) if (!s[i]) return i; return null; },
  prefs() { try { return Object.assign({ speed: 1, sfx: .8, crowd: .5, haptics: true, difficulty: 'normal', ach: {}, tutorial: false }, JSON.parse(localStorage.getItem(DATA.prefsKey) || '{}')); } catch (e) { return { speed: 1, sfx: .8, crowd: .5, haptics: true, difficulty: 'normal', ach: {} }; } },
  setPrefs(p) { try { localStorage.setItem(DATA.prefsKey, JSON.stringify(p)); } catch (e) {} },
};
