class_name MatchPitch
extends Control
## The live 2D pitch. The match engine decides what happens each minute; this plays it out so you can watch:
## both teams hold their shape and shift with the ball, the ball is passed around, and chances end in a shot.
## Home attacks left to right.

var men: Array = []            # {id, side, name, gk, base: Vector2, pos: Vector2, run: Vector2 or null}
var colors := {}               # side -> Color
var ball := Vector2(0.5, 0.5)
var ball_from := Vector2(0.5, 0.5)
var ball_to := Vector2(0.5, 0.5)
var ball_t := 1.0
var ball_dur := 0.3
var holder := -1               # index into men, or -1 while the ball is loose
var poss := "H"
var queue: Array = []          # steps left this minute: {to: man index or -1, point, dur, kind}
var hold := 0.0
var poss_time := {"H": 1.0, "A": 1.0}
var share_home := 0.5          # how much of the ball the home side should see (set from midfield strength)
var clock := 0.0
var flash := 0.0
var flash_text := ""
var running := true
var _rng := RandomNumberGenerator.new()

func setup(m: Dictionary) -> void:
	var cols := UI.team_colors(m.H.club, m.A.club)
	colors = {"H": cols[0], "A": cols[1]}
	sync(m)
	_kick_off("H")

## Rebuilds the two elevens from the match (call after substitutions). Players keep their spot on the pitch.
func sync(m: Dictionary) -> void:
	var old := {}
	for man in men:
		old[man.id] = man.pos
	var holder_id: int = men[holder].id if holder >= 0 and holder < men.size() else -1
	men = []
	for side in ["H", "A"]:
		for e in Sim.layout_xi(m[side].xi, m[side].tactics.formation):
			var along: float = 0.03 + (1.0 - e.slot.y) * 0.68
			var across: float = clampf(0.5 + (e.slot.x - 0.5) * 1.14, 0.06, 0.94)
			var base := Vector2(along, across) if side == "H" else Vector2(1.0 - along, 1.0 - across + 0.035)
			men.append({"id": e.p.id, "side": side, "name": UI.short_name(e.p.name), "gk": e.slot.code == "GK", "base": base,
				"pos": old.get(e.p.id, base), "run": null, "push": 0.38 + e.slot.row * 0.05, "ph": float(e.p.id % 97)})
	holder = -1
	for i in men.size():
		if men[i].id == holder_id:
			holder = i

func possession(side: String) -> int:
	return int(round(100.0 * poss_time[side] / (poss_time.H + poss_time.A)))

func _kick_off(side: String) -> void:
	poss = side
	ball = Vector2(0.5, 0.5)
	ball_t = 1.0
	queue.clear()
	holder = _nearest(side, ball, false)
	for man in men:
		man.run = null

func _nearest(side: String, to: Vector2, allow_gk: bool, skip := -1) -> int:
	var best := -1
	var bd := 9.0
	for i in men.size():
		var man: Dictionary = men[i]
		if man.side != side or i == skip or (man.gk and not allow_gk):
			continue
		var d: float = man.pos.distance_to(to)
		if d < bd:
			bd = d
			best = i
	return best

func _keeper(side: String) -> int:
	for i in men.size():
		if men[i].side == side and men[i].gk:
			return i
	return _nearest(side, Vector2(0.0 if side == "H" else 1.0, 0.5), true)

func _index_of(id: int) -> int:
	for i in men.size():
		if men[i].id == id:
			return i
	return -1

## A team-mate to pass to: one of the nearer ones, leaning forward.
func _receiver(from: int) -> int:
	var side: String = men[from].side
	var dir := 1.0 if side == "H" else -1.0
	var scored := []
	for i in men.size():
		if i == from or men[i].side != side or men[i].gk:
			continue
		var d: Vector2 = men[i].pos - men[from].pos
		scored.append([d.length() - d.x * dir * 0.5 + _rng.randf() * 0.25, i])
	scored.sort_custom(func(a, b): return a[0] < b[0])
	return scored[_rng.randi() % mini(3, scored.size())][1] if not scored.is_empty() else from

