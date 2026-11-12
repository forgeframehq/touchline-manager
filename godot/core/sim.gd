extends Node
## Simulation core: squads, live minute-by-minute matches, fixtures, tables, weeks, board, finances and seasons.
## A faithful port of the web game's js/sim.js: same formulas, same order of random draws, so results match it.
## No UI here. tests/season.gd drives it headless.

var D: Dictionary        # DB.DATA
var MT: Dictionary       # match numbers
var FN: Dictionary       # finance numbers
var POS: Dictionary

func _ready() -> void:
	D = DB.DATA
	MT = D.match
	FN = D.finance
	POS = D.positions

func grp_of(pos: String) -> String:
	return POS[pos].grp if POS.has(pos) else "MF"

# ---------- players ----------
## Attributes come from (id, position, rating), so they can always be rebuilt.
func make_attr(p: Dictionary) -> Dictionary:
	var rng := RNG.new(RNG.imul(p.id, 2654435761) ^ (p.rating * 97) ^ RNG.hash_str(p.pos))
	var keys: Array = POS[p.pos].keys if POS.has(p.pos) else POS.CM.keys
	var attr := {}
	for a in D.attributes:
		var v: int = p.rating + rng.int_in(-3, 4) if keys.has(a) else p.rating - rng.int_in(10, 24)
		attr[a] = clampi(v, 5, 99)
	if p.pos != "GK":
		attr.handling = rng.int_in(8, 20)
		attr.reflexes = rng.int_in(8, 22)
	return attr

func make_player(club_id, src: Dictionary, id: int, extra: Dictionary = {}) -> Dictionary:
	var p := {
		"id": id, "club": club_id, "name": src.name, "pos": src.pos, "grp": grp_of(src.pos), "age": src.age,
		"rating": src.rating, "pot": maxi(src.get("pot", src.rating), src.rating), "nat": src.get("nat", ""),
		"morale": 70.0, "fitness": 100.0, "injured": 0, "goals": 0, "apps": 0, "seasonGoals": 0, "seasonApps": 0,
	}
	p.merge(extra, true)
	p.attr = make_attr(p)
	p.wage = wage(p)
	return p

func gen_name(country: String, rng: RNG) -> String:
	var home: Dictionary = DB.NAMES.get(country, DB.NAMES.ENG)
	var pool: Dictionary = DB.NAMES.ABROAD if rng.chance(D.gen.abroadShare) else home
	var first: String = rng.pick(pool.first)
	return first + " " + rng.pick(pool.last)

func fill_squad(club: Dictionary, existing: Array, rng: RNG, career: Dictionary) -> Array:
	var div: Dictionary = DB.divisions[club.div]
	var band: Array = div.band if div.band != null else [70, 80]
	var lo := 999
	var hi := -999
	for c in DB.clubs:   # the division's founding clubs set the rating band, as in the web game
		if c.div == club.div:
			lo = mini(lo, c.rep)
			hi = maxi(hi, c.rep)
	var centre: float = band[0] + (band[1] - band[0]) * ((club.rep - lo) / float(hi - lo) if hi > lo else 0.5)
	var have := {"GK": 0, "DF": 0, "MF": 0, "FW": 0}
	for p in existing:
		have[p.grp] += 1
	var out := []
	for g in D.gen.squadShape:
		while have[g] < int(D.gen.squadShape[g]):
			var age := rng.int_in(int(D.gen.ageRange[0]), int(D.gen.ageRange[1]))
			var r := int(round(clampf(centre + rng.int_in(-5, 4) - (3 if age < 21 else 0), 40, 85)))
			var pos: String = rng.pick(D.gen.detailByGroup[g])
			var abroad := rng.chance(D.gen.abroadShare)
			var pname: String
			if abroad:
				var first: String = rng.pick(DB.NAMES.ABROAD.first)
				pname = first + " " + rng.pick(DB.NAMES.ABROAD.last)
			else:
				pname = gen_name(club.country, rng)
			var pot := r + rng.int_in(2, 12) if age < 23 else r
			out.append(make_player(club.id, {"name": pname, "pos": pos, "age": age, "rating": r, "pot": pot,
				"nat": "" if abroad else club.country}, _next_id(career), {"gen": true}))
			have[g] += 1
	return out

func _next_id(career: Dictionary) -> int:
	var id: int = career.nextId
	career.nextId += 1
	return id

func wage(p: Dictionary) -> int:
	return maxi(1, int(round(FN.wageBase * exp((p.rating - 55) * FN.wageGrowth) * (FN.legendWageMul if p.get("legend", false) else 1.0))))

## Transfer value in £m.
func value(p: Dictionary) -> float:
	var age_mul := 1.5 if p.age < 22 else 1.25 if p.age < 25 else 1.0 if p.age <= 29 else maxf(0.15, 1 - (p.age - 29) * 0.18)
	var pot_mul := 1 + maxi(0, p.pot - p.rating) * 0.03
	return round(FN.valueBase * exp((p.rating - 55) * FN.valueGrowth) * age_mul * pot_mul * 10) / 10.0

# ---------- squads and strength ----------
func _xi_score(p: Dictionary) -> float:
	return p.rating * (0.6 + p.fitness / 250.0)

func pick_xi(squad: Array, formation: String) -> Dictionary:
	var f: Dictionary = D.formations[formation]
	var need := {"GK": 1, "DF": int(f.DF), "MF": int(f.MF), "FW": int(f.FW)}
	var avail := squad.filter(func(p): return p.injured == 0 and not p.get("ban", false))
	avail.sort_custom(func(a, b):
		var sa := _xi_score(a)
		var sb := _xi_score(b)
		return sa > sb if sa != sb else a.id < b.id)
	var xi := []
	var used := {}
	for g in need:
		for p in avail:
			if need[g] > 0 and p.grp == g and not used.has(p.id):
				xi.append(p)
				used[p.id] = true
				need[g] -= 1
	for g in need:
		while need[g] > 0:
			var found = null
			for q in avail:
				if not used.has(q.id) and (g == "GK" or q.grp != "GK"):
					found = q
					break
			if found == null:
				break
			xi.append(found)
			used[found.id] = true
			need[g] -= 1
	var bench := []
	for p in avail:
		if not used.has(p.id) and bench.size() < int(D.season.subsOnBench):
			bench.append(p)
	return {"xi": xi, "bench": bench}

func _mean(ps: Array, key: String, st: Dictionary, bonus: float) -> float:
	if ps.is_empty():
		return 30.0
	var mul: float = st.get(key, 1.0)
	var s := 0.0
	for p in ps:
		var sharp: float = 1.0 if not p.has("sharp") else 0.94 + p.sharp * 0.0006
		s += (p.attr[key] + bonus) * mul * (p.fitness / 100.0) * (0.85 + p.morale / 700.0) * sharp
	return s / ps.size()

