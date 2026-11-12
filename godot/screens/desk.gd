extends Screen
## Your desk: Saturday's match, the time you have this week, and whatever has landed in front of you.

func build() -> void:
	var c := career()
	var club := Game.my_club()
	var fx = Sim.my_fixture(c)
	var over := Game.season_over()
	# who you are
	var hb := UI.hbox(12)
	hb.custom_minimum_size.y = 62
	hb.add_child(Crest.make(club, 38))
	var t := UI.vbox(0)
	t.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(t)
	t.add_child(UI.cap("%s · %s" % [c.manager.name, UI.season_label(c.season)]))
	t.add_child(UI.clip(UI.label(club.name, 22, UI.TEXT, 800, "num")))
	hb.add_child(t)
	var bal := UI.vbox(0)
	bal.alignment = BoxContainer.ALIGNMENT_CENTER
	bal.add_child(UI.right(UI.cap("In the bank")))
	bal.add_child(UI.right(UI.num(UI.money(c.balances[c.me]), 17, UI.TEXT if c.balances[c.me] >= 0 else UI.BAD)))
	hb.add_child(bal)
	root.add_child(UI.pad(hb, 16, 0, 16, 0))
	var body := UI.vbox(10)
	UI.grow(body, true, true)
	if c.sacked:
		body.add_child(_hero_text("You have been sacked", "The board have lost faith. Your time at %s is over." % club.name))
	elif over:
		body.add_child(_hero_text("The season is over", "You finished %s. The board wanted you to %s." % [UI.ordinal(Sim.position(c, c.me)), c.objective.text.to_lower()]))
	elif fx == null:
		body.add_child(_hero_text("No match this week", "A free weekend. Use the time."))
	else:
		body.add_child(_matchday(c, fx))
	if not c.sacked and not over:
		# your time
		var head := UI.hbox(6)
		head.add_child(UI.grow(UI.cap("Your time this week", UI.TEXT, 11)))
		for i in 3:
			var pip := UI.panel(0, UI.ACCENT if i < c.time else UI.LINE2, 3, UI.CLEAR)
			pip.custom_minimum_size = Vector2(22, 6)
			pip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			head.add_child(pip)
		body.add_child(head)
		var g := UI.grid(2, 8)
		for key in Sim.ACTIONS:
			var a: Dictionary = Sim.ACTIONS[key]
			var used: int = c.done.get(key, 0)
			var once: bool = key in ["scout", "press"]
			var off: bool = c.time <= 0 or (once and used > 0) or (fx == null and key in ["scout", "press"])
			var v := UI.vbox(1)
			v.alignment = BoxContainer.ALIGNMENT_CENTER
			var top := UI.hbox(6)
			top.add_child(UI.grow(UI.clip(UI.label(a.title, 15, UI.TEXT, 700))))
			if used > 0:
				top.add_child(Icon.make("check", 16, UI.ACCENT))
			v.add_child(top)
			v.add_child(UI.clip(UI.label(a.sub, 11, UI.MUTED)))
			var b := UI.row(UI.pad(v, 12, 0, 12, 0), 58, UI.PANEL)
			b.add_theme_stylebox_override("normal", UI.box(UI.PANEL, 14, UI.LINE, 0))
			b.add_theme_stylebox_override("disabled", UI.box(UI.BG, 14, UI.LINE, 0))
			UI.grow(b)
			b.disabled = off
			b.modulate.a = 0.5 if off else 1.0
			b.pressed.connect(func(): UI.nav.go("moment", {"action": key}))
			g.add_child(b)
		body.add_child(g)
		# on your desk
		var room := int((h - 62 - 176 - 22 - 124 - 26 - 72 - 50) / 58)
		if not c.desk.is_empty() and room >= 1:
			body.add_child(UI.cap("On your desk", UI.TEXT, 11))
			for it in c.desk.slice(0, room):
				body.add_child(_letter(it))
			if c.desk.size() > room:
				body.add_child(UI.label("and %d more underneath" % (c.desk.size() - room), 11, UI.MUTED))
	root.add_child(UI.pad(body, 16, 0, 16, 0))
	if c.sacked:
		root.add_child(main_action("Start a new career", func(): UI.nav.go("new_career")))
	elif over:
		root.add_child(main_action("End of season", func(): UI.nav.go("season_end")))
	elif fx == null:
		root.add_child(main_action("Next week", func():
			Game.kick_off()
			Game.free_week()
			UI.nav.refresh()))
	else:
		root.add_child(main_action("Go to the match", func(): UI.nav.go("match")))

