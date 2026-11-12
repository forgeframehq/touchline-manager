class_name MatchEngine
extends RefCounted
## The match, played action by action between the 22 players on the pitch.
## Each step the player on the ball passes, dribbles, crosses or shoots; the outcome comes from his
## attributes against the opponent nearest to him, the pressure he is under, his condition and morale,
## and both teams' tactics and preparation. Positions are fractions of the pitch: x along its length
## (home attacks towards x = 1), y across it.

const L := 105.0
const WD := 68.0

var rng: RNG
var T := {}                 # "H"/"A" -> {club, xi, bench, tac, prep, subs, talk, ai, id}
var men: Array = []         # {p, side, base, pos, gk, row, grp, code, yellow}
var ball := Vector2(0.5, 0.5)
var holder := -1
var poss := "H"
var sec := 0.0
var half := 1
var added := [1, 4]
var score := {"H": 0, "A": 0}
var stats := {}
var events: Array = []      # everything worth telling: goals, saves, cards, subs, half-time...
var pts := {}               # player id -> rating points earned
var played := {}
var done := false
var last_pass := -1         # player id of the last passer, for assists
var neutral := false
var _ai_min := {}

func _init(home: Dictionary, away: Dictionary, seed_value: int) -> void:
	rng = RNG.new(seed_value)
	T = {"H": home, "A": away}
	added = [rng.int_in(1, 3), rng.int_in(2, 6)]
	for s in ["H", "A"]:
		T[s].subs = 0
		T[s].talk = 0.0
		stats[s] = {"shots": 0, "on": 0, "xg": 0.0, "pass": 0, "ok": 0, "poss": 0, "fouls": 0, "corners": 0, "tackles": 0, "yellow": 0}
		_build(s)
	poss = "H"

## A team for the engine from a career.
static func team(career: Dictionary, club_id: String, ai: bool) -> Dictionary:
	var sel: Dictionary = Sim.xi_of(career, club_id)
	return {"id": club_id, "club": Sim.club_of(career, club_id), "xi": sel.xi.duplicate(), "bench": sel.bench.duplicate(), "tac": career.tactics[club_id].duplicate(),
		"prep": career.prep.duplicate() if club_id == career.me else {"att": 0.0, "def": 0.0, "sp": 0.0}, "ai": ai}

func _build(side: String) -> void:
	men = men.filter(func(m): return m.side != side)
	var t: Dictionary = T[side]
	var slots: Array = Sim.shape_slots(t.tac.formation)
	for i in mini(t.xi.size(), slots.size()):
		var s: Dictionary = slots[i]
		var gk: bool = s.code == "GK"
		var along: float = 0.07 if gk else 0.13 + (1.0 - s.y) * 0.62 + (t.tac.mentality - 2) * 0.016
		var across: float = clampf(0.5 + (s.x - 0.5) * 1.14, 0.06, 0.94)
		var base := Vector2(along, across) if side == "H" else Vector2(1.0 - along, 1.0 - across)
		men.append({"p": t.xi[i], "side": side, "base": base, "pos": base, "gk": gk, "row": s.row, "grp": s.grp, "code": s.code, "yellow": false})
		played[t.xi[i].id] = true
		if not t.has("all"):
			t.all = []
		if not t.all.has(t.xi[i]):
			t.all.append(t.xi[i])
		if not pts.has(t.xi[i].id):
			pts[t.xi[i].id] = 0.0
	holder = -1 if holder >= men.size() else holder

func minute() -> int:
	return int(sec / 60.0) + 1

func clock() -> String:
	var m := minute()
	if half == 1 and m > 45:
		return "45+%d" % (m - 45)
	if m > 90:
		return "90+%d" % (m - 90)
	return "%d'" % m

func _other(side: String) -> String:
	return "A" if side == "H" else "H"

func _dir(side: String) -> float:
	return 1.0 if side == "H" else -1.0

