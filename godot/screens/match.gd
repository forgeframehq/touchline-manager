extends Screen
## Match day: the build-up, the live match on a 2D pitch with shouts, changes and speed control, then full time.

const SPEEDS := [1.2, 0.6, 0.3, 0.12]      # seconds per match minute
const SPEED_LABELS := ["1×", "2×", "4×", "8×"]

var state := "pre"            # pre, sim, live, ft
var m: Dictionary             # the live match
var side := "H"               # my side
var fx: Dictionary
var press = null
var press_answer = null
var speed_i := 1
var acc := 0.0
var paused := false
var tab_i := 0
var feed: Array = []
var task := -1
var pitch: MatchPitch
var sheet: Control
var result: Dictionary
# live widgets that change every minute
var w_score: Label
var w_clock: Label
var w_clock_box: PanelContainer
var w_scorers := {}
var w_stats := {}
var w_body: Control
var w_pause: Button
var w_speed: Button
var w_tabs: Control
var sub_off := -1
var sub_on := -1
var body_room := 138.0
var shots := {"H": 0, "A": 0}      # real shots: goals, saves and efforts off target (not every attack ends in one)
var on_target := {"H": 0, "A": 0}

func on_back() -> bool:
	return state != "pre"       # no walking out once the match has started

func test_state(s: String) -> void:
	if s == "real":          # the real path: threaded kick-off, then the live loop at top speed
		_kick_off()
		speed_i = 3
		return
	_kick_off_now()
	speed_i = 1
	if s == "watch":
		while m.min < 20:
			_minute(false)
		rebuild()
		return
	var until := 67 if s != "ft" else 200
	while not m.done and m.min < until:
		_minute(false)
	if s == "ft":
		_full_time()
		return
	rebuild()
	for i in 40:
		pitch._process(0.05)
	if s == "shout":
		_open_shouts()
	elif s == "changes":
		_open_changes()
	elif s == "stats":
		tab_i = 1
		_fill_body()

func build() -> void:
	var c := career()
	if state == "pre":
		fx = Sim.my_fixture(c)
		if press == null and press_answer == null:
			press = Sim.press_for(c, fx)
		_pre(c)
	elif state == "sim":
		root.add_child(UI.spacer(true))
		root.add_child(UI.centre(UI.num("Around the grounds", 22)))
		root.add_child(UI.centre(UI.label("Playing this week's other fixtures…", 13, UI.MUTED)))
		root.add_child(UI.spacer(true))
	elif state == "live":
		_live(c)
	else:
		_ft(c)