func strength(team: Dictionary) -> Dictionary:
	var st: Dictionary = D.styles[team.tactics.style]
	var bonus: float = team.get("bonus", 0)
	var df := []
	var mf := []
	var fw := []
	var gk = null
	for p in team.xi:
		match p.grp:
			"DF": df.append(p)
			"MF": mf.append(p)
			"FW": fw.append(p)
			"GK":
				if gk == null:
					gk = p
	return {
		"gk": (gk.rating + bonus) * (gk.fitness / 100.0) if gk != null else 30.0,
		"def": (_mean(df, "tackling", st, bonus) + _mean(df, "positioning", st, bonus) + _mean(df, "heading", st, bonus)) / 3.0,
		"mid": (_mean(mf, "passing", st, bonus) + _mean(mf, "vision", st, bonus) + _mean(mf, "stamina", st, bonus)) / 3.0,
		"att": (_mean(fw, "shooting", st, bonus) + _mean(fw, "pace", st, bonus) + _mean(fw, "dribbling", st, bonus)) / 3.0,
	}

# ---------- live match ----------
## team = { club, xi, bench, tactics, squad, bonus, ai }. Tactics are copied so in-match changes stay in the match.
func create_match(home: Dictionary, away: Dictionary, seed_value: int, neutral := false) -> Dictionary:
	var rng := RNG.new(seed_value)
	var total := int(D.season.matchMinutes) + rng.int_in(int(D.season.addedTime[0]), int(D.season.addedTime[1]))
	var m := {"rng": rng, "neutral": neutral, "min": 0, "gH": 0, "gA": 0, "events": [], "done": false, "total": total,
		"H": _side(home, "H"), "A": _side(away, "A"),
		"mods": {"H": [], "A": []}, "subs": {"H": 0, "A": 0}, "shots": {"H": 0, "A": 0}, "on_target": {"H": 0, "A": 0},
		"cool": {"H": {}, "A": {}}, "stats": {}, "played": {}, "dirty": true}
	for p in m.H.xi + m.A.xi:
		m.played[p.id] = true
		m.stats[p.id] = {"g": 0, "sh": 0, "on": 0, "off": null}
	return m

func _side(t: Dictionary, side: String) -> Dictionary:
	var c := t.duplicate()
	c.tactics = t.tactics.duplicate()
	c.xi = t.xi.duplicate()
	c.bench = t.bench.duplicate()
	c.side = side
	return c

func _mod_mul(m: Dictionary, side: String, key: String) -> float:
	var v := 1.0
	for x in m.mods[side]:
		if x.until >= m.min and x.has(key):
			v *= x[key]
	return v

## Tactical instructions as multipliers (only the player's club has them).
func _instr_mul(t: Dictionary, key: String) -> float:
	if not t.has("instr") or t.instr == null:
		return 1.0
	var I: Dictionary = t.instr
	var tg: Dictionary = I.get("toggles", {})
	var press: int = I.press + (1 if tg.get("highPress", false) else 0)
	var v := 1.0
	match key:
		"oppCreate":
			v *= 1 - 0.045 * (press - 3)
		"create":
			v *= (1 + 0.03 * (I.line - 3)) * (1 + 0.02 * (I.pass - 3)) * (1.04 if tg.get("overlap", false) else 1.0) \
				* (1.02 if tg.get("playOut", false) else 1.0) * (0.97 if tg.get("possession", false) else 1.0) \
				* (1 + (t.get("chem", 70) - 70) / 300.0)
		"concede":
			v *= (1 + 0.05 * (I.line - 3)) * (1 + 0.015 * (I.pass - 3)) * (1.03 if tg.get("overlap", false) else 1.0) \
				* (1.03 if tg.get("playOut", false) else 1.0) * (0.94 if tg.get("possession", false) else 1.0)
		"tire":
			v *= 1 + 0.08 * (press - 3)
	return v

func _chances(m: Dictionary, me: Dictionary, you: Dictionary, s_me: Dictionary, s_you: Dictionary, is_home: bool, side: String, oside: String, mid_edge: float) -> float:
	var men_me: Dictionary = D.mentality[me.tactics.mentality]
	var men_you: Dictionary = D.mentality[you.tactics.mentality]
	var bal_me: float = D.formations[me.tactics.formation].balance * 0.05
	var bal_you: float = D.formations[you.tactics.formation].balance * 0.05
	return MT.baseChancesPerTeam * (MT.homeAdvantage if is_home and not m.neutral else 1.0) * men_me.create * men_you.concede \
		* (1 + bal_me - bal_you) * sqrt(mid_edge if is_home else 1.0 / mid_edge) * pow(s_me.att / s_you.def, MT.attackExponent) \
		* _mod_mul(m, side, "create") * _mod_mul(m, oside, "concede") * _mod_mul(m, oside, "oppCreate") \
		* _instr_mul(me, "create") * _instr_mul(you, "concede") * _instr_mul(you, "oppCreate")

func rates(m: Dictionary) -> Dictionary:
	if m.dirty or m.min % 5 == 0:
		m.sH = strength(m.H)
		m.sA = strength(m.A)
		m.dirty = false
	var mid_edge := pow(m.sH.mid / m.sA.mid, MT.strengthExponent)
	return {"H": _chances(m, m.H, m.A, m.sH, m.sA, true, "H", "A", mid_edge),
		"A": _chances(m, m.A, m.H, m.sA, m.sH, false, "A", "H", mid_edge)}

func _ai_think(m: Dictionary, side: String) -> void:
	var t: Dictionary = m[side]
	var us: int = m.gH if side == "H" else m.gA
	var them: int = m.gA if side == "H" else m.gH
	if m.min == 60 and us < them:
		t.tactics.mentality = "attacking"
	if m.min == 78 and us > them:
		t.tactics.mentality = "defensive"
	if (m.min == 60 or m.min == 70 or m.min == 80) and m.subs[side] < 3:
		var tired = null
		for p in t.xi:
			if p.grp != "GK" and (tired == null or p.fitness < tired.fitness):
				tired = p
		if tired != null and tired.fitness < 78:
			var inn = null
			for b in t.bench:
				if b.grp == tired.grp:
					inn = b
					break
			if inn == null:
				for b in t.bench:
					if b.grp != "GK":
						inn = b
						break
			if inn != null:
				make_sub(m, side, tired.id, inn.id, true)
	m.dirty = true

