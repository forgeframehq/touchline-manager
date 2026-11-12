extends Screen
## Matchday: the build-up, the match itself on the pitch, your half-time talk, and full time.

const SPEEDS := [0.5, 0.25, 0.1, 0.03]      # seconds per action
const SPEED_LABELS := ["1×", "2×", "4×", "8×"]
const TALKS := ["Well done. More of the same.", "That is not good enough. I want more.", "Stay calm. Keep doing the right things."]

var state := "pre"            # pre, live, ft
var e: MatchEngine
var side := "H"
var speed_i := 1
var acc := 0.0
var paused := false
var feed: Array = []
var result: Dictionary
var pitch: MatchPitch
var sheet: Control
var sub_off := -1
var sub_on := -1
var talk_result := ""
var w := {}                   # live widgets
var body_rows := 3

func on_back() -> bool:
	return state != "pre"

func test_state(s: String) -> void:
	_kick_off()
	while not e.done and e.minute() < (200 if s == "ft" else 63):
		_step(false)
		if e.half == 2 and paused:
			paused = false
	if s == "ft":
		_full_time()
		return
	rebuild()
	for i in 30:
		pitch._process(0.05)
	if s == "watch":
		return
	if s == "tactics":
		_open_tactics()
	elif s == "subs":
		_open_subs()
	elif s == "ht":
		_open_talk()

func build() -> void:
	if state == "pre":
		_pre(career())
	elif state == "live":
		_live(career())
	else:
		_ft(career())

# ---------- before kick-off ----------
func _pre(c: Dictionary) -> void:
	var fx: Dictionary = Sim.my_fixture(c)
	root.add_child(header("Matchday", "%s · %s" % [Sim.match_date(c), Sim.club_of(c, fx.h).stadium], null, true))
	var v := UI.vbox(10)
	UI.grow(v, true, true)
	var card := UI.panel(16)
	var hb := UI.hbox(8)
	for id in [fx.h, fx.a]:
		var club := Sim.club_of(c, id)
		var cv := UI.vbox(6)
		cv.custom_minimum_size.x = 112
		var cc := CenterContainer.new()
		cc.add_child(Crest.make(club, 52))
		cv.add_child(cc)
		cv.add_child(UI.centre(UI.wrap(UI.label(club.name, 14, UI.TEXT, 700), 2)))
		cv.add_child(UI.centre(UI.label("%s · %s" % [UI.ordinal(Sim.position(c, id)), c.tactics[id].formation], 11, UI.MUTED)))
		hb.add_child(cv)
		if id == fx.h:
			var mid := UI.vbox(2)
			mid.alignment = BoxContainer.ALIGNMENT_CENTER
			UI.grow(mid)
			mid.add_child(UI.centre(UI.label("V", 34, UI.MUTED, 800, "num")))
			hb.add_child(mid)
	card.add_child(hb)
	v.add_child(card)
	var t: Dictionary = c.tactics[c.me]
	var prep := []
	if c.prep.att > 0:
		prep.append("sharper going forward")
	if c.prep.def > 0:
		prep.append("tighter at the back")
	if c.prep.sp > 0:
		prep.append("dangerous from set pieces")
	var notes := UI.panel(16, UI.PAPER, 6, UI.CLEAR)
	var nv := UI.vbox(6)
	nv.add_child(UI.cap("Your notes for today", UI.INK2, 11))
	nv.add_child(UI.label("%s, %s" % [t.formation, Sim.MENTALITY[t.mentality].to_lower()], 24, UI.INK, 800, "num"))
	nv.add_child(UI.wrap(UI.label("%s tempo. %s without the ball. %s" % [Sim.TEMPO[t.tempo], Sim.PRESS[t.press], "The week's work has left the team %s." % ", ".join(prep) if not prep.is_empty() else "You did no special preparation this week."], 14, UI.INK), 4, true))
	notes.add_child(nv)
	v.add_child(notes)
	var xi: Array = Sim.my_xi(c).xi
	var p2 := UI.panel(14)
	var lv := UI.vbox(6)
	lv.add_child(UI.cap("Your eleven"))
	lv.add_child(UI.wrap(UI.label(", ".join(xi.map(func(pl): return UI.short_name(pl.name))), 13, UI.MUTED), 3, true))
	var change := UI.btn("Change the team", "ghost", 44, 13)
	change.pressed.connect(func(): UI.nav.tab("tactics"))
	lv.add_child(change)
	p2.add_child(lv)
	v.add_child(p2)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	root.add_child(main_action("Kick off", func():
		_kick_off()
		rebuild()))