# ---------- before kick-off ----------
func _pre(c: Dictionary) -> void:
	var div: Dictionary = DB.divisions[Sim.my_div(c)]
	root.add_child(header("Match day", "%s · Matchday %d" % [div.name, c.week + 1], null, true))
	var v := UI.vbox(10)
	UI.grow(v, true, true)
	var home := Sim.club_of(c, fx.h)
	var away := Sim.club_of(c, fx.a)
	var card := UI.panel(16)
	var hb := UI.hbox(8)
	hb.add_child(_club_col(home))
	var mid := UI.vbox(2)
	mid.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(mid)
	mid.add_child(UI.centre(UI.num("VS", 30)))
	var st := UI.centre(UI.label("%s\n%s seats" % [home.stadium, Sim.commas(home.capacity)], 11, UI.MUTED))
	mid.add_child(st)
	hb.add_child(mid)
	hb.add_child(_club_col(away))
	card.add_child(hb)
	v.add_child(card)
	var opp: String = fx.a if fx.home else fx.h
	var t: Dictionary = c.tactics[c.me]
	var diff := Sim.difficulty(c, opp)
	var tiles := UI.hbox(8)
	tiles.add_child(_tile("Your shape", t.formation, DB.DATA.mentality[t.mentality].label))
	tiles.add_child(_tile("Chemistry", str(Sim.chemistry(c)), DB.DATA.styles[t.style].label + " football"))
	tiles.add_child(_tile("Opponent", ["Weak", "Beatable", "Even", "Strong", "Very strong"][diff - 1], "%s · %s" % [c.tactics[opp].formation, DB.DATA.mentality[c.tactics[opp].mentality].label]))
	v.add_child(tiles)
	if press != null and press_answer == null:
		var p := UI.panel(14)
		var pv := UI.vbox(8)
		pv.add_child(UI.cap("Press conference", UI.ACCENT))
		var q := UI.label(press.q, 15, UI.TEXT, 600)
		q.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		pv.add_child(q)
		for a in press.answers:
			var b := UI.btn(a.text, "ghost", 52, 13)
			b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			b.clip_text = false
			b.pressed.connect(func():
				press_answer = a
				Sim.apply_press(c, a)
				rebuild())
			pv.add_child(b)
		p.add_child(pv)
		v.add_child(p)
	else:
		if press_answer != null:
			var p := UI.panel(14)
			var pv := UI.vbox(4)
			pv.add_child(UI.cap("You told the press"))
			var q := UI.label("“%s”" % press_answer.text, 14, UI.TEXT, 600)
			q.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			pv.add_child(q)
			p.add_child(pv)
			v.add_child(p)
		var xi: Array = Sim.my_xi(c).xi
		var p2 := UI.panel(14)
		var lv := UI.vbox(6)
		lv.add_child(UI.cap("Your starting eleven"))
		var names := UI.label(", ".join(xi.map(func(pl): return UI.short_name(pl.name))), 13, UI.MUTED)
		names.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		lv.add_child(names)
		var change := UI.btn("Change line-up or tactics", "ghost", 44, 13)
		change.pressed.connect(func(): UI.nav.tab("tactics"))
		lv.add_child(change)
		p2.add_child(lv)
		v.add_child(p2)
		if h > 700:
			var best: Array = Sim.team_for(c, opp).xi.duplicate()
			best.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
			var dp := UI.panel(0)
			var dv := UI.vbox(0)
			dv.add_child(UI.pad(UI.fixed(UI.label("%s: ones to watch" % Sim.club_name(c, opp), 13, UI.TEXT, 700), 0, 32), 14, 0, 14, 0))
			for pl in best.slice(0, 3):
				dv.add_child(UI.line())
				var row := UI.hbox(8)
				row.custom_minimum_size.y = 30
				row.add_child(UI.fixed(UI.label(pl.pos, 11, UI.MUTED), 34))
				row.add_child(UI.clip(UI.label(pl.name, 13, UI.TEXT, 600)))
				row.add_child(UI.right(UI.num(str(pl.rating), 14), 30))
				dv.add_child(UI.pad(row, 14, 0, 14, 0))
			dp.add_child(dv)
			v.add_child(dp)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	var act := main_action("Kick off", _kick_off)
	act.get_child(0).disabled = press != null and press_answer == null
	root.add_child(act)

func _club_col(club: Dictionary) -> Control:
	var v := UI.vbox(6)
	v.custom_minimum_size.x = 104
	var cc := CenterContainer.new()
	cc.add_child(Crest.make(club, 48))
	v.add_child(cc)
	v.add_child(UI.centre(UI.wrap(UI.label(club.name, 14, UI.TEXT, 600), 2)))
	v.add_child(UI.centre(UI.label(UI.ordinal(Sim.position(career(), club.id)), 11, UI.MUTED)))
	return v

func _tile(caption: String, value: String, sub: String) -> Control:
	var p := UI.panel(10, UI.PANEL, 14)
	UI.grow(p)
	var v := UI.vbox(1)
	v.add_child(UI.cap(caption))
	v.add_child(UI.clip(UI.num(value, 18)))
	v.add_child(UI.clip(UI.label(sub, 11, UI.MUTED)))
	p.add_child(v)
	return p

func _kick_off() -> void:
	state = "sim"
	rebuild()
	task = WorkerThreadPool.add_task(func(): Game.kick_off())

func _kick_off_now() -> void:
	fx = Sim.my_fixture(career())
	if Game.live == null:
		Game.kick_off()
	_begin()

func _begin() -> void:
	m = Game.live
	side = "H" if m.h == career().me else "A"
	feed = [{"min": 0, "text": "Kick-off at %s." % m.H.club.stadium, "kind": ""}]
	shots = {"H": 0, "A": 0}
	on_target = {"H": 0, "A": 0}
	state = "live"
	paused = false

