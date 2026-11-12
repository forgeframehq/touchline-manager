extends Node
## The world and the manager's week: players as people, squads, the league, money, the board,
## what lands on your desk, how you spend your time, transfers, and the turn of the season.
## Matches you manage are played by MatchEngine (core/engine.gd); everyone else's use quick_match() here.

const ATTRS := ["pace", "passing", "shooting", "dribbling", "tackling", "heading", "vision", "stamina", "handling", "reflexes"]
const TRAITS := ["Leader", "Professional", "Ambitious", "Temperamental", "Easygoing", "Loyal"]
const MENTALITY := ["Very defensive", "Defensive", "Balanced", "Attacking", "All-out attack"]
const TEMPO := ["Patient", "Normal", "Fast"]
const PRESS := ["Stand off", "Normal", "Press high"]
## How each position differs from a player's general level, on the 1-20 attribute scale.
const PROFILE := {
	"GK": {"handling": 2.0, "reflexes": 2.5, "passing": -4.0, "shooting": -9.0, "dribbling": -8.0, "tackling": -7.0, "heading": -5.0, "pace": -4.0, "vision": -2.0, "stamina": -3.0},
	"CB": {"tackling": 2.5, "heading": 2.5, "pace": -1.0, "passing": -1.5, "shooting": -6.0, "dribbling": -4.5, "vision": -2.0, "stamina": 0.0},
	"FB": {"tackling": 1.5, "pace": 2.0, "stamina": 2.0, "passing": 0.0, "dribbling": -0.5, "heading": -2.0, "shooting": -5.0, "vision": -1.5},
	"CDM": {"tackling": 2.5, "passing": 1.0, "stamina": 1.5, "vision": 0.5, "heading": 0.5, "pace": -1.5, "dribbling": -2.0, "shooting": -3.5},
	"CM": {"passing": 2.0, "vision": 1.5, "stamina": 1.5, "tackling": 0.0, "dribbling": 0.0, "shooting": -1.5, "pace": -1.0, "heading": -2.0},
	"CAM": {"passing": 2.0, "vision": 2.5, "dribbling": 2.0, "shooting": 0.5, "pace": 0.0, "stamina": -0.5, "tackling": -4.5, "heading": -3.0},
	"WM": {"pace": 2.0, "dribbling": 1.5, "passing": 1.0, "stamina": 1.5, "shooting": -1.0, "tackling": -2.5, "vision": 0.0, "heading": -3.0},
	"W": {"pace": 2.5, "dribbling": 2.5, "shooting": 1.0, "passing": 0.5, "vision": 0.0, "stamina": 0.0, "tackling": -5.5, "heading": -3.5},
	"ST": {"shooting": 2.5, "heading": 1.0, "pace": 1.5, "dribbling": 1.0, "vision": -0.5, "passing": -1.5, "stamina": -0.5, "tackling": -6.0},
}
const PROFILE_OF := {"GK": "GK", "CB": "CB", "LB": "FB", "RB": "FB", "CDM": "CDM", "CM": "CM", "CAM": "CAM", "LM": "WM", "RM": "WM", "LW": "W", "RW": "W", "ST": "ST"}
const GRP := {"GK": "GK", "CB": "DF", "LB": "DF", "RB": "DF", "CDM": "MF", "CM": "MF", "CAM": "MF", "LM": "MF", "RM": "MF", "LW": "FW", "RW": "FW", "ST": "FW"}
const GEN_SHAPE := {"GK": ["GK", "GK", "GK"], "DF": ["CB", "CB", "CB", "CB", "LB", "LB", "RB", "RB"], "MF": ["CDM", "CM", "CM", "CM", "CAM", "LM", "RM"], "FW": ["ST", "ST", "ST", "LW", "RW"]}
const TIER_MONEY := {1: 1.0, 2: 0.25, 3: 0.08, 4: 0.04, 5: 0.02}
const TICKET := {1: 45, 2: 28, 3: 22, 4: 20, 5: 15}
const SQUAD_MAX := 30
const SQUAD_MIN := 18

func grp_of(pos: String) -> String:
	return GRP.get(pos, "MF")

# ---------- players ----------
func make_attr(p: Dictionary) -> Dictionary:
	var rng := RNG.new(RNG.imul(p.id, 2654435761) ^ RNG.hash_str(p.pos))
	var base := clampf((p.rating - 28) / 3.6, 1.0, 20.0)
	var prof: Dictionary = PROFILE[PROFILE_OF.get(p.pos, "CM")]
	var a := {}
	for k in ATTRS:
		if k == "handling" or k == "reflexes":
			a[k] = clampi(int(round(base + prof[k] + rng.next() * 2 - 1)), 1, 20) if p.pos == "GK" else rng.int_in(1, 3)
		else:
			a[k] = clampi(int(round(base + prof.get(k, 0.0) + rng.next() * 3 - 1.5)), 1, 20)
	return a

func make_player(club_id, src: Dictionary, id: int) -> Dictionary:
	var p := {"id": id, "club": club_id, "name": src.name, "pos": src.pos, "grp": grp_of(src.pos), "age": src.age, "rating": src.rating,
		"pot": maxi(src.get("pot", src.rating), src.rating), "nat": src.get("nat", ""), "trait": TRAITS[RNG.new(id * 7919 + 13).int_in(0, TRAITS.size() - 1)],
		"morale": 65.0, "fitness": 100.0, "trust": 50.0, "injured": 0, "goals": 0, "apps": 0, "seasonGoals": 0, "seasonApps": 0,
		"rsum": 0.0, "dev": 0, "boost": 0, "promise": false}
	p.attr = make_attr(p)
	p.wage = wage(p)
	return p

func wage(p: Dictionary) -> int:
	return maxi(1, int(round(1.2 * exp((p.rating - 50) * 0.115))))

## Transfer value in £m.
func value(p: Dictionary) -> float:
	var age_mul := 1.5 if p.age < 22 else 1.25 if p.age < 25 else 1.0 if p.age <= 29 else maxf(0.12, 1 - (p.age - 29) * 0.17)
	return maxf(0.1, round(0.04 * exp((p.rating - 50) * 0.19) * age_mul * (1 + maxi(0, p.pot - p.rating) * 0.035) * 10) / 10.0)