func _dist(a: Vector2, b: Vector2) -> float:
	return Vector2((a.x - b.x) * L, (a.y - b.y) * WD).length()

## A player's attribute as it is right now: tired legs, mood, the half-time talk and home comforts all count.
func att(m: Dictionary, key: String) -> float:
	var p: Dictionary = m.p
	return p.attr[key] * (0.72 + 0.28 * p.fitness / 100.0) + p.boost + (p.morale - 60) / 40.0 + T[m.side].talk + (0.5 if m.side == "H" and not neutral else 0.0)

func _place() -> void:
	for i in men.size():
		var m: Dictionary = men[i]
		if i == holder:
			m.pos = ball
			continue
		var d := _dir(m.side)
		if m.gk:
			m.pos = Vector2(m.base.x + (ball.x - 0.5) * 0.05, lerpf(0.5, ball.y, 0.25))
			continue
		var x: float = m.base.x + (ball.x - 0.5) * (0.32 + m.row * 0.03) + (0.05 if m.side == poss else -0.03) * d
		var y: float = lerpf(m.base.y, ball.y, 0.15)
		if m.side != poss:
			# without the ball the team closes up: everyone squeezes across, and whoever is
			# caught upfield gets back goal-side of the ball
			y = lerpf(m.base.y, ball.y, 0.34)
			var behind: float = (ball.x - x) * d       # > 0: the ball has not gone past him yet
			if behind < 0.02 and m.row <= 3:
				x = lerpf(x, ball.x - d * 0.03, 0.75)
		m.pos = Vector2(clampf(x, 0.04, 0.96), clampf(y, 0.04, 0.96))
	# the two nearest defenders go to the man on the ball
	if holder >= 0:
		var opp := _other(men[holder].side)
		var first := _nearest(opp, ball)
		if first >= 0:
			var second := _nearest(opp, ball, first)
			men[first].pos = men[first].pos.lerp(ball, 0.7)
			if second >= 0:
				men[second].pos = men[second].pos.lerp(ball, 0.35)

func _nearest(side: String, to: Vector2, skip := -1, allow_gk := false) -> int:
	var best := -1
	var bd := 999.0
	for i in men.size():
		var m: Dictionary = men[i]
		if m.side != side or i == skip or (m.gk and not allow_gk):
			continue
		var d := _dist(m.pos, to)
		if d < bd:
			bd = d
			best = i
	return best

func _keeper(side: String) -> int:
	for i in men.size():
		if men[i].side == side and men[i].gk:
			return i
	return _nearest(side, Vector2(0.0 if side == "H" else 1.0, 0.5), -1, true)

func _best(side: String, key: String, skip := -1) -> int:
	var best := -1
	for i in men.size():
		if men[i].side == side and not men[i].gk and i != skip and (best < 0 or att(men[i], key) > att(men[best], key)):
			best = i
	return best

func _say(type: String, side: String, data := {}) -> Dictionary:
	var e := {"t": type, "side": side, "min": minute(), "clock": clock()}
	e.merge(data)
	events.append(e)
	return e

func _give(i: int) -> void:
	holder = i
	poss = men[i].side
	ball = men[i].pos

func _kickoff(side: String) -> void:
	poss = side
	ball = Vector2(0.5, 0.5)
	holder = -1
	_place()
	_give(_nearest(side, ball))
	men[holder].pos = ball
	last_pass = -1

