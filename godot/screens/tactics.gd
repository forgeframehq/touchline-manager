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
	var nxt := "No match this week" if fx == null else "Next: %s (%s)" % [Sim.club_name(c, fx.a if fx.home else fx.h), "H" if fx.home else "A"]
	root.add_child(header("Tactics", "Chemistry %d · %s" % [Sim.chemistry(c), nxt]))
	root.add_child(UI.pad(UI.segments(["Line-up", "Instructions"], tab_i, func(i):
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
			var natural: bool = DB.DATA.grid.fits.get(slot.code, []).has(p.pos)
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
	var v := UI.vbox(8)
	var roomy := h > 740
	var keys: Array = DB.DATA.mentality7
	v.add_child(_stepper("Mentality", DB.DATA.mentality[t.mentality].label, keys.find(t.mentality), keys.size(), func(d):
		t.mentality = keys[clampi(keys.find(t.mentality) + d, 0, keys.size() - 1)]
		c.preset = null
		_changed(), false))
	var styles: Array = DB.DATA.styles.keys()
	v.add_child(_title("Style", "The board want %s football" % DB.DATA.styles[c.brief.style].label.to_lower()))
	v.add_child(UI.segments(styles.map(func(k): return DB.DATA.styles[k].label), styles.find(t.style), func(i):
		t.style = styles[i]
		_changed(), 40, 13, "accent"))
	for key in ["press", "line", "pass"]:
		var ins: Dictionary = DB.DATA.instructions[key]
		var p := UI.panel(0)
		var hb := UI.hbox(8)
		hb.custom_minimum_size.y = 50 if roomy else 44
		var tv := UI.vbox(0)
		tv.alignment = BoxContainer.ALIGNMENT_CENTER
		UI.grow(tv)
		tv.add_child(UI.cap(ins.label))
		tv.add_child(UI.label(ins.steps[c.instr[key] - 1], 15, UI.TEXT, 600))
		hb.add_child(tv)
		for d in [-1, 1]:
			var b := UI.btn("–" if d < 0 else "+", "ghost", 40, 18)
			b.custom_minimum_size.x = 48
			b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			b.disabled = (d < 0 and c.instr[key] <= 1) or (d > 0 and c.instr[key] >= 5)
			b.pressed.connect(func():
				c.instr[key] = clampi(c.instr[key] + d, 1, 5)
				c.preset = null
				_changed())
			hb.add_child(b)
		p.add_child(UI.pad(hb, 14, 0, 8, 0))
		v.add_child(p)
	var g := UI.grid(2, 6)
	for key in DB.DATA.toggles:
		var on: bool = c.instr.toggles.get(key, false)
		var b := UI.btn(DB.DATA.toggles[key].label, "accent" if on else "off", 40, 12)
		UI.grow(b)
		b.pressed.connect(func():
			c.instr.toggles[key] = not on
			c.preset = null
			_changed())
		g.add_child(b)
	v.add_child(_title("Team instructions", ""))
	v.add_child(g)
	if h > 800:
		v.add_child(_title("Quick set-ups", "One tap sets everything above"))
		var pg := UI.grid(3, 6)
		for key in DB.DATA.presets:
			var b := UI.btn(DB.DATA.presets[key].label, "on" if c.preset == key else "off", 40, 11)
			UI.grow(b)
			b.pressed.connect(func():
				var P: Dictionary = DB.DATA.presets[key]
				t.mentality = P.mentality
				t.style = P.style
				c.instr = {"press": int(P.press), "line": int(P.line), "pass": int(P.pass), "toggles": P.toggles.duplicate()}
				c.preset = key
				_changed())
			pg.add_child(b)
		v.add_child(pg)
	root.add_child(UI.pad(v, 16, 0, 16, 0))

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
