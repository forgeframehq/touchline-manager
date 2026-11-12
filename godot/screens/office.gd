extends Screen
## The manager's office: next match, where you stand, what needs your attention, and the way into match day.

func build() -> void:
	var c := career()
	var club := Game.my_club()
	var div_id := Sim.my_div(c)
	var table := Sim.table(c, div_id)
	var pos := 0
	for i in table.size():
		if table[i].id == c.me:
			pos = i
	var total_weeks := Game.my_weeks()
	# header
	var hb := UI.hbox(12)
	hb.custom_minimum_size.y = 62
	hb.add_child(_mid(Crest.make(club, 38)))
	var t := UI.vbox(1)
	t.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(t)
	t.add_child(UI.clip(UI.label(club.name, 19, UI.TEXT, 700, "num")))
	t.add_child(UI.clip(UI.label("Week %d of %d · Season %s" % [mini(c.week + 1, total_weeks), total_weeks, UI.season_label(c.season)], 12, UI.MUTED)))
	hb.add_child(t)
	var bal := UI.vbox(1)
	bal.alignment = BoxContainer.ALIGNMENT_CENTER
	bal.add_child(UI.right(UI.cap("Balance")))
	bal.add_child(UI.right(UI.num(UI.money(c.balances[c.me]), 15, UI.TEXT if c.balances[c.me] >= 0 else UI.BAD)))
	hb.add_child(bal)
	root.add_child(UI.pad(hb, 16, 0, 16, 0))

	var body := UI.vbox(10)
	UI.grow(body, true, true)
	var fx = Sim.my_fixture(c)
	if c.sacked:
		body.add_child(_notice("The board have sacked you", "Results fell too far below the brief. Other clubs are interested."))
	elif fx == null:
		body.add_child(_notice("Season complete" if c.week >= total_weeks else "No match this week",
			"You finished %s in the %s." % [UI.ordinal(pos + 1), DB.divisions[div_id].name] if c.week >= total_weeks else "Your squad rests while the others play."))
	else:
		body.add_child(_match_card(c, fx, table, div_id))
	# three tiles
	var tiles := UI.hbox(8)
	var gap: int = (table[0].pts - table[pos].pts) if pos > 0 else (table[pos].pts - table[1].pts)
	tiles.add_child(_tile("League", UI.ordinal(pos + 1), ("%d pts off top" % gap if pos > 0 else "%d pts clear" % gap) if table[pos].p > 0 else "Not started"))
	var conf: float = c.board.confidence
	tiles.add_child(_tile("Board", "Delighted" if conf >= 75 else "Secure" if conf >= 55 else "Uneasy" if conf >= 35 else "At risk", c.brief.text,
		UI.TEXT if conf >= 35 else UI.BAD))
	var sq := Sim.squad_of(c, c.me)
	var mor := 0.0
	var unhappy := 0
	for p in sq:
		mor += p.morale
		if p.morale < 50:
			unhappy += 1
	mor /= maxi(1, sq.size())
	tiles.add_child(_tile("Morale", "Superb" if mor >= 80 else "Good" if mor >= 65 else "Okay" if mor >= 50 else "Low", "%d unhappy" % unhappy if unhappy > 0 else "Squad settled"))
	body.add_child(tiles)
	# inbox and table share what is left
	var left := h - 62 - (212 if fx != null and not c.sacked else 92) - 76 - 72 - 40
	var inbox_rows := clampi(mini(c.inbox.size(), int((left - 32 - 28 * 4 - 24) / 45)), 1, 3)
	var table_rows := clampi(int((left - 32 - 45 * inbox_rows - 28 - 24) / 29), 3, 9)
	if table_rows % 2 == 0:
		table_rows -= 1
	body.add_child(_inbox(c, inbox_rows))
	body.add_child(_table(c, table, pos, table_rows, DB.divisions[div_id].name))
	root.add_child(UI.pad(body, 16, 0, 16, 0))

	if c.sacked:
		root.add_child(main_action("See job offers", func(): UI.nav.go("jobs")))
	elif c.week >= total_weeks:
		root.add_child(main_action("End of season", func(): UI.nav.go("season_end")))
	elif fx == null:
		root.add_child(main_action("Continue", func():
			Game.kick_off()
			Game.full_time()
			UI.nav.refresh()))
	else:
		root.add_child(main_action("Go to match", func(): UI.nav.go("match")))

