extends Screen
## One player: who he is, how good, his attributes and his season.

func build() -> void:
	var c := career()
	var p: Dictionary = Sim.player(c, params.id)
	var club_name := Sim.club_name(c, p.club) if p.club != null else "Free agent"
	root.add_child(header(p.name, "%s · %s · %s" % [DB.DATA.positions[p.pos].name, club_name, p.trait], null, true))
	var v := UI.vbox(10)
	var top := UI.hbox(8)
	for f in [["Overall", str(p.rating), UI.ACCENT], ["Potential", str(p.pot), UI.TEXT], ["Age", str(p.age), UI.TEXT], ["Nation", p.nat if p.nat != "" else "–", UI.TEXT]]:
		var t := UI.panel(10, UI.PANEL, 14)
		UI.grow(t)
		var tv := UI.vbox(0)
		tv.add_child(UI.cap(f[0]))
		tv.add_child(UI.num(f[1], 24, f[2]))
		t.add_child(tv)
		top.add_child(t)
	v.add_child(top)
	var st := UI.panel(0)
	var sv := UI.vbox(0)
	var rows := [["Condition", "%d%%" % int(round(p.fitness)), UI.cond_color(p.fitness)], ["Morale", str(int(round(p.morale))), UI.cond_color(p.morale + 15)],
		["Trust in you", "%d%%" % int(round(p.trust)), UI.cond_color(p.trust + 25)],
		["Status", "Injured, %d weeks" % p.injured if p.injured > 0 else "Available", UI.BAD if p.injured > 0 else UI.GOOD],
		["Wage", "£%dk a week" % p.wage, UI.TEXT], ["Value", "£%.1fM" % Sim.value(p), UI.TEXT],
		["This season", "%d games · %d goals%s" % [p.seasonApps, p.seasonGoals, " · %.1f average" % Sim.avg_rating(p) if p.seasonApps > 0 else ""], UI.TEXT]]
	var show := rows if h > 760 else rows.slice(0, 5)
	for i in show.size():
		if i > 0:
			sv.add_child(UI.line())
		var hb := UI.hbox(8)
		hb.custom_minimum_size.y = 34
		hb.add_child(UI.grow(UI.label(show[i][0], 13, UI.MUTED)))
		hb.add_child(UI.label(show[i][1], 13, show[i][2], 600))
		sv.add_child(UI.pad(hb, 14, 0, 14, 0))
	st.add_child(sv)
	v.add_child(st)
	v.add_child(UI.cap("Attributes"))
	var g := UI.grid(2, 14)
	g.add_theme_constant_override("v_separation", 6)
	var prof: Dictionary = Sim.PROFILE[Sim.PROFILE_OF[p.pos]]
	var keys: Array = prof.keys().filter(func(k): return prof[k] >= 1.0)
	var attrs: Array = Sim.ATTRS.duplicate()
	if p.pos != "GK":
		attrs.erase("handling")
		attrs.erase("reflexes")
	for a in attrs:
		var val: int = p.attr[a]
		var hb := UI.hbox(6)
		UI.grow(hb)
		hb.custom_minimum_size.y = 26
		hb.add_child(UI.grow(UI.label(a.capitalize(), 13, UI.TEXT if keys.has(a) else UI.MUTED, 600 if keys.has(a) else 400)))
		var bar := Bar.new()
		bar.value = val / 20.0
		bar.color = UI.ACCENT if val >= 16 else UI.GOOD if val >= 13 else UI.WARN if val >= 9 else UI.BAD
		hb.add_child(bar)
		hb.add_child(UI.right(UI.num(str(val), 13), 22))
		g.add_child(hb)
	v.add_child(g)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	if p.club != c.me and params.get("buy", false):
		root.add_child(UI.spacer(true))
		var why := Sim.can_sign(c, p)
		if why != "":
			root.add_child(UI.centre(UI.label(why, 12, UI.WARN)))
		var act := main_action("Sign for %s" % UI.money(Sim.asking_price(c, p)), func():
			Sim.sign_player(c, p)
			Game.save()
			UI.nav.tab("squad"), false)
		act.get_child(0).disabled = why != ""
		root.add_child(act)

class Bar extends Control:
	var value := 0.5
	var color := Color.WHITE
	func _init() -> void:
		custom_minimum_size = Vector2(44, 6)
		size_flags_vertical = Control.SIZE_SHRINK_CENTER
	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), UI.LINE)
		draw_rect(Rect2(Vector2.ZERO, Vector2(size.x * value, size.y)), color)