func _process(delta: float) -> void:
	if state == "sim":
		if task >= 0 and WorkerThreadPool.is_task_completed(task):
			WorkerThreadPool.wait_for_task_completion(task)
			task = -1
			_begin()
			rebuild()
		return
	if state != "live" or paused or sheet != null or m.done:
		return
	acc += delta
	var step: float = SPEEDS[speed_i]
	while acc >= step and not m.done and not paused:
		acc -= step
		_minute(true)
	if m.done:
		_full_time()

func _minute(show: bool) -> void:
	var evs := Sim.step_match(m)
	for ev in evs:
		if ev.type == "chance":
			ev.shot = (ev.min * 7 + ev.pid) % 5 < 2
		if ev.type in ["goal", "save"] or (ev.type == "chance" and ev.shot):
			shots[ev.side] += 1
			if ev.type != "chance":
				on_target[ev.side] += 1
		feed.push_front(Commentary.line(ev, m, career()))
		if ev.type == "ht" and show:
			paused = true
	if evs.is_empty() and m.min % 7 == 3:
		feed.push_front(Commentary.quiet(m.min, m[pitch.poss if pitch != null else "H"].club.name))
	if feed.size() > 40:
		feed.resize(40)
	if show and pitch != null:
		if evs.any(func(e): return e.type == "sub"):
			pitch.sync(m)
		var mh: float = pow(m.sH.mid, 2)
		pitch.share_home = clampf(mh / (mh + pow(m.sA.mid, 2)), 0.3, 0.7)
		pitch.play_minute(evs, SPEEDS[speed_i])
		_refresh()

# ---------- live ----------
func _live(c: Dictionary) -> void:
	var div: Dictionary = DB.divisions[m.div]
	var cap := UI.vbox(1)
	cap.custom_minimum_size.y = 44
	cap.alignment = BoxContainer.ALIGNMENT_CENTER
	cap.add_child(UI.centre(UI.cap("%s · Matchday %d" % [div.name, c.week + 1])))
	cap.add_child(UI.centre(UI.label(m.H.club.stadium, 11, UI.MUTED)))
	root.add_child(cap)
	# scoreboard
	var sb := UI.panel(12)
	var sv := UI.vbox(6)
	var hb := UI.hbox(8)
	hb.add_child(_score_side(m.H.club, false))
	var mid := UI.vbox(2)
	mid.custom_minimum_size.x = 120
	w_score = UI.centre(UI.num("0 – 0", 38))
	mid.add_child(w_score)
	w_clock_box = UI.panel(0, UI.ACCENT, 6, UI.CLEAR)
	w_clock_box.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	w_clock = UI.num("0'", 12, UI.BG)
	w_clock_box.add_child(UI.pad(w_clock, 8, 1, 8, 1))
	mid.add_child(w_clock_box)
	hb.add_child(mid)
	hb.add_child(_score_side(m.A.club, true))
	sv.add_child(hb)
	var sc := UI.hbox(8)
	for s in ["H", "A"]:
		var l := UI.clip(UI.label("", 11, UI.MUTED))
		if s == "A":
			UI.right(l)
		w_scorers[s] = l
		sc.add_child(l)
	sv.add_child(sc)
	sb.add_child(sv)
	root.add_child(UI.pad(sb, 16, 0, 16, 0))
	# pitch
	pitch = MatchPitch.new()
	var fixed_h := 44 + 112 + 8 + 86 + 50 + 4 + 70
	pitch.custom_minimum_size.y = clampf(h - fixed_h - 47 * 4, 170, 290)
	body_room = h - fixed_h - pitch.custom_minimum_size.y
	pitch.clip_contents = true
	pitch.setup(m)
	var pp := UI.panel(0, UI.PITCH_A, 14, UI.LINE)
	pp.clip_children = CanvasItem.CLIP_CHILDREN_ONLY
	pp.add_child(pitch)
	root.add_child(UI.pad(pp, 16, 8, 16, 0))
	# three stat bars
	var stats := UI.vbox(4)
	for key in ["Possession", "Shots (on target)", "Team condition"]:
		var row := UI.hbox(8)
		row.custom_minimum_size.y = 22
		var a := UI.fixed(UI.num("", 13), 46)
		var b := UI.right(UI.num("", 13), 46)
		var midv := UI.vbox(2)
		UI.grow(midv)
		midv.alignment = BoxContainer.ALIGNMENT_CENTER
		midv.add_child(UI.centre(UI.cap(key, UI.MUTED, 9)))
		var bar := Split.new()
		bar.ca = pitch.colors.H
		bar.cb = pitch.colors.A
		midv.add_child(bar)
		row.add_child(a)
		row.add_child(midv)
		row.add_child(b)
		w_stats[key] = [a, b, bar]
		stats.add_child(row)
	root.add_child(UI.pad(stats, 16, 8, 16, 0))
	w_tabs = UI.segments(["Commentary", "Stats", "Line-up"], tab_i, func(i):
		tab_i = i
		rebuild_tabs())
	root.add_child(UI.pad(w_tabs, 16, 10, 16, 0))
	w_body = UI.vbox(0)
	UI.grow(w_body, true, true)
	w_body.clip_contents = true
	root.add_child(UI.pad(w_body, 16, 4, 16, 0))
	# control bar
	var bar_p := UI.panel(0, UI.NAVBG, 0, UI.CLEAR)
	var ctl := UI.hbox(8)
	var shout := UI.btn("Shout", "ghost", 48)
	UI.grow(shout)
	shout.pressed.connect(_open_shouts)
	var chg := UI.btn("Changes", "ghost", 48)
	UI.grow(chg)
	chg.pressed.connect(_open_changes)
	w_speed = UI.btn(SPEED_LABELS[speed_i], "ghost", 48, 15)
	w_speed.custom_minimum_size.x = 56
	w_speed.add_theme_font_override("font", UI.font("num", 700))
	w_speed.pressed.connect(func():
		speed_i = (speed_i + 1) % SPEEDS.size()
		w_speed.text = SPEED_LABELS[speed_i])
	w_pause = UI.btn("Pause", "primary", 48, 15)
	w_pause.custom_minimum_size.x = 104
	w_pause.pressed.connect(func():
		paused = not paused
		_refresh())
	for b in [shout, chg, w_speed, w_pause]:
		ctl.add_child(b)
	bar_p.add_child(UI.pad(ctl, 16, 10, 16, 12))
	root.add_child(bar_p)
	_refresh()

