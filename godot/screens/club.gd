extends Screen
## The club at a glance: board and fans, weekly money, your record, and the latest news.

func build() -> void:
	var c := career()
	var club := Game.my_club()
	root.add_child(header(club.name, "%s · %s · %s" % [DB.divisions[club.div].name, club.stadium, Sim.commas(club.capacity)], Crest.make(club, 36)))
	var v := UI.vbox(10)
	var two := UI.hbox(8)
	two.add_child(_meter("Board confidence", c.board.confidence, c.brief.text))
	two.add_child(_meter("Fan mood", c.fans, "Gates %d%% full" % int(round(Sim.attendance(c) * 100))))
	v.add_child(two)
	var f := Sim.week_finance(c, c.me, true)
	v.add_child(_list("Money each home week", [["Gate receipts", UI.money(f.gate), UI.TEXT], ["Commercial", UI.money(f.commercial), UI.TEXT], ["TV money", UI.money(f.tv), UI.TEXT],
		["Wages", "-" + UI.money(f.wages), UI.WARN], ["Net", UI.money(f.net), UI.GOOD if f.net >= 0 else UI.BAD]], UI.money(c.balances[c.me]) + " in the bank"))
	var mg: Dictionary = c.manager
	var tro: String = "None yet" if mg.trophies.is_empty() else "%d: %s" % [mg.trophies.size(), mg.trophies[-1].label]
	v.add_child(_list(mg.name, [["Record", "%d played · %d won · %d drawn · %d lost" % [mg.games, mg.w, mg.d, mg.l], UI.TEXT], ["Honours", tro, UI.TEXT],
		["Best unbeaten run", "%d matches" % c.stats.bestUnbeaten, UI.TEXT]], "Manager"))
	var left := h - 62 - 100 - 216 - 148 - 50
	var n := clampi(int((left - 34) / 40), 0, 4)
	if n > 0:
		var p := UI.panel(0)
		var nv := UI.vbox(0)
		nv.add_child(UI.pad(UI.fixed(UI.label("News", 13, UI.TEXT, 700), 0, 32), 14, 0, 14, 0))
		for item in c.news.slice(0, n):
			nv.add_child(UI.line())
			var l := UI.wrap(UI.label(item.text, 12, UI.MUTED), 2)
			l.custom_minimum_size.y = 38
			nv.add_child(UI.pad(l, 14, 0, 14, 0))
		p.add_child(nv)
		v.add_child(p)
	root.add_child(UI.pad(v, 16, 0, 16, 0))

func _meter(caption: String, value: float, sub: String) -> Control:
	var p := UI.panel(12, UI.PANEL, 14)
	UI.grow(p)
	var v := UI.vbox(4)
	v.add_child(UI.cap(caption))
	v.add_child(UI.num("%d%%" % int(round(value)), 24, UI.TEXT if value >= 35 else UI.BAD))
	var bar := ProgressBar.new()
	bar.show_percentage = false
	bar.custom_minimum_size.y = 6
	bar.value = value
	bar.add_theme_stylebox_override("background", UI.box(UI.LINE, 3, UI.CLEAR, 0))
	bar.add_theme_stylebox_override("fill", UI.box(UI.ACCENT if value >= 35 else UI.BAD, 3, UI.CLEAR, 0))
	v.add_child(bar)
	v.add_child(UI.clip(UI.label(sub, 11, UI.MUTED)))
	p.add_child(v)
	return p

func _list(title: String, rows: Array, note: String) -> Control:
	var p := UI.panel(0)
	var v := UI.vbox(0)
	var head := UI.hbox(8)
	head.custom_minimum_size.y = 32
	head.add_child(UI.grow(UI.label(title, 13, UI.TEXT, 700)))
	head.add_child(UI.label(note, 12, UI.MUTED))
	v.add_child(UI.pad(head, 14, 0, 14, 0))
	for r in rows:
		v.add_child(UI.line())
		var hb := UI.hbox(8)
		hb.custom_minimum_size.y = 30
		hb.add_child(UI.label(r[0], 13, UI.MUTED))
		hb.add_child(UI.right(UI.clip(UI.label(r[1], 13, r[2], 600))))
		v.add_child(UI.pad(hb, 14, 0, 14, 0))
	p.add_child(v)
	return p