## Plays one minute: `events` are that minute's events from the engine, `dur` is how long the minute lasts on screen.
func play_minute(events: Array, dur: float) -> void:
	queue.clear()
	var shots := events.filter(func(e): return e.type in ["goal", "save", "chance"])
	if shots.is_empty():
		var want := "H" if _rng.randf() < share_home else "A"
		if want != poss and holder >= 0:          # the other side wins it
			poss = want
			queue.append({"to": _nearest(poss, ball, false), "dur": dur * 0.25, "kind": "pass"})
		var passes := 2 if dur >= 0.5 else 1
		for i in passes:
			queue.append({"to": -2, "dur": dur * (0.32 if passes == 2 else 0.6), "kind": "pass"})
		return
	var each: float = dur / shots.size()
	for ev in shots:
		var side: String = ev.side
		var dir := 1.0 if side == "H" else -1.0
		var goal_x := 1.0 if side == "H" else 0.0
		var shooter := _index_of(ev.pid)
		if shooter < 0:
			shooter = _nearest(side, Vector2(goal_x, 0.5), false)
		queue.append({"to": -3, "side": side, "dur": each * 0.2, "kind": "pass"})
		men[shooter].run = Vector2(goal_x - dir * _rng.randf_range(0.1, 0.2), _rng.randf_range(0.32, 0.68))
		queue.append({"to": shooter, "dur": each * 0.26, "kind": "pass"})
		var target: Vector2
		match ev.type:
			"goal": target = Vector2(goal_x + dir * 0.012, _rng.randf_range(0.45, 0.55))
			"save": target = Vector2(goal_x - dir * 0.03, _rng.randf_range(0.46, 0.54))
			_: target = Vector2(goal_x + dir * 0.02, 0.5 + (0.13 if _rng.randf() < 0.5 else -0.13))
		if ev.type == "chance" and not ev.get("shot", true):     # the attack breaks down before a shot
			queue.append({"to": -4, "side": side, "dur": each * 0.15, "kind": "lost"})
			continue
		queue.append({"to": -1, "point": target, "dur": each * 0.18, "kind": ev.type, "side": side})

func _next_step() -> void:
	if queue.is_empty():
		return
	var s: Dictionary = queue.pop_front()
	var to: int = s.to
	if to == -3:                      # start of an attack: give it to someone on that side
		poss = s.side
		to = _nearest(poss, ball, false, holder)
	elif to == -2:
		to = _receiver(holder) if holder >= 0 else _nearest(poss, ball, false)
	elif to == -4:                    # a defender nicks it
		for man in men:
			man.run = null
		to = _nearest("A" if s.side == "H" else "H", ball, false)
	ball_from = ball
	ball_dur = maxf(0.05, s.dur)
	ball_t = 0.0
	if to >= 0 and to < men.size():
		poss = men[to].side
		var lead: Vector2 = men[to].run if men[to].run != null else men[to].pos
		ball_to = lead
		holder = -1
		set_meta("arrive", {"man": to, "kind": s.kind})
	else:
		ball_to = s.point
		holder = -1
		set_meta("arrive", {"man": -1, "kind": s.kind, "side": s.side})

func _arrive() -> void:
	var a: Dictionary = get_meta("arrive", {})
	remove_meta("arrive")
	if a.is_empty():
		return
	if a.man >= 0:
		holder = a.man
		hold = 0.06
		return
	var other: String = "A" if a.side == "H" else "H"
	match a.kind:
		"goal":
			flash = 1.6
			flash_text = "GOAL"
			queue.clear()
			await get_tree().create_timer(0.9).timeout
			_kick_off(other)
		_:
			for man in men:
				man.run = null
			poss = other
			holder = _keeper(other)
			hold = 0.25