## One action. Returns what happened this step (also appended to `events` when it matters).
func step() -> Array:
	var out := []
	if done:
		return out
	if holder < 0:
		_kickoff(poss)
	var c: Dictionary = men[holder]
	var side: String = c.side
	var opp := _other(side)
	var tac: Dictionary = T[side].tac
	sec += [9.2, 7.6, 6.3][tac.tempo] * (0.8 + rng.next() * 0.4)
	stats[side].poss += 1
	for m in men:
		m.p.fitness = maxf(30.0, m.p.fitness - (0.006 if m.gk else 0.024) * (1.0 + 0.3 * (T[m.side].tac.press - 1)) * (1.35 - m.p.attr.stamina / 40.0))
	_place()
	var d := _dir(side)
	var goal := Vector2(1.0 if side == "H" else 0.0, 0.5)
	var dg := _dist(ball, goal)
	var adv: float = ball.x if side == "H" else 1.0 - ball.x
	var near := _nearest(opp, ball)
	var pressed: bool = _dist(men[near].pos, ball) < [5.0, 7.5, 10.0][T[opp].tac.press]
	var shoot_p: float = (0.9 if dg < 8 else 0.45 if dg < 14 else 0.25 if dg < 20 else 0.08 if dg < 27 else 0.01 if dg < 33 else 0.0) * (1.0 + 0.05 * (tac.mentality - 2)) * (0.8 if pressed else 1.0)
	if c.gk:
		out.append(_pass(c, side, pressed, true))
	elif rng.chance(shoot_p):
		out.append(_shot(holder, dg, pressed, false, -1.0))
	elif adv > 0.7 and absf(ball.y - 0.5) > 0.24 and rng.chance(0.4):
		out.append(_cross(c, side))
	elif rng.chance(0.1 + att(c, "dribbling") * 0.008 + (0.14 if adv > 0.62 else 0.0)):
		out.append(_dribble(c, side, near, pressed, dg))
	else:
		out.append(_pass(c, side, pressed, false))
	_time(out)
	return out

func _pass(c: Dictionary, side: String, pressed: bool, from_gk: bool) -> Dictionary:
	var opp := _other(side)
	var d := _dir(side)
	var tac: Dictionary = T[side].tac
	# look forward or keep it? Mentality and tempo set how often the team tries to play through the lines
	var forward := rng.chance(clampf(0.78 + 0.025 * (tac.mentality - 2) + 0.08 * (tac.tempo - 1) + (0.2 if from_gk else 0.0), 0.2, 0.92))
	var best := -1
	var bs := -999.0
	var b_gain := 0.0
	var b_dist := 0.0
	var b_open := 0.0
	for pass_no in 2:
		for i in men.size():
			var m: Dictionary = men[i]
			if m.side != side or i == holder or m.gk:
				continue
			var gain: float = (m.pos.x - ball.x) * d
			var dist := _dist(m.pos, ball)
			if forward and (gain < 0.04 or dist > 42):
				continue
			var open := _dist(men[_nearest(opp, m.pos)].pos, m.pos)
			var sc: float = (minf(open, 8.0) * 0.5 + gain * 6.0 - maxf(0.0, dist - 25.0) * 0.15 if forward else minf(open, 10.0) - absf(dist - 12.0) * 0.2) + rng.next() * 3.0
			if sc > bs:
				bs = sc
				best = i
				b_gain = gain
				b_dist = dist
				b_open = open
		if best >= 0:
			break
		forward = false          # nobody ahead: play it safe
	var p: float = 0.92 - maxf(0.0, b_dist - 12.0) * 0.006 - (0.07 if pressed else 0.0) - (0.1 if b_open < 3 else 0.04 if b_open < 6 else 0.0) - maxf(0.0, b_gain) * 0.35 \
		+ (att(c, "passing") - att(men[_nearest(opp, men[best].pos)], "tackling")) * 0.0065 + (att(c, "vision") - 11.0) * 0.003 + T[side].prep.att - T[opp].prep.def
	stats[side].pass += 1
	var from := ball
	if rng.chance(clampf(p, 0.3, 0.97)):
		stats[side].ok += 1
		last_pass = c.p.id
		_give(best)
		if b_gain > 0.02:          # played into his stride
			ball = Vector2(clampf(ball.x + d * 0.03, 0.03, 0.97), ball.y)
			men[best].pos = ball
		return {"t": "pass", "side": side, "from": from, "to": ball}
	var thief := _nearest(opp, men[best].pos)
	pts[men[thief].p.id] += 0.04
	pts[c.p.id] -= 0.04
	last_pass = -1
	_give(thief)
	return {"t": "lost", "side": side, "from": from, "to": ball}