func _mid(c: Control) -> Control:
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return c

func _notice(title: String, text: String) -> Control:
	var p := UI.panel(16)
	var v := UI.vbox(4)
	v.add_child(UI.label(title, 20, UI.TEXT, 700, "num"))
	var l := UI.label(text, 13, UI.MUTED)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(l)
	p.add_child(v)
	return p

func _match_card(c: Dictionary, fx: Dictionary, table: Array, div_id: String) -> Control:
	var p := UI.panel(14)
	var v := UI.vbox(12)
	var top := UI.hbox(8)
	top.add_child(UI.clip(UI.cap("%s · Matchday %d" % [DB.divisions[div_id].name, c.week + 1])))
	var tag := UI.panel(0, UI.LINE, 6, UI.CLEAR)
	tag.add_child(UI.pad(UI.cap("Home" if fx.home else "Away", UI.TEXT, 11), 8, 3, 8, 3))
	top.add_child(tag)
	v.add_child(top)
	var mid := UI.hbox(8)
	mid.add_child(_side(c, fx.h, table))
	var ko := UI.vbox(2)
	ko.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(ko)
	var opp: String = fx.a if fx.home else fx.h
	var derby: bool = Game.my_club().rival == opp
	ko.add_child(UI.centre(UI.cap("Derby" if derby else "Next match", UI.ACCENT if derby else UI.MUTED)))
	ko.add_child(UI.centre(UI.num("VS", 30)))
	ko.add_child(UI.centre(UI.label(Sim.club_of(c, fx.h).stadium, 11, UI.MUTED)))
	ko.get_child(2).autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	mid.add_child(ko)
	mid.add_child(_side(c, fx.a, table))
	v.add_child(mid)
	var forms := UI.hbox(8)
	forms.add_child(_form(table, fx.h))
	forms.add_child(UI.grow(UI.centre(UI.cap("Form"))))
	forms.add_child(_form(table, fx.a))
	v.add_child(forms)
	p.add_child(v)
	return p

func _side(c: Dictionary, id: String, table: Array) -> Control:
	var club := Sim.club_of(c, id)
	var v := UI.vbox(5)
	v.custom_minimum_size.x = 108
	var cc := CenterContainer.new()
	cc.add_child(Crest.make(club, 40))
	v.add_child(cc)
	v.add_child(UI.centre(UI.wrap(UI.label(club.name, 14, UI.TEXT, 600), 2)))
	var pos := 0
	var pts := 0
	for i in table.size():
		if table[i].id == id:
			pos = i + 1
			pts = table[i].pts
	v.add_child(UI.centre(UI.label("%s · %d pts" % [UI.ordinal(pos), pts], 11, UI.MUTED)))
	return v

func _form(table: Array, id: String) -> Control:
	var hb := UI.hbox(3)
	var form: Array = []
	for r in table:
		if r.id == id:
			form = r.form.slice(-5)
	for i in 5:
		var l: String = form[i] if i < form.size() else "–"
		var col: Color = UI.WIN if l == "W" else UI.WARN if l == "L" else UI.DRAWC
		var chip := UI.panel(0, col if i < form.size() else UI.RAISED, 5, UI.CLEAR)
		chip.custom_minimum_size = Vector2(20, 20)
		chip.add_child(UI.centre(UI.label(l, 11, UI.BG if l == "L" else UI.TEXT, 700)))
		hb.add_child(chip)
	return hb

