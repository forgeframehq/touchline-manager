// Touchline Manager — every rule and number lives here. Tuning is a data change, not a code change.
// Clubs, squads and legends live in js/packs/ (via js/world.js).
'use strict';
const DATA = {
  version: 2,
  saveKey: 'tlm.career.v2',
  prefsKey: 'tlm.prefs.v1',

  season: { pointsWin: 3, pointsDraw: 1, squadMin: 22, squadMax: 32, subsOnBench: 7, matchMinutes: 90, addedTime: [1, 6], startYear: 2026 },

  // detailed position → engine group, plus which attributes matter (for generating attributes from a rating)
  positions: {
    GK:  { grp: 'GK', name: 'Goalkeeper',          keys: ['handling', 'reflexes', 'positioning'] },
    CB:  { grp: 'DF', name: 'Centre-back',         keys: ['tackling', 'heading', 'positioning'] },
    LB:  { grp: 'DF', name: 'Left-back',           keys: ['tackling', 'pace', 'stamina', 'passing'] },
    RB:  { grp: 'DF', name: 'Right-back',          keys: ['tackling', 'pace', 'stamina', 'passing'] },
    CDM: { grp: 'MF', name: 'Defensive midfield',  keys: ['tackling', 'passing', 'stamina', 'positioning'] },
    CM:  { grp: 'MF', name: 'Central midfield',    keys: ['passing', 'vision', 'stamina', 'tackling'] },
    CAM: { grp: 'MF', name: 'Attacking midfield',  keys: ['passing', 'vision', 'dribbling', 'shooting'] },
    LM:  { grp: 'MF', name: 'Left midfield',       keys: ['pace', 'passing', 'dribbling', 'stamina'] },
    RM:  { grp: 'MF', name: 'Right midfield',      keys: ['pace', 'passing', 'dribbling', 'stamina'] },
    LW:  { grp: 'FW', name: 'Left wing',           keys: ['pace', 'dribbling', 'shooting', 'passing'] },
    RW:  { grp: 'FW', name: 'Right wing',          keys: ['pace', 'dribbling', 'shooting', 'passing'] },
    ST:  { grp: 'FW', name: 'Striker',             keys: ['shooting', 'heading', 'pace', 'dribbling'] },
  },
  groups: { GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' },
  attributes: ['pace', 'passing', 'shooting', 'dribbling', 'heading', 'tackling', 'positioning', 'vision', 'stamina', 'handling', 'reflexes'],

  formations: {
    '4-3-3':   { DF: 4, MF: 3, FW: 3, balance: +1 },
    '4-2-3-1': { DF: 4, MF: 5, FW: 1, balance: 0 },
    '4-4-2':   { DF: 4, MF: 4, FW: 2, balance: 0 },
    '3-5-2':   { DF: 3, MF: 5, FW: 2, balance: 0 },
    '5-3-2':   { DF: 5, MF: 3, FW: 2, balance: -1 },
  },
  mentality: {
    defensive: { create: .82, concede: .78, label: 'Defensive' },
    balanced:  { create: 1, concede: 1, label: 'Balanced' },
    attacking: { create: 1.22, concede: 1.25, label: 'Attacking' },
  },
  styles: {
    possession: { passing: 1.25, vision: 1.15, pace: .9, label: 'Possession' },
    direct:     { heading: 1.25, pace: 1.15, passing: .9, label: 'Direct' },
    counter:    { pace: 1.3, dribbling: 1.1, stamina: 1.1, label: 'Counter' },
  },

  match: {
    baseChancesPerTeam: 10,
    homeAdvantage: 1.1,
    strengthExponent: 2.2,     // ratings sit close together (70–90), so gaps must bite
    attackExponent: 1.2,
    goalFromChance: 0.115,
    finishExponent: 1.4,   // shooter vs keeper
    fatiguePerMinute: 0.32,
    injuryChancePerMatch: 0.03, injuryWeeks: [1, 6],
    moraleWin: +6, moraleDraw: +1, moraleLoss: -5, moraleClamp: [20, 100],
  },

  // money in £k
  finance: {
    wageBase: 1.5, wageGrowth: 0.165,     // weekly wage ≈ wageBase × e^((rating−55)×wageGrowth)
    valueBase: 0.05, valueGrowth: 0.19,   // transfer value (£m) ≈ valueBase × e^((rating−55)×valueGrowth) × age factor
    ticket: { 1: 45, 2: 28, 3: 22, 4: 20, 5: 15 },
    commercialTierMul: { 1: 1, 2: .25, 3: .08, 4: .04, 5: .02 },
    balanceMul: { 1: 15, 2: 3, 3: 1, 4: .7, 5: .4 },
    legendWageMul: 1.6, freeAgentWageMul: 1.1,
  },

  gen: { squadShape: { GK: 3, DF: 8, MF: 7, FW: 5 }, squadSize: 23, ageRange: [18, 34], abroadShare: .15,
    detailByGroup: { GK: ['GK'], DF: ['CB', 'CB', 'LB', 'RB'], MF: ['CDM', 'CM', 'CM', 'CAM', 'LM', 'RM'], FW: ['ST', 'ST', 'LW', 'RW'] } },

  growth: { youngUpTo: 23, youngGain: [1, 5], peakTo: 29, declineFrom: 31, decline: [1, 3], retireAge: 36, retireHardAge: 39 },

  legends: { repGap: 25, aiSignShare: .35, aiClubMinRep: 80, perClubMax: 2, weeklyAiChance: .025 },

  board: {
    start: 60, clamp: [0, 100], win: +2.5, draw: 0, loss: -3, positionWeight: .45, fromWeek: 6, warnAt: 25,
    seasonBeat: +15, seasonMiss: -25,
    // briefs by squad-strength rank within the division
    top: [
      { upTo: 2, text: 'Win the league', target: 1, warn: 3 },
      { upTo: 5, text: 'Finish in the top four', target: 4, warn: 6 },
      { upTo: 8, text: 'Qualify for Europe (top 7)', target: 7, warn: 10 },
      { upTo: 12, text: 'Finish in the top half', target: 10, warn: 13 },
      { upTo: 16, text: 'Stay well clear of relegation', target: 15, warn: 17 },
      { upTo: 99, text: 'Avoid relegation', target: 17, warn: 18 },
    ],
    lower: [
      { upTo: 3, text: 'Win promotion', target: 2, warn: 6 },
      { upTo: 8, text: 'Reach the play-offs', target: 6, warn: 10 },
      { upTo: 15, text: 'Finish mid-table', target: 12, warn: 18 },
      { upTo: 99, text: 'Avoid relegation', target: -4, warn: -3 },   // negative = places above the drop
    ],
    styles: ['possession', 'direct', 'counter'],
  },

  ai: {
    easy: { ratingBonus: -3 }, normal: { ratingBonus: 0 }, hard: { ratingBonus: +3 },
  },

  tipsForMatches: 3,
  tips: [
    'Gold edge on a sticker = in your starting XI.',
    'Attacking mentality creates more chances but concedes more too.',
    'The Club tab shows what the board expects and how patient they are.',
    'Free agents and legends live in the Market. Watch the wage bill.',
  ],
};
if (typeof module !== 'undefined') module.exports = DATA;
