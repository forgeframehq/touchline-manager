extends Screen
## After a sacking: clubs who would take you on.

func build() -> void:
	var c := career()
	root.add_child(header("Job offers", "Pick your next club", null, true))
	var v := UI.vbox(8)
	UI.grow(v, true, true)
	var offers := Sim.job_offers(c)
	if offers.is_empty():
		v.add_child(UI.label("No club has come in for you. You can start a new career from the title screen.", 13, UI.MUTED))
		v.get_child(0).autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	for club in offers:
		var hb := UI.hbox(12)
		hb.add_child(Crest.make(club, 40))
		var t := UI.vbox(1)
		t.alignment = BoxContainer.ALIGNMENT_CENTER
		UI.grow(t)
		t.add_child(UI.clip(UI.label(club.name, 16, UI.TEXT, 600)))
		t.add_child(UI.clip(UI.label("%s · %s in the table" % [DB.divisions[club.div].name, UI.ordinal(Sim.position(c, club.id))], 12, UI.MUTED)))
		hb.add_child(t)
		hb.add_child(Icon.make("next", 16, UI.MUTED))
		var b := UI.row(UI.pad(hb, 14, 0, 12, 0), 68, UI.PANEL)
		b.add_theme_stylebox_override("normal", UI.box(UI.PANEL, 14, UI.LINE, 0))
		b.pressed.connect(func():
			Sim.take_job(c, club.id)
			Game.save()
			UI.nav.tab("office"))
		v.add_child(b)
	root.add_child(UI.pad(v, 16, 0, 16, 0))
	var back_btn := UI.btn("Back to the title screen", "ghost", 48)
	back_btn.pressed.connect(func(): UI.nav.go("title", {}, "root"))
	root.add_child(UI.pad(back_btn, 16, 10, 16, 10))