func _kick_off() -> void:
	Game.kick_off()
	e = Game.engine
	side = "H" if e.T.H.id == career().me else "A"
	feed = [{"clock": "1'", "text": "We are under way at %s." % e.T.H.club.stadium, "kind": ""}]
	state = "live"
	paused = false

func _process(delta: float) -> void:
	if state != "live" or paused or sheet != null or e.done:
		return
	acc += delta
	var dur: float = SPEEDS[speed_i]
	var n := 0
	while acc >= dur and not e.done and not paused and n < 8:
		acc -= dur
		n += 1
		_step(true)
	if e.done:
		_full_time()

func _step(show: bool) -> void:
	var before := e.events.size()
	var out := e.step()
	for ev in e.events.slice(before):
		var line := _line(ev)
		if line.text != "":
			feed.push_front(line)
		if ev.t == "ht":
			paused = true
			if show:
				_open_talk.call_deferred()
	if feed.size() > 30:
		feed.resize(30)
	if show and pitch != null:
		pitch.on_step(out, SPEEDS[speed_i])
		_refresh()

func _pick(a: Array) -> String:
	return a[randi() % a.size()]

func _line(ev: Dictionary) -> Dictionary:
	var team: String = e.T[ev.side].club.name
	var text := ""
	var kind := ""
	match ev.t:
		"shot":
			var who: String = ev.who
			match ev.res:
				"goal":
					text = _pick(["GOAL! %s scores for %s!", "GOAL! %s finds the net for %s!", "It's in! %s, for %s!"]) % [who, team]
					if ev.header:
						text = "GOAL! %s rises highest and heads it in for %s!" % [who, team]
					if ev.assist != null:
						text += " %s with the pass." % UI.short_name(ev.assist)
					text += " %s %s %s." % [e.T.H.club.short, ev.score, e.T.A.club.short]
					kind = "goal"
				"save":
					text = _pick(["%s shoots, and %s saves.", "%s is denied by %s.", "%s forces a good stop from %s."]) % [who, UI.short_name(ev.keeper)]
				"block":
					text = _pick(["%s shoots, but it is blocked.", "A defender throws himself in front of %s's shot."]) % who
				_:
					text = _pick(["%s drags it wide.", "%s blazes over.", "%s's header drifts wide." if ev.header else "%s misses the target."]) % who
		"foul":
			if ev.card:
				text = "Yellow card. %s is booked for a foul on %s." % [ev.who, UI.short_name(ev.on)]
				kind = "warn"
		"injury":
			text = "%s is hurt and may not be able to continue at full tilt." % ev.who
			kind = "warn"
		"sub":
			text = "%s change: %s on for %s." % [team, ev.on, ev.off]
		"ht":
			text = "Half-time: %s %s %s." % [e.T.H.club.name, ev.score, e.T.A.club.name]
			kind = "warn"
		"ft":
			text = "Full time: %s %s %s." % [e.T.H.club.name, ev.score, e.T.A.club.name]
			kind = "warn"
	return {"clock": ev.clock, "text": text, "kind": kind}