## One minute of football. Returns that minute's events.
func step_match(m: Dictionary) -> Array:
	if m.done:
		return []
	m.min += 1
	var out := []
	var r := rates(m)
	var rng: RNG = m.rng
	for side in ["H", "A"]:
		var me: Dictionary = m[side]
		var opp: Dictionary = m.A if side == "H" else m.H
		var s_opp: Dictionary = m.sA if side == "H" else m.sH
		if not rng.chance(r[side] / m.total):
			continue
		var of := []
		var fw := []
		var mf := []
		for p in me.xi:
			if p.grp == "GK":
				continue
			of.append(p)
			if p.grp == "FW":
				fw.append(p)
			elif p.grp == "MF":
				mf.append(p)
		var pool := fw + fw + fw + mf + mf + of
		var shooter: Dictionary = rng.pick(pool if not pool.is_empty() else of)
		m.stats[shooter.id].sh += 1
		m.shots[side] += 1
		var p_goal: float = MT.goalFromChance * pow(shooter.attr.shooting / maxf(40.0, s_opp.gk), MT.finishExponent)
		if rng.chance(p_goal):
			if side == "H":
				m.gH += 1
			else:
				m.gA += 1
			m.on_target[side] += 1
			m.stats[shooter.id].g += 1
			shooter.goals += 1
			shooter.seasonGoals += 1
			var assist = null
			if rng.chance(0.7):
				assist = rng.pick(of.filter(func(p): return p.id != shooter.id))
			out.append({"min": m.min, "type": "goal", "side": side, "who": shooter.name, "pid": shooter.id,
				"assist": assist.name if assist != null else null, "score": "%d-%d" % [m.gH, m.gA]})
		else:
			var saved := rng.chance(0.35)
			if saved:
				m.on_target[side] += 1
			var keeper := ""
			for p in opp.xi:
				if p.grp == "GK":
					keeper = p.name
					break
			out.append({"min": m.min, "type": "save" if saved else "chance", "side": side, "who": shooter.name, "pid": shooter.id, "keeper": keeper})
	for side in ["H", "A"]:
		var tire: float = _mod_mul(m, side, "tire") * _instr_mul(m[side], "tire")
		for p in m[side].xi:
			p.fitness = maxf(40.0, p.fitness - MT.fatiguePerMinute * (1.2 - p.attr.stamina / 120.0) * tire)
	if m.min == 45:
		out.append({"min": 45, "type": "ht"})
	for side in ["H", "A"]:
		if m[side].get("ai", false):
			_ai_think(m, side)
	if m.min >= m.total:
		m.done = true
		out.append({"min": m.min, "type": "ft"})
	m.events.append_array(out)
	return out

func shout(m: Dictionary, side: String, key: String) -> bool:
	if not D.shouts.has(key) or m.cool[side].get(key, 0) > m.min:
		return false
	var s: Dictionary = D.shouts[key]
	m.cool[side][key] = m.min + int(s.cooldown)
	var mod: Dictionary = s.effect.duplicate()
	mod.until = m.min + int(s.mins)
	m.mods[side].append(mod)
	if s.has("morale"):
		for p in m[side].xi:
			p.morale = clampf(p.morale + s.morale, 20, 100)
	m.dirty = true
	m.events.append({"min": m.min, "type": "shout", "side": side, "key": key})
	return true

func set_tactic(m: Dictionary, side: String, key: String, val) -> void:
	m[side].tactics[key] = val
	m.dirty = true

func make_sub(m: Dictionary, side: String, out_id: int, in_id: int, quiet := false) -> bool:
	var t: Dictionary = m[side]
	if m.subs[side] >= int(D.season.subsAllowed):
		return false
	var oi := -1
	var ii := -1
	for i in t.xi.size():
		if t.xi[i].id == out_id:
			oi = i
	for i in t.bench.size():
		if t.bench[i].id == in_id:
			ii = i
	if oi < 0 or ii < 0:
		return false
	var off: Dictionary = t.xi[oi]
	var on: Dictionary = t.bench[ii]
	t.xi[oi] = on
	t.bench.remove_at(ii)
	m.subs[side] += 1
	m.played[on.id] = true
	if not m.stats.has(on.id):
		m.stats[on.id] = {"g": 0, "sh": 0, "on": m.min, "off": null}
	m.stats[off.id].off = m.min
	m.dirty = true
	m.events.append({"min": m.min, "type": "sub", "side": side, "off": off.name, "on": on.name, "quiet": quiet})
	return true

func finish_match(m: Dictionary) -> Dictionary:
	while not m.done:
		step_match(m)
	var rng: RNG = m.rng
	var res := "H" if m.gH > m.gA else "A" if m.gH < m.gA else "D"
	var ratings := {}
	for side in ["H", "A"]:
		var t: Dictionary = m[side]
		var conceded: int = m.gA if side == "H" else m.gH
		var won: bool = res == side
		var lost: bool = res != "D" and not won
		var everyone: Array = t.squad.filter(func(p): return m.played.has(p.id)) if t.has("squad") else t.xi
		for p in everyone:
			var s: Dictionary = m.stats.get(p.id, {"g": 0, "sh": 0})
			var r: float = 6.3 + s.g * 1.15 + s.sh * 0.12 + (0.45 if won else -0.35 if lost else 0.0) + (rng.next() - 0.5) * 0.8
			if p.grp == "GK" or p.grp == "DF":
				r += 0.8 if conceded == 0 else -0.25 * conceded
			ratings[p.id] = round(clampf(r, 4, 10) * 10) / 10.0
			p.apps += 1
			p.seasonApps += 1
			if rng.chance(MT.injuryChancePerMatch):
				var w := rng.int_in(int(MT.injuryWeeks[0]), int(MT.injuryWeeks[1]))
				if t.has("medical"):
					w = maxi(1, int(round(w * (1.25 - t.medical * 0.07))))
				p.injured = w
				m.events.append({"min": m.total, "type": "injury", "who": p.name, "side": side})
		var delta: float = MT.moraleDraw if res == "D" else MT.moraleWin if won else MT.moraleLoss
		for p in (t.squad if t.has("squad") else t.xi):
			p.morale = clampf(p.morale + delta * (1.0 if m.played.has(p.id) else 0.4), MT.moraleClamp[0], MT.moraleClamp[1])
	var ids := ratings.keys()
	ids.sort()
	var potm = null
	for id in ids:
		if potm == null or ratings[id] > ratings[potm]:
			potm = id
	m.ratings = ratings
	m.potm = potm
	return {"gH": m.gH, "gA": m.gA, "events": m.events, "total": m.total, "ratings": ratings, "potm": potm,
		"shots": m.shots, "on_target": m.on_target}

func play_match(home: Dictionary, away: Dictionary, seed_value: int, neutral := false) -> Dictionary:
	var h := home.duplicate()
	h.ai = true
	var a := away.duplicate()
	a.ai = true
	return finish_match(create_match(h, a, seed_value, neutral))

# ---------- fixtures and tables ----------
func fixtures(ids: Array, seed_value: int) -> Array:
	var rng := RNG.new(seed_value)
	var arr := ids.duplicate()
	for i in range(arr.size() - 1, 0, -1):
		var j := int(floor(rng.next() * (i + 1)))
		var tmp = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp
	if arr.size() % 2 == 1:
		arr.append(null)
	var n := arr.size()
	var rounds := []
	for r in n - 1:
		var round_ := []
		for i in n / 2:
			var a = arr[i]
			var b = arr[n - 1 - i]
			if a != null and b != null:
				round_.append([a, b] if r % 2 == 1 else [b, a])
		rounds.append(round_)
		arr = [arr[0], arr[n - 1]] + arr.slice(1, n - 1)
	var back := []
	for r in rounds:
		back.append(r.map(func(f): return [f[1], f[0]]))
	return rounds + back