## The tab row sits inside the live layout, so only the body is swapped.
func rebuild_tabs() -> void:
	for i in w_tabs.get_child_count():
		UI.restyle(w_tabs.get_child(i), "on" if i == tab_i else "off")
	_fill_body()

func _score_side(club: Dictionary, flip: bool) -> Control:
	var hb := UI.hbox(8)
	UI.grow(hb)
	var parts := [Crest.make(club, 30, false), UI.num(club.short, 18)]
	if flip:
		parts.reverse()
		hb.alignment = BoxContainer.ALIGNMENT_END
	for p in parts:
		p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(p)
	return hb

func _refresh() -> void:
	if w_score == null or not is_instance_valid(w_score):
		return
	w_score.text = "%d – %d" % [m.gH, m.gA]
	w_clock.text = "Half-time" if (paused and m.min == 45) else "%d'" % m.min
	w_pause.text = "Second half" if (paused and m.min == 45) else "Resume" if paused else "Pause"
	pitch.running = not paused
	for s in ["H", "A"]:
		var goals: Array = m.events.filter(func(e): return e.type == "goal" and e.side == s)
		w_scorers[s].text = " · ".join(goals.map(func(e): return "%s %d'" % [UI.short_name(e.who), e.min]))
	var ph: int = pitch.possession("H")
	_set_stat("Possession", "%d%%" % ph, "%d%%" % (100 - ph), ph / 100.0)
	var sh: int = shots.H
	var sa: int = shots.A
	_set_stat("Shots (on target)", "%d (%d)" % [sh, on_target.H], "%d (%d)" % [sa, on_target.A], 0.5 if sh + sa == 0 else sh / float(sh + sa))
	var fh := _condition("H")
	var fa := _condition("A")
	_set_stat("Team condition", "%d%%" % fh, "%d%%" % fa, fh / float(fh + fa))
	_fill_body()