func _dribble(c: Dictionary, side: String, near: int, pressed: bool, dg: float) -> Dictionary:
	var d := _dir(side)
	var df: Dictionary = men[near]
	var p := 0.92 if not pressed else clampf(0.5 + (att(c, "dribbling") + att(c, "pace") * 0.5 - att(df, "tackling") - att(df, "pace") * 0.5) * 0.016, 0.15, 0.85)
	var from := ball
	if rng.chance(p):
		var adv: float = ball.x if side == "H" else 1.0 - ball.x
		ball = Vector2(clampf(ball.x + d * (0.04 + rng.next() * 0.05), 0.03, 0.97), clampf(lerpf(ball.y, 0.5, 0.25 if adv > 0.7 else 0.0), 0.04, 0.96))
		c.pos = ball
		if pressed:
			pts[c.p.id] += 0.05
		return {"t": "dribble", "side": side, "from": from, "to": ball}
	if rng.chance(0.15):      # brought down
		var opp := _other(side)
		stats[opp].fouls += 1
		var card: bool = not df.yellow and rng.chance(0.22)
		if card:
			df.yellow = true
			stats[opp].yellow += 1
			pts[df.p.id] -= 0.3
		var e := _say("foul", opp, {"who": df.p.name, "on": c.p.name, "card": card})
		if rng.chance(0.03):
			c.p.injured = rng.int_in(1, 5)
			_say("injury", side, {"who": c.p.name})
		if dg < 30:               # a free kick within range: the best striker of the ball has a go
			var taker := _best(side, "shooting")
			_shot(taker, maxf(dg, 18.0), false, false, 0.06 * (1.0 + T[side].prep.sp))
		return e
	pts[df.p.id] += 0.07
	stats[df.side].tackles += 1
	last_pass = -1
	_give(near)
	return {"t": "tackle", "side": df.side, "from": from, "to": ball}

func _cross(c: Dictionary, side: String) -> Dictionary:
	var from := ball
	if rng.chance(clampf(0.36 + (att(c, "passing") - 11.0) * 0.02 + T[side].prep.sp * 0.1, 0.15, 0.7)):
		last_pass = c.p.id
		return _aerial(side, 0.11, from)
	var opp := _other(side)
	_give(_keeper(opp) if rng.chance(0.4) else _nearest(opp, Vector2(1.0 if side == "H" else 0.0, 0.5)))
	return {"t": "lost", "side": side, "from": from, "to": ball}

## A ball into the box: the best header of the ball against the best defender in the air.
func _aerial(side: String, xg: float, from: Vector2) -> Dictionary:
	var opp := _other(side)
	var d := _dir(side)
	var a := _best(side, "heading")
	var b := _best(opp, "heading")
	var spot := Vector2((1.0 if side == "H" else 0.0) - d * 0.075, 0.5 + rng.next() * 0.12 - 0.06)
	if rng.chance(clampf(0.34 + (att(men[a], "heading") - att(men[b], "heading")) * 0.03 + T[side].prep.sp * 0.2, 0.1, 0.7)):
		ball = spot
		men[a].pos = spot
		holder = a
		poss = side
		return _shot(a, 8.0, true, true, xg * (1.0 + T[side].prep.sp * 0.6))
	pts[men[b].p.id] += 0.1
	_give(b)
	return {"t": "clear", "side": opp, "from": from, "to": spot}

func _corner(side: String) -> void:
	stats[side].corners += 1
	_say("corner", side, {})
	var taker := _best(side, "passing")
	last_pass = men[taker].p.id
	_aerial(side, 0.09, Vector2(1.0 if side == "H" else 0.0, 0.02))

