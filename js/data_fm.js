// Touchline Manager — Football Manager depth: 1–20 attributes, the position grid, roles and duties,
// team / opposition instructions, set-piece routines, contracts, transfers, budgets and cups.
// Effects are small multipliers on the match engine: c = chances created, x = chances conceded,
// o = opponent chance creation, t = tiredness, k = keeps the ball (possession share).
'use strict';
Object.assign(DATA, {
  version: 5, saveKey: 'tlm.career.v5', slotsKey: 'tlm.slots.v5',

  // ---------- 1–20 attributes, derived from the engine's base attributes (+ a little noise per player) ----------
  fmAttr: {
    technical: { Corners: ['passing', 'vision'], Crossing: ['passing', 'dribbling'], Dribbling: ['dribbling'], Finishing: ['shooting'], 'First Touch': ['dribbling', 'passing'],
      'Free Kicks': ['shooting', 'passing'], Heading: ['heading'], 'Long Shots': ['shooting', 'vision'], Marking: ['tackling', 'positioning'], Passing: ['passing'],
      Penalties: ['shooting'], Tackling: ['tackling'], Technique: ['dribbling', 'passing', 'vision'] },
    mental: { Aggression: ['tackling', 'stamina'], Anticipation: ['positioning', 'vision'], Bravery: ['heading', 'tackling'], Composure: ['shooting', 'passing', 'positioning'],
      Concentration: ['positioning'], Decisions: ['vision', 'positioning'], Determination: ['stamina'], Flair: ['dribbling', 'vision'], Leadership: ['positioning'],
      'Off the Ball': ['positioning', 'pace'], Positioning: ['positioning', 'tackling'], Teamwork: ['passing', 'stamina'], Vision: ['vision'], 'Work Rate': ['stamina'] },
    physical: { Acceleration: ['pace'], Agility: ['dribbling', 'pace'], Balance: ['dribbling'], Jumping: ['heading'], 'Natural Fitness': ['stamina'],
      Pace: ['pace'], Stamina: ['stamina'], Strength: ['heading', 'tackling'] },
    goalkeeping: { 'Aerial Reach': ['handling'], 'Command of Area': ['handling', 'positioning'], Communication: ['positioning'], Handling: ['handling'], Kicking: ['passing'],
      'One on Ones': ['reflexes'], Reflexes: ['reflexes'], 'Rushing Out': ['reflexes', 'pace'], Throwing: ['passing'] },
  },
  personalities: ['Model Professional', 'Professional', 'Determined', 'Ambitious', 'Resolute', 'Balanced', 'Fairly Loyal', 'Driven', 'Spirited', 'Light-Hearted', 'Temperamental', 'Casual', 'Volatile'],
  squadStatus: ['Star Player', 'Key Player', 'First Team', 'Rotation', 'Backup', 'Hot Prospect', 'Youngster'],

  // ---------- the position grid (FM style): 6 rows × 5 lanes ----------
  // row 0 GK · 1 D · 2 DM/WB · 3 M · 4 AM · 5 ST ; lanes 0 left … 4 right
  grid: {
    rows: ['GK', 'D', 'DM', 'M', 'AM', 'ST'],
    code(r, c) { return r === 0 ? 'GK' : r === 1 ? ['DL', 'DC', 'DC', 'DC', 'DR'][c] : r === 2 ? ['WBL', 'DM', 'DM', 'DM', 'WBR'][c] : r === 3 ? ['ML', 'MC', 'MC', 'MC', 'MR'][c] : r === 4 ? ['AML', 'AMC', 'AMC', 'AMC', 'AMR'][c] : 'ST'; },
    allowed(r, c) { return r === 0 ? c === 2 : r === 5 ? c >= 1 && c <= 3 : true; },
    grp: { GK: 'GK', DL: 'DF', DC: 'DF', DR: 'DF', WBL: 'DF', WBR: 'DF', DM: 'MF', ML: 'MF', MC: 'MF', MR: 'MF', AMC: 'MF', AML: 'FW', AMR: 'FW', ST: 'FW' },
    // which player positions suit each grid code (natural first)
    fits: { GK: ['GK'], DC: ['CB', 'CDM'], DL: ['LB', 'LM', 'CB'], DR: ['RB', 'RM', 'CB'], WBL: ['LB', 'LM', 'LW'], WBR: ['RB', 'RM', 'RW'], DM: ['CDM', 'CM', 'CB'], MC: ['CM', 'CDM', 'CAM'],
      ML: ['LM', 'LW', 'LB'], MR: ['RM', 'RW', 'RB'], AMC: ['CAM', 'CM', 'ST'], AML: ['LW', 'LM', 'ST'], AMR: ['RW', 'RM', 'ST'], ST: ['ST', 'CAM', 'LW', 'RW'] },
  },
  // formations as grid slots [row, lane]
  shapes: {
    '4-3-3':     [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [2, 2], [3, 1], [3, 3], [4, 0], [4, 4], [5, 2]],
    '4-2-3-1':   [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [2, 1], [2, 3], [4, 0], [4, 2], [4, 4], [5, 2]],
    '4-4-2':     [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [3, 0], [3, 1], [3, 3], [3, 4], [5, 1], [5, 3]],
    '4-1-4-1':   [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [3, 3], [3, 4], [5, 2]],
    '4-4-1-1':   [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [3, 0], [3, 1], [3, 3], [3, 4], [4, 2], [5, 2]],
    '4-3-1-2':   [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [3, 1], [3, 2], [3, 3], [4, 2], [5, 1], [5, 3]],
    '4-2-2-2':   [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [2, 1], [2, 3], [4, 1], [4, 3], [5, 1], [5, 3]],
    '4-1-2-1-2': [[0, 2], [1, 0], [1, 1], [1, 3], [1, 4], [2, 2], [3, 1], [3, 3], [4, 2], [5, 1], [5, 3]],
    '3-5-2':     [[0, 2], [1, 1], [1, 2], [1, 3], [2, 0], [2, 4], [3, 1], [3, 2], [3, 3], [5, 1], [5, 3]],
    '3-4-3':     [[0, 2], [1, 1], [1, 2], [1, 3], [3, 0], [3, 1], [3, 3], [3, 4], [4, 0], [4, 4], [5, 2]],
    '3-4-2-1':   [[0, 2], [1, 1], [1, 2], [1, 3], [2, 0], [2, 4], [3, 1], [3, 3], [4, 1], [4, 3], [5, 2]],
    '5-3-2':     [[0, 2], [1, 1], [1, 2], [1, 3], [2, 0], [2, 4], [3, 1], [3, 2], [3, 3], [5, 1], [5, 3]],
    '5-4-1':     [[0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [3, 0], [3, 1], [3, 3], [3, 4], [5, 2]],
    '5-2-3':     [[0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [3, 1], [3, 3], [4, 0], [4, 4], [5, 2]],
  },

  // ---------- roles: per grid code; duties D/S/A; key attributes (base engine names) and engine effects ----------
  roles: {
    GK: [['GK', 'Goalkeeper', 'D', ['handling', 'reflexes'], {}], ['SK', 'Sweeper Keeper', 'DSA', ['reflexes', 'passing', 'pace'], { k: .02, x: .01 }]],
    DC: [['CD', 'Central Defender', 'DSC', ['tackling', 'heading', 'positioning'], {}], ['BPD', 'Ball-Playing Defender', 'DS', ['passing', 'tackling', 'vision'], { k: .02, c: .01, x: .01 }],
      ['NCB', 'No-Nonsense Centre-Back', 'D', ['tackling', 'heading'], { x: -.02, k: -.02 }], ['L', 'Libero', 'SA', ['passing', 'vision', 'tackling'], { c: .02, x: .02, k: .02 }]],
    DL: [['FB', 'Full-Back', 'DSA', ['tackling', 'pace', 'stamina'], {}], ['WB', 'Wing-Back', 'DSA', ['pace', 'stamina', 'passing'], { c: .02, x: .015, t: .03 }],
      ['IWB', 'Inverted Wing-Back', 'DSA', ['passing', 'vision', 'tackling'], { k: .03, c: .01 }], ['NFB', 'No-Nonsense Full-Back', 'D', ['tackling', 'positioning'], { x: -.015, c: -.01 }]],
    WBL: [['WB', 'Wing-Back', 'DSA', ['pace', 'stamina', 'passing'], { c: .02, x: .015, t: .03 }], ['CWB', 'Complete Wing-Back', 'SA', ['pace', 'dribbling', 'passing'], { c: .035, x: .025, t: .04 }],
      ['IWB', 'Inverted Wing-Back', 'DSA', ['passing', 'vision', 'tackling'], { k: .03, c: .01 }]],
    DM: [['DM', 'Defensive Midfielder', 'DS', ['tackling', 'positioning', 'passing'], { x: -.015 }], ['A', 'Anchor', 'D', ['positioning', 'tackling'], { x: -.025, c: -.01 }],
      ['DLP', 'Deep-Lying Playmaker', 'DS', ['passing', 'vision'], { k: .035, c: .015 }], ['BWM', 'Ball-Winning Midfielder', 'DS', ['tackling', 'stamina'], { o: -.02, t: .03 }],
      ['REG', 'Regista', 'S', ['passing', 'vision', 'dribbling'], { k: .03, c: .025, x: .01 }], ['HB', 'Half-Back', 'D', ['positioning', 'tackling', 'passing'], { x: -.02, k: .01 }],
      ['RPM', 'Roaming Playmaker', 'S', ['passing', 'vision', 'stamina'], { k: .025, c: .02, t: .03 }]],
    MC: [['CM', 'Central Midfielder', 'DSA', ['passing', 'tackling', 'stamina'], {}], ['BBM', 'Box-to-Box Midfielder', 'S', ['stamina', 'passing', 'tackling'], { c: .015, o: -.01, t: .04 }],
      ['DLP', 'Deep-Lying Playmaker', 'DS', ['passing', 'vision'], { k: .035, c: .015 }], ['BWM', 'Ball-Winning Midfielder', 'DS', ['tackling', 'stamina'], { o: -.02, t: .03 }],
      ['AP', 'Advanced Playmaker', 'SA', ['passing', 'vision', 'dribbling'], { c: .03, k: .02 }], ['MEZ', 'Mezzala', 'SA', ['dribbling', 'passing', 'shooting'], { c: .03, x: .015 }],
      ['CAR', 'Carrilero', 'S', ['stamina', 'positioning', 'passing'], { x: -.015 }], ['RPM', 'Roaming Playmaker', 'S', ['passing', 'vision', 'stamina'], { k: .025, c: .02, t: .03 }]],
    ML: [['WM', 'Wide Midfielder', 'DSA', ['passing', 'stamina', 'tackling'], {}], ['W', 'Winger', 'SA', ['pace', 'dribbling', 'passing'], { c: .025, x: .01 }],
      ['DW', 'Defensive Winger', 'DS', ['stamina', 'tackling', 'pace'], { x: -.015, o: -.01 }], ['WP', 'Wide Playmaker', 'SA', ['passing', 'vision'], { k: .025, c: .015 }],
      ['IW', 'Inverted Winger', 'SA', ['dribbling', 'passing', 'shooting'], { c: .025, k: .01 }]],
    AMC: [['AM', 'Attacking Midfielder', 'SA', ['passing', 'shooting', 'vision'], { c: .02 }], ['AP', 'Advanced Playmaker', 'SA', ['passing', 'vision', 'dribbling'], { c: .03, k: .02 }],
      ['SS', 'Shadow Striker', 'A', ['shooting', 'pace', 'positioning'], { c: .035, x: .015 }], ['T', 'Trequartista', 'A', ['dribbling', 'vision', 'shooting'], { c: .04, x: .02, o: .01 }],
      ['EG', 'Enganche', 'S', ['passing', 'vision'], { k: .03, c: .02, o: .01 }]],
    AML: [['W', 'Winger', 'SA', ['pace', 'dribbling', 'passing'], { c: .025, x: .01 }], ['IF', 'Inside Forward', 'SA', ['shooting', 'dribbling', 'pace'], { c: .035, x: .01 }],
      ['IW', 'Inverted Winger', 'SA', ['dribbling', 'passing', 'shooting'], { c: .025, k: .01 }], ['RMD', 'Raumdeuter', 'A', ['positioning', 'shooting'], { c: .03, o: .01 }],
      ['WTM', 'Wide Target Man', 'SA', ['heading', 'positioning'], { c: .015 }]],
    ST: [['AF', 'Advanced Forward', 'A', ['shooting', 'pace', 'dribbling'], { c: .03 }], ['CF', 'Complete Forward', 'SA', ['shooting', 'passing', 'dribbling', 'heading'], { c: .035 }],
      ['DLF', 'Deep-Lying Forward', 'SA', ['passing', 'vision', 'shooting'], { k: .02, c: .015 }], ['F9', 'False Nine', 'S', ['passing', 'dribbling', 'vision'], { k: .03, c: .02 }],
      ['P', 'Poacher', 'A', ['shooting', 'positioning'], { c: .02 }], ['PF', 'Pressing Forward', 'DSA', ['stamina', 'tackling', 'pace'], { o: -.025, t: .04 }],
      ['TM', 'Target Man', 'SA', ['heading', 'positioning'], { c: .015, k: -.01 }], ['T', 'Trequartista', 'A', ['dribbling', 'vision', 'shooting'], { c: .04, o: .01 }]],
  },
  roleAlias: { DR: 'DL', WBR: 'WBL', MR: 'ML', AMR: 'AML' },
  duty: { D: { label: 'Defend', c: -.03, x: -.03 }, S: { label: 'Support', c: 0, x: 0 }, A: { label: 'Attack', c: .035, x: .025 }, C: { label: 'Cover', c: -.02, x: -.035 } },

  // ---------- mentality (7 steps, like FMM) ----------
  mentality7: ['contain', 'defensive', 'counter', 'balanced', 'control', 'attacking', 'overload'],

  // ---------- team instructions ----------
  // each: label, options [label, effects], default index
  instr: {
    inPossession: {
      width: { label: 'Width', opts: [['Narrow', { c: -.02, x: -.02, k: .01 }], ['Balanced', {}], ['Wide', { c: .03, x: .02 }]], def: 1 },
      tempo: { label: 'Tempo', opts: [['Slow', { c: -.03, k: .03, t: -.03 }], ['Normal', {}], ['Fast', { c: .035, k: -.02, t: .04 }]], def: 1 },
      passing: { label: 'Passing', opts: [['Short', { k: .04, c: -.01, x: -.01 }], ['Mixed', {}], ['Direct', { c: .03, k: -.04 }]], def: 1 },
      freedom: { label: 'Creative Freedom', opts: [['Disciplined', { c: -.02, x: -.02 }], ['Balanced', {}], ['Expressive', { c: .03, x: .015 }]], def: 1 },
      focus: { label: 'Focus Play', opts: [['Left', { c: .01 }], ['Mixed', {}], ['Centre', { c: .005, k: .01 }], ['Right', { c: .01 }]], def: 1 },
      final: { label: 'Final Third', opts: [['Work into box', { c: -.03, k: .02 }], ['Mixed', {}], ['Shoot on sight', { c: .05, k: -.02 }]], def: 1 },
      buildup: { label: 'Build-Up', opts: [['Play out', { k: .03, x: .02 }], ['Mixed', {}], ['Go long', { k: -.03, x: -.015 }]], def: 1 },
    },
    outPossession: {
      line: { label: 'Defensive Line', opts: [['Deep', { x: -.03, c: -.02 }], ['Standard', {}], ['High', { x: .03, c: .03, o: -.015 }]], def: 1 },
      engage: { label: 'Line of Engagement', opts: [['Low', { o: .02, x: -.02, t: -.03 }], ['Mid', {}], ['High', { o: -.03, x: .015, t: .03 }]], def: 1 },
      press: { label: 'Pressing', opts: [['Less', { o: .025, t: -.04 }], ['Balanced', {}], ['More', { o: -.04, t: .06 }]], def: 1 },
      tackling: { label: 'Tackling', opts: [['Stay on feet', { o: .015, cards: -.4 }], ['Balanced', {}], ['Get stuck in', { o: -.02, cards: .6 }]], def: 1 },
      offside: { label: 'Offside Trap', opts: [['Off', {}], ['On', { o: -.02, x: .02 }]], def: 0 },
      marking: { label: 'Marking', opts: [['Zonal', {}], ['Man-marking', { o: -.015, t: .02 }]], def: 0 },
    },
    transition: {
      lost: { label: 'When Possession Lost', opts: [['Regroup', { x: -.025, o: .01 }], ['Balanced', {}], ['Counter-press', { o: -.035, t: .05 }]], def: 1 },
      won: { label: 'When Possession Won', opts: [['Hold shape', { k: .03, c: -.02 }], ['Balanced', {}], ['Counter', { c: .04, k: -.02 }]], def: 1 },
      gk: { label: 'Goalkeeper Distribution', opts: [['Roll out', { k: .02 }], ['Mixed', {}], ['Long kicks', { k: -.02, c: .01 }]], def: 1 },
      timewaste: { label: 'Time Wasting', opts: [['Never', {}], ['Sometimes', { c: -.01, x: -.01 }], ['Often', { c: -.03, x: -.03, cards: .3 }]], def: 0 },
    },
  },
  oppInstr: [['tight', 'Tight Mark', 'Less space for him (−shots)'], ['press', 'Press', 'Close him down fast (tiring)'], ['weak', 'Weak Foot', 'Show onto his weaker foot'], ['hard', 'Hard Tackle', 'Get stuck in (cards)']],
  setPiece: {
    corners: { label: 'Attacking Corners', opts: ['Near post', 'Far post', 'Short', 'Edge of box', 'Mixed'], def: 4 },
    freekicks: { label: 'Free Kicks', opts: ['Shoot', 'Cross', 'Short', 'Mixed'], def: 3 },
    defCorners: { label: 'Defending Corners', opts: ['Zonal', 'Man-marking', 'Mixed'], def: 2 },
    throws: { label: 'Throw-ins', opts: ['Short', 'Long', 'Mixed'], def: 2 },
  },

  // ---------- transfers, contracts, budgets ----------
  transfer: {
    windows: [[0, 5], [20, 24]],           // league weeks [from, to] inclusive; last week = deadline day
    askMul: { 'Star Player': 1.6, 'Key Player': 1.4, 'First Team': 1.2, Rotation: 1.0, Backup: .85, 'Hot Prospect': 1.5, Youngster: .9, listed: .75 },
    contractMul: [.5, .8, 1, 1.1, 1.2, 1.25],   // years left 0..5
    wageDemand: 1.12, repPull: .012,            // wage demand rises when he moves down in reputation
    aiDealsPerWeek: 4, aiBidChance: .3, unsolicitedChance: .08, freeAgentPool: 70,
    budgetShare: .35, wageHeadroom: 1.08,
  },
  contract: { years: [1, 5], renewWarnWeeks: 8 },
  cups: {
    fa: { name: 'FA Cup', short: 'FAC', tiers: [1, 2, 3, 4, 5], weeks: [4, 9, 14, 19, 25, 31, 36], byes: 12, prize: [100, 150, 300, 600, 1200, 2500, 6000] },
    lc: { name: 'League Cup', short: 'LC', tiers: [1, 2, 3, 4], weeks: [2, 6, 11, 16, 22, 27, 33], byes: 36, prize: [50, 80, 150, 300, 600, 1200, 3000] },
    roundNames: ['First Round', 'Second Round', 'Third Round', 'Fourth Round', 'Quarter-Final', 'Semi-Final', 'Final'],
  },
});
// AI mentality keys stay valid; the 7-step ladder adds four more
Object.assign(DATA.mentality, {
  contain: { create: .72, concede: .7, label: 'Contain' },
  counter: { create: .92, concede: .88, label: 'Counter' },
  control: { create: 1.1, concede: 1.1, label: 'Control' },
  overload: { create: 1.35, concede: 1.4, label: 'Overload' },
});
// every shape is also a formation the engine knows (counts by group, attacking balance)
for (const [k, slots] of Object.entries(DATA.shapes)) {
  const n = { DF: 0, MF: 0, FW: 0 };
  for (const [r, c] of slots) { const g = DATA.grid.grp[DATA.grid.code(r, c)]; if (g !== 'GK') n[g]++; }
  DATA.formations[k] = Object.assign(n, { balance: n.FW >= 3 ? 1 : n.DF >= 5 ? -1 : 0 });
}