func avg_rating(p: Dictionary) -> float:
	return p.rsum / p.seasonApps if p.seasonApps > 0 else 0.0

func _gen_name(rng: RNG) -> String:
	var pool: Dictionary = DB.NAMES.ABROAD if rng.chance(0.15) else DB.NAMES.ENG
	var first: String = rng.pick(pool.first)
	return first + " " + rng.pick(pool.last)

func _fill_squad(career: Dictionary, club: Dictionary, existing: Array, rng: RNG) -> Array:
	var div: Dictionary = DB.divisions[club.div]
	var band: Array = div.band if div.band != null else [70, 80]
	var centre: float = lerpf(band[0], band[1], clampf((club.rep - 30) / 60.0, 0.0, 1.0)) if div.tier > 1 else club.rep * 0.62 + 22
	var have := {"GK": 0, "DF": 0, "MF": 0, "FW": 0}
	for p in existing:
		have[p.grp] += 1
	var out := []
	for g in GEN_SHAPE:
		while have[g] < GEN_SHAPE[g].size():
			var age := rng.int_in(18, 33)
			var r := clampi(int(round(centre + rng.int_in(-5, 4) - (3 if age < 21 else 0))), 40, 86)
			out.append(make_player(club.id, {"name": _gen_name(rng), "pos": GEN_SHAPE[g][have[g]], "age": age, "rating": r,
				"pot": r + rng.int_in(2, 12) if age < 23 else r, "nat": ""}, _next_id(career)))
			have[g] += 1
	return out

func _next_id(career: Dictionary) -> int:
	career.nextId += 1
	return career.nextId - 1

# ---------- lookups ----------
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

func club_name(career: Dictionary, id) -> String:
	return club_of(career, id).name if id != null else "Free agent"

func my_div(career: Dictionary) -> String:
	return club_of(career, career.me).div

func commas(n: int) -> String:
	var s := str(n)
	var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return s + out

func rep_tier(rep: int) -> String:
	return "World class" if rep >= 90 else "Continental" if rep >= 80 else "National" if rep >= 65 else "Regional" if rep >= 45 else "Local"

# ---------- shapes and line-ups ----------
func slot_code(row: int, col: int) -> String:
	var side := "L" if col == 0 else "R" if col == 4 else "C"
	match row:
		0: return "GK"
		1: return "D" + side
		2: return "DM" if side == "C" else "WB" + side
		3: return "M" + side
		4: return "AM" + side
		_: return "ST"

## The eleven slots of a formation: [{code, grp, x, y, row}], attack at the top (y small).
func shape_slots(formation: String) -> Array:
	var out := []
	var ys := [0.91, 0.745, 0.61, 0.475, 0.32, 0.16]
	for s in DB.DATA.shapes[formation]:
		var code := slot_code(int(s[0]), int(s[1]))
		out.append({"code": code, "grp": DB.DATA.grid.grp[code], "x": 0.13 + int(s[1]) * 0.185, "y": ys[int(s[0])], "row": int(s[0])})
	return out

## How well a player suits a slot: 0 natural, small for a nearby role, large when out of position.
func misfit(p: Dictionary, code: String) -> int:
	var f: int = DB.DATA.grid.fits[code].find(p.pos)
	return 0 if f == 0 else 2 if f > 0 else 5 if DB.DATA.grid.grp[code] == p.grp else 12

func _auto_xi(squad: Array, formation: String) -> Dictionary:
	var avail := squad.filter(func(p): return p.injured == 0)
	var used := {}
	var slots := shape_slots(formation)
	var xi := []
	xi.resize(slots.size())
	for natural in [true, false]:      # first players in their own position, then the best of the rest
		for i in slots.size():
			if xi[i] != null:
				continue
			var best = null
			var bs := -999.0
			for p in avail:
				if used.has(p.id) or (natural and misfit(p, slots[i].code) > 0):
					continue
				var sc: float = p.rating - misfit(p, slots[i].code) * 1.6 - (100 - p.fitness) * 0.12
				if sc > bs:
					bs = sc
					best = p
			if best != null:
				used[best.id] = true
				xi[i] = best
	xi = xi.filter(func(p): return p != null)
	var rest := avail.filter(func(p): return not used.has(p.id))
	rest.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
	var bench := []
	var gk = null
	for p in rest:
		if p.pos == "GK" and gk == null:
			gk = p
	if gk != null:
		bench.append(gk)
	for p in rest:
		if bench.size() < 9 and p != gk and p.pos != "GK":
			bench.append(p)
	return {"xi": xi, "bench": bench}

## A club's eleven in slot order, plus the bench. Mine follows my saved line-up where it still holds.
func xi_of(career: Dictionary, club_id: String) -> Dictionary:
	var sq := squad_of(career, club_id)
	var f: String = career.tactics[club_id].formation
	var auto := _auto_xi(sq, f)
	if club_id != career.me or career.lineup == null or career.lineup.f != f:
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
		if xi[i] == null:
			for q in auto.xi + auto.bench + sq:
				if q.injured == 0 and not used.has(q.id):
					xi[i] = q
					used[q.id] = true
					break
	xi = xi.filter(func(p): return p != null)
	var rest := sq.filter(func(p): return p.injured == 0 and not used.has(p.id))
	rest.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
	return {"xi": xi, "bench": rest.slice(0, 9)}

func my_xi(career: Dictionary) -> Dictionary:
	return xi_of(career, career.me)

## Pairs each starter with his slot: [{slot, p}].
func layout_xi(xi: Array, formation: String) -> Array:
	var slots := shape_slots(formation)
	var out := []
	for i in mini(xi.size(), slots.size()):
		out.append({"slot": slots[i], "p": xi[i]})
	return out

func swap_into_xi(career: Dictionary, out_id: int, in_id: int) -> void:
	var cur: Array = my_xi(career).xi.map(func(p): return p.id)
	var i := cur.find(out_id)
	if i < 0:
		return
	var j := cur.find(in_id)
	if j >= 0:
		cur[j] = out_id
	cur[i] = in_id
	career.lineup = {"f": career.tactics[career.me].formation, "ids": cur}

