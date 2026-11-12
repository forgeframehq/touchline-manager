extends Screen
## Tactics. Line-up: pick the shape, tap a player then tap who replaces him. Instructions: how the team plays.

var tab_i := 0
var selected := -1        # player id picked for a swap
var page := 0

func test_state(s: String) -> void:
	tab_i = 1 if s == "instr" else 0
	if s == "pick":
		selected = Sim.my_xi(career()).xi[8].id
	rebuild()

func build() -> void:
	var c := career()
	var t: Dictionary = c.tactics[c.me]
	var fx = Sim.my_fixture(c)
	var nxt := "No match this week" if fx == null else "Next: %s (%s)" % [Sim.club_name(c, fx.opp), "H" if fx.home else "A"]
	root.add_child(header("Tactics", "Dressing room %d · %s" % [Sim.chemistry(c), nxt]))
	root.add_child(UI.pad(UI.segments(["Team sheet", "How we play"], tab_i, func(i):
		tab_i = i
		selected = -1
		rebuild()), 16, 0, 16, 8))
	if tab_i == 0:
		_lineup(c, t)
	else:
		_instructions(c, t)

# ---------- line-up ----------
func _lineup(c: Dictionary, t: Dictionary) -> void:
	var shapes: Array = DB.DATA.shapes.keys()
	root.add_child(UI.pad(_stepper("Formation", t.formation, shapes.find(t.formation), shapes.size(), func(d):
		t.formation = shapes[(shapes.find(t.formation) + d + shapes.size()) % shapes.size()]
		c.lineup = null
		selected = -1
		Game.save()
		rebuild(), true), 16, 0, 16, 8))
	var sel := Sim.my_xi(c)
	var bench_h := 30 + 2 * 50 + 6 + 48 + 16
	var pitch := Pitch.new()
	pitch.custom_minimum_size.y = clampf(h - 62 - 44 - 44 - bench_h - 16, 250, 430)
	pitch.screen = self
	pitch.placed = Sim.layout_xi(sel.xi, t.formation)
	pitch.kit = UI.kit(Game.my_club(), 0)
	root.add_child(UI.pad(pitch, 16, 0, 16, 0))
	# everyone not starting, four to a row
	var rest: Array = sel.bench.duplicate()
	var used := {}
	for p in sel.xi + sel.bench:
		used[p.id] = true
	var others: Array = Sim.squad_of(c, c.me).filter(func(p): return not used.has(p.id))
	others.sort_custom(func(a, b): return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
	rest.append_array(others)
	var per := 8
	var pages := maxi(1, int(ceil(rest.size() / float(per))))
	page = clampi(page, 0, pages - 1)
	var hint := "Tap a player, then tap who takes his place" if selected < 0 else "Now tap a team-mate to swap with %s" % UI.short_name(Sim.player(c, selected).name)
	root.add_child(UI.pad(UI.fixed(UI.label(hint, 12, UI.ACCENT if selected >= 0 else UI.MUTED, 600), 0, 30), 16, 0, 16, 0))
	var g := UI.grid(4, 6)
	for p in rest.slice(page * per, page * per + per):
		var on_bench: bool = sel.bench.has(p)
		var v := UI.vbox(0)
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		v.add_child(UI.centre(UI.clip(UI.label(UI.short_name(p.name), 12, UI.TEXT if p.injured == 0 else UI.BAD, 600))))
		v.add_child(UI.centre(UI.label("%s · %d%s" % [p.pos, p.rating, " · inj" if p.injured > 0 else ""], 10, UI.MUTED)))
		var b := UI.row(v, 50, UI.ACCENT.darkened(0.72) if p.id == selected else UI.PANEL if on_bench else UI.BG)
		b.add_theme_stylebox_override("normal", UI.box(UI.RAISED if p.id == selected else UI.PANEL if on_bench else UI.BG, 10, UI.ACCENT if p.id == selected else UI.LINE, 0))
		UI.grow(b)
		b.disabled = p.injured > 0
		b.pressed.connect(tap.bind(p.id))
		g.add_child(b)
	root.add_child(UI.pad(g, 16, 0, 16, 0))
	root.add_child(UI.spacer(true))
	root.add_child(pager("Bench and reserves", page, pages, func(d):
		page += d
		rebuild(), "%d–%d of %d" % [page * per + 1, mini(rest.size(), page * per + per), rest.size()]))

## First tap selects; second tap swaps the two (in the XI, or a reserve in for a starter).
func tap(id: int) -> void:
	var c := career()
	if selected < 0 or selected == id:
		selected = -1 if selected == id else id
		rebuild()
		return
	var xi_ids: Array = Sim.my_xi(c).xi.map(func(p): return p.id)
	if xi_ids.has(selected):
		Sim.swap_into_xi(c, selected, id)
	elif xi_ids.has(id):
		Sim.swap_into_xi(c, id, selected)
	selected = -1
	Game.save()
	rebuild()

class Pitch extends Control:
	var screen
	var placed: Array = []    # [{slot, p}] from Sim.layout_xi
	var kit := Color.WHITE

	func _ready() -> void:
		clip_contents = true
		resized.connect(_place)
		_place()

	func _place() -> void:
		for c in get_children():
			remove_child(c)
			c.queue_free()
		if size.x <= 0:
			return
		for e in placed:
			var p: Dictionary = e.p
			var slot: Dictionary = e.slot
			var on: bool = screen.selected == p.id
			var v := UI.vbox(1)
			v.alignment = BoxContainer.ALIGNMENT_CENTER
			var dot := Dot.new()
			dot.fill = UI.WARN if slot.code == "GK" else kit
			dot.ring = UI.ACCENT if on else Color.WHITE
			dot.text = str(p.rating)
			var cc := CenterContainer.new()
			cc.add_child(dot)
			v.add_child(cc)
			var nm := UI.centre(UI.clip(UI.label(UI.short_name(p.name), 11, Color.WHITE, 600)))
			nm.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.7))
			nm.add_theme_constant_override("shadow_offset_y", 1)
			v.add_child(nm)
			var natural: bool = Sim.misfit(p, slot.code) <= 2
			var tag := UI.panel(0, Color(UI.BG, 0.78) if natural else Color(UI.WARN, 0.95), 4, UI.CLEAR)
			tag.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			tag.add_child(UI.pad(UI.label("%s · %d%%" % [slot.code, int(round(p.fitness))], 9, UI.TEXT if natural else UI.BG, 700), 5, 0, 5, 0))
			v.add_child(tag)
			var b := UI.row(v, 62)
			b.size = Vector2(72, 62)
			b.position = Vector2(slot.x * size.x, slot.y * size.y) - b.size / 2.0
			b.pressed.connect(screen.tap.bind(p.id))
			add_child(b)

	func _draw() -> void:
		var r := Rect2(Vector2.ZERO, size)
		var band := size.y / 9.0
		for i in 9:
			draw_rect(Rect2(0, i * band, size.x, band + 1), UI.PITCH_A if i % 2 == 0 else UI.PITCH_B)
		var w := Color(1, 1, 1, 0.28)
		var m := 10.0
		draw_rect(r.grow(-m), w, false, 1.5)
		draw_line(Vector2(m, size.y / 2), Vector2(size.x - m, size.y / 2), w, 1.5)
		draw_arc(size / 2, 34, 0, TAU, 48, w, 1.5, true)
		var bw := size.x * 0.48
		draw_rect(Rect2((size.x - bw) / 2, m, bw, size.y * 0.13), w, false, 1.5)
		draw_rect(Rect2((size.x - bw) / 2, size.y - m - size.y * 0.13, bw, size.y * 0.13), w, false, 1.5)

