class_name Screen
extends Control
## Base for every screen. A screen fills the phone, never scrolls, and builds itself in build().

var params := {}
var h := 844.0            # height available to this screen
var root: VBoxContainer

func start() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root = UI.vbox(0)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(root)
	build()

func build() -> void:
	pass

## Clears and rebuilds in place (after a tap changes what is shown).
func rebuild() -> void:
	for c in root.get_children():
		root.remove_child(c)
		c.queue_free()
	build()

func career() -> Dictionary:
	return Game.career

## Title row: optional back button, title with a small line under it, optional control on the right. 62 high.
func header(title: String, sub := "", right_side: Control = null, back := false) -> Control:
	var hb := UI.hbox(12)
	hb.custom_minimum_size.y = 62
	hb.alignment = BoxContainer.ALIGNMENT_BEGIN
	if back:
		var b := UI.btn("", "off", 44)
		b.custom_minimum_size.x = 44
		b.add_child(_centre(Icon.make("back", 20, UI.TEXT)))
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		b.pressed.connect(func(): UI.nav.back())
		hb.add_child(b)
	var v := UI.vbox(1)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(v)
	v.add_child(UI.clip(UI.label(title, 22, UI.TEXT, 700, "num")))
	if sub != "":
		v.add_child(UI.clip(UI.label(sub, 12, UI.MUTED)))
	hb.add_child(v)
	if right_side != null:
		right_side.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(right_side)
	return UI.pad(hb, 16, 0, 16, 0)

func _centre(c: Control) -> Control:
	var cc := CenterContainer.new()
	cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cc.add_child(c)
	return cc

## "‹  Players 1–14 of 25  ›" pager. turn(delta) is called with -1 or +1.
func pager(text: String, page: int, pages: int, turn: Callable, sub := "") -> Control:
	var hb := UI.hbox(8)
	hb.custom_minimum_size.y = 48
	for d in [-1, 1]:
		var b := UI.btn("", "off", 40)
		b.custom_minimum_size.x = 44
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		b.add_child(_centre(Icon.make("back" if d < 0 else "next", 18, UI.TEXT)))
		b.disabled = (d < 0 and page <= 0) or (d > 0 and page >= pages - 1)
		b.modulate.a = 0.35 if b.disabled else 1.0
		b.pressed.connect(turn.bind(d))
		if d > 0:
			var v := UI.vbox(1)
			v.alignment = BoxContainer.ALIGNMENT_CENTER
			UI.grow(v)
			v.add_child(UI.centre(UI.label(text, 13, UI.TEXT, 600)))
			if sub != "":
				v.add_child(UI.centre(UI.label(sub, 11, UI.MUTED)))
			hb.add_child(v)
		hb.add_child(b)
	return UI.pad(hb, 12, 0, 12, 0)

## The one main action of a screen, always in the same place at the bottom.
func main_action(text: String, action: Callable, arrow := true) -> Control:
	var b := UI.btn(text + ("   →" if arrow else ""), "primary", 52, 16)
	b.pressed.connect(action)
	return UI.pad(b, 16, 10, 16, 10)