func _process(delta: float) -> void:
	if men.is_empty() or not running:
		return
	poss_time[poss] += delta
	clock += delta
	flash = maxf(0.0, flash - delta)
	if ball_t < 1.0:
		ball_t = minf(1.0, ball_t + delta / ball_dur)
		ball = ball_from.lerp(ball_to, ball_t)
		if ball_t >= 1.0:
			_arrive()
	elif holder >= 0:
		ball = men[holder].pos
		hold -= delta
		if hold <= 0.0:
			_next_step()
	elif not has_meta("arrive"):
		_next_step()
	var presser := _nearest("A" if poss == "H" else "H", ball, false)
	var k := 1.0 - exp(-delta * 3.2)
	for i in men.size():
		var man: Dictionary = men[i]
		var dir := 1.0 if man.side == "H" else -1.0
		var target: Vector2 = man.base
		if man.gk:
			target = Vector2(man.base.x + (ball.x - 0.5) * 0.05, lerpf(0.5, ball.y, 0.25))
		else:
			target.x += (ball.x - 0.5) * man.push + (0.05 if man.side == poss else -0.03) * dir
			target.y = lerpf(target.y, ball.y, 0.14)
			target += Vector2(sin(clock * 0.9 + man.ph), cos(clock * 0.7 + man.ph * 1.7)) * 0.018    # nobody stands still
			if man.run != null:
				target = man.run
			elif i == holder:
				target = man.pos + Vector2(dir * 0.03, 0)
			elif i == presser:
				target = target.lerp(ball, 0.7)
		target.x = clampf(target.x, 0.03, 0.97)
		target.y = clampf(target.y, 0.05, 0.95)
		man.pos = man.pos.lerp(target, k)
	queue_redraw()

func _pt(v: Vector2) -> Vector2:
	var m := 9.0
	return Vector2(m + v.x * (size.x - 2 * m), m + v.y * (size.y - 2 * m))

func _draw() -> void:
	var bands := 10
	var bw := size.x / bands
	for i in bands:
		draw_rect(Rect2(i * bw, 0, bw + 1, size.y), UI.PITCH_A if i % 2 == 0 else UI.PITCH_B)
	var w := Color(1, 1, 1, 0.28)
	var a := _pt(Vector2.ZERO)
	var b := _pt(Vector2.ONE)
	draw_rect(Rect2(a, b - a), w, false, 1.5)
	draw_line(_pt(Vector2(0.5, 0)), _pt(Vector2(0.5, 1)), w, 1.5)
	draw_arc(_pt(Vector2(0.5, 0.5)), size.y * 0.13, 0, TAU, 48, w, 1.5, true)
	for gx in [0.0, 1.0]:
		var d := 1.0 if gx == 0.0 else -1.0
		var p0 := _pt(Vector2(gx, 0.24))
		var p1 := _pt(Vector2(gx + d * 0.14, 0.76))
		draw_rect(Rect2(Vector2(minf(p0.x, p1.x), p0.y), Vector2(absf(p1.x - p0.x), p1.y - p0.y)), w, false, 1.5)
		var g0 := _pt(Vector2(gx, 0.44))
		var g1 := _pt(Vector2(gx, 0.56))
		draw_line(g0, g1, Color(1, 1, 1, 0.8), 3.0)
	for i in men.size():
		var man: Dictionary = men[i]
		var c: Color = UI.WARN if man.gk and man.side == "H" else Color("4CC2FF") if man.gk else colors[man.side]
		var p := _pt(man.pos)
		draw_circle(p, 7.5, Color.WHITE if c.get_luminance() < 0.75 else UI.BG, true, -1, true)
		draw_circle(p, 5.8, c, true, -1, true)
	var bp := _pt(ball)
	draw_circle(bp, 5.0, Color(UI.BG, 0.65), true, -1, true)
	draw_circle(bp, 3.4, UI.ACCENT, true, -1, true)
	if holder >= 0:
		var text: String = men[holder].name.to_upper()
		var f := UI.font("ui", 700)
		var tw := f.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
		var r := Rect2(10, size.y - 30, tw + 28, 20)
		draw_style_box(UI.box(Color(UI.BG, 0.8), 6, UI.CLEAR, 0), r)
		draw_circle(Vector2(r.position.x + 10, r.position.y + 10), 4, colors[men[holder].side], true, -1, true)
		draw_string(f, Vector2(r.position.x + 20, r.position.y + 14), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, UI.TEXT)
	if flash > 0.0:
		var alpha := clampf(flash, 0.0, 1.0)
		draw_rect(Rect2(Vector2.ZERO, size), Color(UI.BG, 0.45 * alpha))
		draw_string(UI.font("num", 700), Vector2(0, size.y / 2 + 22), flash_text, HORIZONTAL_ALIGNMENT_CENTER, size.x, 64, Color(UI.ACCENT, alpha))