class Dot extends Control:
	var fill := Color.RED
	var ring := Color.WHITE
	var text := ""
	func _init() -> void:
		custom_minimum_size = Vector2(30, 30)
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		draw_circle(size / 2, 15, ring, true, -1, true)
		draw_circle(size / 2, 12.5, fill, true, -1, true)
		draw_string(UI.font("num", 700), Vector2(0, 19.5), text, HORIZONTAL_ALIGNMENT_CENTER, size.x, 12, UI.ink_on(fill))

# ---------- instructions ----------
func _instructions(c: Dictionary, t: Dictionary) -> void:
	var v := UI.vbox(10)
	for row in [["mentality", "Mentality", Sim.MENTALITY, "How many you commit forward, and how often you look for the killer pass"],
			["tempo", "Tempo", Sim.TEMPO, "Patient keeps the ball; fast gets it forward early and loses it more"],
			["press", "Without the ball", Sim.PRESS, "Pressing high wins it back sooner, and empties the legs"]]:
		var key: String = row[0]
		v.add_child(_stepper(row[1], row[2][t[key]], t[key], row[2].size(), func(d):
			t[key] = clampi(t[key] + d, 0, row[2].size() - 1)
			_changed(), false))
		v.add_child(UI.wrap(UI.label(row[3], 12, UI.MUTED), 2))
	var prep := []
	if c.prep.att > 0:
		prep.append("sharper going forward")
	if c.prep.def > 0:
		prep.append("tighter at the back")
	if c.prep.sp > 0:
		prep.append("dangerous from set pieces")
	var p := UI.panel(14)
	var pv := UI.vbox(4)
	pv.add_child(UI.cap("This week's preparation", UI.ACCENT))
	pv.add_child(UI.wrap(UI.label("Nothing yet. Training and a scouting report shape how the team plays on Saturday." if prep.is_empty() else "For Saturday the team is %s." % ", ".join(prep), 13, UI.TEXT), 3, true))
	p.add_child(pv)
	v.add_child(p)
	root.add_child(UI.pad(v, 16, 4, 16, 0))

