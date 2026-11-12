extends Control
## The frame around every screen: safe-area margins, the screen itself, and the five-tab bar at the bottom.
## Screens are stacked: go() pushes, back() pops, tab() starts a fresh stack on a main tab.

const TABS := [["office", "Office"], ["squad", "Squad"], ["tactics", "Tactics"], ["league", "League"], ["club", "Club"]]
const BAR_H := 60.0

var stack: Array = []      # [name, params]
var host: Control
var bar: PanelContainer
var current: Screen
var safe_top := 0.0
var safe_bottom := 0.0

func _ready() -> void:
	UI.nav = self
	get_tree().set_quit_on_go_back(false)
	var bg := ColorRect.new()
	bg.color = UI.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	_safe_area()
	var v := UI.vbox(0)
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	v.offset_top = safe_top
	v.offset_bottom = -safe_bottom
	add_child(v)
	host = Control.new()
	host.clip_contents = true
	UI.grow(host, true, true)
	v.add_child(host)
	bar = PanelContainer.new()
	var sb := UI.box(UI.NAVBG, 0, UI.LINE, 0)
	sb.set_border_width_all(0)
	sb.border_width_top = 1
	bar.add_theme_stylebox_override("panel", sb)
	bar.custom_minimum_size.y = BAR_H
	v.add_child(bar)
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			var t: Node = load("res://tests/shots.gd").new()
			t.out_dir = a.trim_prefix("--shots=")
			add_child(t)
			return
	go("title", {}, "root")

func _safe_area() -> void:
	if not OS.has_feature("mobile"):
		return
	var win := DisplayServer.window_get_size()
	var safe := DisplayServer.get_display_safe_area()
	if win.x <= 0 or safe.size.y <= 0:
		return
	var k := get_viewport_rect().size.x / float(win.x)
	safe_top = maxf(0.0, safe.position.y * k)
	safe_bottom = maxf(0.0, (win.y - safe.end.y) * k)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		back()

## mode: "push" (default), "replace" (swap the top screen), "root" (clear the stack first).
func go(screen: String, p := {}, mode := "push") -> void:
	if mode == "root":
		stack.clear()
	elif mode == "replace" and not stack.is_empty():
		stack.pop_back()
	stack.append([screen, p])
	_show(mode != "replace")

func tab(screen: String) -> void:
	go(screen, {}, "root")

func back() -> void:
	if current != null and current.has_method("on_back") and current.on_back():
		return
	if stack.size() <= 1:
		return
	stack.pop_back()
	_show(true)

## Rebuilds the screen on top (after the career changes underneath it).
func refresh() -> void:
	_show(false)

func _show(animate: bool) -> void:
	var top: Array = stack[-1]
	var screen: String = top[0]
	if current != null:
		host.remove_child(current)
		current.queue_free()
	var has_bar := TABS.any(func(t): return t[0] == screen)
	bar.visible = has_bar
	_build_bar(screen)
	current = load("res://screens/%s.gd" % screen).new()
	current.params = top[1]
	current.h = get_viewport_rect().size.y - safe_top - safe_bottom - (BAR_H if has_bar else 0.0)
	host.add_child(current)
	current.start()
	if animate:
		current.modulate.a = 0.0
		current.position.y = 10
		var tw := create_tween().set_parallel().set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
		tw.tween_property(current, "modulate:a", 1.0, 0.16)
		tw.tween_property(current, "position:y", 0.0, 0.2)

func _build_bar(active: String) -> void:
	for c in bar.get_children():
		bar.remove_child(c)
		c.queue_free()
	var hb := UI.hbox(0)
	bar.add_child(hb)
	for t in TABS:
		var col: Color = UI.ACCENT if t[0] == active else UI.MUTED
		var v := UI.vbox(3)
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		v.add_child(Icon.make(t[0], 22, col))
		v.add_child(UI.centre(UI.label(t[1], 11, col, 600)))
		var b := UI.row(v, int(BAR_H))
		UI.grow(b)
		b.pressed.connect(tab.bind(t[0]))
		hb.add_child(b)
