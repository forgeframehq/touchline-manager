extends Node
## The look of the game in one place: colours, fonts and the small builders every screen uses.
## Modern dark and flat: graphite ground, flat panels, one lime accent. Club colours only on crests, kits and pitch dots.

const BG := Color("0D1015")
const NAVBG := Color("11141A")
const PANEL := Color("161A21")
const RAISED := Color("1D222B")
const LINE := Color("272D38")
const LINE2 := Color("343B48")
const TEXT := Color("EEF1F5")
const MUTED := Color("9BA4B3")
const ACCENT := Color("C6F432")
const WARN := Color("F2B54A")
const GOOD := Color("7EE0A1")
const BAD := Color("F58A6B")
const WIN := Color("2E7D5B")
const DRAWC := Color("3A4250")
const PITCH_A := Color("14402B")
const PITCH_B := Color("123A27")
const CLEAR := Color(0, 0, 0, 0)

var _base := {}
var _fonts := {}
var nav   # the Nav node (ui/nav.gd), set when the game starts

func _ready() -> void:
	_base.ui = load("res://fonts/Inter.ttf")
	_base.num = load("res://fonts/SpaceGrotesk.ttf")

## kind: "ui" (Inter) or "num" (Space Grotesk, for titles and numbers).
func font(kind := "ui", weight := 400) -> Font:
	var key := "%s%d" % [kind, weight]
	if not _fonts.has(key):
		var f := FontVariation.new()
		f.base_font = _base[kind]
		f.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): weight}
		_fonts[key] = f
	return _fonts[key]

func label(text: String, size := 13, color := TEXT, weight := 400, kind := "ui") -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font(kind, weight))
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.clip_text = false
	return l

## Small capital caption, e.g. "BALANCE".
func cap(text: String, color := MUTED, size := 10) -> Label:
	var l := label(text.to_upper(), size, color, 600)
	l.add_theme_constant_override("line_spacing", 0)
	return l

func num(text: String, size := 15, color := TEXT) -> Label:
	return label(text, size, color, 700, "num")

## A label that shortens with … instead of pushing the layout.
func clip(l: Label) -> Label:
	l.clip_text = true
	l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

## A label that wraps onto up to `lines` lines, then shortens with ….
func wrap(l: Label, lines := 2, reserve := false) -> Label:
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.max_lines_visible = lines
	l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	l.clip_text = false
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.size_flags_vertical = Control.SIZE_FILL
	# at least one line (rows give the rest); reserve = keep room for all the lines
	l.custom_minimum_size = Vector2(40, l.get_theme_font_size("font_size") * 1.36 * (lines if reserve else 1))
	return l

func right(l: Label, w := 0.0) -> Label:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	if w > 0:
		l.custom_minimum_size.x = w
	return l

func centre(l: Label) -> Label:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l

func fixed(c: Control, w: float, h := 0.0) -> Control:
	c.custom_minimum_size = Vector2(w, h)
	return c

func box(bg: Color, radius := 16, border := LINE, pad := 14, bw := 1) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	s.set_border_width_all(bw if border.a > 0 else 0)
	s.border_color = border
	s.set_content_margin_all(pad)
	s.anti_aliasing = true
	return s

func panel(pad := 14, bg := PANEL, radius := 16, border := LINE) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(bg, radius, border, pad))
	return p

func vbox(sep := 8) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	return v

func hbox(sep := 8) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	return h

func grid(cols: int, sep := 8) -> GridContainer:
	var g := GridContainer.new()
	g.columns = cols
	g.add_theme_constant_override("h_separation", sep)
	g.add_theme_constant_override("v_separation", sep)
	return g

func pad(child: Control, l := 16, t := 0, r := 16, b := 0) -> MarginContainer:
	var m := MarginContainer.new()
	m.add_theme_constant_override("margin_left", l)
	m.add_theme_constant_override("margin_top", t)
	m.add_theme_constant_override("margin_right", r)
	m.add_theme_constant_override("margin_bottom", b)
	m.add_child(child)
	m.size_flags_horizontal = child.size_flags_horizontal
	m.size_flags_vertical = child.size_flags_vertical
	return m

func grow(c: Control, h := true, v := false) -> Control:
	if h:
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if v:
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return c

func spacer(v := false) -> Control:
	var c := Control.new()
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return grow(c, not v, v)

func line() -> ColorRect:
	var c := ColorRect.new()
	c.color = LINE
	c.custom_minimum_size.y = 1
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c

