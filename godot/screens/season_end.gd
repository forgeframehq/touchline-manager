extends Screen
## The end of the season: where you finished against what the board asked, and who went up and down.

var s: Dictionary

func build() -> void:
	var c := career()
	if s.is_empty():
		s = Game.next_season()
	var div: Dictionary = DB.divisions[s.div]
	root.add_child(header("Season %s" % UI.season_label(s.season), div.name))
	var v := UI.vbox(10)
	UI.grow(v, true, true)
	var verdict := "You did what was asked. The board are delighted." if s.met else "Well short of what the board wanted. Your position is under review." if s.pos > s.target + 4 else "Close to what was asked, but not quite. The board expect more next year."
	var card := UI.panel(16, UI.PAPER, 6, UI.CLEAR)
	var cv := UI.vbox(2)
	cv.add_child(UI.cap("You finished", UI.INK2, 11))
	cv.add_child(UI.label(UI.ordinal(s.pos), 56, UI.INK, 800, "num"))
	cv.add_child(UI.wrap(UI.label("The board asked you to %s. %s" % [s.objective.to_lower(), verdict], 14, UI.INK), 3, true))
	card.add_child(cv)
	v.add_child(card)
	var r: Dictionary = s.record
	var tiles := UI.hbox(8)
	for f in [["Won", r.w], ["Drawn", r.d], ["Lost", r.l], ["Goals", "%d–%d" % [r.gf, r.ga]]]:
		var p := UI.panel(10, UI.PANEL, 14)
		UI.grow(p)
		var pv := UI.vbox(0)
		pv.add_child(UI.cap(f[0]))
		pv.add_child(UI.num(str(f[1]), 22))
		p.add_child(pv)
		tiles.add_child(p)
	v.add_child(tiles)
	var mine: Array = s.tables[s.div]
	var rows := [["Champions", Sim.club_name(c, s.champions[s.div])], ["Top scorer", "%s, %d goals" % [s.top[s.div].name, s.top[s.div].goals]]]
	var up: Array = s.up.filter(func(id): return mine.has(id))
	var down: Array = s.down.filter(func(id): return mine.has(id))
	if not up.is_empty():
		rows.append(["Promoted", ", ".join(up.map(func(id): return Sim.club_name(c, id)))])
	if not down.is_empty():
		rows.append(["Relegated", ", ".join(down.map(func(id): return Sim.club_name(c, id)))])
	var lp := UI.panel(0)
	var lv := UI.vbox(0)
	for i in rows.size():
		if i > 0:
			lv.add_child(UI.line())
		var row := UI.hbox(10)
		row.custom_minimum_size.y = 42
		row.add_child(UI.fixed(UI.label(rows[i][0], 13, UI.MUTED), 84))
		row.add_child(UI.wrap(UI.label(rows[i][1], 13, UI.TEXT, 600), 2))
		lv.add_child(UI.pad(row, 14, 0, 14, 0))
	lp.add_child(lv)
	v.add_child(lp)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	root.add_child(main_action("Back to your desk" if c.sacked else "On to %s" % UI.season_label(c.season), func(): UI.nav.tab("desk")))