func _shot(i: int, dg: float, pressed: bool, header: bool, fixed_xg: float) -> Dictionary:
	var c: Dictionary = men[i]
	var side: String = c.side
	var opp := _other(side)
	var d := _dir(side)
	var gx := 1.0 if side == "H" else 0.0
	var xg := fixed_xg
	if xg < 0:
		xg = 1.4 * exp(-dg / 8.5) * (1.0 - minf(0.6, absf(ball.y - 0.5) * 1.6)) * (0.7 if pressed else 1.0)
	var crowd := 0
	for m in men:
		if m.side == opp and not m.gk and _dist(m.pos, ball) < 6.5:
			crowd += 1
	xg = clampf(xg * (1.0 + 0.16 * (T[opp].tac.mentality - 2)) / (1.0 + 0.18 * maxi(0, crowd - 1)), 0.012, 0.7)      # commit men forward and you leave room behind
	var k := _keeper(opp)
	var kq := (att(men[k], "reflexes") + att(men[k], "handling")) / 2.0
	# the chance is what it is; the finish is the striker against the keeper
	var p_goal := clampf(xg * (1.0 + (att(c, "heading" if header else "shooting") - kq) * 0.018) * (1.0 + T[side].prep.att * 1.5) * (1.0 - T[opp].prep.def), 0.008, 0.8)
	stats[side].shots += 1
	stats[side].xg += xg
	var r := rng.next()
	var e := {"who": c.p.name, "pid": c.p.id, "xg": xg, "header": header, "from": ball, "keeper": men[k].p.name}
	var on_p := 0.3 + xg * 0.3
	var res := "goal" if r < p_goal else "save" if r < p_goal + on_p else "block" if r < p_goal + on_p + 0.2 else "off"
	var blocker := _nearest(opp, ball)
	match res:
		"goal":
			score[side] += 1
			stats[side].on += 1
			pts[c.p.id] += 1.1
			c.p.goals += 1
			c.p.seasonGoals += 1
			e.assist = null
			if last_pass >= 0 and last_pass != c.p.id:
				pts[last_pass] = pts.get(last_pass, 0.0) + 0.6
				for m in men:
					if m.p.id == last_pass:
						e.assist = m.p.name
			for m in men:
				if m.side == opp and (m.gk or m.grp == "DF"):
					pts[m.p.id] -= 0.18
			e.to = Vector2(gx + d * 0.012, 0.5 + rng.next() * 0.08 - 0.04)
			e.score = "%d–%d" % [score.H, score.A]
		"save":
			stats[side].on += 1
			pts[men[k].p.id] += 0.22
			pts[c.p.id] += 0.08
			e.to = Vector2(gx - d * 0.02, 0.5 + rng.next() * 0.06 - 0.03)
		"block":
			pts[men[blocker].p.id] += 0.1
			e.to = men[blocker].pos
		_:
			e.to = Vector2(gx + d * 0.02, 0.5 + (0.12 if rng.chance(0.5) else -0.12))
	e.res = res
	var ev := _say("shot", side, e)
	last_pass = -1
	if res == "goal":
		poss = opp
		holder = -1
		ball = Vector2(0.5, 0.5)
	elif res != "off" and rng.chance(0.3):
		_corner(side)
	else:
		_give(blocker if res == "block" else k)
	return ev