func _condition(s: String) -> int:
	var t := 0.0
	for p in m[s].xi:
		t += p.fitness
	return int(round(t / m[s].xi.size()))

func _set_stat(key: String, a: String, b: String, share: float) -> void:
	w_stats[key][0].text = a
	w_stats[key][1].text = b
	w_stats[key][2].share = share
	w_stats[key][2].queue_redraw()

func _fill_body() -> void:
	for ch in w_body.get_children():
		w_body.remove_child(ch)
		ch.queue_free()
	var room := body_room
	if tab_i == 0:
		for item in feed.slice(0, int(room / 47)):
			w_body.add_child(_feed_row(item))
	elif tab_i == 1:
		var rows := [["Goals", m.gH, m.gA], ["Shots", shots.H, shots.A], ["On target", on_target.H, on_target.A], ["Attacks", m.shots.H, m.shots.A],
			["Substitutions", m.subs.H, m.subs.A], ["Mentality", DB.DATA.mentality[m.H.tactics.mentality].label, DB.DATA.mentality[m.A.tactics.mentality].label]]
		for r in rows.slice(0, int(room / 30)):
			var hb := UI.hbox(8)
			hb.custom_minimum_size.y = 30
			hb.add_child(UI.fixed(UI.num(str(r[1]), 14), 90))
			hb.add_child(UI.grow(UI.centre(UI.label(r[0], 12, UI.MUTED))))
			hb.add_child(UI.right(UI.num(str(r[2]), 14), 90))
			w_body.add_child(hb)
			w_body.add_child(UI.line())
	else:
		var g := UI.grid(2, 12)
		g.add_theme_constant_override("v_separation", 0)
		var per_col := int(room / 24)
		for p in m[side].xi.slice(0, per_col * 2):
			var hb := UI.hbox(6)
			UI.grow(hb)
			hb.custom_minimum_size.y = 24
			hb.add_child(UI.fixed(UI.label(p.pos, 10, UI.MUTED, 600), 28))
			hb.add_child(UI.clip(UI.label(UI.short_name(p.name), 12, UI.TEXT, 600)))
			hb.add_child(UI.right(UI.label("%d%%" % int(round(p.fitness)), 12, UI.cond_color(p.fitness), 600), 34))
			g.add_child(hb)
		w_body.add_child(g)

func _feed_row(item: Dictionary) -> Control:
	var hb := UI.hbox(10)
	hb.custom_minimum_size.y = 46
	var goal: bool = item.kind == "goal"
	var chip := UI.panel(0, UI.ACCENT if goal else UI.WARN if item.kind == "warn" else UI.LINE, 6, UI.CLEAR)
	chip.custom_minimum_size = Vector2(36, 24)
	chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	chip.add_child(UI.centre(UI.num("%d'" % item.min, 12, UI.BG if item.kind != "" else UI.TEXT)))
	hb.add_child(chip)
	var l := UI.label(item.text, 13, UI.TEXT, 700 if goal else 400)
	hb.add_child(UI.wrap(l, 2))
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
		var w := size.x - 3
		draw_rect(Rect2(0, 0, w * share, size.y), ca)
		draw_rect(Rect2(w * share + 3, 0, w * (1 - share), size.y), cb)

# ---------- sheets (the match waits while one is open) ----------
func _open_sheet(title: String, content: Control) -> void:
	_close_sheet()
	sheet = Control.new()
	sheet.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.6)
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
	head.add_child(UI.grow(UI.num(title, 18)))
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