func table(career: Dictionary, div_id: String) -> Array:
	var rows := {}
	for c in career.clubs:
		if c.div == div_id:
			rows[c.id] = {"id": c.id, "p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0, "form": []}
	for m in career.results:
		if m.div != div_id or not rows.has(m.h) or not rows.has(m.a):
			continue
		var h: Dictionary = rows[m.h]
		var a: Dictionary = rows[m.a]
		h.p += 1
		a.p += 1
		h.gf += m.gH
		h.ga += m.gA
		a.gf += m.gA
		a.ga += m.gH
		if m.gH > m.gA:
			h.w += 1
			a.l += 1
			h.pts += 3
			h.form.append("W")
			a.form.append("L")
		elif m.gH < m.gA:
			a.w += 1
			h.l += 1
			a.pts += 3
			h.form.append("L")
			a.form.append("W")
		else:
			h.d += 1
			a.d += 1
			h.pts += 1
			a.pts += 1
			h.form.append("D")
			a.form.append("D")
	var out := rows.values()
	out.sort_custom(func(x, y):
		if x.pts != y.pts:
			return x.pts > y.pts
		var gx: int = x.gf - x.ga
		var gy: int = y.gf - y.ga
		if gx != gy:
			return gx > gy
		if x.gf != y.gf:
			return x.gf > y.gf
		return x.id < y.id)
	return out

func position(career: Dictionary, club_id: String) -> int:
	var t := table(career, club_of(career, club_id).div)
	for i in t.size():
		if t[i].id == club_id:
			return i + 1
	return 0

# ---------- lookups (cached; call reindex() after players change club) ----------
func reindex(career: Dictionary) -> void:
	var by := {}
	var cl := {}
	for c in career.clubs:
		by[c.id] = []
		cl[c.id] = c
	for p in career.players:
		if p.club != null:
			by[p.club].append(p)
	career._sq = by
	career._cl = cl

func club_of(career: Dictionary, id: String) -> Dictionary:
	if not career.has("_cl"):
		reindex(career)
	return career._cl[id]

func squad_of(career: Dictionary, club_id: String) -> Array:
	if not career.has("_sq"):
		reindex(career)
	return career._sq[club_id]

func player(career: Dictionary, id: int):
	for p in career.players:
		if p.id == id:
			return p
	return null

func team_for(career: Dictionary, club_id: String) -> Dictionary:
	var club := club_of(career, club_id)
	var squad := squad_of(career, club_id)
	var tactics: Dictionary = career.tactics[club_id]
	var mine: bool = club_id == career.me
	var sel := my_xi(career) if mine else pick_xi(squad, tactics.formation)
	var bonus: float = (D.coins.boost if career.boost else 0.0) if mine else D.ai[career.difficulty].ratingBonus
	var t := {"club": club, "xi": sel.xi, "bench": sel.bench, "tactics": tactics, "squad": squad, "bonus": bonus, "ai": not mine}
	if mine:
		t.instr = career.instr
		t.chem = chemistry(career)
		t.medical = career.facilities.medical
	return t

func squad_strength(career: Dictionary, club_id: String) -> float:
	var s := squad_of(career, club_id).map(func(p): return p.rating)
	s.sort()
	s.reverse()
	s = s.slice(0, 14)
	if s.is_empty():
		return 0.0
	var tot := 0
	for v in s:
		tot += v
	return tot / float(s.size())

func difficulty(career: Dictionary, opp: String) -> int:
	return clampi(int(round(3 + (squad_strength(career, opp) - squad_strength(career, career.me)) / 3.0)), 1, 5)

# ---------- board ----------
func brief(career: Dictionary, club_id: String) -> Dictionary:
	var club := club_of(career, club_id)
	var div: Dictionary = DB.divisions[club.div]
	var ranked := []
	for c in career.clubs:
		if c.div == club.div:
			ranked.append({"id": c.id, "s": squad_strength(career, c.id) + c.rep * 0.05})
	ranked.sort_custom(func(a, b): return a.s > b.s if a.s != b.s else a.id < b.id)
	var rank := 0
	for i in ranked.size():
		if ranked[i].id == club_id:
			rank = i + 1
	var n := ranked.size()
	var b: Dictionary = _brief_row(div.tier, rank)
	var target := int(b.target)
	var warn := int(b.warn)
	return {"text": b.text, "target": n + target if target < 0 else target, "warn": n + warn if warn < 0 else warn, "rank": rank,
		"style": D.board.styles[RNG.hash_str(club_id) % D.board.styles.size()]}

func _brief_row(tier: int, rank: int) -> Dictionary:
	for x in (D.board.top if tier == 1 else D.board.lower):
		if rank <= int(x.upTo):
			return x
	return {}

## Before a career exists: rank by reputation.
func preview_brief(club_id: String) -> String:
	var club := DB.club(club_id)
	var peers := DB.clubs_in(club.div)
	peers.sort_custom(func(a, b): return a.rep > b.rep if a.rep != b.rep else a.id < b.id)
	return _brief_row(DB.divisions[club.div].tier, peers.find(club) + 1).text

# ---------- finances (£k) ----------
func week_finance(career: Dictionary, club_id: String, home: bool) -> Dictionary:
	var c := club_of(career, club_id)
	var div: Dictionary = DB.divisions[c.div]
	var tier := str(div.tier)
	var wages := 0
	for p in squad_of(career, club_id):
		wages += p.wage
	var mine: bool = club_id == career.me
	var price: float = career.ticket if mine and career.ticket != null else FN.ticket[tier]
	var fill: float = attendance(career) if mine else minf(1.0, 0.72 + c.rep / 400.0)
	var gate := int(round(c.capacity * fill * price / 1000.0)) if home else 0
	var commercial := int(round(pow(c.rep, 3) / 400.0 * FN.commercialTierMul[tier]))
	return {"wages": wages, "gate": gate, "commercial": commercial, "tv": div.tv, "net": gate + commercial + div.tv - wages}

# ---------- career ----------
func new_career(seed_value: int, my_club: String, opts: Dictionary = {}) -> Dictionary:
	var rng := RNG.new(seed_value)
	var clubs := []
	for c in DB.clubs:
		clubs.append(c.duplicate(true))
	var me: Dictionary = clubs.filter(func(c): return c.id == my_club)[0]
	var start := int(D.season.startYear)
	var career := {"version": int(D.version), "seed": seed_value, "me": my_club, "difficulty": opts.get("difficulty", "normal"),
		"legendsOn": opts.get("legends", false), "season": start, "week": 0, "clubs": clubs, "players": [], "results": [],
		"balances": {}, "tactics": {}, "news": [], "history": [], "inbox": [],
		"board": {"confidence": float(D.board.start), "warned": false}, "fans": int(D.fans.start), "matchesPlayed": 0, "nextId": 1,
		"manager": {"name": opts.get("name", "The Boss"), "nat": opts.get("nat", "ENG"), "games": 0, "w": 0, "d": 0, "l": 0,
			"trophies": [], "sackings": 0, "clubs": [{"id": my_club, "name": me.name, "from": start}]},
		"stats": {"legendsSigned": 0, "derbyWins": 0, "bigWins": 0, "unbeaten": 0, "bestUnbeaten": 0},
		"coins": int(D.coins.start), "ticket": null, "build": null, "lineup": null, "fam": {}, "boost": false,
		"instr": {"press": 3, "line": 3, "pass": 3, "toggles": {}}, "preset": null, "setp": {}, "pending": false, "sacked": false,
		"facilities": _start_facilities(me), "fixtures": {}}
	for c in clubs:
		var r := rng.fork("squad:" + c.id)
		var real := []
		for s in DB.squads.get(c.id, []):
			real.append(make_player(c.id, s, _next_id(career)))
		career.players.append_array(real)
		career.players.append_array(fill_squad(c, real, r, career))
	for c in clubs:
		career.balances[c.id] = int(round(c.rep * c.rep * FN.balanceMul[str(DB.divisions[c.div].tier)]))
		career.tactics[c.id] = {"formation": "4-3-3" if c.rep >= 80 else "4-2-3-1" if c.rep >= 60 else "4-4-2",
			"mentality": "attacking" if c.rep >= 85 else "balanced", "style": D.board.styles[RNG.hash_str(c.id) % 3]}
	for d in DB.division_list:
		career.fixtures[d.id] = fixtures(_ids_in(career, d.id), seed_value ^ RNG.hash_str(d.id))
	reindex(career)
	if career.legendsOn:
		_add_legends(career, rng.fork("legends"))
		reindex(career)
	auto_roles(career)
	career.brief = brief(career, my_club)
	news(career, "%s appoint %s as manager. The board's brief: %s." % [me.name, career.manager.name, career.brief.text.to_lower()], "board")
	mail(career, "board", "The Chairman", "Welcome to %s. Our brief for this season: %s. We also want to see %s football." % [
		me.name, career.brief.text.to_lower(), D.styles[career.brief.style].label.to_lower()])
	return career

func _ids_in(career: Dictionary, div_id: String) -> Array:
	var out := []
	for c in career.clubs:
		if c.div == div_id:
			out.append(c.id)
	return out

func club_name(career: Dictionary, id) -> String:
	return club_of(career, id).name if id != null and career._cl.has(id) else str(id)

func news(career: Dictionary, text: String, kind := "news") -> void:
	career.news.push_front({"season": career.season, "week": career.week, "text": text, "kind": kind})
	if career.news.size() > 80:
		career.news.resize(80)

func mail(career: Dictionary, kind: String, from: String, text: String) -> void:
	career.inbox.push_front({"season": career.season, "week": career.week, "kind": kind, "from": from, "text": text, "read": false})
	if career.inbox.size() > 60:
		career.inbox.resize(60)

func _add_legends(career: Dictionary, rng: RNG) -> void:
	var L: Dictionary = D.legends
	var big: Array = career.clubs.filter(func(c): return c.rep >= L.aiClubMinRep and c.id != career.me)
	var count := {}
	var list := DB.legends.duplicate()
	list.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.name < b.name)
	for s in list:
		var p := make_player(null, s, _next_id(career), {"legend": true, "known": s.get("known", "")})
		if rng.chance(L.aiSignShare) and not big.is_empty():
			var opts := big.filter(func(c): return count.get(c.id, 0) < int(L.perClubMax))
			if not opts.is_empty():
				var c: Dictionary = weighted_pick(opts, rng)
				p.club = c.id
				count[c.id] = count.get(c.id, 0) + 1
		career.players.append(p)

