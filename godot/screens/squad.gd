extends Screen
## The squad as a dense table: four views, tap a column to sort, tap a player for his profile.

const VIEWS := ["General", "Fitness", "Stats", "Value"]
const COLS := {
	"General": [["AGE", "age"], ["POT", "pot"], ["OVR", "rating"]],
	"Fitness": [["COND", "fitness"], ["MOR", "morale"], ["INJ", "injured"]],
	"Stats": [["APPS", "seasonApps"], ["GLS", "seasonGoals"], ["CAREER", "goals"]],
	"Value": [["AGE", "age"], ["WAGE", "wage"], ["VALUE", "value"]],
}
var view := 0
var page := 0
var sort_key := ""

func test_state(s: String) -> void:
	view = VIEWS.find(s)
	rebuild()

func build() -> void:
	var c := career()
	var sq := Sim.squad_of(c, c.me)
	var sel := Sim.my_xi(c)
	var slot := {}
	for i in sel.xi.size():
		slot[sel.xi[i].id] = i
	for i in sel.bench.size():
		slot[sel.bench[i].id] = 100 + i
	var age := 0.0
	for p in sq:
		age += p.age
	root.add_child(header("Squad", "First team · %d players · average age %.1f" % [sq.size(), age / maxi(1, sq.size())]))
	root.add_child(UI.pad(UI.segments(VIEWS, view, func(i):
		view = i
		sort_key = ""
		rebuild()), 12, 0, 12, 8))
	var cols: Array = COLS[VIEWS[view]]
	var list := sq.duplicate()
	if sort_key == "":
		list.sort_custom(func(a, b):
			var sa: int = slot.get(a.id, 1000)
			var sb: int = slot.get(b.id, 1000)
			if sa != sb:
				return sa < sb
			return a.rating > b.rating if a.rating != b.rating else a.id < b.id)
	else:
		list.sort_custom(func(a, b):
			var va = _val(a, sort_key)
			var vb = _val(b, sort_key)
			return va > vb if va != vb else a.id < b.id)
	# column header
	var head := UI.hbox(6)
	head.custom_minimum_size.y = 28
	head.add_child(_hcell("", "", 38, false))
	head.add_child(UI.grow(_hcell("NAME", "", 0, false)))
	head.add_child(_hcell("POS", "", 36, false))
	for col in cols:
		head.add_child(_hcell(col[0], col[1], 46, true))
	var hp := UI.panel(0, UI.NAVBG, 0, UI.CLEAR)
	hp.add_child(UI.pad(head, 12, 0, 12, 0))
	root.add_child(hp)
	root.add_child(UI.line())
	var row_h := 36
	var per := maxi(6, int((h - 62 - 44 - 30 - 48) / (row_h + 1)))
	var pages := int(ceil(list.size() / float(per)))
	page = clampi(page, 0, pages - 1)
	var rows := UI.vbox(0)
	UI.grow(rows, true, true)
	for p in list.slice(page * per, page * per + per):
		var s: int = slot.get(p.id, 1000)
		var hb := UI.hbox(6)
		var tag := "INJ" if p.injured > 0 else "XI" if s < 100 else "SUB" if s < 1000 else "–"
		var chip := UI.panel(0, UI.BAD if p.injured > 0 else UI.ACCENT if s < 100 else UI.LINE if s < 1000 else UI.CLEAR, 5, UI.CLEAR)
		chip.custom_minimum_size = Vector2(38, 20)
		chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		chip.add_child(UI.centre(UI.label(tag, 10, UI.BG if (s < 100 or p.injured > 0) else UI.MUTED, 700)))
		hb.add_child(chip)
		var nm := UI.clip(UI.label(p.name, 14, UI.TEXT, 600))
		hb.add_child(nm)
		hb.add_child(UI.fixed(UI.label(p.pos, 11, UI.MUTED), 36))
		for col in cols:
			hb.add_child(_cell(p, col[1]))
		var b := UI.row(UI.pad(hb, 12, 0, 12, 0), row_h)
		b.pressed.connect(func(): UI.nav.go("player", {"id": p.id}))
		rows.add_child(b)
		rows.add_child(UI.line())
	root.add_child(rows)
	root.add_child(pager("Players %d–%d of %d" % [page * per + 1, mini(list.size(), page * per + per), list.size()], page, pages, func(d):
		page += d
		rebuild(), "Tap a column to sort · tap a player to open him"))

func _val(p: Dictionary, key: String):
	return Sim.value(p) if key == "value" else p[key]

func _hcell(text: String, key: String, w: float, right_side: bool) -> Control:
	var on := key != "" and key == sort_key
	var l := UI.label(text + (" ▾" if on else ""), 10, UI.ACCENT if on else UI.MUTED, 700)
	if right_side:
		UI.right(l)
	if key == "":
		return UI.fixed(l, w)
	var b := UI.row(l, 28)
	b.custom_minimum_size.x = w
	b.pressed.connect(func():
		sort_key = "" if sort_key == key else key
		page = 0
		rebuild())
	return b

func _cell(p: Dictionary, key: String) -> Control:
	var text := ""
	var col := UI.TEXT
	var kind := "num"
	match key:
		"fitness":
			text = "%d%%" % int(round(p.fitness))
			col = UI.cond_color(p.fitness)
		"morale":
			text = str(int(round(p.morale)))
			col = UI.cond_color(p.morale + 15)
		"injured":
			text = "%dw" % p.injured if p.injured > 0 else "–"
			col = UI.BAD if p.injured > 0 else UI.MUTED
		"wage":
			text = "£%dk" % p.wage
		"value":
			text = "£%.1fM" % Sim.value(p)
		"age":
			text = str(p.age)
			col = UI.MUTED
			kind = "ui"
		"pot":
			text = str(p.pot)
			col = UI.GOOD if p.pot > p.rating else UI.MUTED
		_:
			text = str(p[key])
	return UI.right(UI.label(text, 13, col, 700 if kind == "num" else 400, kind), 46)
