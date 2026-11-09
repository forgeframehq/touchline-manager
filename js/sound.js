// Sound: real samples (ElevenLabs for match, crowd and stings; Kenney CC0 clicks + soft synth for the interface),
// decoded once with WebAudio, a random variant with a slight pitch change on every play. Two looping ambience beds.
// Haptics via navigator.vibrate.
'use strict';
const Sound = (() => {
  const BANK = { tap: 4, select: 3, back: 3, swipe: 3, card: 3, error: 2, hold: 2, toast: 2, coin: 3, ach: 2, stamp: 2, camera: 2, phone: 2,
    whistle1: 3, whistle2: 2, whistle3: 2, kick: 5, post: 2, net: 3, ooh: 4, goal: 4, groan: 3, applause: 2, boo: 2, chant: 3,
    sting_unveil: 2, sting_trophy: 1, sting_sacked: 1, sting_signing: 1, sting_deadline: 1, amb_stadium: 1, amb_menu: 1,
    vc_goal: 3, vc_save: 2, vc_post: 2, vc_chance: 2, vc_red: 2, vc_penalty: 1, vc_penmiss: 1, vc_var: 1, vc_nogoal: 1, vc_kickoff: 1, vc_ht: 1, vc_ft: 1, intro_light: 1, intro_slam: 1, intro_roar: 1 };
  const VOL = { vc_goal: 1.3, vc_save: 1.2, vc_post: 1.2, vc_chance: 1.1, vc_red: 1.2, vc_penalty: 1.2, vc_penmiss: 1.2, vc_var: 1.1, vc_nogoal: 1.2, vc_kickoff: 1.1, vc_ht: 1.1, vc_ft: 1.2, tap: .55, swipe: .6, card: .7, select: .75, back: .65, hold: .6, error: .7, toast: .7, kick: .8, chant: .7, ooh: .9, goal: 1, groan: .85 };
  let ctx = null, master = null, buf = {}, loading = false, prefs = { sfx: .8, crowd: .5, haptics: true };
  const beds = {};  // name -> {src, gain}
  let bedName = null, bedLevel = 0;
  // legacy names used around the game
  const ALIAS = { tick: 'tap', move: 'swipe', flip: 'card', confirm: 'select', unlock: 'ach', sting: 'sting_unveil', chance: 'ooh', concede: 'groan' };

  function unlock() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); } catch (e) { return; } }
    if (ctx.state === 'suspended') ctx.resume();
    if (!loading) { loading = true; loadAll(); }
  }
  function loadAll() {
    const order = ['tap', 'select', 'back', 'swipe', 'card', 'toast', 'amb_menu'].concat(Object.keys(BANK));
    const seen = new Set();
    (async () => { for (const k of order) { if (seen.has(k)) continue; seen.add(k); buf[k] = [];
      for (let i = 1; i <= BANK[k]; i++) { try { const r = await fetch(`assets/sound/${k}_${i}.mp3`); const ab = await r.arrayBuffer(); buf[k].push(await ctx.decodeAudioData(ab)); } catch (e) {} }
      if (k === bedName) startBed(bedName); } })();
  }
  function setPrefs(p) { prefs = p; if (mus && ctx) mus.gain.gain.setTargetAtTime((p.music == null ? .5 : p.music) * .55, ctx.currentTime, .3); for (const n in beds) beds[n].gain.gain.setTargetAtTime(n === bedName ? bedLevel * prefs.crowd : 0, ctx ? ctx.currentTime : 0, .4); }
  function play(name, opts) {
    try {
      unlock(); name = ALIAS[name] || name; if (!ctx || !prefs.sfx) return;
      const list = buf[name]; if (!list || !list.length) return;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = list[Math.floor(Math.random() * list.length)];
      src.playbackRate.value = (opts && opts.rate) || (name.startsWith('vc_') ? 1 : 1 + (Math.random() - .5) * .08);
      g.gain.value = prefs.sfx * (VOL[name] || .9) * ((opts && opts.vol) || 1);
      src.connect(g).connect(master); src.start();
    } catch (e) {}
  }
  function startBed(name) {
    if (!ctx || !buf[name] || !buf[name].length || beds[name]) return;
    const src = ctx.createBufferSource(), gain = ctx.createGain(); src.buffer = buf[name][0]; src.loop = true; gain.gain.value = 0;
    src.connect(gain).connect(master); src.start(); beds[name] = { src, gain };
  }
  // crowd(level): 0 = silent, ~.35 = menus (outside the stadium), >= .6 = match crowd
  function crowd(level) {
    unlock(); if (!ctx) return;
    const name = level >= .6 ? 'amb_stadium' : 'amb_menu'; bedName = level > 0 ? name : bedName; bedLevel = level;
    if (level > 0) startBed(name);
    for (const n in beds) beds[n].gain.gain.setTargetAtTime(level > 0 && n === name ? Math.min(1, level) * prefs.crowd * .9 : 0, ctx.currentTime, .6);
  }
  function swell(amount, dur) { const b = beds.amb_stadium; if (!b || !ctx) return; const base = bedLevel * prefs.crowd * .9, t = ctx.currentTime; b.gain.gain.cancelScheduledValues(t); b.gain.gain.setTargetAtTime(Math.max(0, base * (1 + amount * .4)), t, .15); b.gain.gain.setTargetAtTime(base, t + dur, .8); }
  // title / menu music: one looping track, faded in and out (prefs.music 0..1, prefs.track 1..3)
  let mus = null, musName = null; const musBuf = {};
  async function music(on) {
    try { unlock(); if (!ctx) return; const vol = prefs.music == null ? .5 : prefs.music, name = 'music_' + (prefs.track || 1);
      if (!on || !vol) { if (mus) { const m = mus; m.gain.gain.setTargetAtTime(0, ctx.currentTime, .5); setTimeout(() => { try { m.src.stop(); } catch (e) {} }, 2500); mus = null; musName = null; } return; }
      if (mus && musName === name) { mus.gain.gain.setTargetAtTime(vol * .55, ctx.currentTime, .4); return; }
      if (mus) music(false);
      musName = name;
      if (!musBuf[name]) { const r = await fetch(`assets/sound/${name}.mp3`); musBuf[name] = await ctx.decodeAudioData(await r.arrayBuffer()); }
      if (musName !== name) return;
      const src = ctx.createBufferSource(), gain = ctx.createGain(); src.buffer = musBuf[name]; src.loop = true; gain.gain.value = 0; src.connect(gain).connect(master); src.start();
      gain.gain.setTargetAtTime(vol * .55, ctx.currentTime, .8); mus = { src, gain };
    } catch (e) {}
  }
  function buzz(ms) { try { if (prefs.haptics && navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }
  return { unlock, setPrefs, play, buzz, crowd, swell, music };
})();
