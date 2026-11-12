extends Screen
## First screen: the wordmark, Continue (with where you left off) and New career.

func build() -> void:
	root.add_child(UI.spacer(true))
	var mark := UI.vbox(0)
	mark.add_child(UI.centre(UI.cap("Forge Frame presents", UI.MUTED, 11)))
	mark.add_child(fixed_gap(14))
	mark.add_child(UI.centre(UI.label("TOUCHLINE", 52, UI.TEXT, 700, "num")))
	var m := UI.centre(UI.label("M A N A G E R", 20, UI.ACCENT, 700, "num"))
	mark.add_child(m)
	root.add_child(mark)
	root.add_child(fixed_gap(28))
	root.add_child(UI.pad(PitchMark.new(), 56, 0, 56, 0))
	root.add_child(UI.spacer(true))
	var has := Game.has_save() and Game.load_game()
	var v := UI.vbox(10)
	if has:
		var c: Dictionary = Game.career
		var club := Game.my_club()
		var p := UI.panel(14)
		var hb := UI.hbox(12)
		hb.add_child(Crest.make(club, 44))
		var t := UI.vbox(2)
		UI.grow(t)
		t.add_child(UI.cap("Continue career"))
		t.add_child(UI.clip(UI.label(club.name, 19, UI.TEXT, 700, "num")))
		var fx = Sim.my_fixture(c)
		var nxt := "Season finished" if fx == null else "Next: %s (%s)" % [Sim.club_name(c, fx.a if fx.home else fx.h), "H" if fx.home else "A"]
		t.add_child(UI.clip(UI.label("%s · Week %d · %s" % [UI.season_label(c.season), c.week + 1, nxt], 12, UI.MUTED)))
		hb.add_child(t)
		p.add_child(hb)
		v.add_child(p)
		var go := UI.btn("Continue   →", "primary", 52, 16)
		go.pressed.connect(func(): UI.nav.tab("office"))
		v.add_child(go)
		var n := UI.btn("New career", "ghost", 48)
		n.pressed.connect(func(): UI.nav.go("new_career"))
		v.add_child(n)
	else:
		var n := UI.btn("New career   →", "primary", 52, 16)
		n.pressed.connect(func(): UI.nav.go("new_career"))
		v.add_child(n)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	root.add_child(fixed_gap(10))
	root.add_child(UI.centre(UI.label("Godot build %s" % ProjectSettings.get_setting("application/config/version"), 11, UI.MUTED)))
	root.add_child(fixed_gap(14))

func fixed_gap(px: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size.y = px
	return c

## A centre circle and halfway line, as a quiet mark under the title.
class PitchMark extends Control:
	func _init() -> void:
		custom_minimum_size.y = 120
	func _draw() -> void:
		var c := size / 2.0
		var col := Color(UI.TEXT, 0.16)
		draw_line(Vector2(0, c.y), Vector2(size.x, c.y), col, 1.5, true)
		draw_arc(c, 46, 0, TAU, 64, col, 1.5, true)
		draw_circle(c, 4, UI.ACCENT)