# ---------- live ----------
func _live(c: Dictionary) -> void:
	var cap := UI.vbox(0)
	cap.custom_minimum_size.y = 40
	cap.alignment = BoxContainer.ALIGNMENT_CENTER
	cap.add_child(UI.centre(UI.cap("%s · %s" % [DB.divisions[Sim.my_div(c)].name, e.T.H.club.stadium])))
	root.add_child(cap)
	var sb := UI.panel(12)
	var sv := UI.vbox(4)
	var hb := UI.hbox(8)
	hb.add_child(_score_side(e.T.H.club, false))
	var mid := UI.vbox(0)
	mid.custom_minimum_size.x = 124
	w.score = UI.centre(UI.label("0 – 0", 44, UI.TEXT, 800, "num"))
	mid.add_child(w.score)
	var cb := UI.panel(0, UI.ACCENT, 6, UI.CLEAR)
	cb.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	w.clock = UI.num("1'", 13, UI.BG)
	cb.add_child(UI.pad(w.clock, 8, 1, 8, 1))
	mid.add_child(cb)
	hb.add_child(mid)
	hb.add_child(_score_side(e.T.A.club, true))
	sv.add_child(hb)
	var sc := UI.hbox(8)
	for s in ["H", "A"]:
		var l := UI.clip(UI.label("", 11, UI.MUTED))
		if s == "A":
			UI.right(l)
		w["sc" + s] = l
		sc.add_child(l)
	sv.add_child(sc)
	sb.add_child(sv)
	root.add_child(UI.pad(sb, 16, 0, 16, 0))
	var fixed_h := 40 + 118 + 8 + 86 + 8 + 72
	pitch = MatchPitch.new()
	pitch.custom_minimum_size.y = clampf(h - fixed_h - 47 * 4, 176, 300)
	body_rows = int((h - fixed_h - pitch.custom_minimum_size.y) / 47)
	pitch.setup(e)
	var pp := UI.panel(0, UI.PITCH_A, 14, UI.LINE)
	pp.clip_children = CanvasItem.CLIP_CHILDREN_ONLY
	pp.add_child(pitch)
	root.add_child(UI.pad(pp, 16, 8, 16, 0))
	var stats := UI.vbox(4)
	for key in ["Possession", "Shots (on target)", "Chances created (xG)"]:
		var row := UI.hbox(8)
		row.custom_minimum_size.y = 22
		var a := UI.fixed(UI.num("", 14), 50)
		var b := UI.right(UI.num("", 14), 50)
		var mv := UI.vbox(2)
		UI.grow(mv)
		mv.alignment = BoxContainer.ALIGNMENT_CENTER
		mv.add_child(UI.centre(UI.cap(key, UI.MUTED, 9)))
		var bar := Split.new()
		bar.ca = pitch.colors.H
		bar.cb = pitch.colors.A
		mv.add_child(bar)
		row.add_child(a)
		row.add_child(mv)
		row.add_child(b)
		w[key] = [a, b, bar]
		stats.add_child(row)
	root.add_child(UI.pad(stats, 16, 8, 16, 0))
	w.body = UI.vbox(0)
	UI.grow(w.body, true, true)
	w.body.clip_contents = true
	root.add_child(UI.pad(w.body, 16, 4, 16, 0))
	var bar_p := UI.panel(0, UI.NAVBG, 0, UI.CLEAR)
	var ctl := UI.hbox(8)
	var tac := UI.btn("Tactics", "ghost", 48)
	UI.grow(tac)
	tac.pressed.connect(_open_tactics)
	var subs := UI.btn("Subs", "ghost", 48)
	UI.grow(subs)
	subs.pressed.connect(_open_subs)
	w.speed = UI.btn(SPEED_LABELS[speed_i], "ghost", 48, 16)
	w.speed.custom_minimum_size.x = 56
	w.speed.add_theme_font_override("font", UI.font("num", 700))
	w.speed.pressed.connect(func():
		speed_i = (speed_i + 1) % SPEEDS.size()
		w.speed.text = SPEED_LABELS[speed_i])
	w.pause = UI.btn("Pause", "primary", 48, 15)
	w.pause.custom_minimum_size.x = 104
	w.pause.pressed.connect(func():
		paused = not paused
		_refresh())
	for b in [tac, subs, w.speed, w.pause]:
		ctl.add_child(b)
	bar_p.add_child(UI.pad(ctl, 16, 10, 16, 12))
	root.add_child(bar_p)
	_refresh()

