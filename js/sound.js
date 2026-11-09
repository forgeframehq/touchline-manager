// Sound and haptics. Everything is synthesised with WebAudio (no audio files yet; ElevenLabs effects can replace these later).
// Menu ticks, whistles, crowd ambience that swells on chances and roars on goals, a sting for big moments.
'use strict';
const Sound = (() => {
  let ctx = null, master = null, crowdGain = null, crowdSrc = null, crowdFilter = null, prefs = { sfx: .8, crowd: .5, haptics: true }, crowdLevel = 0;
  const now = () => ctx.currentTime;
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination); } catch (e) { ctx = null; }
  }
  function setPrefs(p) { prefs = p; if (crowdGain && ctx) crowdGain.gain.setTargetAtTime(crowdLevel * prefs.crowd * .22, now(), .3); }
  function env(g, t0, a, peak, d) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + a + d); }
  function tone(freq, dur, type, vol, delay, slide) {
    if (!ctx || !prefs.sfx) return; const t0 = now() + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    env(g, t0, .005, (vol || .2) * prefs.sfx, dur); o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + .05);
  }
  let noiseBuf = null;
  function noise() { if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function burst(dur, f0, f1, vol, q) {
    if (!ctx || !prefs.sfx) return; const t0 = now(), s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = q || 1.2; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime((vol || .3) * prefs.sfx, t0 + dur * .25); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(f).connect(g).connect(master); s.start(t0); s.stop(t0 + dur + .05);
  }
  function whistle(blasts) {
    if (!ctx || !prefs.sfx) return;
    const lens = blasts === 3 ? [.25, .25, .9] : blasts === 2 ? [.25, .6] : [.5];
    let t = now();
    for (const L of lens) {
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12 * prefs.sfx, t + .02); g.gain.setValueAtTime(.12 * prefs.sfx, t + L - .05); g.gain.linearRampToValueAtTime(0, t + L);
      o.connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + L + .05); lfo.stop(t + L + .05); t += L + .12;
    }
  }
  function crowd(level) {   // 0 = off, .4 = menus, 1 = match
    if (!ctx) return; crowdLevel = level;
    if (!crowdSrc) {
      crowdSrc = noise(); crowdFilter = ctx.createBiquadFilter(); crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 700; crowdFilter.Q.value = .6;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .13; lg.gain.value = 180; lfo.connect(lg).connect(crowdFilter.frequency); lfo.start();
      crowdGain = ctx.createGain(); crowdGain.gain.value = 0; crowdSrc.connect(crowdFilter).connect(crowdGain).connect(master); crowdSrc.start();
    }
    crowdGain.gain.setTargetAtTime(level * prefs.crowd * .22, now(), .6);
  }
  function swell(amount, dur) { if (!crowdGain || !ctx) return; const base = crowdLevel * prefs.crowd * .22, t = now(); crowdGain.gain.cancelScheduledValues(t); crowdGain.gain.setTargetAtTime(base * (1 + amount), t, .15); crowdGain.gain.setTargetAtTime(base, t + dur, .8); }
  const fx = {
    tick: () => tone(1500, .03, 'sine', .08),
    move: () => tone(900, .04, 'triangle', .1),
    select: () => { tone(660, .06, 'triangle', .14); tone(990, .08, 'triangle', .12, .05); },
    back: () => { tone(700, .06, 'triangle', .12); tone(470, .08, 'triangle', .1, .05); },
    confirm: () => { [523, 659, 784].forEach((f, i) => tone(f, .22, 'triangle', .12, i * .03)); },
    error: () => tone(160, .18, 'square', .08),
    flip: () => burst(.25, 600, 3000, .15, .8),
    sting: () => { [262, 330, 392, 523].forEach((f, i) => tone(f, .9, 'sawtooth', .05, i * .07)); [523, 659, 784].forEach(f => tone(f, 1.2, 'triangle', .08, .3)); burst(1.2, 400, 1400, .12, .6); },
    chance: () => swell(1.6, 1.2),
    goal: () => { swell(4, 3.5); burst(2.6, 500, 1100, .35, .5); tone(233, .7, 'sawtooth', .06, .1); tone(233, .9, 'sawtooth', .06, .9); },
    concede: () => { swell(-.5, 2); tone(196, .5, 'sine', .06); },
    whistle1: () => whistle(1), whistle2: () => whistle(2), whistle3: () => whistle(3),
    unlock: () => { tone(880, .1, 'triangle', .1); tone(1175, .12, 'triangle', .1, .08); tone(1568, .25, 'triangle', .12, .16); },
  };
  function play(name) { try { unlock(); fx[name] && fx[name](); } catch (e) {} }
  function buzz(ms) { try { if (prefs.haptics && navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }
  return { unlock, setPrefs, play, buzz, crowd, swell };
})();