func _open_shouts() -> void:
	var g := UI.grid(2, 8)
	for key in DB.DATA.shouts:
		var s: Dictionary = DB.DATA.shouts[key]
		var wait: int = m.cool[side].get(key, 0) - m.min
		var v := UI.vbox(1)
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		v.add_child(UI.centre(UI.label(s.label, 15, UI.TEXT, 700)))
		v.add_child(UI.centre(UI.label(s.sub if wait <= 0 else "Ready in %d min" % wait, 11, UI.MUTED)))
		var b := UI.row(v, 64, UI.RAISED)
		b.add_theme_stylebox_override("normal", UI.box(UI.RAISED, 12, UI.LINE2, 0))
		UI.grow(b)
		b.disabled = wait > 0
		b.modulate.a = 0.45 if wait > 0 else 1.0
		b.pressed.connect(func():
			Sim.shout(m, side, key)
			feed.push_front(Commentary.line({"min": m.min, "type": "shout", "side": side, "key": key}, m, career()))
			_close_sheet()
			_refresh())
		g.add_child(b)
	_open_sheet("Shout from the touchline", g)

func _open_changes() -> void:
	var v := UI.vbox(10)
	var keys: Array = DB.DATA.mentality7
	var cur: int = keys.find(m[side].tactics.mentality)
	v.add_child(UI.cap("Mentality: %s" % DB.DATA.mentality[m[side].tactics.mentality].label, UI.TEXT, 11))
	v.add_child(UI.segments(["Contain", "Def", "Counter", "Bal", "Control", "Att", "All out"], cur, func(i):
		Sim.set_tactic(m, side, "mentality", keys[i])
		_open_changes(), 36, 10, "accent"))
	var left: int = int(DB.DATA.season.subsAllowed) - m.subs[side]
	v.add_child(UI.label("Substitutions: %d of %d left. Tap who comes off, then who goes on." % [left, int(DB.DATA.season.subsAllowed)], 12, UI.MUTED))
	var cols := UI.hbox(8)
	var a := UI.vbox(2)
	UI.grow(a)
	for p in m[side].xi:
		a.add_child(_sub_row(p, "%d%%" % int(round(p.fitness)), UI.cond_color(p.fitness), sub_off == p.id, func():
			sub_off = p.id
			_open_changes()))
	var b := UI.vbox(2)
	UI.grow(b)
	for p in m[side].bench:
		b.add_child(_sub_row(p, str(p.rating), UI.TEXT, sub_on == p.id, func():
			sub_on = p.id
			_open_changes()))
	cols.add_child(a)
	cols.add_child(b)
	v.add_child(cols)
	var go := UI.btn("Make the change", "primary", 48, 15)
	go.disabled = sub_off < 0 or sub_on < 0 or left <= 0
	go.pressed.connect(func():
		if Sim.make_sub(m, side, sub_off, sub_on):
			feed.push_front(Commentary.line(m.events[-1], m, career()))
			pitch.sync(m)
		sub_off = -1
		sub_on = -1
		_close_sheet()
		_refresh())
	v.add_child(go)
	_open_sheet("Changes", v)