func _score_side(club: Dictionary, flip: bool) -> Control:
	var hb := UI.hbox(8)
	UI.grow(hb)
	var parts := [Crest.make(club, 30, false), UI.label(club.short, 20, UI.TEXT, 800, "num")]
	if flip:
		parts.reverse()
		hb.alignment = BoxContainer.ALIGNMENT_END
	for p in parts:
		p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(p)
	return hb

func _refresh() -> void:
	if not w.has("score") or not is_instance_valid(w.score):
		return
	w.score.text = "%d – %d" % [e.score.H, e.score.A]
	var ht: bool = paused and e.half == 2 and e.sec <= 45 * 60.0 + 1
	w.clock.text = "Half-time" if ht else e.clock()
	w.pause.text = "Second half" if ht else "Resume" if paused else "Pause"
	pitch.running = not paused
	for s in ["H", "A"]:
		var goals: Array = e.events.filter(func(ev): return ev.t == "shot" and ev.res == "goal" and ev.side == s)
		w["sc" + s].text = " · ".join(goals.map(func(ev): return "%s %d'" % [UI.short_name(ev.who), ev.min]))
	var ph := e.possession("H")
	_stat("Possession", "%d%%" % ph, "%d%%" % (100 - ph), ph / 100.0)
	var sh: Dictionary = e.stats.H
	var sa: Dictionary = e.stats.A
	_stat("Shots (on target)", "%d (%d)" % [sh.shots, sh.on], "%d (%d)" % [sa.shots, sa.on], 0.5 if sh.shots + sa.shots == 0 else sh.shots / float(sh.shots + sa.shots))
	_stat("Chances created (xG)", "%.2f" % sh.xg, "%.2f" % sa.xg, 0.5 if sh.xg + sa.xg <= 0 else sh.xg / (sh.xg + sa.xg))
	for ch in w.body.get_children():
		w.body.remove_child(ch)
		ch.queue_free()
	for item in feed.slice(0, body_rows):
		w.body.add_child(_feed_row(item))

func _stat(key: String, a: String, b: String, share: float) -> void:
	w[key][0].text = a
	w[key][1].text = b
	w[key][2].share = share
	w[key][2].queue_redraw()

func _feed_row(item: Dictionary) -> Control:
	var hb := UI.hbox(10)
	hb.custom_minimum_size.y = 46
	var goal: bool = item.kind == "goal"
	var chip := UI.panel(0, UI.ACCENT if goal else UI.WARN if item.kind == "warn" else UI.LINE, 6, UI.CLEAR)
	chip.custom_minimum_size = Vector2(42, 24)
	chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	chip.add_child(UI.centre(UI.num(item.clock, 12, UI.BG if item.kind != "" else UI.TEXT)))
	hb.add_child(chip)
	hb.add_child(UI.wrap(UI.label(item.text, 13, UI.TEXT, 700 if goal else 400), 2))
	var v := UI.vbox(0)
	v.add_child(hb)
	v.add_child(UI.line())
	return v

class Split extends Control:
	var share := 0.5
	var ca := Color.RED
	var cb := Color.WHITE
	func _init() -> void:
		custom_minimum_size.y = 5
	func _draw() -> void:
		var ww := size.x - 3
		draw_rect(Rect2(0, 0, ww * share, size.y), ca)
		draw_rect(Rect2(ww * share + 3, 0, ww * (1 - share), size.y), cb)

# ---------- sheets (the match waits while one is open) ----------
func _open_sheet(title: String, content: Control, closable := true) -> void:
	_close_sheet()
	sheet = Control.new()
	sheet.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.62)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	sheet.add_child(dim)
	var p := UI.panel(16, UI.PANEL, 20, UI.LINE2)
	p.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	p.grow_vertical = Control.GROW_DIRECTION_BEGIN
	p.offset_left = 8
	p.offset_right = -8
	p.offset_bottom = -8
	var v := UI.vbox(10)
	var head := UI.hbox(8)
	head.add_child(UI.grow(UI.label(title, 22, UI.TEXT, 800, "num")))
	if closable:
		var x := UI.btn("Close", "ghost", 40, 13)
		x.custom_minimum_size.x = 72
		x.pressed.connect(_close_sheet)
		head.add_child(x)
	v.add_child(head)
	v.add_child(content)
	p.add_child(v)
	sheet.add_child(p)
	add_child(sheet)
	if pitch != null:
		pitch.running = false

