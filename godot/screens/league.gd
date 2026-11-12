extends Screen
## League tables for every division, one screen each.

const DIV_LABELS := {"eng1": "Premier", "eng2": "Champ", "eng3": "Lge One", "eng4": "Lge Two", "eng5": "National"}
var div_i := -1

func build() -> void:
	var c := career()
	if div_i < 0:
		for i in DB.division_list.size():
			if DB.division_list[i].id == Sim.my_div(c):
				div_i = i
	var div: Dictionary = DB.division_list[div_i]
	var t := Sim.table(c, div.id)
	var played := 0
	for r in t:
		played = maxi(played, r.p)
	root.add_child(header(div.name, "Season %s · %d of %d played" % [UI.season_label(c.season), played, c.fixtures[div.id].size()]))
	root.add_child(UI.pad(UI.segments(DB.division_list.map(func(d): return DIV_LABELS.get(d.id, d.name)), div_i, func(i):
		div_i = i
		rebuild(), 36, 11), 12, 0, 12, 8))
	var n := t.size()
	var row_h := clampf(floor((h - 62 - 44 - 26 - 34) / n), 19, 30)
	var fs := 13 if row_h >= 26 else 12 if row_h >= 22 else 11
	root.add_child(_row(["#", "CLUB", "P", "W", "D", "L", "GD", "PTS"], 26, 10, UI.MUTED, 700, UI.CLEAR, UI.CLEAR))
	var up_to: int = div.up if div_i > 0 else 0
	var po: Array = div.playoff if div.playoff != null else [0, -1]
	for i in n:
		var r: Dictionary = t[i]
		var mine: bool = r.id == c.me
		var zone := UI.CLEAR
		if div_i == 0 and i < 4:
			zone = UI.ACCENT
		elif i < up_to:
			zone = UI.ACCENT
		elif i + 1 >= po[0] and i + 1 <= po[1]:
			zone = UI.GOOD
		elif div.down > 0 and i >= n - div.down:
			zone = UI.BAD
		root.add_child(_row([str(i + 1), Sim.club_name(c, r.id), str(r.p), str(r.w), str(r.d), str(r.l), "%+d" % (r.gf - r.ga), str(r.pts)],
			row_h, fs, UI.TEXT if mine else UI.MUTED, 700 if mine else 400, zone, UI.RAISED if mine else UI.CLEAR))
	root.add_child(UI.spacer(true))
	var key := UI.hbox(14)
	key.custom_minimum_size.y = 30
	key.alignment = BoxContainer.ALIGNMENT_CENTER
	for k in ([["Top four", UI.ACCENT]] if div_i == 0 else [["Promotion", UI.ACCENT], ["Play-offs", UI.GOOD]]) + ([["Relegation", UI.BAD]] if div.down > 0 else []):
		var hb := UI.hbox(5)
		var dot := UI.panel(0, k[1], 2, UI.CLEAR)
		dot.custom_minimum_size = Vector2(4, 12)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(dot)
		hb.add_child(UI.label(k[0], 11, UI.MUTED))
		key.add_child(hb)
	root.add_child(key)

func _row(cells: Array, row_h: float, fs: int, col: Color, weight: int, zone: Color, bg: Color) -> Control:
	var p := UI.panel(0, bg, 0, UI.CLEAR)
	p.custom_minimum_size.y = row_h
	var hb := UI.hbox(4)
	var z := ColorRect.new()
	z.color = zone
	z.custom_minimum_size.x = 3
	hb.add_child(z)
	hb.add_child(UI.right(UI.label(cells[0], fs, UI.MUTED, weight), 20))
	hb.add_child(UI.fixed(Control.new(), 4))
	hb.add_child(UI.clip(UI.label(cells[1], fs, UI.TEXT if weight == 700 and fs > 10 else col, weight)))
	for i in range(2, 7):
		hb.add_child(UI.right(UI.label(cells[i], fs, UI.MUTED, weight), 30 if i == 6 else 22))
	hb.add_child(UI.right(UI.label(cells[7], fs, col if fs > 10 else UI.MUTED, 700, "num" if fs > 10 else "ui"), 32))
	p.add_child(UI.pad(hb, 8, 0, 14, 0))
	return p
