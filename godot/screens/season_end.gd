extends Screen
## End of season: how it went, who went up and down, then on to the next one.

var s: Dictionary
var finished_year := 0

func build() -> void:
	var c := career()
	if s.is_empty():
		finished_year = c.season
		s = Game.next_season()      # plays any weeks left in other divisions, then rolls the world forward
	var div: Dictionary = DB.divisions[s.myDiv]
	root.add_child(header("Season %s" % UI.season_label(finished_year), "%s · final table" % div.name))
	var v := UI.vbox(10)
	UI.grow(v, true, true)
	var card := UI.panel(16)
	var hb := UI.hbox(14)
	hb.add_child(Crest.make(Game.my_club(), 56))
	var t := UI.vbox(2)
	UI.grow(t)
	t.add_child(UI.cap("You finished"))
	t.add_child(UI.num(UI.ordinal(s.myPos), 34, UI.ACCENT if s.beat else UI.TEXT))
	var verdict := "The board are delighted: brief met." if s.beat else "The board are unhappy: well short of the brief." if s.missed else "The board accept it: close to the brief."
	t.add_child(UI.wrap(UI.label("Brief: %s. %s" % [s.brief, verdict], 12, UI.MUTED), 2, true))
	hb.add_child(t)
	card.add_child(hb)
	v.add_child(card)
	var r: Dictionary = s.record
	var tiles := UI.hbox(8)
	for f in [["Won", r.w], ["Drawn", r.d], ["Lost", r.l], ["Goals", "%d–%d" % [r.gf, r.ga]]]:
		var p := UI.panel(10, UI.PANEL, 14)
		UI.grow(p)
		var pv := UI.vbox(0)
		pv.add_child(UI.cap(f[0]))
		pv.add_child(UI.num(str(f[1]), 20))
		p.add_child(pv)
		tiles.add_child(p)
	v.add_child(tiles)
	var rows := [["Champions", Sim.club_name(c, s.champions[s.myDiv])]]
	if s.topScorer.has(s.myDiv):
		rows.append(["Top scorer", "%s, %d goals" % [s.topScorer[s.myDiv].name, s.topScorer[s.myDiv].goals]])
	var up: Array = s.promoted.filter(func(id): return s.tables[s.myDiv].has(id))
	var down: Array = s.relegated.filter(func(id): return s.tables[s.myDiv].has(id))
	if not up.is_empty():
		rows.append(["Promoted", ", ".join(up.map(func(id): return Sim.club_name(c, id)))])
	if not down.is_empty():
		rows.append(["Relegated", ", ".join(down.map(func(id): return Sim.club_name(c, id)))])
	rows.append(["Academy", "%d graduates joined the squad" % s.intake.size()])
	var lp := UI.panel(0)
	var lv := UI.vbox(0)
	for i in rows.size():
		if i > 0:
			lv.add_child(UI.line())
		var row := UI.hbox(10)
		row.custom_minimum_size.y = 40
		row.add_child(UI.fixed(UI.label(rows[i][0], 13, UI.MUTED), 84))
		row.add_child(UI.wrap(UI.label(rows[i][1], 13, UI.TEXT, 600), 2))
		lv.add_child(UI.pad(row, 14, 0, 14, 0))
	lp.add_child(lv)
	v.add_child(lp)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	if c.sacked:
		root.add_child(main_action("The board want to see you", func(): UI.nav.tab("office")))
	else:
		root.add_child(main_action("Start %s" % UI.season_label(c.season), func(): UI.nav.tab("office")))