func _close_sheet() -> void:
	if sheet != null:
		remove_child(sheet)
		sheet.queue_free()
		sheet = null
		if pitch != null:
			pitch.running = not paused

func _open_tactics() -> void:
	var v := UI.vbox(8)
	var t: Dictionary = e.T[side].tac
	for row in [["mentality", "Mentality", ["V. def", "Def", "Balanced", "Attack", "All out"]], ["tempo", "Tempo", Sim.TEMPO], ["press", "Without the ball", Sim.PRESS]]:
		v.add_child(UI.cap(row[1], UI.MUTED, 10))
		var key: String = row[0]
		v.add_child(UI.segments(row[2], t[key], func(i):
			e.set_tactic(side, key, i)
			_open_tactics(), 40, 12, "accent"))
	_open_sheet("Change it", v)

func _open_subs() -> void:
	var v := UI.vbox(10)
	var left: int = 5 - e.T[side].subs
	v.add_child(UI.label("%d of 5 changes left. Tap who comes off, then who goes on." % left, 12, UI.MUTED))
	var cols := UI.hbox(8)
	var a := UI.vbox(2)
	UI.grow(a)
	for p in e.T[side].xi:
		a.add_child(_sub_row(p, "%d%%" % int(round(p.fitness)), UI.cond_color(p.fitness + 12), sub_off == p.id, func():
			sub_off = p.id
			_open_subs()))
	var b := UI.vbox(2)
	UI.grow(b)
	for p in e.T[side].bench:
		b.add_child(_sub_row(p, str(p.rating), UI.TEXT, sub_on == p.id, func():
			sub_on = p.id
			_open_subs()))
	cols.add_child(a)
	cols.add_child(b)
	v.add_child(cols)
	var go := UI.btn("Make the change", "primary", 48, 15)
	go.disabled = sub_off < 0 or sub_on < 0 or left <= 0
	go.pressed.connect(func():
		var ev := e.sub(side, sub_off, sub_on)
		if not ev.is_empty():
			feed.push_front(_line(ev))
		sub_off = -1
		sub_on = -1
		_close_sheet()
		_refresh())
	v.add_child(go)
	_open_sheet("Substitutions", v)

func _sub_row(p: Dictionary, right_text: String, col: Color, on: bool, pick: Callable) -> Control:
	var hb := UI.hbox(6)
	hb.add_child(UI.fixed(UI.label(p.pos, 10, UI.MUTED, 600), 28))
	hb.add_child(UI.clip(UI.label(UI.short_name(p.name), 12, UI.TEXT, 600)))
	hb.add_child(UI.right(UI.label(right_text, 12, col, 600), 34))
	var b := UI.row(UI.pad(hb, 8, 0, 8, 0), 30)
	b.add_theme_stylebox_override("normal", UI.box(UI.RAISED if on else UI.BG, 8, UI.ACCENT if on else UI.LINE, 0))
	b.pressed.connect(pick)
	return b

func _open_talk() -> void:
	var v := UI.vbox(8)
	var diff: int = e.score[side] - e.score["A" if side == "H" else "H"]
	if talk_result != "":
		v.add_child(UI.wrap(UI.label(talk_result, 14, UI.TEXT), 3, true))
		var go := UI.btn("Send them back out", "primary", 48, 15)
		go.pressed.connect(func():
			talk_result = ""
			_close_sheet()
			paused = false
			_refresh())
		v.add_child(go)
	else:
		v.add_child(UI.wrap(UI.label("The dressing room goes quiet. You are %s. What do you say?" % ("ahead" if diff > 0 else "behind" if diff < 0 else "level"), 14, UI.MUTED), 2, true))
		for i in TALKS.size():
			var b := UI.btn(TALKS[i], "ghost", 52, 14)
			b.pressed.connect(func():
				talk_result = e.team_talk(side, i)
				_open_talk())
			v.add_child(b)
	_open_sheet("Half-time", v, false)
	_refresh()

