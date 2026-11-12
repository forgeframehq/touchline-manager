extends Screen
## Start a career: pick any club in the pyramid, then name your manager.

const DIV_LABELS := {"eng1": "Premier", "eng2": "Champ", "eng3": "Lge One", "eng4": "Lge Two", "eng5": "National"}
var div_i := 0
var page := 0
var picked := ""
var step := "pick"
var manager_name := "The Boss"

func on_back() -> bool:
	if step == "confirm":
		step = "pick"
		rebuild()
		return true
	return false

func build() -> void:
	if step == "confirm":
		_confirm()
		return
	root.add_child(header("Choose your club", "Any of 116 clubs in England", null, true))
	var labels := DB.division_list.map(func(d): return DIV_LABELS.get(d.id, d.name))
	root.add_child(UI.pad(UI.segments(labels, div_i, func(i):
		div_i = i
		page = 0
		rebuild(), 36, 11), 12, 0, 12, 8))
	var div: Dictionary = DB.division_list[div_i]
	var clubs := DB.clubs_in(div.id)
	clubs.sort_custom(func(a, b): return a.rep > b.rep if a.rep != b.rep else a.name < b.name)
	var row_h := 54
	var per := maxi(4, int((h - 62 - 44 - 48 - 72 - 8) / row_h))
	var pages := int(ceil(clubs.size() / float(per)))
	page = clampi(page, 0, pages - 1)
	var list := UI.vbox(0)
	UI.grow(list, true, true)
	for c in clubs.slice(page * per, page * per + per):
		var hb := UI.hbox(10)
		hb.add_child(_gap(4))
		hb.add_child(Crest.make(c, 32))
		var t := UI.vbox(1)
		t.alignment = BoxContainer.ALIGNMENT_CENTER
		UI.grow(t)
		t.add_child(UI.clip(UI.label(c.name, 15, UI.TEXT, 600)))
		t.add_child(UI.clip(UI.label("%s · %s" % [c.stadium, Sim.commas(c.capacity)], 11, UI.MUTED)))
		hb.add_child(t)
		var r := UI.vbox(1)
		r.alignment = BoxContainer.ALIGNMENT_CENTER
		r.add_child(UI.right(UI.cap(Sim.rep_tier(c.rep), UI.ACCENT if c.id == picked else UI.MUTED)))
		r.add_child(UI.right(UI.label("Reputation %d" % c.rep, 11, UI.MUTED)))
		hb.add_child(r)
		hb.add_child(_gap(4))
		var b := UI.row(hb, row_h, UI.RAISED if c.id == picked else UI.CLEAR)
		b.pressed.connect(func():
			picked = c.id
			rebuild())
		list.add_child(b)
		list.add_child(UI.line())
	root.add_child(UI.pad(list, 12, 0, 12, 0))
	root.add_child(pager("%s · %d clubs" % [div.name, clubs.size()], page, pages, func(d):
		page += d
		rebuild(), "Page %d of %d" % [page + 1, pages]))
	var act := main_action("Manage %s" % DB.club(picked).name if picked != "" else "Pick a club", func():
		step = "confirm"
		rebuild(), picked != "")
	act.get_child(0).disabled = picked == ""
	root.add_child(act)

func _gap(w: float) -> Control:
	return UI.fixed(Control.new(), w)

func _confirm() -> void:
	var c := DB.club(picked)
	var div: Dictionary = DB.divisions[c.div]
	root.add_child(header(c.name, div.name, null, true))
	var v := UI.vbox(10)
	var top := UI.panel(16)
	var hb := UI.hbox(14)
	hb.add_child(Crest.make(c, 64))
	var t := UI.vbox(3)
	t.alignment = BoxContainer.ALIGNMENT_CENTER
	UI.grow(t)
	t.add_child(UI.cap("The job"))
	t.add_child(UI.label("Manager of %s" % c.short, 24, UI.TEXT, 800, "num"))
	t.add_child(UI.label("You replace %s" % c.manager, 12, UI.MUTED))
	hb.add_child(t)
	top.add_child(hb)
	v.add_child(top)
	var g := UI.grid(2, 8)
	for f in [["Stadium", c.stadium], ["Capacity", Sim.commas(c.capacity)], ["Reputation", "%s (%d)" % [Sim.rep_tier(c.rep), c.rep]],
			["Rivals", DB.club(c.rival).name if c.rival != null and DB._club_by_id.has(c.rival) else "None"]]:
		var p := UI.panel(12, UI.PANEL, 14)
		UI.grow(p)
		var pv := UI.vbox(2)
		pv.add_child(UI.cap(f[0]))
		pv.add_child(UI.clip(UI.label(f[1], 15, UI.TEXT, 600)))
		p.add_child(pv)
		g.add_child(p)
	v.add_child(g)
	v.add_child(UI.cap("Manager name"))
	var le := LineEdit.new()
	le.text = manager_name
	le.max_length = 24
	le.custom_minimum_size.y = 48
	le.add_theme_font_override("font", UI.font("ui", 600))
	le.add_theme_font_size_override("font_size", 16)
	le.add_theme_color_override("font_color", UI.TEXT)
	le.add_theme_stylebox_override("normal", UI.box(UI.PANEL, 12, UI.LINE2, 12))
	le.add_theme_stylebox_override("focus", UI.box(UI.PANEL, 12, UI.ACCENT, 12))
	le.text_changed.connect(func(s): manager_name = s)
	v.add_child(le)
	v.add_child(UI.wrap(UI.label("The board will tell you what they expect once you have signed. The players will make up their own minds.", 12, UI.MUTED), 3, true))
	root.add_child(UI.pad(v, 16, 4, 16, 0))
	root.add_child(UI.spacer(true))
	root.add_child(main_action("Start career", func():
		Game.new_game(picked, manager_name.strip_edges() if manager_name.strip_edges() != "" else "The Boss")
		UI.nav.tab("desk")))