func _style(b: Button, bg: Color, fg: Color, border: Color, radius: int) -> void:
	var n := box(bg, radius, border, 0)
	var p := box(bg.lightened(0.12) if bg.a > 0 else Color(1, 1, 1, 0.06), radius, border, 0)
	for s in ["normal", "hover", "focus"]:
		b.add_theme_stylebox_override(s, n)
	b.add_theme_stylebox_override("pressed", p)
	var dis := box(bg, radius, border, 0)
	b.add_theme_stylebox_override("disabled", dis)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(c, fg)
	b.add_theme_color_override("font_disabled_color", Color(fg, 0.4))

## kind: "primary" (the one main action), "ghost", "on" / "off" (tabs and segments), "flat" (no box).
func btn(text: String, kind := "ghost", h := 44, size := 14) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size.y = h
	b.focus_mode = Control.FOCUS_NONE
	b.clip_text = true
	b.add_theme_font_size_override("font_size", size)
	restyle(b, kind)
	return b

func restyle(b: Button, kind: String) -> void:
	b.add_theme_font_override("font", font("ui", 700 if kind == "primary" else 600))
	match kind:
		"primary": _style(b, ACCENT, BG, CLEAR, 14)
		"on": _style(b, TEXT, BG, TEXT, 10)
		"off": _style(b, PANEL, MUTED, LINE, 10)
		"accent": _style(b, ACCENT, BG, ACCENT, 10)
		"flat": _style(b, CLEAR, TEXT, CLEAR, 8)
		_: _style(b, RAISED, TEXT, LINE2, 12)

## A tappable list row: a flat button with your own content laid over it.
func row(content: Control, h := 44, bg := CLEAR) -> Button:
	var b := Button.new()
	b.custom_minimum_size.y = h
	b.focus_mode = Control.FOCUS_NONE
	_style(b, bg, TEXT, CLEAR, 8)
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	b.add_child(content)
	passive(content)
	return b

## Lets taps fall through to the button underneath.
func passive(n: Node) -> void:
	if n is Control:
		n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for c in n.get_children():
		passive(c)

## A row of equal segments; `on` is the selected index. pick(index) is called on tap.
func segments(labels: Array, on: int, pick: Callable, h := 36, size := 12, on_kind := "on") -> HBoxContainer:
	var hb := hbox(4)
	for i in labels.size():
		var b := btn(labels[i], on_kind if i == on else "off", h, size)
		grow(b)
		b.pressed.connect(pick.bind(i))
		hb.add_child(b)
	return hb

func ink_on(c: Color) -> Color:
	return BG if c.get_luminance() > 0.55 else Color.WHITE

func kit(club: Dictionary, i := 0) -> Color:
	return Color(club.kit[i])

func cond_color(v: float) -> Color:
	return GOOD if v >= 90 else WARN if v >= 75 else BAD

## Money given in £k.
func money(k: float) -> String:
	var a := absf(k)
	var s := "-" if k < 0 else ""
	if a >= 1000000:
		return "%s£%.2fB" % [s, a / 1000000.0]
	if a >= 1000:
		return "%s£%.1fM" % [s, a / 1000.0]
	return "%s£%dk" % [s, int(a)]

func ordinal(n: int) -> String:
	var t := n % 100
	if t >= 11 and t <= 13:
		return "%dth" % n
	return "%d%s" % [n, ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"][n % 10]]

## Star rating out of 5 from a 0-99 rating, in halves, as text like "4.5".
func stars(rating: int) -> String:
	return "%.1f" % clampf(round((rating - 45) / 9.0 * 2) / 2.0, 0.5, 5.0)

## Surname for tight spaces.
func short_name(n: String) -> String:
	var parts := n.split(" ")
	return n if parts.size() < 2 else " ".join(parts.slice(1))

func season_label(y: int) -> String:
	return "%d/%s" % [y, str(y + 1).substr(2)]

## Two colours to tell the sides apart on the pitch and in stat bars: each club's main colour where possible,
## falling back to the second colour when it would vanish on the pitch or look like the other side.
func team_colors(home: Dictionary, away: Dictionary) -> Array:
	var h := _visible(Color(home.kit[0]), Color(home.kit[1]))
	var a := _visible(Color(away.kit[0]), Color(away.kit[1]))
	if _near(h, a):
		var alt := Color(away.kit[1])
		a = alt if not _near(h, alt) and not _near(alt, PITCH_A) else (Color.WHITE if h.get_luminance() < 0.6 else Color("20242C"))
	return [h, a]

func _visible(c: Color, alt: Color) -> Color:
	return alt if _near(c, PITCH_A) and not _near(alt, PITCH_A) else c

func _near(a: Color, b: Color) -> bool:
	return Vector3(a.r - b.r, a.g - b.g, a.b - b.b).length() < 0.42