# ---------- full time ----------
func _full_time() -> void:
	_close_sheet()
	result = Game.full_time()
	state = "ft"
	rebuild()

func _ft(c: Dictionary) -> void:
	var home := Sim.club_of(c, result.h)
	var away := Sim.club_of(c, result.a)
	var us: int = result.gH if result.h == c.me else result.gA
	var them: int = result.gA if result.h == c.me else result.gH
	root.add_child(header("Full time", "A win" if us > them else "A defeat" if us < them else "A draw"))
	var v := UI.vbox(10)
	UI.grow(v, true, true)
	var card := UI.panel(16)
	var cv := UI.vbox(8)
	var hb := UI.hbox(8)
	for club in [home, away]:
		var sv := UI.vbox(4)
		sv.custom_minimum_size.x = 96
		var cc := CenterContainer.new()
		cc.add_child(Crest.make(club, 44))
		sv.add_child(cc)
		sv.add_child(UI.centre(UI.wrap(UI.label(club.name, 13, UI.TEXT, 600), 2)))
		hb.add_child(sv)
		if club == home:
			hb.add_child(UI.grow(UI.centre(UI.label("%d – %d" % [result.gH, result.gA], 52, UI.ACCENT if us > them else UI.TEXT, 800, "num"))))
	cv.add_child(hb)
	var goals: Array = result.events.filter(func(ev): return ev.t == "shot" and ev.res == "goal")
	if not goals.is_empty():
		var sc := UI.hbox(8)
		for s in ["H", "A"]:
			var l := UI.label("\n".join(goals.filter(func(ev): return ev.side == s).map(func(ev): return "%s %d'" % [UI.short_name(ev.who), ev.min])), 12, UI.MUTED)
			UI.grow(l)
			if s == "A":
				UI.right(l)
			sc.add_child(l)
		cv.add_child(sc)
	card.add_child(cv)
	v.add_child(card)
	var st: Dictionary = result.stats
	var tiles := UI.hbox(8)
	for f in [["Shots", "%d – %d" % [st.H.shots, st.A.shots]], ["Chances (xG)", "%.1f – %.1f" % [st.H.xg, st.A.xg]], ["League", UI.ordinal(Sim.position(c, c.me))]]:
		var p := UI.panel(10, UI.PANEL, 14)
		UI.grow(p)
		var pv := UI.vbox(0)
		pv.add_child(UI.cap(f[0]))
		pv.add_child(UI.num(f[1], 20))
		p.add_child(pv)
		tiles.add_child(p)
	v.add_child(tiles)
	var mine: Array = Sim.squad_of(c, c.me).filter(func(p): return result.ratings.has(p.id))
	mine.sort_custom(func(a, b): return result.ratings[a.id] > result.ratings[b.id] if result.ratings[a.id] != result.ratings[b.id] else a.id < b.id)
	var rp := UI.panel(0)
	var rv := UI.vbox(0)
	rv.add_child(UI.pad(UI.fixed(UI.label("How your players did", 13, UI.TEXT, 700), 0, 32), 14, 0, 14, 0))
	var n := clampi(int((h - 62 - 200 - 70 - 72 - 60) / 31), 3, 11)
	for p in mine.slice(0, n):
		rv.add_child(UI.line())
		var row := UI.hbox(8)
		row.custom_minimum_size.y = 30
		row.add_child(UI.fixed(UI.label(p.pos, 11, UI.MUTED), 34))
		row.add_child(UI.clip(UI.label(p.name, 13, UI.TEXT, 600)))
		var r: float = result.ratings[p.id]
		row.add_child(UI.right(UI.num("%.1f" % r, 15, UI.ACCENT if r >= 7.8 else UI.TEXT if r >= 6.3 else UI.WARN), 40))
		rv.add_child(UI.pad(row, 14, 0, 14, 0))
	rp.add_child(rv)
	v.add_child(rp)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	root.add_child(main_action("Back to your desk", func(): UI.nav.tab("desk")))