## Dressing-room harmony, 0-99: morale, trust in you, and players in their natural positions.
func chemistry(career: Dictionary) -> int:
	var placed := layout_xi(my_xi(career).xi, career.tactics[career.me].formation)
	if placed.is_empty():
		return 50
	var t := 0.0
	for e in placed:
		t += e.p.morale * 0.45 + e.p.trust * 0.3 + (25 if misfit(e.p, e.slot.code) == 0 else 12 if misfit(e.p, e.slot.code) <= 2 else 0)
	return clampi(int(round(t / placed.size())), 0, 99)

## Attack and defence levels of a club's eleven, for quick results and the board's expectations.
func strength(career: Dictionary, club_id: String) -> Dictionary:
	var placed := layout_xi(xi_of(career, club_id).xi, career.tactics[club_id].formation)
	var att := 0.0
	var aw := 0.0
	var def := 0.0
	var dw := 0.0
	for e in placed:
		var r: float = (e.p.rating - misfit(e.p, e.slot.code)) * (0.8 + e.p.fitness / 500.0) * (0.94 + e.p.morale / 1000.0)
		var wa: float = {"GK": 0.0, "DF": 0.25, "MF": 0.8, "FW": 1.3}[e.slot.grp]
		var wd: float = {"GK": 1.6, "DF": 1.2, "MF": 0.6, "FW": 0.1}[e.slot.grp]
		att += r * wa
		aw += wa
		def += r * wd
		dw += wd
	return {"att": att / maxf(aw, 0.1), "def": def / maxf(dw, 0.1)}

# ---------- career ----------
func new_career(seed_value: int, my_club: String, opts: Dictionary = {}) -> Dictionary:
	var rng := RNG.new(seed_value)
	var clubs := []
	for c in DB.clubs:
		clubs.append(c.duplicate(true))
	var career := {"version": 30, "seed": seed_value, "me": my_club, "season": 2026, "week": 0, "clubs": clubs, "players": [], "results": [],
		"balances": {}, "tactics": {}, "fixtures": {}, "news": [], "history": [], "desk": [], "time": 3, "done": {},
		"prep": {"att": 0.0, "def": 0.0, "sp": 0.0}, "board": 60.0, "fans": 60.0, "lineup": null, "nextId": 1, "sacked": false,
		"manager": {"name": opts.get("name", "The Boss"), "games": 0, "w": 0, "d": 0, "l": 0, "trophies": []}, "objective": {}, "form": []}
	for c in clubs:
		var real := []
		for s in DB.squads.get(c.id, []):
			real.append(make_player(c.id, s, _next_id(career)))
		career.players.append_array(real)
		career.players.append_array(_fill_squad(career, c, real, rng.fork("squad:" + c.id)))
		var tier: int = DB.divisions[c.div].tier
		career.balances[c.id] = int(round(c.rep * c.rep * {1: 12.0, 2: 2.5, 3: 0.8, 4: 0.5, 5: 0.3}[tier]))
		var shapes: Array = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-1-4-1"]
		career.tactics[c.id] = {"formation": shapes[RNG.hash_str(c.id) % shapes.size()], "mentality": 3 if c.rep >= 85 else 2, "tempo": 1, "press": 2 if c.rep >= 85 else 1}
	reindex(career)
	for c in clubs:      # every manager starts with the shape that suits his squad best
		var best := ""
		var bs := -1.0
		for f in ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-1-4-1", "5-3-2"]:
			var slots := shape_slots(f)
			var xi: Array = _auto_xi(squad_of(career, c.id), f).xi
			var sc := 0.0
			for i in mini(xi.size(), slots.size()):
				sc += xi[i].rating - misfit(xi[i], slots[i].code) * 1.6
			if sc > bs:
				bs = sc
				best = f
		career.tactics[c.id].formation = best
	_new_fixtures(career)
	career.objective = objective(career, my_club)
	new_week(career)
	career.desk.push_front({"kind": "note", "from": "The Chairman", "title": "Welcome to %s" % club_of(career, my_club).name,
		"body": "The board are delighted to have you. This season we expect you to %s. You will find your staff ready, and your players waiting to see what kind of manager you are." % career.objective.text.to_lower()})
	return career

func _new_fixtures(career: Dictionary) -> void:
	for d in DB.division_list:
		var ids := []
		for c in career.clubs:
			if c.div == d.id:
				ids.append(c.id)
		career.fixtures[d.id] = _round_robin(ids, career.seed ^ RNG.hash_str(d.id) ^ career.season)

func _round_robin(ids: Array, seed_value: int) -> Array:
	var rng := RNG.new(seed_value)
	var arr := ids.duplicate()
	for i in range(arr.size() - 1, 0, -1):
		var j := rng.int_in(0, i)
		var t = arr[i]
		arr[i] = arr[j]
		arr[j] = t
	if arr.size() % 2 == 1:
		arr.append(null)
	var n := arr.size()
	var rounds := []
	for r in n - 1:
		var rd := []
		for i in n / 2:
			if arr[i] != null and arr[n - 1 - i] != null:
				rd.append([arr[i], arr[n - 1 - i]] if r % 2 == 1 else [arr[n - 1 - i], arr[i]])
		rounds.append(rd)
		arr = [arr[0], arr[n - 1]] + arr.slice(1, n - 1)
	var back := []
	for rd in rounds:
		back.append(rd.map(func(f): return [f[1], f[0]]))
	return rounds + back