func weighted_pick(list: Array, rng: RNG) -> Dictionary:
	var tot := 0
	for c in list:
		tot += c.rep
	var r := rng.next() * tot
	for c in list:
		r -= c.rep
		if r <= 0:
			return c
	return list[-1]

func free_agents(career: Dictionary) -> Array:
	var out: Array = career.players.filter(func(p): return p.club == null)
	out.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
	return out

func can_sign(career: Dictionary, p: Dictionary) -> Dictionary:
	if squad_of(career, career.me).size() >= int(D.season.squadMax):
		return {"ok": false, "why": "Squad is full (%d)" % int(D.season.squadMax)}
	var me := club_of(career, career.me)
	if p.get("legend", false) and me.rep < p.rating - D.legends.repGap:
		return {"ok": false, "why": "Wants a bigger club (rep %d+)" % (p.rating - int(D.legends.repGap))}
	var f := week_finance(career, career.me, true)
	if f.net - p.wage < 0 and career.balances[career.me] < p.wage * 52:
		return {"ok": false, "why": "Board: can't afford £%dk a week" % p.wage}
	return {"ok": true}

func sign_player(career: Dictionary, pid: int) -> bool:
	var p = player(career, pid)
	if p == null or p.club != null or not can_sign(career, p).ok:
		return false
	p.club = career.me
	p.morale = 82.0
	if p.get("legend", false):
		career.stats.legendsSigned += 1
		career.fans = clampi(career.fans + int(D.fans.legendSigned), 0, 100)
	reindex(career)
	news(career, "%s signs for %s on £%dk a week." % [p.name, club_name(career, career.me), p.wage], "transfer")
	return true

func release(career: Dictionary, pid: int) -> bool:
	var p = player(career, pid)
	if p == null or p.club != career.me or squad_of(career, career.me).size() <= int(D.season.squadMin):
		return false
	p.club = null
	reindex(career)
	news(career, "%s leaves %s by mutual consent." % [p.name, club_name(career, career.me)], "transfer")
	return true

func _ai_market(career: Dictionary, rng: RNG) -> void:
	var L: Dictionary = D.legends
	var big: Array = career.clubs.filter(func(c): return c.rep >= 75 and c.id != career.me)
	for p in free_agents(career):
		if not p.get("legend", false) or not rng.chance(L.weeklyAiChance):
			continue
		var opts := big.filter(func(c):
			var sq := squad_of(career, c.id)
			return sq.size() < int(D.season.squadMax) and sq.filter(func(q): return q.get("legend", false)).size() < int(L.perClubMax))
		if opts.is_empty():
			continue
		var c: Dictionary = weighted_pick(opts, rng)
		p.club = c.id
		reindex(career)
		news(career, "%s joins %s." % [p.name, c.name], "transfer")

# ---------- weeks ----------
func my_div(career: Dictionary) -> String:
	return club_of(career, career.me).div

func season_length(career: Dictionary) -> int:
	var n := 0
	for id in career.fixtures:
		n = maxi(n, career.fixtures[id].size())
	return n

func my_fixture(career: Dictionary, week: int = -1):
	var w: int = career.week if week < 0 else week
	var rounds: Array = career.fixtures[my_div(career)]
	if w >= rounds.size():
		return null
	for f in rounds[w]:
		if f[0] == career.me or f[1] == career.me:
			return {"h": f[0], "a": f[1], "home": f[0] == career.me}
	return null

func match_seed(career: Dictionary, h: String, a: String) -> int:
	return (career.seed ^ (career.season * 31) ^ (career.week * 7919) ^ RNG.hash_str(h + a)) & RNG.M

func settle(career: Dictionary, div_id: String, h: String, a: String, r: Dictionary) -> void:
	career.results.append({"season": career.season, "week": career.week, "div": div_id, "h": h, "a": a, "gH": r.gH, "gA": r.gA})
	career.balances[h] += week_finance(career, h, true).net
	career.balances[a] += week_finance(career, a, false).net

