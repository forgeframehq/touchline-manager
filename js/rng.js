// Seeded RNG. Every random number in the game comes from here so a career or match replays identically.
'use strict';
function RNG(seed) { this.s = (seed >>> 0) || 1; }
RNG.prototype.next = function () {           // mulberry32
  let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
RNG.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
RNG.prototype.chance = function (p) { return this.next() < p; };
RNG.prototype.fork = function (tag) {       // derive a child stream so one draw doesn't shift unrelated systems
  let h = this.s ^ 0x9E3779B9; for (let i = 0; i < tag.length; i++) h = Math.imul(h ^ tag.charCodeAt(i), 16777619);
  return new RNG(h >>> 0);
};
if (typeof module !== 'undefined') module.exports = RNG;
