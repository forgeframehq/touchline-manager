class_name MatchPitch
extends Control
## Draws the match as the engine plays it: every dot is a player where the engine has him, and the ball
## travels from pass to pass, tackle to tackle, and into the net. Home attacks left to right.

var e: MatchEngine
var colors := {}
var vpos := {}                 # player id -> where he is drawn (eases towards the engine's position)
var vball := Vector2(0.5, 0.5)
var path: Array = []           # points the ball still has to visit this step
var step_time := 0.3
var flash := 0.0
var running := true

func setup(engine: MatchEngine) -> void:
	e = engine
	var cols := UI.team_colors(e.T.H.club, e.T.A.club)
	colors = {"H": cols[0], "A": cols[1]}
	vball = e.ball

## Call after each engine step with what happened and how long the step lasts on screen.
func on_step(out: Array, dur: float) -> void:
	step_time = maxf(dur, 0.03)
	path = []
	for ev in out:
		if ev.get("t", "") == "shot":
			path.append(ev.from)
			path.append(ev.to)
			if ev.res == "goal":
				flash = 1.8
	path.append(e.ball)

func _process(delta: float) -> void:
	if e == null or not running:
		return
	flash = maxf(0.0, flash - delta)
	var speed := 1.6 / step_time                       # pitch lengths per second, so the ball arrives within the step
	if not path.is_empty():
		var to: Vector2 = path[0]
		var d := to - vball
		var move := speed * delta * maxf(1.0, path.size() * 0.8)
		if d.length() <= move:
			vball = to
			path.pop_front()
		else:
			vball += d.normalized() * move
	var k := 1.0 - exp(-delta * clampf(1.4 / step_time, 3.0, 30.0))
	for i in e.men.size():
		var m: Dictionary = e.men[i]
		var target: Vector2 = m.pos
		if i == e.holder and path.size() <= 1:
			target = vball
		vpos[m.p.id] = vpos.get(m.p.id, target).lerp(target, k)
	queue_redraw()

func _pt(v: Vector2) -> Vector2:
	var m := 9.0
	return Vector2(m + v.x * (size.x - 2 * m), m + v.y * (size.y - 2 * m))

func _draw() -> void:
	var bands := 10
	var bw := size.x / bands
	for i in bands:
		draw_rect(Rect2(i * bw, 0, bw + 1, size.y), UI.PITCH_A if i % 2 == 0 else UI.PITCH_B)
	var w := Color(1, 1, 1, 0.3)
	var a := _pt(Vector2.ZERO)
	var b := _pt(Vector2.ONE)
	draw_rect(Rect2(a, b - a), w, false, 1.5)
	draw_line(_pt(Vector2(0.5, 0)), _pt(Vector2(0.5, 1)), w, 1.5)
	draw_arc(_pt(Vector2(0.5, 0.5)), size.y * 0.13, 0, TAU, 48, w, 1.5, true)
	for gx in [0.0, 1.0]:
		var d := 1.0 if gx == 0.0 else -1.0
		for box in [[0.157, 0.21, 0.79], [0.052, 0.365, 0.635]]:
			var p0 := _pt(Vector2(gx, box[1]))
			var p1 := _pt(Vector2(gx + d * box[0], box[2]))
			draw_rect(Rect2(Vector2(minf(p0.x, p1.x), p0.y), Vector2(absf(p1.x - p0.x), p1.y - p0.y)), w, false, 1.5)
		draw_line(_pt(Vector2(gx, 0.445)), _pt(Vector2(gx, 0.555)), Color(1, 1, 1, 0.85), 3.0)
	if e == null:
		return
	var f := UI.font("num", 700)
	for i in e.men.size():
		var m: Dictionary = e.men[i]
		var c: Color = (UI.WARN if m.side == "H" else Color("FF7AD9")) if m.gk else colors[m.side]
		var p := _pt(vpos.get(m.p.id, m.pos))
		draw_circle(p, 8.2, Color.WHITE if c.get_luminance() < 0.75 else UI.BG, true, -1, true)
		draw_circle(p, 6.6, c, true, -1, true)
		if i == e.holder:
			draw_arc(p, 11.0, 0, TAU, 24, UI.ACCENT if c != UI.ACCENT else Color.WHITE, 1.5, true)
	var bp := _pt(vball)
	draw_circle(bp, 4.6, Color(0, 0, 0, 0.55), true, -1, true)
	draw_circle(bp, 3.3, Color.WHITE, true, -1, true)
	if e.holder >= 0 and e.holder < e.men.size():
		var text: String = UI.short_name(e.men[e.holder].p.name).to_upper()
		var tw := f.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
		var r := Rect2(10, size.y - 30, tw + 28, 20)
		draw_style_box(UI.box(Color(UI.BG, 0.82), 6, UI.CLEAR, 0), r)
		draw_circle(Vector2(r.position.x + 10, r.position.y + 10), 4, colors[e.men[e.holder].side], true, -1, true)
		draw_string(f, Vector2(r.position.x + 20, r.position.y + 14.5), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, UI.TEXT)
	if flash > 0.0:
		var alpha := clampf(flash, 0.0, 1.0)
		draw_rect(Rect2(Vector2.ZERO, size), Color(UI.BG, 0.5 * alpha))
		draw_string(UI.font("num", 800), Vector2(0, size.y / 2 + 26), "GOAL", HORIZONTAL_ALIGNMENT_CENTER, size.x, 76, Color(UI.ACCENT, alpha))
