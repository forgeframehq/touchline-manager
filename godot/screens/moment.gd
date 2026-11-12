extends Screen
## One thing that needs you: a letter, a knock on the door, or a block of your time
## (training, a one-to-one, the scout's report, the press). You choose; then you see how it went.

var result := ""
var pid := -1
var page := 0
var report: Dictionary
var q := 0

func on_back() -> bool:
	if result != "":
		UI.nav.tab("desk")
		return true
	if pid >= 0:
		pid = -1
		rebuild()
		return true
	return false

func test_state(s: String) -> void:
	if s == "pick":
		pid = Sim.squad_of(career(), career().me)[9].id
	elif s == "done":
		result = Sim.train(career(), "att")
	rebuild()

func build() -> void:
	var c := career()
	var action: String = params.get("action", "")
	if result != "":
		root.add_child(header("Done", "", null, false))
		root.add_child(UI.pad(_paper("", "", result), 16, 0, 16, 0))
		root.add_child(UI.spacer(true))
		root.add_child(main_action("Back to your desk", func(): UI.nav.tab("desk")))
		Game.save()
		return
	match action:
		"":
			var it: Dictionary = params.item
			root.add_child(header(it.from, "On your desk", null, true))
			root.add_child(UI.pad(_paper(it.from, it.title, it.body), 16, 0, 16, 0))
			if it.has("choices"):
				_choices(it.choices, func(i): return Sim.resolve(c, it, i))
			else:
				root.add_child(UI.spacer(true))
				root.add_child(main_action("Noted", func():
					c.desk.erase(it)
					UI.nav.tab("desk"), false))
		"training":
			root.add_child(header("Take training", "One block of your time", null, true))
			root.add_child(UI.pad(_paper("Training ground", "What do they work on?", "You can only fit one session into the slot. The squad will do what you ask; what matters is what you ask for."), 16, 0, 16, 0))
			_choices(Sim.SESSIONS.map(func(s): return "%s\n%s" % [s[0], s[1]]), func(i): return Sim.train(c, Sim.SESSIONS[i][2]), true)
		"talk":
			if pid < 0:
				_pick_player(c)
			else:
				var p: Dictionary = Sim.player(c, pid)
				var mood := "in good spirits" if p.morale >= 70 else "getting on with it" if p.morale >= 50 else "unhappy"
				var form := "has not played yet" if p.seasonApps == 0 else "is averaging %.1f in %d games" % [Sim.avg_rating(p), p.seasonApps]
				root.add_child(header(p.name, "One-to-one", null, true))
				root.add_child(UI.pad(_paper("Your office", p.name, "%s sits down opposite you. He is %s, and %s. Those who know him say he is %s. How do you handle him?" % [
					UI.short_name(p.name), mood, form, {"Leader": "a leader who sets the standard", "Professional": "a model professional who hates flattery", "Ambitious": "ambitious and hungry for more",
					"Temperamental": "talented but thin-skinned", "Easygoing": "relaxed, perhaps too relaxed", "Loyal": "loyal to the club"}[p.trait]]), 16, 0, 16, 0))
				_choices(Sim.TONES, func(i): return Sim.talk(c, pid, i))
		"scout":
			if report.is_empty():
				report = Sim.scout_report(c)
			root.add_child(header("Scout's report", Sim.club_of(c, report.opp).name, null, true))
			root.add_child(UI.pad(_paper("Chief scout", "How do we hurt them?", report.text), 16, 0, 16, 0))
			_choices(report.plans.map(func(pl): return pl[0]), func(i): return Sim.set_plan(c, report.plans[i][1], report.weak))
		"press":
			q = (c.week + c.season) % Sim.PRESS_Q.size()
			root.add_child(header("Press conference", "The room is full", null, true))
			root.add_child(UI.pad(_paper("A reporter asks", "", "“%s”" % Sim.PRESS_Q[q][0]), 16, 0, 16, 0))
			_choices(Sim.PRESS_Q[q][1], func(i): return Sim.press(c, q, i))

func _paper(from: String, title: String, body: String) -> Control:
	var p := UI.panel(18, UI.PAPER, 6, UI.CLEAR)
	var v := UI.vbox(8)
	if from != "":
		v.add_child(UI.cap(from, UI.INK2, 11))
	if title != "":
		v.add_child(UI.wrap(UI.label(title, 24, UI.INK, 800, "num"), 2))
	var l := UI.label(body, 15, UI.INK, 400)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_constant_override("line_spacing", 4)
	l.size_flags_vertical = Control.SIZE_FILL
	l.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	v.add_child(l)
	p.add_child(v)
	return p

## Your possible answers, stacked at the bottom of the screen.
func _choices(options: Array, pick: Callable, two_line := false) -> void:
	root.add_child(UI.spacer(true))
	var v := UI.vbox(8)
	for i in options.size():
		var parts: PackedStringArray = options[i].split("\n")
		var inner := UI.vbox(1)
		inner.alignment = BoxContainer.ALIGNMENT_CENTER
		inner.add_child(UI.wrap(UI.label(parts[0], 14, UI.TEXT, 600), 2))
		if parts.size() > 1:
			inner.add_child(UI.clip(UI.label(parts[1], 11, UI.MUTED)))
		var b := UI.row(UI.pad(inner, 14, 0, 14, 0), 50 if two_line or options.size() > 3 else 56, UI.RAISED)
		b.add_theme_stylebox_override("normal", UI.box(UI.RAISED, 12, UI.LINE2, 0))
		b.pressed.connect(func():
			result = pick.call(i)
			if result == "":
				UI.nav.tab("desk")
			else:
				rebuild())
		v.add_child(b)
	root.add_child(UI.pad(v, 16, 10, 16, 14))

func _pick_player(c: Dictionary) -> void:
	root.add_child(header("One-to-one", "Who do you want to see?", null, true))
	var sq: Array = Sim.squad_of(c, c.me).duplicate()
	sq.sort_custom(func(a, b): return a.morale < b.morale if a.morale != b.morale else a.id < b.id)
	var per := maxi(5, int((h - 62 - 48) / 49))
	var pages := int(ceil(sq.size() / float(per)))
	var list := UI.vbox(0)
	UI.grow(list, true, true)
	for p in sq.slice(page * per, page * per + per):
		var hb := UI.hbox(8)
		hb.add_child(UI.fixed(UI.label(p.pos, 11, UI.MUTED, 600), 34))
		var v := UI.vbox(0)
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		UI.grow(v)
		v.add_child(UI.clip(UI.label(p.name, 14, UI.TEXT, 600)))
		v.add_child(UI.clip(UI.label("%s · trusts you %d%%" % [p.trait, int(p.trust)], 11, UI.MUTED)))
		hb.add_child(v)
		hb.add_child(UI.right(UI.label("Happy" if p.morale >= 70 else "Fine" if p.morale >= 50 else "Unhappy", 12, UI.cond_color(p.morale + 18), 600), 64))
		var b := UI.row(UI.pad(hb, 16, 0, 16, 0), 48)
		b.pressed.connect(func():
			pid = p.id
			rebuild())
		list.add_child(b)
		list.add_child(UI.line())
	root.add_child(list)
	root.add_child(pager("Least happy first", page, pages, func(d):
		page += d
		rebuild(), "Page %d of %d" % [page + 1, pages]))
