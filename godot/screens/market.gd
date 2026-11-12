extends Screen
## The transfer market: players your scouts think you could get this week. The list changes every week.

var page := 0

func build() -> void:
	var c := career()
	var list := Sim.market(c)
	root.add_child(header("Transfer market", "%s to spend · squad %d of %d" % [UI.money(c.balances[c.me]), Sim.squad_of(c, c.me).size(), Sim.SQUAD_MAX], null, true))
	var per := maxi(5, int((h - 62 - 48) / 53))
	var pages := maxi(1, int(ceil(list.size() / float(per))))
	var rows := UI.vbox(0)
	UI.grow(rows, true, true)
	for e in list.slice(page * per, page * per + per):
		var p: Dictionary = e.p
		var hb := UI.hbox(8)
		hb.add_child(UI.fixed(UI.label(p.pos, 11, UI.MUTED, 600), 32))
		var v := UI.vbox(0)
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		UI.grow(v)
		v.add_child(UI.clip(UI.label(p.name, 14, UI.TEXT, 600)))
		v.add_child(UI.clip(UI.label("%s · %d years old" % [Sim.club_name(c, p.club), p.age], 11, UI.MUTED)))
		hb.add_child(v)
		hb.add_child(UI.right(UI.num(str(p.rating), 16, UI.ACCENT), 30))
		hb.add_child(UI.right(UI.label(UI.money(e.fee), 13, UI.TEXT if c.balances[c.me] >= e.fee else UI.MUTED, 600), 66))
		var b := UI.row(UI.pad(hb, 16, 0, 16, 0), 52)
		b.pressed.connect(func(): UI.nav.go("player", {"id": p.id, "buy": true}))
		rows.add_child(b)
		rows.add_child(UI.line())
	root.add_child(rows)
	root.add_child(pager("%d players available" % list.size(), page, pages, func(d):
		page += d
		rebuild(), "Tap a player to look closer"))
