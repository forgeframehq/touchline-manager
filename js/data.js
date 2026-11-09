// Touchline Manager — every rule and number lives here. Tuning is a data change, not a code change.
// Clubs, players and names are fictional. Kit colours are a dye pass over one base sprite (CIV_LOOK trick).
'use strict';
const DATA = {
  version: 1,
  saveKey: 'tlm.career.v1',
  prefsKey: 'tlm.prefs.v1',

  // ---------- Season ----------
  season: {
    teams: 12,              // one division to start; promotion/relegation later
    rounds: 2,              // home and away → 22 match weeks
    pointsWin: 3, pointsDraw: 1,
    squadSize: 20,
    startingXI: 11, subsOnBench: 5, subsAllowed: 3,
    matchMinutes: 90, addedTime: [1, 5],
    weekBudgetWage: true,   // wages paid every match week
  },

  // ---------- Positions ----------
  // key attribute weights per position (sum ≈ 1). Rating = Σ attr × weight.
  positions: {
    GK: { name: 'Goalkeeper', weights: { handling: .45, reflexes: .35, positioning: .2 } },
    DF: { name: 'Defender',   weights: { tackling: .35, heading: .2, positioning: .25, pace: .1, passing: .1 } },
    MF: { name: 'Midfielder', weights: { passing: .35, vision: .25, stamina: .15, tackling: .15, shooting: .1 } },
    FW: { name: 'Forward',    weights: { shooting: .4, pace: .25, dribbling: .2, heading: .15 } },
  },
  attributes: ['pace', 'passing', 'shooting', 'dribbling', 'heading', 'tackling', 'positioning', 'vision', 'stamina', 'handling', 'reflexes'],

  // ---------- Formations and tactics ----------
  formations: {
    '4-4-2': { DF: 4, MF: 4, FW: 2, balance: 0 },
    '4-3-3': { DF: 4, MF: 3, FW: 3, balance: +1 },   // + = attacking
    '5-3-2': { DF: 5, MF: 3, FW: 2, balance: -1 },
    '3-5-2': { DF: 3, MF: 5, FW: 2, balance: 0 },
    '4-2-3-1': { DF: 4, MF: 5, FW: 1, balance: 0 },
  },
  mentality: {   // multipliers applied to chance creation / chance conceded
    defensive: { create: .8, concede: .75, label: 'Defensive' },
    balanced:  { create: 1, concede: 1, label: 'Balanced' },
    attacking: { create: 1.25, concede: 1.3, label: 'Attacking' },
  },
  styles: {      // which attributes matter most in build-up
    possession: { passing: 1.3, vision: 1.2, pace: .8, label: 'Possession' },
    direct:     { heading: 1.3, pace: 1.2, passing: .8, label: 'Direct' },
    counter:    { pace: 1.4, dribbling: 1.1, stamina: 1.1, label: 'Counter' },
  },

  // ---------- Match engine numbers ----------
  match: {
    baseChancesPerTeam: 11,      // expected shots per 90 at even strength
    homeAdvantage: 1.08,
    strengthExponent: 1.0,       // how much a rating gap tilts chances
    goalFromChance: 0.10,        // base conversion, scaled by FW shooting vs GK rating
    gkSaveWeight: 0.5,
    fatiguePerMinute: 0.35,      // stamina drain, recovered between weeks
    injuryChancePerMatch: 0.035,
    injuryWeeks: [1, 6],
    cardChancePerFoul: 0.18, foulsPerTeam: 11,
    moraleWin: +6, moraleDraw: +1, moraleLoss: -5, moraleClamp: [20, 100],
  },

  // ---------- Finances (in £k) ----------
  finance: {
    ticketPrice: 25,                      // £ per seat, attendance = stadium × form factor
    attendanceBase: .72, attendanceWinBonus: .03, attendanceCap: 1,
    sponsorPerWeek: { 1: 200, 2: 160, 3: 140 },   // by club tier
    tvPerWeek: { 1: 260, 2: 200, 3: 170 },
    wagePerRating: 0.09, wageExponent: 3, // weekly wage (£k) ≈ rating^wageExponent × wagePerRating / 1000
    transferValuePerRating: 38,           // value ≈ rating^2.4 × this / 1000, × age curve
    boardPatienceStart: 60, boardPatienceClamp: [0, 100],
  },

  // ---------- Player generation ----------
  gen: {
    ageRange: [17, 35],
    peakAge: [26, 30],
    youthGrowth: [2, 5],       // rating pts per season under 23
    declineFrom: 31, declinePerYear: [1, 3],
    // rating range of generated squads by club tier (overall 1–99)
    tierRating: { 1: [66, 82], 2: [58, 74], 3: [50, 66] },
    starPerSquad: { 1: 2, 2: 1, 3: 0 },  // players +6 above range
    squadShape: { GK: 2, DF: 7, MF: 7, FW: 4 },
    firstNames: ['Arlo','Bram','Cato','Dax','Eli','Finn','Gus','Hal','Ivo','Jude','Kai','Leo','Milo','Nico','Otto','Pim','Quin','Rafe','Sol','Tam','Ulf','Vik','Wes','Zane','Ade','Bode','Cyr','Dane','Emeka','Fidel','Gino','Idris','Jaro','Kemal','Lars','Matteo','Nuno','Oren','Pavel','Rune','Sven','Tariq','Yusuf'],
    lastNames: ['Ashby','Brook','Calder','Dunmore','Elder','Fenwick','Garrow','Hale','Irwin','Jarvis','Kerr','Lowry','Marsh','Noble','Oakes','Pryce','Quayle','Rowe','Stroud','Thorne','Usher','Vance','Weir','Yates','Adeyemi','Baptiste','Costa','Dvorak','Ekwueme','Farah','Giraud','Haddad','Ivanic','Juric','Kovac','Lindqvist','Moreau','Nilsen','Okafor','Petrov','Ramos','Sato','Toure'],
  },

  // ---------- Clubs (fictional; crests to be painted via Kie, regionally grounded) ----------
  // kit: [primary, secondary] hex used as the dye pass; tier sets squad quality and money.
  clubs: [
    { id: 'harbor',   name: 'Harbor Town FC',       short: 'HAR', city: 'Harbor Town',  tier: 1, stadium: 42000, kit: ['#1d4e89', '#ffffff'], founded: 1884, nick: 'The Mariners' },
    { id: 'ironvale', name: 'Ironvale United',      short: 'IRV', city: 'Ironvale',     tier: 1, stadium: 51000, kit: ['#b3202b', '#f2f2f2'], founded: 1878, nick: 'The Forge' },
    { id: 'northgate',name: 'Northgate Athletic',   short: 'NGA', city: 'Northgate',    tier: 1, stadium: 38000, kit: ['#111111', '#f0e6b0'], founded: 1892, nick: 'The Gatesmen' },
    { id: 'kings',    name: 'Kingsbridge City',     short: 'KBC', city: 'Kingsbridge',  tier: 1, stadium: 60000, kit: ['#6ab0e3', '#ffffff'], founded: 1880, nick: 'The Royals' },
    { id: 'saltmere', name: 'Saltmere Rovers',      short: 'SAL', city: 'Saltmere',     tier: 2, stadium: 27000, kit: ['#2e8b57', '#ffffff'], founded: 1901, nick: 'The Gulls' },
    { id: 'ashford',  name: 'Ashford Wanderers',    short: 'ASH', city: 'Ashford',      tier: 2, stadium: 24000, kit: ['#f4c20d', '#1a1a1a'], founded: 1896, nick: 'The Wasps' },
    { id: 'wexley',   name: 'Wexley Albion',        short: 'WEX', city: 'Wexley',       tier: 2, stadium: 22000, kit: ['#ffffff', '#1d4e89'], founded: 1899, nick: 'The Throstles' },
    { id: 'dunmoor',  name: 'Dunmoor Rangers',      short: 'DUN', city: 'Dunmoor',      tier: 2, stadium: 20000, kit: ['#4b2e83', '#f4c20d'], founded: 1905, nick: 'The Moormen' },
    { id: 'carrow',   name: 'Carrow Orient',        short: 'CAR', city: 'Carrow',       tier: 3, stadium: 14000, kit: ['#d2691e', '#ffffff'], founded: 1910, nick: 'The Orient' },
    { id: 'brightwater', name: 'Brightwater Celtic',short: 'BWC', city: 'Brightwater',  tier: 3, stadium: 12000, kit: ['#0b6623', '#ffffff'], founded: 1908, nick: 'The Hoops' },
    { id: 'stoneleigh', name: 'Stoneleigh Villa',   short: 'STV', city: 'Stoneleigh',   tier: 3, stadium: 11000, kit: ['#7b1e3a', '#9ad0ec'], founded: 1912, nick: 'The Villans' },
    { id: 'coralbay', name: 'Coral Bay Islanders',  short: 'CBI', city: 'Coral Bay',    tier: 3, stadium: 9000,  kit: ['#ff6f91', '#1a3a5a'], founded: 1920, nick: 'The Islanders' },
  ],

  // ---------- AI difficulty presets (judge pace on normal) ----------
  ai: {
    easy:   { ratingBonus: -3, tacticsIQ: .5, transferBudgetMul: .8 },
    normal: { ratingBonus: 0,  tacticsIQ: .8, transferBudgetMul: 1 },
    hard:   { ratingBonus: +3, tacticsIQ: 1,  transferBudgetMul: 1.3 },
  },

  // ---------- First-match tips (switch off after `tipsForMatches`) ----------
  tipsForMatches: 3,
  tips: [
    'Tap a player on the Squad tab to see their best position.',
    'Attacking mentality creates more chances but concedes more too.',
    'Wages come out every match week. Watch the Finance tab before buying.',
    'The board judges you on league position and money. Keep both healthy.',
  ],
};
if (typeof module !== 'undefined') module.exports = DATA;