func _hero_text(title: String, text: String) -> Control:
	var p := UI.panel(16)
	var v := UI.vbox(4)
	v.add_child(UI.label(title, 26, UI.TEXT, 800, "num"))
	v.add_child(UI.wrap(UI.label(text, 13, UI.MUTED), 3, true))
	p.add_child(v)
	return p

func _matchday(c: Dictionary, fx: Dictionary) -> Control:
	var p := UI.panel(0)
	var v := UI.vbox(0)
	var strip := UI.panel(0, UI.ACCENT, 0, UI.CLEAR)
	var sb: StyleBoxFlat = strip.get_theme_stylebox("panel")
	sb.corner_radius_top_left = 15
	sb.corner_radius_top_right = 15
	strip.add_child(UI.pad(UI.label("%s  ·  MATCHDAY %d  ·  %s" % [Sim.match_date(c).to_upper(), c.week + 1, "HOME" if fx.home else "AWAY"], 12, UI.BG, 800, "num"), 14, 5, 14, 5))
	v.add_child(strip)
	var table := Sim.table(c, Sim.my_div(c))
	var hb := UI.hbox(6)
	hb.add_child(_side(c, fx.h, table))
	var mid := UI.vbox(0)
	mid.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(mid)
	mid.add_child(UI.centre(UI.label("V", 34, UI.MUTED, 800, "num")))
	if Game.my_club().rival == fx.opp:
		mid.add_child(UI.centre(UI.cap("Derby", UI.ACCENT)))
	hb.add_child(mid)
	hb.add_child(_side(c, fx.a, table))
	v.add_child(UI.pad(hb, 12, 12, 12, 10))
	v.add_child(UI.line())
	var foot := UI.hbox(8)
	foot.custom_minimum_size.y = 34
	foot.add_child(UI.grow(UI.clip(UI.label(Sim.club_of(c, fx.h).stadium, 12, UI.MUTED))))
	foot.add_child(UI.label("The board want: %s" % c.objective.text.to_lower(), 12, UI.MUTED))
	v.add_child(UI.pad(foot, 14, 0, 14, 0))
	p.add_child(v)
	return p

func _side(c: Dictionary, id: String, table: Array) -> Control:
	var club := Sim.club_of(c, id)
	var v := UI.vbox(4)
	v.custom_minimum_size.x = 118
	var cc := CenterContainer.new()
	cc.add_child(Crest.make(club, 44))
	v.add_child(cc)
	v.add_child(UI.centre(UI.clip(UI.label(club.name, 14, UI.TEXT, 700))))
	var pos := 0
	var form: Array = []
	for i in table.size():
		if table[i].id == id:
			pos = i + 1
			form = table[i].form.slice(-5)
	var f := UI.hbox(3)
	f.alignment = BoxContainer.ALIGNMENT_CENTER
	f.add_child(UI.label(UI.ordinal(pos) + " ", 11, UI.MUTED, 600))
	for r in form:
		var dot := UI.panel(0, UI.GOOD if r == "W" else UI.BAD if r == "L" else UI.LINE2, 3, UI.CLEAR)
		dot.custom_minimum_size = Vector2(6, 6)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		f.add_child(dot)
	v.add_child(f)
	return v

## A letter or a knock on the door, as a slip of paper.
func _letter(it: Dictionary) -> Control:
	var hb := UI.hbox(10)
	var v := UI.vbox(0)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(v)
	v.add_child(UI.cap(it.from, UI.INK2))
	v.add_child(UI.clip(UI.label(it.title, 15, UI.INK, 700)))
	hb.add_child(v)
	if it.has("choices"):
		var chip := UI.panel(0, UI.INK, 6, UI.CLEAR)
		chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		chip.add_child(UI.pad(UI.label("Decide", 10, UI.PAPER, 700), 7, 2, 7, 2))
		hb.add_child(chip)
	hb.add_child(Icon.make("next", 14, UI.INK2))
	var b := UI.row(UI.pad(hb, 14, 0, 10, 0), 50, UI.PAPER)
	b.add_theme_stylebox_override("normal", UI.box(UI.PAPER, 10, UI.CLEAR, 0))
	b.add_theme_stylebox_override("pressed", UI.box(UI.PAPER.darkened(0.08), 10, UI.CLEAR, 0))
	b.pressed.connect(func(): UI.nav.go("moment", {"item": it}))
	return b