func _sub_row(p: Dictionary, right_text: String, col: Color, on: bool, pick: Callable) -> Control:
	var hb := UI.hbox(6)
	hb.add_child(UI.fixed(UI.label(p.pos, 10, UI.MUTED, 600), 28))
	hb.add_child(UI.clip(UI.label(UI.short_name(p.name), 12, UI.TEXT, 600)))
	hb.add_child(UI.right(UI.label(right_text, 12, col, 600), 34))
	var b := UI.row(UI.pad(hb, 8, 0, 8, 0), 30)
	b.add_theme_stylebox_override("normal", UI.box(UI.RAISED if on else UI.BG, 8, UI.ACCENT if on else UI.LINE, 0))
	b.pressed.connect(pick)
	return b

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
	root.add_child(header("Full time", "Victory" if us > them else "Defeat" if us < them else "Draw"))
	var v := UI.vbox(10)
	UI.grow(v, true, true)
	var card := UI.panel(16)
	var cv := UI.vbox(8)
	var hb := UI.hbox(8)
	hb.add_child(_ft_side(home))
	hb.add_child(UI.grow(UI.centre(UI.num("%d – %d" % [result.gH, result.gA], 44, UI.ACCENT if us > them else UI.TEXT))))
	hb.add_child(_ft_side(away))
	cv.add_child(hb)
	var goals: Array = result.events.filter(func(e): return e.type == "goal")
	if not goals.is_empty():
		var sc := UI.hbox(8)
		for s in ["H", "A"]:
			var l := UI.label("\n".join(goals.filter(func(e): return e.side == s).map(func(e): return "%s %d'" % [UI.short_name(e.who), e.min])), 12, UI.MUTED)
			UI.grow(l)
			if s == "A":
				UI.right(l)
			sc.add_child(l)
		cv.add_child(sc)
	card.add_child(cv)
	v.add_child(card)
	# best performers from my side
	var mine: Array = Sim.squad_of(c, c.me).filter(func(p): return result.ratings.has(p.id))
	mine.sort_custom(func(a, b): return result.ratings[a.id] > result.ratings[b.id] if result.ratings[a.id] != result.ratings[b.id] else a.id < b.id)
	var potm = Sim.player(c, result.potm) if result.potm != null else null
	var rp := UI.panel(0)
	var rv := UI.vbox(0)
	var head := UI.hbox(8)
	head.custom_minimum_size.y = 32
	head.add_child(UI.grow(UI.label("Player ratings", 13, UI.TEXT, 700)))
	if potm != null:
		head.add_child(UI.label("Player of the match: %s" % UI.short_name(potm.name), 12, UI.ACCENT, 600))
	rv.add_child(UI.pad(head, 14, 0, 14, 0))
	var n := clampi(int((h - 62 - 190 - 150 - 72 - 60) / 31), 3, 5)
	for p in mine.slice(0, n):
		rv.add_child(UI.line())
		var row := UI.hbox(8)
		row.custom_minimum_size.y = 30
		row.add_child(UI.fixed(UI.label(p.pos, 11, UI.MUTED), 34))
		row.add_child(UI.clip(UI.label(p.name, 13, UI.TEXT, 600)))
		var r: float = result.ratings[p.id]
		row.add_child(UI.right(UI.num("%.1f" % r, 14, UI.ACCENT if r >= 8 else UI.TEXT if r >= 6.5 else UI.WARN), 40))
		rv.add_child(UI.pad(row, 14, 0, 14, 0))
	rp.add_child(rv)
	v.add_child(rp)
	# where that leaves us
	var tiles := UI.hbox(8)
	tiles.add_child(_tile("League", UI.ordinal(Sim.position(c, c.me)), DB.divisions[Sim.my_div(c)].name))
	tiles.add_child(_tile("Board", "%d%%" % int(round(c.board.confidence)), "Confidence"))
	tiles.add_child(_tile("Shots", "%d – %d" % [shots.H, shots.A], "On target %d – %d" % [on_target.H, on_target.A]))
	v.add_child(tiles)
	var others: Array = c.results.filter(func(r): return r.week == c.week - 1 and r.div == result.div and r.h != c.me and r.a != c.me)
	var room := int((h - 62 - 150 - (33 + 31 * n) - 86 - 72 - 40 - 32) / 27)
	if room >= 2 and not others.is_empty():
		var op := UI.panel(0)
		var ov := UI.vbox(0)
		ov.add_child(UI.pad(UI.fixed(UI.label("Around the grounds", 13, UI.TEXT, 700), 0, 32), 14, 0, 14, 0))
		for r in others.slice(0, room):
			ov.add_child(UI.line())
			var row := UI.hbox(8)
			row.custom_minimum_size.y = 26
			row.add_child(UI.right(UI.clip(UI.label(Sim.club_name(c, r.h), 12, UI.MUTED))))
			row.add_child(UI.centre(UI.fixed(UI.num("%d – %d" % [r.gH, r.gA], 13), 46)))
			row.add_child(UI.clip(UI.label(Sim.club_name(c, r.a), 12, UI.MUTED)))
			ov.add_child(UI.pad(row, 14, 0, 14, 0))
		op.add_child(ov)
		v.add_child(op)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	root.add_child(main_action("Continue", func(): UI.nav.tab("office")))

func _ft_side(club: Dictionary) -> Control:
	var v := UI.vbox(4)
	v.custom_minimum_size.x = 96
	var cc := CenterContainer.new()
	cc.add_child(Crest.make(club, 44))
	v.add_child(cc)
	v.add_child(UI.centre(UI.wrap(UI.label(club.name, 13, UI.TEXT, 600), 2)))
	return v