## Plays every fixture this week except mine; returns my match ready to play live (or null on a bye).
func start_week(career: Dictionary):
	var w: int = career.week
	if w >= season_length(career):
		return null
	var live = null
	for div_id in career.fixtures:
		var rounds: Array = career.fixtures[div_id]
		if w >= rounds.size():
			continue
		for f in rounds[w]:
			var h: String = f[0]
			var a: String = f[1]
			if h == career.me or a == career.me:
				live = create_match(team_for(career, h), team_for(career, a), match_seed(career, h, a))
				live.h = h
				live.a = a
				live.div = div_id
				continue
			settle(career, div_id, h, a, play_match(team_for(career, h), team_for(career, a), match_seed(career, h, a)))
	career.pending = live != null
	return live

func finish_week(career: Dictionary, live):
	var mine = null
	if live != null:
		var r := finish_match(live)
		settle(career, live.div, live.h, live.a, r)
		mine = r
		mine.h = live.h
		mine.a = live.a
		mine.div = live.div
		career.matchesPlayed += 1
		_after_my_match(career, mine)
		var us: int = mine.gH if mine.h == career.me else mine.gA
		var them: int = mine.gA if mine.h == career.me else mine.gH
		career.coins += int(D.coins.win) if us > them else int(D.coins.draw) if us == them else 0
		var f: String = career.tactics[career.me].formation
		career.fam[f] = minf(1.0, career.fam.get(f, 0.5) + 0.06)
		career.boost = false
	if career.build != null and career.week + 1 >= career.build.ready:
		var c := club_of(career, career.me)
		c.capacity += career.build.seats
		news(career, "The new stand is open! %s now holds %s." % [c.stadium, commas(c.capacity)], "board")
		mail(career, "board", "Stadium Manager", "Construction is complete. Capacity is now %s." % commas(c.capacity))
		career.build = null
	for p in career.players:
		if p.club == null:
			continue
		p.fitness = minf(100.0, p.fitness + 30)
		if p.injured > 0:
			p.injured -= 1
	if career.legendsOn:
		_ai_market(career, RNG.new(career.seed ^ (career.season * 104729) ^ (career.week * 7919)))
	career.week += 1
	career.pending = false
	return mine

## Headless: my match plays itself.
func play_week(career: Dictionary):
	var live = start_week(career)
	if live != null:
		live.H.ai = true
		live.A.ai = true
	if career.week >= season_length(career) and live == null:
		return null
	return finish_week(career, live)

func _after_my_match(career: Dictionary, m: Dictionary) -> void:
	var B: Dictionary = D.board
	var home: bool = m.h == career.me
	var us: int = m.gH if home else m.gA
	var them: int = m.gA if home else m.gH
	var opp: String = m.a if home else m.h
	var me := club_of(career, career.me)
	var derby: bool = opp == me.rival
	var mg: Dictionary = career.manager
	var st: Dictionary = career.stats
	mg.games += 1
	if us > them:
		mg.w += 1
	elif us < them:
		mg.l += 1
	else:
		mg.d += 1
	if us >= them:
		st.unbeaten += 1
		st.bestUnbeaten = maxi(st.bestUnbeaten, st.unbeaten)
	else:
		st.unbeaten = 0
	if derby and us > them:
		st.derbyWins += 1
	if us - them >= 4:
		st.bigWins += 1
	var d: float = B.win if us > them else B.loss if us < them else B.draw
	if derby:
		d *= 2
	if career.week >= int(B.fromWeek):
		var pos := position(career, career.me)
		d += (career.brief.warn - pos) * B.positionWeight * 0.3 + (0.6 if pos <= career.brief.target else 0.0)
	if career.tactics[career.me].style == career.brief.style:
		d += 0.3
	career.board.confidence = round(clampf(career.board.confidence + d, B.clamp[0], B.clamp[1]) * 10) / 10.0
	var fd: float = (D.fans.win if us > them else D.fans.loss if us < them else D.fans.draw) * (2 if derby else 1) + (1 if us >= 3 else 0)
	career.fans = clampi(int(round(career.fans + fd)), 0, 100)
	if derby:
		var on := club_name(career, opp)
		news(career, ("Derby joy: %s beat %s %d–%d." % [me.short, on, us, them]) if us > them else ("Derby pain: %s lose %d–%d to %s." % [me.short, them, us, on]) if us < them else ("Honours even in the derby, %d–%d." % [us, them]), "derby")
	if career.board.confidence <= B.warnAt and not career.board.warned:
		career.board.warned = true
		mail(career, "warning", "The Chairman", "The board have called you in. Results must improve quickly, or we will act.")
		career.alert = "warning"
	if career.board.confidence > B.warnAt + 15:
		career.board.warned = false
	if career.board.confidence <= 0:
		career.sacked = true

# ---------- press conferences ----------
func press_for(career: Dictionary, fx):
	if fx == null:
		return null
	var me := club_of(career, career.me)
	var opp: String = fx.a if fx.home else fx.h
	var derby: bool = opp == me.rival
	var big := difficulty(career, opp) >= 4
	var recent: Array = career.results.filter(func(r): return r.h == career.me or r.a == career.me).slice(-3)
	var lost3: bool = recent.size() == 3 and recent.all(func(r): return r.gH < r.gA if r.h == career.me else r.gA < r.gH)
	if not (derby or big or lost3 or (career.week > 0 and career.week % 4 == 0)):
		return null
	var tag := "derby" if derby else "slump" if lost3 else "big" if big else "general"
	var pool: Array = D.press.filter(func(q): return q.tag == tag)
	var q: Dictionary = pool[(career.week + career.season) % pool.size()]
	var fill := func(s: String) -> String: return s.replace("{opp}", club_name(career, opp)).replace("{club}", me.name)
	var answers := []
	for a in q.answers:
		var c: Dictionary = a.duplicate()
		c.text = fill.call(a.text)
		answers.append(c)
	return {"tag": tag, "q": fill.call(q.q), "answers": answers}

func apply_press(career: Dictionary, answer: Dictionary) -> void:
	for p in squad_of(career, career.me):
		p.morale = clampf(p.morale + answer.get("morale", 0), 20, 100)
	career.board.confidence = clampf(career.board.confidence + answer.get("board", 0), 0, 100)
	career.fans = clampi(career.fans + int(answer.get("fans", 0)), 0, 100)
	news(career, "%s: “%s”" % [career.manager.name, answer.text], "press")

# ---------- end of season ----------
func _playoffs(career: Dictionary, div_id: String, rng: RNG):
	var d: Dictionary = DB.divisions[div_id]
	if d.playoff == null:
		return null
	var t := table(career, div_id)
	var round_: Array = t.slice(d.playoff[0] - 1, d.playoff[1]).map(func(r): return r.id)
	while round_.size() > 1:
		var nxt := []
		for i in ceili(round_.size() / 2.0):   # with three sides left the middle seed 'plays itself', i.e. gets a bye (as in the web game)
			var h: String = round_[i]
			var x: String = round_[round_.size() - 1 - i]
			var r := play_match(team_for(career, h), team_for(career, x), rng.int_in(1, 1000000000), true)
			nxt.append(h if r.gH > r.gA else x if r.gH < r.gA else (h if rng.chance(0.5) else x))
		round_ = nxt
	return round_[0]