## What the board expect, from where the squad ranks in its division.
func objective(career: Dictionary, club_id: String) -> Dictionary:
	var div_id: String = club_of(career, club_id).div
	var ranked := []
	for c in career.clubs:
		if c.div == div_id:
			var s := strength(career, c.id)
			ranked.append([s.att + s.def, c.id])
	ranked.sort_custom(func(a, b): return a[0] > b[0] if a[0] != b[0] else a[1] < b[1])
	var rank := 1
	for i in ranked.size():
		if ranked[i][1] == club_id:
			rank = i + 1
	var n := ranked.size()
	var top: bool = DB.divisions[div_id].tier == 1
	var rows := [[2, "Win the title", 1], [5, "Finish in the top four", 4], [8, "Qualify for Europe", 7], [13, "Finish in the top half", 10], [99, "Stay in the division", n - 3]] if top \
		else [[3, "Win promotion", 2], [8, "Reach the play-offs", 6], [16, "Finish mid-table", 12], [99, "Avoid the drop", n - 4]]
	for r in rows:
		if rank <= r[0]:
			return {"text": r[1], "target": r[2], "rank": rank}
	return {}

func table(career: Dictionary, div_id: String) -> Array:
	var rows := {}
	for c in career.clubs:
		if c.div == div_id:
			rows[c.id] = {"id": c.id, "p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0, "form": []}
	for m in career.results:
		if m.div != div_id:
			continue
		var h: Dictionary = rows[m.h]
		var a: Dictionary = rows[m.a]
		h.p += 1
		a.p += 1
		h.gf += m.gH
		h.ga += m.gA
		a.gf += m.gA
		a.ga += m.gH
		var rh := "W" if m.gH > m.gA else "L" if m.gH < m.gA else "D"
		var ra := "W" if m.gA > m.gH else "L" if m.gA < m.gH else "D"
		for pair in [[h, rh], [a, ra]]:
			pair[0].form.append(pair[1])
			pair[0][pair[1].to_lower()] += 1
			pair[0].pts += 3 if pair[1] == "W" else 1 if pair[1] == "D" else 0
	var out := rows.values()
	out.sort_custom(func(x, y):
		if x.pts != y.pts:
			return x.pts > y.pts
		if x.gf - x.ga != y.gf - y.ga:
			return x.gf - x.ga > y.gf - y.ga
		return x.gf > y.gf if x.gf != y.gf else x.id < y.id)
	return out

func position(career: Dictionary, club_id: String) -> int:
	var t := table(career, club_of(career, club_id).div)
	for i in t.size():
		if t[i].id == club_id:
			return i + 1
	return 0

func my_weeks(career: Dictionary) -> int:
	return career.fixtures[my_div(career)].size()

func my_fixture(career: Dictionary):
	var rounds: Array = career.fixtures[my_div(career)]
	if career.week >= rounds.size():
		return null
	for f in rounds[career.week]:
		if f[0] == career.me or f[1] == career.me:
			return {"h": f[0], "a": f[1], "home": f[0] == career.me, "opp": f[1] if f[0] == career.me else f[0]}
	return null

## Saturday's date for the current week, e.g. "Sat 15 Aug".
func match_date(career: Dictionary) -> String:
	var t: int = Time.get_unix_time_from_datetime_dict({"year": career.season, "month": 8, "day": 15, "hour": 12, "minute": 0, "second": 0}) + career.week * 7 * 86400
	var d := Time.get_datetime_dict_from_unix_time(t)
	return "%s %d %s" % [["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.weekday], d.day, ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.month - 1]]

# ---------- quick results for everyone else ----------
func _poisson(rng: RNG, lam: float) -> int:
	var l := exp(-lam)
	var k := 0
	var p := rng.next()
	while p > l and k < 9:
		k += 1
		p *= rng.next()
	return k

func quick_match(career: Dictionary, h: String, a: String, rng: RNG) -> Dictionary:
	var sh := strength(career, h)
	var sa := strength(career, a)
	var th: Dictionary = career.tactics[h]
	var ta: Dictionary = career.tactics[a]
	var gh := _poisson(rng, 1.42 * pow(sh.att / sa.def, 5.2) * (1 + 0.06 * (th.mentality - 2)) * (1 + 0.05 * (ta.mentality - 2)))
	var ga := _poisson(rng, 1.14 * pow(sa.att / sh.def, 5.2) * (1 + 0.06 * (ta.mentality - 2)) * (1 + 0.05 * (th.mentality - 2)))
	for side in [[h, gh, ga], [a, ga, gh]]:
		var sel := xi_of(career, side[0])
		var shooters := []
		for e in layout_xi(sel.xi, career.tactics[side[0]].formation):
			for k in {"GK": 0, "DF": 1, "MF": 3, "FW": 7}[e.slot.grp]:
				shooters.append(e.p)
			e.p.apps += 1
			e.p.seasonApps += 1
			e.p.rsum += clampf(6.6 + (side[1] - side[2]) * 0.25 + rng.next() * 1.2 - 0.6, 4.5, 9.5)
			e.p.fitness = maxf(55.0, e.p.fitness - 24 + e.p.attr.stamina * 0.4)
			if rng.chance(0.012):
				e.p.injured = rng.int_in(1, 6)
		for g in side[1]:
			var s: Dictionary = rng.pick(shooters)
			s.goals += 1
			s.seasonGoals += 1
	return {"gH": gh, "gA": ga}

func record(career: Dictionary, div_id: String, h: String, a: String, gh: int, ga: int) -> void:
	career.results.append({"week": career.week, "div": div_id, "h": h, "a": a, "gH": gh, "gA": ga})
	for pair in [[h, true], [a, false]]:
		career.balances[pair[0]] += week_money(career, pair[0], pair[1]).net

## Plays the week's other fixtures. Returns my fixture (or null on a free week).
func play_others(career: Dictionary):
	var rng := RNG.new(career.seed ^ (career.season * 7919) ^ (career.week * 104729))
	var mine = null
	for div_id in career.fixtures:
		var rounds: Array = career.fixtures[div_id]
		if career.week >= rounds.size():
			continue
		for f in rounds[career.week]:
			if f[0] == career.me or f[1] == career.me:
				mine = {"h": f[0], "a": f[1], "div": div_id}
				continue
			var r := quick_match(career, f[0], f[1], rng)
			record(career, div_id, f[0], f[1], r.gH, r.gA)
	return mine

## Weekly money in £k.
func week_money(career: Dictionary, club_id: String, home: bool) -> Dictionary:
	var c := club_of(career, club_id)
	var tier: int = DB.divisions[c.div].tier
	var wages := 0
	for p in squad_of(career, club_id):
		wages += p.wage
	var fill := clampf(0.7 + c.rep / 400.0 + ((career.fans - 60) / 300.0 if club_id == career.me else 0.0), 0.3, 1.0)
	var gate := int(round(c.capacity * fill * TICKET[tier] / 1000.0)) if home else 0
	var commercial := int(round(pow(c.rep, 3) / 300.0 * TIER_MONEY[tier]))
	var tv: int = DB.divisions[c.div].tv
	return {"wages": wages, "gate": gate, "commercial": commercial, "tv": tv, "net": gate + commercial + tv - wages, "fill": fill}

# ---------- after my match, and the new week ----------
## result: {h, a, div, gH, gA, ratings: {pid: rating}, played: [pid]} from the engine (null on a free week).
func finish_week(career: Dictionary, result) -> void:
	var me: String = career.me
	if result != null:
		record(career, result.div, result.h, result.a, result.gH, result.gA)
		var us: int = result.gH if result.h == me else result.gA
		var them: int = result.gA if result.h == me else result.gH
		var mg: Dictionary = career.manager
		mg.games += 1
		mg["w" if us > them else "l" if us < them else "d"] += 1
		career.form.append("W" if us > them else "L" if us < them else "D")
		var opp: String = result.a if result.h == me else result.h
		var gap: float = (strength(career, opp).att + strength(career, opp).def - strength(career, me).att - strength(career, me).def) / 2.0
		var d := (2.2 if us > them else -2.8 if us < them else -0.2) + clampf(gap * 0.25, -1.5, 1.5)   # beating better sides counts for more
		if career.week >= 6:
			d += clampf((career.objective.target - position(career, me)) * 0.12, -1.2, 1.2)
		career.board = clampf(career.board + d, 0, 100)
		career.fans = clampf(career.fans + (3 if us > them else -3 if us < them else 0) + (1 if us >= 3 else 0), 0, 100)
		for p in squad_of(career, me):
			var played: bool = result.played.has(p.id)
			p.morale = clampf(p.morale + ((4.0 if us > them else -3.0 if us < them else 0.5) if played else (-0.8 if p.rating >= 72 else -0.3)), 5, 100)
			if p.promise:
				p.trust = clampf(p.trust + (6 if played else -14), 0, 100)
				if not played:
					p.morale = clampf(p.morale - 8, 5, 100)
				p.promise = false
			p.boost = 0
		if career.board <= 0:
			career.sacked = true
	for p in career.players:
		if p.club == null:
			continue
		p.fitness = minf(100.0, p.fitness + 26)
		p.morale += (62 - p.morale) * 0.08
		if p.injured > 0:
			p.injured -= 1
	_ai_transfers(career)
	career.week += 1
	new_week(career)

## Sets up the week ahead: fresh time, cleared preparation, and whatever lands on your desk.
func new_week(career: Dictionary) -> void:
	career.time = 3
	career.done = {}
	career.prep = {"att": 0.0, "def": 0.0, "sp": 0.0}
	career.desk = []
	var rng := RNG.new(career.seed ^ (career.season * 31) ^ (career.week * 2654435761))
	var fx = my_fixture(career)
	var sq := squad_of(career, career.me)
	if fx == null:
		return
	var opp := club_of(career, fx.opp)
	var danger: Dictionary = _danger_man(career, fx.opp)
	career.desk.append({"kind": "note", "from": "Your assistant", "title": "%s on %s" % [opp.name, "Saturday" if fx.home else "the road"],
		"body": "%s sit %s and line up %s. Keep an eye on %s, their best player. If you can spare the time, a proper scouting report would tell us where they are weak." % [
			opp.name, _ordinal(position(career, fx.opp)), career.tactics[fx.opp].formation, danger.name]})
	# a player who feels left out
	var benched := sq.filter(func(p): return p.injured == 0 and p.morale < 55 and p.rating >= 70 and p.seasonApps * 2 < career.week)
	if career.week >= 3 and not benched.is_empty() and rng.chance(0.45):
		var p: Dictionary = rng.pick(benched)
		career.desk.append({"kind": "unhappy", "pid": p.id, "from": p.name, "title": "%s wants a word" % p.name,
			"body": "%s knocks on your door. “Boss, I have barely played. I came here to play football, not to watch it. Where do I stand?”" % p.name,
			"choices": ["You start on Saturday. Show me I was wrong.", "You are behind others right now. Train harder and your chance will come.", "I pick the team. Close the door on your way out."]})
	# a bid for one of mine
	if rng.chance(0.16) and sq.size() > SQUAD_MIN + 2:
		var pool := sq.duplicate()
		pool.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
		var target: Dictionary = pool[rng.int_in(3, mini(pool.size() - 1, 16))]
		var buyers: Array = career.clubs.filter(func(c): return c.id != career.me and career.balances[c.id] > value(target) * 1300 and c.rep >= target.rating - 12)
		if not buyers.is_empty():
			var b: Dictionary = rng.pick(buyers)
			var fee := int(round(value(target) * 1000 * (0.9 + rng.next() * 0.45)))
			career.desk.append({"kind": "bid", "pid": target.id, "club": b.id, "fee": fee, "from": b.name, "title": "%s bid for %s" % [b.name, target.name],
				"body": "%s have offered %s for %s. We value him at about %s. He is %d, rated %d, and earns £%dk a week." % [b.name, _money(fee), target.name, _money(value(target) * 1000), target.age, target.rating, target.wage],
				"choices": ["Accept the offer.", "Tell them he costs more.", "He is not for sale."]})
	# the chairman, after a run
	var last: Array = career.form.slice(-3)
	if last.size() == 3 and last.all(func(r): return r == "L"):
		career.desk.append({"kind": "note", "from": "The Chairman", "title": "This cannot go on", "body": "Three defeats in a row. The board still back you, but our patience has limits. We need a response on Saturday."})
	elif last.size() == 3 and last.all(func(r): return r == "W"):
		career.desk.append({"kind": "note", "from": "The Chairman", "title": "Keep it going", "body": "Three wins on the spin. The mood around the club is as good as I can remember. Well done."})
	# a kid from the academy
	if rng.chance(0.07) and sq.size() < SQUAD_MAX:
		var pos: String = rng.pick(["CB", "CM", "CAM", "LW", "RW", "ST", "LB", "RB"])
		var r := clampi(int(strength(career, career.me).att) - rng.int_in(14, 22), 45, 72)
		career.desk.append({"kind": "youth", "from": "Academy coach", "title": "One for the first team?", "kid": {"name": _gen_name(rng), "pos": pos, "age": 17, "rating": r, "pot": clampi(r + rng.int_in(12, 24), r + 6, 94), "nat": "ENG"},
			"body": "“Gaffer, we have a seventeen-year-old %s who is too good for the under-18s. Raw, but there is something there. Do you want him training with the first team?”" % DB.DATA.positions[pos].name.to_lower(),
			"choices": ["Bring him up. Let's see what he has.", "Not yet. Let him develop."]})
	for it in career.desk:
		it.week = career.week

func _danger_man(career: Dictionary, club_id: String) -> Dictionary:
	var best = null
	for p in xi_of(career, club_id).xi:
		if p.grp != "GK" and p.grp != "DF" and (best == null or p.rating > best.rating):
			best = p
	return best if best != null else xi_of(career, club_id).xi[0]

func _ordinal(n: int) -> String:
	return UI.ordinal(n)

func _money(k: float) -> String:
	return UI.money(k)

## Deals with a desk item. Returns what happened, as a sentence or two.
func resolve(career: Dictionary, item: Dictionary, choice: int) -> String:
	item.read = true
	career.desk.erase(item)
	var rng := RNG.new(career.seed ^ (career.week * 977) ^ item.get("pid", 7))
	match item.kind:
		"unhappy":
			var p = player(career, item.pid)
			if p == null:
				return ""
			if choice == 0:
				p.promise = true
				p.morale = clampf(p.morale + 14, 5, 100)
				return "%s leaves with a spring in his step. You have promised him a start: break it and he will not forget." % p.name
			if choice == 1:
				var ok: bool = p.trait in ["Professional", "Leader", "Loyal", "Ambitious"]
				p.morale = clampf(p.morale + (6 if ok else -4), 5, 100)
				p.trust = clampf(p.trust + (8 if ok else -3), 0, 100)
				p.boost = 1 if ok else 0
				return ("%s nods. “Fair enough, boss. I'll show you.” He is first out for training the next morning." if ok else "%s shrugs and walks out. That did not land the way you hoped.") % p.name
			p.morale = clampf(p.morale - 12, 5, 100)
			p.trust = clampf(p.trust - 15, 0, 100)
			return "%s slams the door. The dressing room will hear about this." % p.name
		"bid":
			var p = player(career, item.pid)
			if p == null or p.club != career.me:
				return ""
			var fee: int = item.fee
			if choice == 1:
				if rng.chance(0.5):
					fee = int(fee * 1.2)
				else:
					return "%s walk away. “That is our final offer,” they say, and the line goes dead." % item.from
			if choice == 2:
				var sulk: bool = p.trait == "Ambitious" and club_of(career, item.club).rep > club_of(career, career.me).rep
				if sulk:
					p.morale = clampf(p.morale - 10, 5, 100)
				return "You turn %s down." % item.from + (" %s had his heart set on the move and is not happy." % p.name if sulk else " %s stays." % p.name)
			_move(career, p, item.club, fee)
			return "%s joins %s for %s. The money is in the club's account." % [p.name, item.from, _money(fee)]
		"youth":
			if choice == 0:
				var p := make_player(career.me, item.kid, _next_id(career))
				career.players.append(p)
				reindex(career)
				return "%s (%s, 17) joins the first-team squad. Rated %d now, and the coaches think he could go a long way." % [p.name, p.pos, p.rating]
			return "He stays with the under-18s for now."
	return ""

func _move(career: Dictionary, p: Dictionary, to: String, fee: int) -> void:
	career.balances[p.club] += fee
	career.balances[to] -= fee
	career.news.push_front("%s: %s to %s, %s" % [club_name(career, p.club), p.name, club_name(career, to), _money(fee)])
	p.club = to
	p.morale = 70.0
	p.trust = 50.0
	p.promise = false
	if career.lineup != null and career.lineup.ids.has(p.id):
		career.lineup = null
	reindex(career)

## The odd deal between other clubs, so the world moves.
func _ai_transfers(career: Dictionary) -> void:
	var rng := RNG.new(career.seed ^ (career.season * 613) ^ (career.week * 15485863))
	if not rng.chance(0.5):
		return
	var buyer: Dictionary = rng.pick(career.clubs)
	if buyer.id == career.me or squad_of(career, buyer.id).size() >= SQUAD_MAX:
		return
	var p: Dictionary = rng.pick(career.players)
	if p.club == null or p.club == career.me or p.club == buyer.id or squad_of(career, p.club).size() <= 21:
		return
	var fee := int(value(p) * 1150)
	if club_of(career, p.club).rep < buyer.rep and career.balances[buyer.id] > fee * 2 and p.rating >= strength(career, buyer.id).att - 4:
		_move(career, p, buyer.id, fee)

# ---------- how you spend your time ----------
const ACTIONS := {
	"training": {"title": "Take training", "sub": "Shape Saturday's match"},
	"talk": {"title": "One-to-one", "sub": "Sit down with a player"},
	"scout": {"title": "Scout the opponent", "sub": "Find where they are weak"},
	"press": {"title": "Face the press", "sub": "Set the mood"},
}
const SESSIONS := [
	["Attacking patterns", "Sharper going forward on Saturday", "att"], ["Defensive shape", "Harder to break down on Saturday", "def"],
	["Set pieces", "More danger from corners and free kicks", "sp"], ["Recovery day", "Tired legs recover, spirits lift", "rest"],
	["Work with the youngsters", "Under-23s improve over the season", "dev"]]

func train(career: Dictionary, kind: String) -> String:
	career.time -= 1
	career.done["training"] = career.done.get("training", 0) + 1
	var sq := squad_of(career, career.me)
	match kind:
		"att":
			career.prep.att += 0.05
			return "The front players spend the afternoon on movement and combinations. It clicks. The team will be sharper going forward on Saturday."
		"def":
			career.prep.def += 0.05
			return "You drill the back line and the midfield screen until they move as one. The team will be harder to break down on Saturday."
		"sp":
			career.prep.sp += 0.5
			return "Corners, free kicks, near-post runs. Dull work, but it wins matches. Expect more from set pieces on Saturday."
		"rest":
			for p in sq:
				p.fitness = minf(100.0, p.fitness + 14)
				p.morale = clampf(p.morale + 2, 5, 100)
			return "A light session and an early finish. Legs recover and the mood lifts."
		_:
			var up := []
			for p in sq:
				if p.age <= 23 and p.rating < p.pot:
					p.dev += 1
					if p.dev >= 3:
						p.dev = 0
						p.rating += 1
						p.attr = make_attr(p)
						p.wage = wage(p)
						up.append(p.name)
			return "You stay behind with the young players." + (" %s %s visibly improved." % [", ".join(up.slice(0, 3)), "has" if up.size() == 1 else "have"] if not up.is_empty() else " Progress is slow, but it is progress.")

const TONES := ["Praise him", "Challenge him", "Promise him a start"]

func talk(career: Dictionary, pid: int, tone: int) -> String:
	career.time -= 1
	career.done["talk"] = career.done.get("talk", 0) + 1
	var p: Dictionary = player(career, pid)
	if tone == 0:
		var hollow: bool = p.trait == "Professional" and p.seasonApps >= 3 and avg_rating(p) < 6.5
		p.morale = clampf(p.morale + (2 if hollow else 12 if p.trait == "Temperamental" else 8), 5, 100)
		p.trust = clampf(p.trust + (-3 if hollow else 4), 0, 100)
		return ("%s listens politely. He knows he has not been playing well, and praise he has not earned does not sit right with him." if hollow else "%s grows an inch taller. “Thanks, boss. That means a lot.”") % p.name
	if tone == 1:
		var up: bool = p.trait in ["Ambitious", "Leader", "Professional"]
		p.morale = clampf(p.morale + (6 if up else -9), 5, 100)
		p.trust = clampf(p.trust + (5 if up else -6), 0, 100)
		p.boost = 1 if up else 0
		return ("%s's jaw tightens. “You'll get more from me. Watch.” He trains like a man possessed." if up else "%s goes quiet. He did not need a telling-off, and now he is sulking.") % p.name
	p.promise = true
	p.morale = clampf(p.morale + 10, 5, 100)
	return "“You're in the team on Saturday.” %s cannot hide his grin. Keep your word." % p.name

## What a proper look at the opponent tells you. The weakness is for you to read from the report.
func scout_report(career: Dictionary) -> Dictionary:
	var fx = my_fixture(career)
	var opp: String = fx.opp
	var placed := layout_xi(xi_of(career, opp).xi, career.tactics[opp].formation)
	var cb_pace := 0.0
	var cb_air := 0.0
	var mid := 0.0
	var nd := 0
	var nm := 0
	for e in placed:
		if e.slot.grp == "DF":
			cb_pace += e.p.attr.pace
			cb_air += e.p.attr.heading
			nd += 1
		elif e.slot.grp == "MF":
			mid += e.p.attr.tackling + e.p.attr.stamina
			nm += 1
	var scores := {"pace": cb_pace / maxi(nd, 1), "air": cb_air / maxi(nd, 1) - 1.5, "mid": mid / maxi(nm, 1) / 2.0 + 1.0}
	var weak := "pace"
	for k in scores:
		if scores[k] < scores[weak]:
			weak = k
	var lines := {
		"pace": "Their back line holds a high line and does not enjoy turning. More than once our scout saw a forward run clean through.",
		"air": "They are small at the back. Two of the goals they conceded lately came from balls into the box that nobody attacked.",
		"mid": "Their midfield fades. For an hour they compete; after that there is space in the middle of the pitch for anyone who wants it."}
	var t: Dictionary = career.tactics[opp]
	return {"weak": weak, "opp": opp, "text": "%s play %s, %s, %s. %s is the one who makes them tick. %s" % [club_of(career, opp).name, t.formation, MENTALITY[t.mentality].to_lower(),
		["and sit off", "with a normal press", "and press high"][t.press], _danger_man(career, opp).name, lines[weak]],
		"plans": [["Play balls in behind", "pace"], ["Get crosses into the box", "air"], ["Overrun their midfield", "mid"]]}

func set_plan(career: Dictionary, plan: String, weak: String) -> String:
	career.time -= 1
	career.done["scout"] = 1
	career.plan = plan
	var right := plan == weak
	career.prep.att += 0.08 if right else 0.015
	if plan == "air":
		career.prep.sp += 0.4 if right else 0.1
	if plan == "mid":
		career.prep.def += 0.04 if right else 0.0
	return "The squad work on it all week. You will find out on Saturday whether you read them right."

const PRESS_Q := [
	["How do you see Saturday's game going?", ["We will win. I have no doubt.", "They are a good side. We will need to be at our best.", "Ask their manager. He has more to worry about than I do."]],
	["Is your squad good enough to meet the board's target?", ["More than good enough.", "We are working hard every day. Judge us in May.", "With the right backing, yes."]],
	["Some fans are questioning your tactics. Your response?", ["The fans will get what they want: goals.", "I understand. We are all on the same side.", "I have forgotten more about this game than they know."]]]

func press(career: Dictionary, q: int, answer: int) -> String:
	career.time -= 1
	career.done["press"] = 1
	var sq := squad_of(career, career.me)
	if answer == 0:
		career.fans = clampf(career.fans + 3, 0, 100)
		for p in sq:
			p.morale = clampf(p.morale + 2, 5, 100)
		return "Bold words, and they make the back pages. The fans love it and the players walk taller. Lose now and it will be thrown back at you."
	if answer == 1:
		career.board = clampf(career.board + 1.5, 0, 100)
		return "Measured and respectful. The board appreciate a manager who does not make their lives harder."
	career.fans = clampf(career.fans + (4 if q == 0 else -3), 0, 100)
	career.board = clampf(career.board - 1.5, 0, 100)
	career.prep.att += 0.02 if q == 0 else 0.0
	return "The room laughs, and the clip is everywhere by teatime." + (" The chairman would rather you kept it to football." if q != 2 else " Supporters are not amused.")

# ---------- transfer market ----------
## Players you could sign this week: [{p, fee}] (fee in £k). The list changes each week.
func market(career: Dictionary) -> Array:
	var rng := RNG.new(career.seed ^ (career.season * 131) ^ (career.week * 31337))
	var lvl: float = strength(career, career.me).att
	var pool: Array = career.players.filter(func(p): return p.club != null and p.club != career.me and p.rating >= lvl - 9 and p.rating <= lvl + 5 and p.age <= 32 and club_of(career, p.club).rep <= club_of(career, career.me).rep + 6 and squad_of(career, p.club).size() > 20)
	var out := []
	while out.size() < 12 and not pool.is_empty():
		var p: Dictionary = pool.pop_at(rng.int_in(0, pool.size() - 1))
		out.append({"p": p, "fee": int(round(value(p) * 1000 * (1.1 + (RNG.imul(p.id, 7919) % 30) / 100.0)))})
	out.sort_custom(func(a, b): return a.p.rating > b.p.rating if a.p.rating != b.p.rating else a.p.id < b.p.id)
	return out

func asking_price(career: Dictionary, p: Dictionary) -> int:
	return int(round(value(p) * 1000 * (1.1 + (RNG.imul(p.id, 7919) % 30) / 100.0)))

func can_sign(career: Dictionary, p: Dictionary) -> String:
	if squad_of(career, career.me).size() >= SQUAD_MAX:
		return "Your squad is full (%d players)." % SQUAD_MAX
	if career.balances[career.me] < asking_price(career, p):
		return "The club cannot afford the fee."
	return ""

func sign_player(career: Dictionary, p: Dictionary) -> void:
	_move(career, p, career.me, asking_price(career, p))

# ---------- the end of the season ----------
func end_season(career: Dictionary) -> Dictionary:
	while career.week < _longest(career):      # lower divisions play more rounds
		play_others(career)
		for p in career.players:
			p.fitness = minf(100.0, p.fitness + 26)
		career.week += 1
	var rng := RNG.new(career.seed ^ (career.season * 4409))
	var my_d := my_div(career)
	var s := {"season": career.season, "div": my_d, "tables": {}, "up": [], "down": [], "champions": {}, "top": {}}
	var moves := []
	var divs: Array = DB.divisions_of("ENG")
	for i in divs.size():
		var d: Dictionary = divs[i]
		var t := table(career, d.id)
		s.tables[d.id] = t.map(func(r): return r.id)
		s.champions[d.id] = t[0].id
		var best = null
		for p in career.players:
			if p.club != null and club_of(career, p.club).div == d.id and (best == null or p.seasonGoals > best.seasonGoals):
				best = p
		s.top[d.id] = {"name": best.name, "goals": best.seasonGoals, "club": best.club}
		if i + 1 < divs.size():
			for r in t.slice(t.size() - d.down):
				moves.append([r.id, divs[i + 1].id, false])
		if i > 0:
			var ups: Array = t.slice(0, d.up).map(func(r): return r.id)
			if d.playoff != null:      # the play-offs: one of the chasing pack goes up, form deciding
				var pack: Array = t.slice(d.playoff[0] - 1, d.playoff[1]).map(func(r): return r.id)
				ups.append(pack[mini(pack.size() - 1, int(pow(rng.next(), 1.6) * pack.size()))])
			for id in ups:
				moves.append([id, divs[i - 1].id, true])
	s.pos = s.tables[my_d].find(career.me) + 1
	s.target = career.objective.target
	s.objective = career.objective.text
	s.met = s.pos <= s.target
	var rec := {"w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0}
	for r in career.results:
		if r.h == career.me or r.a == career.me:
			var us: int = r.gH if r.h == career.me else r.gA
			var them: int = r.gA if r.h == career.me else r.gH
			rec.gf += us
			rec.ga += them
			rec["w" if us > them else "l" if us < them else "d"] += 1
	s.record = rec
	for mv in moves:
		club_of(career, mv[0]).div = mv[1]
		(s.up if mv[2] else s.down).append(mv[0])
	career.board = clampf(career.board + (15 if s.met else -20 if s.pos > s.target + 4 else -5), 0, 100)
	if s.pos == 1:
		career.manager.trophies.append("%s %s" % [DB.divisions[my_d].name, UI.season_label(career.season)])
	if career.board < 15:
		career.sacked = true
	# a year older: the young improve, the old fade, some hang up their boots, academies fill the gaps
	var keep := []
	for p in career.players:
		p.age += 1
		if p.age <= 23:
			p.rating = mini(p.pot, p.rating + rng.int_in(1, 4))
		elif p.age >= 31:
			p.rating -= rng.int_in(1, 3)
		p.rating = clampi(p.rating, 35, 96)
		p.attr = make_attr(p)
		p.wage = wage(p)
		p.seasonGoals = 0
		p.seasonApps = 0
		p.rsum = 0.0
		p.injured = 0
		p.fitness = 100.0
		p.morale = 65.0
		if p.age < 36 or (p.rating >= 76 and p.age < 39):
			keep.append(p)
	career.players = keep
	reindex(career)
	for c in career.clubs:
		var sq := squad_of(career, c.id)
		if sq.size() < 23:
			for p in _fill_squad(career, c, sq, rng.fork("youth" + c.id + str(career.season))):
				p.age = mini(p.age, 20)
				career.players.append(p)
	reindex(career)
	career.history.append(s)
	career.season += 1
	career.week = 0
	career.results = []
	career.form = []
	career.lineup = null
	_new_fixtures(career)
	career.objective = objective(career, career.me)
	new_week(career)
	return s

func _longest(career: Dictionary) -> int:
	var n := 0
	for id in career.fixtures:
		n = maxi(n, career.fixtures[id].size())
	return n
