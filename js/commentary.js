// Text commentary: build-up lines from the ball-by-ball flow, outcome lines for every event, context
// (late goals, equalisers, winners, comebacks, braces, hat-tricks, derbies) and pundit lines at half / full time.
'use strict';
const Comm = (() => {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const sn = n => { if (!n) return ''; const p = n.split(' '); return p.length > 1 ? p.slice(1).join(' ') : n; };
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? `<b>${o[k]}</b>` : '');
  const T = {
    kickoff: ['And we are under way at {v}!', 'The referee blows, and {t} get us started.', 'Kick-off at {v}. Here we go!', 'We are off and running at {v}.'],
    build: {
      pass: ['{p} keeps it moving.', '{p} plays it short.', 'Neat from {p}.', '{p} finds a team-mate.', 'Tidy passing from {t}, through {p}.'],
      through: ['{p} slides a ball in behind!', 'Lovely weight on that pass from {p}.', '{p} threads it through…', 'Clever from {p}, splitting the defence.'],
      cross: ['{p} whips it in…', '{p} swings a cross into the box…', 'Here comes the delivery from {p}…', '{p} gets to the byline and crosses…'],
      dribble: ['{p} goes past one… and another!', '{p} drives at the defence.', 'Quick feet from {p}!', '{p} skips away from his man.'],
      switch: ['{p} switches the play.', 'Long diagonal from {p} to change the angle.', '{p} spreads it wide.'],
      long: ['{p} goes long.', 'A hopeful ball forward from {p}.', '{p} launches it upfield.'],
      carry: ['{p} carries it out of defence.', '{p} strides forward.', '{p} brings it out calmly.'],
      cutback: ['{p} pulls it back…', '{p} cuts it back across goal…', 'Low cutback from {p}…'],
      tackle: ['Great tackle from {p}!', '{p} wins it back.', 'Strong challenge from {p}, and {t} have the ball.', '{p} reads it and intercepts.'],
    },
    chance: {
      wide: ['{p} shoots… just wide!', '{p} drags it wide of the post.', 'Off target from {p}.', '{p} lets fly, but it is wide.'],
      over: ['{p} blazes it over!', '{p} leans back and it sails over.', 'Over the bar from {p}.', '{p} goes for power, and it flies over.'],
      blocked: ['{p} shoots… blocked!', 'Brave block to deny {p}.', '{p} has his effort charged down.', 'Bodies on the line to stop {p}!'],
      post: ['{p} hits the post!', 'OFF THE WOODWORK! {p} so close!', '{p} smashes it against the bar!', 'The frame of the goal saves them from {p}!'],
      sp: ['{p} rises from the {sp}… just over.', 'Header from {p} after the {sp}, wide.', '{p} gets on the end of the {sp}, but no goal.'],
    },
    save: ['{p} shoots… saved by {k}!', 'Great save! {k} denies {p}.', '{k} gets down well to stop {p}.', '{p} forces a fine stop from {k}.', 'Fingertips! {k} tips it away from {p}.'],
    goal: ['GOAL! {p} scores for {t}!', 'GOAL! {p} finishes it off! {s}', 'IT\'S IN! {p} scores for {t}! {s}', 'GOAL! What a finish from {p}! {s}', 'GOAL! {p} picks his spot! {s}'],
    goalAssist: ['GOAL! {a} sets it up and {p} finishes! {s}', 'GOAL! Brilliant from {a}, and {p} makes no mistake! {s}', 'GOAL! {p} converts {a}\'s ball! {s}'],
    goalSp: ['GOAL! {p} heads home from the {sp}! {s}', 'GOAL! {p} rises highest from the {sp}! {s}', 'GOAL from the {sp}! {p}! {s}'],
    goalFk: ['GOAL! {p} curls the free kick in! {s}', 'WHAT A FREE KICK from {p}! {s}'],
    goalPen: ['GOAL! {p} sends the keeper the wrong way! {s}', 'GOAL! {p} buries the penalty! {s}', 'Cool as you like, {p} scores from the spot! {s}'],
    late: ['Late drama at {v}!', 'Right at the death!', 'That could be the moment of the match!'],
    equaliser: ['{t} are level!', 'All square again!', 'The equaliser!'],
    lead: ['{t} lead!', '{t} are in front!', 'That puts {t} ahead!'],
    brace: ['That is his second of the game!', '{p} has two!', 'A brace for {p}!'],
    hattrick: ['HAT-TRICK! {p} takes the match ball home!', 'Three for {p}! A hat-trick!'],
    derby: ['The home end erupts in this derby!', 'Derby day delight!', 'Bragging rights at stake, and that is huge!'],
    penalty: ['PENALTY! {t} have a spot kick!', 'The referee points to the spot! Penalty to {t}!', 'PENALTY! Clumsy challenge in the box!'],
    penSaved: ['SAVED! {k} denies {p} from the spot!', '{k} guesses right and saves {p}\'s penalty!'],
    penMissed: ['MISSED! {p} puts the penalty wide!', '{p} skies it! The penalty is missed!'],
    yellow: ['{p} goes into the book.', 'Yellow card for {p}.', '{p} is booked for that challenge.', 'The referee shows {p} a yellow.'],
    red: ['RED CARD! {p} is sent off!', 'Off he goes! {p} sees red!', '{t} are down to ten! {p} dismissed!'],
    injury: ['{p} is down and needs treatment…', 'Worrying moments: {p} is hurt.', '{p} pulls up and is signalling to the bench.'],
    sub: ['Substitution for {t}: {on} replaces {off}.', '{t} make a change: {off} off, {on} on.', 'Fresh legs: {on} comes on for {off}.'],
    offside: ['The flag goes up: {p} offside.', '{p} was offside.', 'Offside against {p}.'],
    foul: ['Free kick to {t}.', 'Foul by {p}.', '{p} brings his man down.'],
    varCheck: ['VAR is checking the goal…', 'Hold on, VAR is taking a look…'],
    varOk: ['VAR: the goal stands!', 'Checked and confirmed, the goal stands!'],
    varNo: ['NO GOAL! VAR rules it out!', 'Disallowed after a VAR review!', 'VAR overturns it, no goal!'],
    ht: ['Half-time at {v}. {s}', 'The referee blows for half-time. {s}', 'That is the break. {s}'],
    ft: ['FULL TIME! {s}', 'It is all over at {v}! {s}', 'The final whistle goes. {s}'],
    shout: ['From the touchline: "{x}"'],
  };
  const pundit = {
    ht: { lead: ['They have been the better side and deserve to be ahead.', 'A good half; now they must see it out.'], level: ['Tight game. The next goal is massive.', 'Not much between them so far.'], behind: ['They need a reaction after the break.', 'Big team talk needed in that dressing room.'] },
    ft: { win: ['A deserved win and three big points.', 'Professional. The manager will be pleased.'], draw: ['A point apiece, and probably fair.', 'Neither side could find a winner.'], loss: ['A disappointing afternoon. Questions to answer.', 'They were second best and know it.'] },
  };
  function scoreLine(m, H, A) { return `${H.short.replace(/\d/g, '')} ${m.gH}-${m.gA} ${A.short.replace(/\d/g, '')}`; }
  // ctx: { m, H, A, derby, venue, goalsBy }
  function line(e, c) {
    const side = e.side ? (e.side === 'H' ? c.H : c.A) : null, tn = side ? side.short.replace(/\d/g, '') : '';
    const o = { p: sn(e.who), t: tn, k: sn(e.keeper), v: c.venue, s: c.m ? scoreLine(c.m, c.H, c.A) : '', a: sn(e.assist), on: sn(e.on), off: sn(e.off), sp: e.sp, x: e.x };
    switch (e.type) {
      case 'kickoff': return fill(pick(T.kickoff), o);
      case 'play': return fill(pick(T.build[e.kind] || T.build.pass), o);
      case 'chance': return fill(pick(e.sp ? T.chance.sp : T.chance[e.kind] || T.chance.wide), o);
      case 'save': return fill(pick(T.save), o);
      case 'goal': {
        let s = fill(pick(e.pen ? T.goalPen : e.sp === 'free kick' ? T.goalFk : e.sp ? T.goalSp : e.assist ? T.goalAssist : T.goal), o);
        const n = (c.goalsBy[e.pid] = (c.goalsBy[e.pid] || 0) + 1);
        const us = e.side === 'H' ? c.m.gH : c.m.gA, them = e.side === 'H' ? c.m.gA : c.m.gH;
        const extra = [];
        if (n === 3) extra.push(pick(T.hattrick)); else if (n === 2) extra.push(pick(T.brace));
        if (us === them) extra.push(pick(T.equaliser)); else if (us === them + 1) extra.push(pick(T.lead));
        if (e.min >= 85) extra.push(pick(T.late)); if (c.derby && Math.random() < .5) extra.push(pick(T.derby));
        return s + (extra.length ? ' ' + fill(extra.slice(0, 2).join(' '), o) : '');
      }
      case 'disallowed': return fill(pick(T.varNo), o) + ` ${fill('{p}', o)}'s effort is chalked off.`;
      case 'penalty': return fill(pick(T.penalty), o);
      case 'penmiss': return fill(pick(e.saved ? T.penSaved : T.penMissed), o);
      case 'yellow': return fill(pick(T.yellow), o);
      case 'red': return fill(pick(T.red), o);
      case 'injury': return fill(pick(T.injury), o);
      case 'sub': return fill(pick(T.sub), o);
      case 'offside': return fill(pick(T.offside), o);
      case 'foul': return fill(pick(T.foul), Object.assign(o, { t: (e.side === 'H' ? c.A : c.H).short.replace(/\d/g, '') }));
      case 'ht': return fill(pick(T.ht), o);
      case 'ft': return fill(pick(T.ft), o);
      case 'shout': return fill(pick(T.shout), o);
    }
    return '';
  }
  function punditLine(kind, mine, m) {
    const us = mine === 'H' ? m.gH : m.gA, them = mine === 'H' ? m.gA : m.gH;
    if (kind === 'ht') return pick(pundit.ht[us > them ? 'lead' : us < them ? 'behind' : 'level']);
    return pick(pundit.ft[us > them ? 'win' : us < them ? 'loss' : 'draw']);
  }
  return { line, punditLine, sn };
})();
