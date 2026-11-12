extends Node
## Headless port check: prints the same lines as `node tools/export_godot_data.mjs ref` so the two can be compared.
func _ready() -> void:
	var t0 := Time.get_ticks_msec()
	var c := Sim.new_career(1000, "arsenal", {})
	print("players ", c.players.size(), " p1 ", JSON.stringify(c.players[0].attr), " last ", c.players[-1].name)
	var t1 := Time.get_ticks_msec()
	while c.week < Sim.season_length(c):
		Sim.play_week(c)
	var g := 0
	var n := 0
	for r in c.results:
		if r.div == "eng1":
			g += r.gH + r.gA
			n += 1
	print("eng1 goals/match %.3f" % (g / float(n)))
	var t := Sim.table(c, "eng1")
	var line := []
	for i in t.size():
		line.append("%d.%s %d" % [i + 1, t[i].id, t[i].pts])
	print(" ".join(line))
	var t2 := Time.get_ticks_msec()
	var s := Sim.end_season(c)
	print("promoted ", ",".join(s.promoted), " relegated ", ",".join(s.relegated), " players ", c.players.size())
	print("timing: new career %d ms, season %d ms (%d ms a week), season end %d ms" % [t1 - t0, t2 - t1, (t2 - t1) / 46, Time.get_ticks_msec() - t2])
	get_tree().quit()