func _tile(caption: String, value: String, sub: String, col := UI.TEXT) -> Control:
	var p := UI.panel(10, UI.PANEL, 14)
	UI.grow(p)
	p.custom_minimum_size.y = 76
	var v := UI.vbox(1)
	v.add_child(UI.cap(caption))
	v.add_child(UI.clip(UI.num(value, 20, col)))
	v.add_child(UI.clip(UI.label(sub, 11, UI.MUTED)))
	p.add_child(v)
	return p

func _inbox(c: Dictionary, rows: int) -> Control:
	var p := UI.panel(0)
	var v := UI.vbox(0)
	var unread: int = c.inbox.filter(func(m): return not m.read).size()
	var head := UI.hbox(8)
	head.custom_minimum_size.y = 32
	head.add_child(UI.grow(UI.label("Inbox", 13, UI.TEXT, 700)))
	if unread > 0:
		var chip := UI.panel(0, UI.ACCENT, 6, UI.CLEAR)
		chip.add_child(UI.pad(UI.label("%d new" % unread, 11, UI.BG, 700), 7, 1, 7, 1))
		chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		head.add_child(chip)
	head.add_child(UI.label("View all", 12, UI.MUTED))
	var hbtn := UI.row(UI.pad(head, 14, 0, 14, 0), 32)
	hbtn.pressed.connect(func(): UI.nav.go("inbox"))
	v.add_child(hbtn)
	for m in c.inbox.slice(0, rows):
		v.add_child(UI.line())
		var hb := UI.hbox(10)
		var dot := UI.panel(0, UI.ACCENT if not m.read else UI.LINE2, 4, UI.CLEAR)
		dot.custom_minimum_size = Vector2(8, 8)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(dot)
		var t := UI.vbox(1)
		t.alignment = BoxContainer.ALIGNMENT_CENTER
		UI.grow(t)
		t.add_child(UI.clip(UI.label(m.text, 13, UI.TEXT, 600)))
		t.add_child(UI.clip(UI.label("%s · week %d" % [m.from, m.week + 1], 11, UI.MUTED)))
		hb.add_child(t)
		hb.add_child(Icon.make("next", 14, UI.MUTED))
		var b := UI.row(UI.pad(hb, 14, 0, 12, 0), 44)
		b.pressed.connect(func(): UI.nav.go("inbox"))
		v.add_child(b)
	p.add_child(v)
	return p

func _table(c: Dictionary, table: Array, pos: int, rows: int, div_name: String) -> Control:
	var p := UI.panel(0)
	var v := UI.vbox(0)
	v.add_child(_trow(["#", div_name.to_upper(), "P", "GD", "PTS"], UI.MUTED, 10, 600, true))
	var from := clampi(pos - rows / 2, 0, maxi(0, table.size() - rows))
	for i in range(from, mini(table.size(), from + rows)):
		var r: Dictionary = table[i]
		v.add_child(UI.line())
		var mine: bool = r.id == c.me
		v.add_child(_trow([str(i + 1), Sim.club_name(c, r.id), str(r.p), "%+d" % (r.gf - r.ga), str(r.pts)], UI.TEXT if mine else UI.MUTED, 13, 700 if mine else 400, false))
	var b := UI.row(v, 28 * (rows + 1) + rows)
	b.pressed.connect(func(): UI.nav.tab("league"))
	p.add_child(b)
	return p

func _trow(cells: Array, col: Color, size: int, weight: int, head: bool) -> Control:
	var hb := UI.hbox(6)
	hb.custom_minimum_size.y = 28
	hb.add_child(UI.fixed(UI.label(cells[0], size, UI.MUTED, weight), 20))
	hb.add_child(UI.clip(UI.label(cells[1], size, UI.MUTED if head else (UI.TEXT), weight)))
	hb.add_child(UI.right(UI.label(cells[2], size, UI.MUTED, weight), 26))
	hb.add_child(UI.right(UI.label(cells[3], size, UI.MUTED, weight), 34))
	hb.add_child(UI.right(UI.label(cells[4], size, UI.MUTED if head else col, 700, "ui" if head else "num"), 34))
	return UI.pad(hb, 14, 0, 14, 0)