func _title(a: String, b: String) -> Control:
	var hb := UI.hbox(8)
	hb.add_child(UI.grow(UI.cap(a, UI.TEXT, 11)))
	hb.add_child(UI.label(b, 11, UI.MUTED))
	return hb

func _changed() -> void:
	Game.save()
	rebuild()

## "‹ value ›" with a row of pips showing where you are. wrap: stepping past the end goes round.
func _stepper(caption: String, value: String, index: int, count: int, step: Callable, wrap: bool) -> Control:
	var p := UI.panel(0)
	var hb := UI.hbox(8)
	hb.custom_minimum_size.y = 52
	for d in [-1, 1]:
		var b := UI.btn("", "ghost", 40)
		b.custom_minimum_size.x = 48
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		b.add_child(_centre(Icon.make("back" if d < 0 else "next", 18, UI.TEXT)))
		b.disabled = not wrap and ((d < 0 and index <= 0) or (d > 0 and index >= count - 1))
		b.modulate.a = 0.35 if b.disabled else 1.0
		b.pressed.connect(step.bind(d))
		if d > 0:
			var tv := UI.vbox(3)
			tv.alignment = BoxContainer.ALIGNMENT_CENTER
			UI.grow(tv)
			tv.add_child(UI.centre(UI.cap(caption)))
			tv.add_child(UI.centre(UI.num(value, 17)))
			var pips := UI.hbox(3)
			pips.alignment = BoxContainer.ALIGNMENT_CENTER
			for i in count:
				var pip := ColorRect.new()
				pip.color = UI.ACCENT if (i <= index and not wrap) or i == index else UI.LINE2
				pip.custom_minimum_size = Vector2(14 if count <= 8 else 8, 3)
				pips.add_child(pip)
			tv.add_child(pips)
			hb.add_child(tv)
		hb.add_child(b)
	p.add_child(UI.pad(hb, 8, 0, 8, 0))
	return p
