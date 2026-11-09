// Touchline Manager — every rule and number lives here. Tuning is a data change, not a code change.
// Clubs, squads and legends live in js/packs/ (via js/world.js).
'use strict';
const DATA = {
  version: 3,
  saveKey: 'tlm.career.v3', slotsKey: 'tlm.slots.v3', slotCount: 3,
  prefsKey: 'tlm.prefs.v1',

  season: { pointsWin: 3, pointsDraw: 1, squadMin: 22, squadMax: 32, subsOnBench: 7, subsAllowed: 5, matchMinutes: 90, addedTime: [1, 6], startYear: 2026 },

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
    goalFromChance: 0.098,
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

  fans: { start: 60, win: 3, draw: 0, loss: -3, legendSigned: 6 },

  // touchline shouts: effect lasts `mins`, can't repeat for `cooldown` minutes
  shouts: {
    push:      { label: 'Push up!',       sub: 'More chances, more risk',     mins: 12, cooldown: 15, effect: { create: 1.3, concede: 1.25 } },
    calm:      { label: 'Calm it down',   sub: 'Slow it, keep the ball',      mins: 12, cooldown: 15, effect: { create: .8, concede: .7 } },
    stuck:     { label: 'Get stuck in!',  sub: 'Win it back, tires legs',     mins: 10, cooldown: 15, effect: { oppCreate: .8, tire: 1.6 } },
    encourage: { label: 'Encourage',      sub: 'Lift heads after a setback',  mins: 1,  cooldown: 25, effect: {}, morale: 8 },
  },

  // press conferences: tag picks when they happen (derby, big game, slump, routine every 4 weeks)
  press: [
    { tag: 'derby', q: 'It\'s derby week against {opp}. What does this one mean to you?', answers: [
      { text: 'Everything. The fans deserve a win and we\'ll give them one.', fans: 6, morale: 3, board: 0 },
      { text: 'Three points like any other. We stay calm.', fans: -2, morale: 2, board: 2 },
      { text: 'They should be worried about us, not the other way round.', fans: 8, morale: 5, board: -2 } ] },
    { tag: 'derby', q: '{opp} say they own this city. Your response?', answers: [
      { text: 'Talk is cheap. We\'ll answer on the pitch.', fans: 4, morale: 4, board: 1 },
      { text: 'They can say what they like. I respect them.', fans: -3, morale: 0, board: 2 },
      { text: 'Check the history books. This city is ours.', fans: 9, morale: 3, board: -3 } ] },
    { tag: 'big', q: '{opp} are favourites. Can {club} really get something?', answers: [
      { text: 'Absolutely. We fear nobody.', fans: 4, morale: 5, board: -1 },
      { text: 'It\'s a tough test. A point would be a good result.', fans: -1, morale: -1, board: 2 },
      { text: 'All the pressure is on them. We\'ll enjoy it.', fans: 2, morale: 3, board: 1 } ] },
    { tag: 'big', q: 'How do you stop a side like {opp}?', answers: [
      { text: 'Work harder than them for ninety minutes.', fans: 2, morale: 4, board: 1 },
      { text: 'I\'m not giving my plan away in here.', fans: 0, morale: 1, board: 1 },
      { text: 'We don\'t stop them. We make them stop us.', fans: 5, morale: 4, board: -2 } ] },
    { tag: 'slump', q: 'Three defeats in a row. Is your job under threat?', answers: [
      { text: 'I take full responsibility. We\'ll turn it around.', fans: 2, morale: 3, board: 3 },
      { text: 'The players know they\'ve let people down.', fans: 0, morale: -6, board: 2 },
      { text: 'Bad luck, nothing more. The performances were fine.', fans: -4, morale: 2, board: -3 } ] },
    { tag: 'slump', q: 'Fans were booing at the final whistle. Do they have a point?', answers: [
      { text: 'They pay their money. They\'re entitled to show it.', fans: 4, morale: 0, board: 1 },
      { text: 'We need them behind us, not against us.', fans: -3, morale: 2, board: 0 },
      { text: 'Give us a few weeks. They\'ll be singing again.', fans: 2, morale: 2, board: 1 } ] },
    { tag: 'general', q: 'How would you sum up the mood in the dressing room?', answers: [
      { text: 'Hungry. Everyone wants more.', fans: 2, morale: 3, board: 1 },
      { text: 'Focused. We take it one game at a time.', fans: 0, morale: 2, board: 2 },
      { text: 'Some players need to step up, and they know it.', fans: 1, morale: -4, board: 2 } ] },
    { tag: 'general', q: 'Are you happy with the squad you have?', answers: [
      { text: 'Very. I wouldn\'t swap any of them.', fans: 1, morale: 5, board: 0 },
      { text: 'We\'re always looking to improve.', fans: 2, morale: -2, board: 2 },
      { text: 'Ask me again when the board give me money.', fans: 3, morale: 0, board: -4 } ] },
    { tag: 'general', q: 'What are your targets for the rest of the season?', answers: [
      { text: 'Meet the board\'s brief, then see how far we can go.', fans: 0, morale: 1, board: 3 },
      { text: 'Silverware. Nothing less.', fans: 5, morale: 3, board: -1 },
      { text: 'Play football the fans are proud of.', fans: 4, morale: 2, board: 0 } ] },
  ],

  // achievements: global across careers, unlocked with a popup
  achievements: [
    { id: 'first_win', title: 'Off the Mark', desc: 'Win your first match' },
    { id: 'derby_win', title: 'Local Hero', desc: 'Win a derby' },
    { id: 'thrash', title: 'Demolition', desc: 'Win by five goals or more' },
    { id: 'comeback', title: 'Never Say Die', desc: 'Win after going two goals down' },
    { id: 'unbeaten10', title: 'Invincible Run', desc: 'Go ten league games unbeaten' },
    { id: 'legend1', title: 'Living Legend', desc: 'Sign a legend' },
    { id: 'legend5', title: 'Galácticos', desc: 'Sign five legends in one career' },
    { id: 'champions', title: 'Champions!', desc: 'Win a league title' },
    { id: 'promoted', title: 'Going Up', desc: 'Win promotion' },
    { id: 'nonleague_up', title: 'Out of the Non-League', desc: 'Win promotion from the National League' },
    { id: 'top_flight_title', title: 'Top of the Pyramid', desc: 'Win the Premier League' },
    { id: 'survive', title: 'Great Escape', desc: 'Survive a season the board feared relegation' },
    { id: 'games100', title: 'Centurion', desc: 'Manage 100 matches' },
    { id: 'board_love', title: 'Untouchable', desc: 'Reach 95 board confidence' },
    { id: 'fans_love', title: 'Cult Hero', desc: 'Reach 95 fan mood' },
  ],

  ai: {
    easy: { ratingBonus: -3 }, normal: { ratingBonus: 0 }, hard: { ratingBonus: +3 },
  },

  tipsForMatches: 3,
  tips: [
    'Tap Shout to change the game: Push up when chasing, Calm it down when ahead.',
    'Pause to make substitutions. Tired legs (low fitness) cost you late on.',
    'The Club tab shows what the board expects and how patient they are.',
    'Free agents and legends live in Club › Market. Watch the wage bill.',
  ],
  nations: ['ENG','SCO','WAL','NIR','IRL','ESP','FRA','GER','ITA','POR','NED','BEL','BRA','ARG','USA','MEX','JPN','KOR','AUS','NGA','GHA','BER'],
};
if (typeof module !== 'undefined') module.exports = DATA;