func end_season(career: Dictionary) -> Dictionary:
	while career.week < season_length(career):
		play_week(career)
	var rng := RNG.new(career.seed ^ (career.season * 977))
	var moves := []
	var summary := {"season": career.season, "tables": {}, "champions": {}, "promoted": [], "relegated": [], "topScorer": {}, "playoffWinners": {}}
	var rec := {"w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0}
	for r in career.results:
		if r.h != career.me and r.a != career.me:
			continue
		var us: int = r.gH if r.h == career.me else r.gA
		var them: int = r.gA if r.h == career.me else r.gH
		rec.gf += us
		rec.ga += them
		rec["w" if us > them else "l" if us < them else "d"] += 1
	summary.record = rec
	for cid in DB.countries:
		var divs := DB.divisions_of(cid)
		for i in divs.size():
			var d: Dictionary = divs[i]
			var t := table(career, d.id)
			summary.tables[d.id] = t.map(func(r): return r.id)
			summary.champions[d.id] = t[0].id
			var ts = null
			for p in career.players:
				if p.club == null or club_of(career, p.club).div != d.id:
					continue
				if ts == null or p.seasonGoals > ts.seasonGoals or (p.seasonGoals == ts.seasonGoals and p.rating > ts.rating):
					ts = p
			if ts != null:
				summary.topScorer[d.id] = {"name": ts.name, "club": ts.club, "goals": ts.seasonGoals, "id": ts.id}
			if i + 1 < divs.size() and d.down > 0:
				for r in t.slice(t.size() - d.down):
					moves.append([r.id, divs[i + 1].id])
			if i > 0:
				var ups: Array = t.slice(0, d.up).map(func(r): return r.id)
				var po = _playoffs(career, d.id, rng)
				if po != null and not ups.has(po):
					ups.append(po)
					summary.playoffWinners[d.id] = po
				for id in ups:
					moves.append([id, divs[i - 1].id])
	var my_d := my_div(career)
	var my_pos: int = summary.tables[my_d].find(career.me) + 1
	var div_name: String = DB.divisions[my_d].name
	var beat: bool = my_pos <= career.brief.target
	var missed: bool = my_pos > career.brief.warn
	career.board.confidence = clampf(career.board.confidence + (D.board.seasonBeat if beat else D.board.seasonMiss if missed else 0.0), 0, 100)
	summary.merge({"myPos": my_pos, "myDiv": my_d, "brief": career.brief.text, "beat": beat, "missed": missed})
	for mv in moves:
		var c := club_of(career, mv[0])
		var from: String = c.div
		c.div = mv[1]
		(summary.promoted if DB.divisions[mv[1]].tier < DB.divisions[from].tier else summary.relegated).append(mv[0])
	var me_name := club_name(career, career.me)
	var tier: int = DB.divisions[my_d].tier
	if my_pos == 1:
		career.manager.trophies.append({"season": career.season, "label": div_name + " title", "club": me_name, "kind": "league", "tier": tier})
	elif summary.promoted.has(career.me):
		career.manager.trophies.append({"season": career.season, "label": ("Play-off winners" if summary.playoffWinners.get(my_d) == career.me else "Promotion") + " — " + div_name,
			"club": me_name, "kind": "promotion", "tier": tier})
	if missed and career.board.confidence < 30:
		career.sacked = true
	# players age, grow and retire; AI squads are topped up with youth
	var G: Dictionary = D.growth
	for p in career.players:
		p.age += 1
		if p.age <= int(G.youngUpTo):
			p.rating = mini(p.pot, p.rating + rng.int_in(int(G.youngGain[0]), int(G.youngGain[1])) + (career.facilities.training / 4 if p.club == career.me else 0))
		elif p.age >= int(G.declineFrom):
			p.rating -= rng.int_in(int(G.decline[0]), int(G.decline[1])) + (1 if p.age >= 34 else 0)
		else:
			p.rating += rng.int_in(-1, 1)
		p.rating = clampi(p.rating, 35, 95)
		p.pot = maxi(p.pot, p.rating)
		p.attr = make_attr(p)
		p.wage = wage(p)
		p.seasonGoals = 0
		p.seasonApps = 0
		p.injured = 0
		p.fitness = 100.0
		p.morale = 70.0
	var keep := []
	for p in career.players:
		var gone: bool = p.age >= int(G.retireHardAge) or (p.age >= int(G.retireAge) and p.rating < 72 + (p.age - int(G.retireAge)) * 3)
		if gone:
			if p.club == career.me:
				news(career, "%s retires after a fine career." % p.name)
		else:
			keep.append(p)
	career.players = keep
	reindex(career)
	for c in career.clubs:
		if c.id == career.me:
			continue
		var sq := squad_of(career, c.id)
		if sq.size() < int(D.gen.squadSize):
			career.players.append_array(fill_squad(c, sq, rng.fork("youth" + c.id + str(career.season)), career))
	reindex(career)
	summary.intake = _youth_intake(career, rng)
	reindex(career)
	if beat:
		career.coins += int(D.coins.briefMet)
	career.history.append(summary)
	career.season += 1
	career.week = 0
	career.results = []
	career.stats.unbeaten = 0
	for d in DB.division_list:
		career.fixtures[d.id] = fixtures(_ids_in(career, d.id), career.seed ^ RNG.hash_str(d.id) ^ career.season)
	career.brief = brief(career, career.me)
	career.board.warned = false
	news(career, "New season %d/%s. Brief: %s." % [career.season, str(career.season + 1).substr(2), career.brief.text.to_lower()], "board")
	mail(career, "board", "The Chairman", "A new season. Our brief: %s." % career.brief.text.to_lower())
	return summary

func job_offers(career: Dictionary) -> Array:
	var me := club_of(career, career.me)
	var rng := RNG.new(career.seed ^ career.season ^ career.week)
	var pool: Array = career.clubs.filter(func(c): return c.id != me.id and c.rep <= me.rep - 3 and c.rep >= me.rep - 30)
	var out := []
	while out.size() < 3 and not pool.is_empty():
		out.append(pool.pop_at(rng.int_in(0, pool.size() - 1)))
	return out

func take_job(career: Dictionary, club_id: String) -> void:
	var old: String = career.me
	career.me = club_id
	career.sacked = false
	career.board = {"confidence": float(D.board.start), "warned": false}
	career.fans = int(D.fans.start)
	career.manager.sackings += 1
	career.manager.clubs.append({"id": club_id, "name": club_name(career, club_id), "from": career.season})
	career.lineup = null
	career.facilities = _start_facilities(club_of(career, club_id))
	career.brief = brief(career, club_id)
	auto_roles(career)
	news(career, "%s appoint %s, formerly of %s." % [club_name(career, club_id), career.manager.name, club_name(career, old)], "board")
	mail(career, "board", "The Chairman", "Welcome to %s. Our brief: %s." % [club_name(career, club_id), career.brief.text.to_lower()])

# ---------- club systems: facilities, stadium, roles, line-up, chemistry ----------
func _start_facilities(c: Dictionary) -> Dictionary:
	var l := clampi(int(round(c.rep / 12.0)), 1, 9)
	return {"training": l, "youth": clampi(l - 1 + (RNG.hash_str(c.id) % 3), 1, 9), "scouting": clampi(l - 1, 1, 9), "medical": clampi(l, 1, 9)}

func base_price(career: Dictionary) -> float:
	return FN.ticket[str(DB.divisions[my_div(career)].tier)]

func attendance(career: Dictionary) -> float:
	var c := club_of(career, career.me)
	var base := base_price(career)
	var price: float = career.ticket if career.ticket != null else base
	var demand: float = 0.72 + c.rep / 400.0 + (career.fans - 60) / 400.0
	return clampf(demand * (1 - 0.45 * (price / base - 1)), 0.25, 1.0)

func rep_tier(rep: int) -> String:
	for r in D.reputation:
		if rep >= r[0]:
			return r[1]
	return ""

func auto_roles(career: Dictionary) -> void:
	var sq := squad_of(career, career.me).duplicate()
	sq.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
	var cap = null
	for p in sq:
		if p.age >= 26:
			cap = p
			break
	if cap == null and not sq.is_empty():
		cap = sq[0]
	career.captain = cap.id if cap != null else null

## My XI: the saved line-up where it is still valid, auto-picked otherwise.
func my_xi(career: Dictionary) -> Dictionary:
	var sq := squad_of(career, career.me)
	var f: String = career.tactics[career.me].formation
	var auto := pick_xi(sq, f)
	if career.lineup == null or career.lineup.f != f:
		return auto
	var by := {}
	for p in sq:
		by[p.id] = p
	var used := {}
	var xi := []
	for id in career.lineup.ids:
		var p = by.get(id)
		if p != null and p.injured == 0 and not used.has(id):
			xi.append(p)
			used[id] = true
		else:
			xi.append(null)
	for i in xi.size():
		if xi[i] != null:
			continue
		var g: String = auto.xi[i].grp if i < auto.xi.size() else "MF"
		var best = null
		for p in sq:
			if p.injured > 0 or used.has(p.id):
				continue
			if best == null or (p.grp == g and best.grp != g) or ((p.grp == g) == (best.grp == g) and p.rating > best.rating):
				best = p
		if best != null:
			xi[i] = best
			used[best.id] = true
	var rest := sq.filter(func(p): return p.injured == 0 and not used.has(p.id))
	rest.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
	return {"xi": xi.filter(func(p): return p != null), "bench": rest.slice(0, int(D.season.subsOnBench))}

func swap_into_xi(career: Dictionary, out_id: int, in_id: int) -> bool:
	var cur: Array = my_xi(career).xi.map(func(p): return p.id)
	var i := cur.find(out_id)
	if i < 0:
		return false
	var j := cur.find(in_id)
	if j >= 0:
		cur[j] = out_id
	cur[i] = in_id
	career.lineup = {"f": career.tactics[career.me].formation, "ids": cur}
	return true

## Group each XI slot expects, in order: GK, defenders, midfielders, forwards.
func slot_groups(formation: String) -> Array:
	var f: Dictionary = D.formations[formation]
	var out := ["GK"]
	for g in ["DF", "MF", "FW"]:
		for i in int(f[g]):
			out.append(g)
	return out

func chemistry(career: Dictionary) -> int:
	var xi: Array = my_xi(career).xi
	if xi.is_empty():
		return 50
	var f: String = career.tactics[career.me].formation
	var slots := slot_groups(f)
	var morale := 0.0
	var fit := 0
	for i in xi.size():
		morale += xi[i].morale
		if i < slots.size() and xi[i].grp == slots[i]:
			fit += 1
	morale /= xi.size()
	return clampi(int(round(20 + morale * 0.35 + career.fam.get(f, 0.5) * 25 + fit / float(xi.size()) * 25)), 0, 99)

func _youth_intake(career: Dictionary, rng: RNG) -> Array:
	var c := club_of(career, career.me)
	var lvl: int = career.facilities.youth
	var div: Dictionary = DB.divisions[c.div]
	var band: Array = div.band if div.band != null else [62, 72]
	var n := 2 + lvl / 3
	var out := []
	for i in n:
		var g: String = rng.pick(["DF", "MF", "MF", "FW", "FW", "GK"])
		var pos: String = rng.pick(D.gen.detailByGroup[g])
		var age := rng.int_in(16, 17)
		var r := clampi(band[0] - 6 + lvl + rng.int_in(-3, 3), 42, 75)
		var pot := clampi(r + 10 + lvl * 2 + rng.int_in(0, 10), r + 5, 94)
		var p := make_player(c.id, {"name": gen_name(c.country, rng), "pos": pos, "age": age, "rating": r, "pot": pot, "nat": c.country},
			_next_id(career), {"gen": true, "youth": true})
		career.players.append(p)
		out.append(p.id)
	mail(career, "youth", "Academy Director", "Youth intake day: %d academy graduates join the squad." % n)
	return out

func commas(n: int) -> String:
	var s := str(n)
	var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return s + out

# ---------- shapes: where each of the eleven stands ----------
## Position code for a cell of the 6-row, 5-column tactics grid (rows GK, D, DM, M, AM, ST).
func slot_code(row: int, col: int) -> String:
	var side := "L" if col == 0 else "R" if col == 4 else "C"
	match row:
		0: return "GK"
		1: return "D" + side
		2: return "DM" if side == "C" else "WB" + side
		3: return "M" + side
		4: return "AM" + side
		_: return "ST"

## The eleven slots of a formation: [{code, grp, x, y}], x and y as fractions of a pitch with the attack at the top.
func shape_slots(formation: String) -> Array:
	var out := []
	var ys := [0.91, 0.745, 0.61, 0.475, 0.32, 0.16]
	var cells: Array = D.shapes.get(formation, [])
	var per_row := {}
	for s in cells:
		per_row[int(s[0])] = per_row.get(int(s[0]), 0) + 1
	for s in cells:
		var r := int(s[0])
		var col := int(s[1])
		var code := slot_code(r, col)
		out.append({"code": code, "grp": D.grid.grp[code], "x": 0.13 + col * 0.185, "y": ys[r], "row": r, "col": col})
	return out

## Pairs each starter with a slot of his own group, favouring the side he plays on: [{slot, p}].
func layout_xi(xi: Array, formation: String) -> Array:
	var slots := shape_slots(formation)
	var left := xi.duplicate()
	var out := []
	for s in slots:
		var fits: Array = D.grid.fits.get(s.code, [])
		var best = null
		var best_score := 999
		for p in left:
			var f := fits.find(p.pos)
			var score: int = (f if f >= 0 else 9) + (0 if p.grp == s.grp else 100)
			if score < best_score:
				best = p
				best_score = score
		if best != null:
			left.erase(best)
			out.append({"slot": s, "p": best})
	return out