## Half-time, full time and what the other bench does as the clock runs.
func _time(out: Array) -> void:
	if half == 1 and sec >= (45 + added[0]) * 60.0:
		half = 2
		sec = 45 * 60.0
		out.append(_say("ht", "H", {"score": "%d–%d" % [score.H, score.A]}))
		holder = -1
		poss = "A"
		for s in ["H", "A"]:
			if T[s].ai:
				var diff: int = score[s] - score[_other(s)]
				T[s].talk = 0.4 if diff < 0 else 0.2
	elif half == 2 and sec >= (90 + added[1]) * 60.0:
		done = true
		out.append(_say("ft", "H", {"score": "%d–%d" % [score.H, score.A]}))
	for s in ["H", "A"]:
		if not T[s].ai:
			continue
		var m := minute()
		if m in [60, 68, 76, 84] and not _ai_min.has(s + str(m)):
			_ai_min[s + str(m)] = true
			var diff: int = score[s] - score[_other(s)]
			if m >= 68:
				set_tactic(s, "mentality", clampi(T[s].tac.mentality + (1 if diff < 0 else -1 if diff > 0 and m >= 76 else 0), 0, 4))
			var tired = null
			for mm in men:
				if mm.side == s and not mm.gk and (tired == null or mm.p.fitness < tired.p.fitness):
					tired = mm
			if tired != null and tired.p.fitness < 74 and T[s].subs < 5:
				var on = null
				for b in T[s].bench:
					if b.pos != "GK" and (on == null or (b.grp == tired.p.grp and on.grp != tired.p.grp)):
						on = b
				if on != null:
					out.append(sub(s, tired.p.id, on.id))

func set_tactic(side: String, key: String, value: int) -> void:
	T[side].tac[key] = value
	if key == "mentality":
		for m in men:
			if m.side == side and not m.gk:
				var s: Dictionary = Sim.shape_slots(T[side].tac.formation)[T[side].xi.find(m.p)]
				var along: float = 0.13 + (1.0 - s.y) * 0.62 + (value - 2) * 0.016
				m.base.x = along if side == "H" else 1.0 - along

func sub(side: String, off_id: int, on_id: int) -> Dictionary:
	var t: Dictionary = T[side]
	var on = null
	for b in t.bench:
		if b.id == on_id:
			on = b
	if on == null or t.subs >= 5:
		return {}
	for m in men:
		if m.side == side and m.p.id == off_id:
			var off: Dictionary = m.p
			t.xi[t.xi.find(off)] = on
			t.bench.erase(on)
			m.p = on
			t.subs += 1
			played[on.id] = true
			t.all.append(on)
			pts[on.id] = pts.get(on.id, 0.0)
			return _say("sub", side, {"on": on.name, "off": off.name})
	return {}

## The half-time talk. kind: 0 praise, 1 demand more, 2 stay calm. Returns how it went down.
func team_talk(side: String, kind: int) -> String:
	var diff: int = score[side] - score[_other(side)]
	var table: Array = [[0.5, -0.3, 0.3], [0.2, 0.3, 0.3], [-0.3, 0.6, 0.2]][0 if diff > 0 else 1 if diff == 0 else 2]
	T[side].talk = table[kind]
	if table[kind] >= 0.5:
		return "That is exactly what they needed to hear. They cannot wait to get back out."
	if table[kind] > 0:
		return "Nods around the room. A decent response."
	return "Blank faces. That was the wrong note to strike."

func possession(side: String) -> int:
	return int(round(100.0 * stats[side].poss / maxf(1.0, stats.H.poss + stats.A.poss)))

## Final ratings and the summary the career needs.
func result() -> Dictionary:
	var ratings := {}
	for s in ["H", "A"]:
		var diff: int = score[s] - score[_other(s)]
		for p in T[s].all:
			var r: float = 6.3 + pts.get(p.id, 0.0) + (0.3 if diff > 0 else -0.2 if diff < 0 else 0.0)
			if (p.grp == "DF" or p.grp == "GK") and score[_other(s)] == 0:
				r += 0.5
			ratings[p.id] = round(clampf(r, 4.0, 10.0) * 10) / 10.0
			p.apps += 1
			p.seasonApps += 1
			p.rsum += ratings[p.id]
			if rng.chance(0.01):
				p.injured = rng.int_in(1, 5)
	return {"gH": score.H, "gA": score.A, "ratings": ratings, "played": played.keys(), "stats": stats, "events": events}
