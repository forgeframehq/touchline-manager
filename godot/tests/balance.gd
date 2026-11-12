extends Node
## Headless check of the match engine and a full season: goals, shots and possession should look like football,
## and the engine should agree with the quick results used for other clubs.
func _ready() -> void:
	var c: Dictionary = Sim.new_career(1000, "arsenal", {})
	var t0 := Time.get_ticks_msec()
	for div in ["eng1", "eng3"]:
		var g := [0.0, 0.0]
		var sh := 0.0
		var xg := 0.0
		var n := 0
		var res := [0, 0, 0]
		var q := 0.0
		var passes := 0.0
		var okp := 0.0
		for rd in [0, 7, 15]:
			for f in c.fixtures[div][rd]:
				for k in 2:
					for p in c.players:
						p.fitness = 100.0
						p.injured = 0
					var e := MatchEngine.new(MatchEngine.team(c, f[0], true), MatchEngine.team(c, f[1], true), rd * 100 + k)
					while not e.done:
						e.step()
					g[0] += e.score.H
					g[1] += e.score.A
					sh += e.stats.H.shots + e.stats.A.shots
					xg += e.stats.H.xg + e.stats.A.xg
					passes += e.stats.H.pass + e.stats.A.pass
					okp += e.stats.H.ok + e.stats.A.ok
					res[0 if e.score.H > e.score.A else 1 if e.score.H == e.score.A else 2] += 1
					var r: Dictionary = Sim.quick_match(c, f[0], f[1], RNG.new(rd * 77 + k))
					q += r.gH + r.gA
					n += 1
		print("%s: n=%d engine goals %.2f (home %.2f away %.2f) quick %.2f  H/D/A %d/%d/%d  shots/team %.1f  xg/match %.2f  passes/team %d (%d%%)" % [div, n, (g[0] + g[1]) / n, g[0] / n, g[1] / n,
			q / n, res[0], res[1], res[2], sh / n / 2, xg / n, passes / n / 2, 100 * okp / passes])
	print("engine sample: %d ms" % (Time.get_ticks_msec() - t0))
	c = Sim.new_career(1000, "arsenal", {})
	t0 = Time.get_ticks_msec()
	while c.week < Sim.my_weeks(c):
		var fx = Sim.play_others(c)
		var res = null
		if fx != null:
			var e := MatchEngine.new(MatchEngine.team(c, fx.h, true), MatchEngine.team(c, fx.a, true), c.week + 1)
			while not e.done:
				e.step()
			res = e.result()
			res.merge(fx)
		Sim.finish_week(c, res)
	var t: Array = Sim.table(c, "eng1")
	var gl := 0
	for r in c.results:
		if r.div == "eng1":
			gl += r.gH + r.gA
	print("season: %d ms, PL goals/match %.2f, board %.0f, desk %d" % [Time.get_ticks_msec() - t0, gl / 380.0, c.board, c.desk.size()])
	print(" ".join(range(t.size()).map(func(i): return "%d.%s %d" % [i + 1, t[i].id, t[i].pts])))
	var s: Dictionary = Sim.end_season(c)
	print("finished ", s.pos, " target ", s.target, " up ", s.up, " down ", s.down, " top ", s.top.eng1, " players ", c.players.size())
	get_tree().quit()
