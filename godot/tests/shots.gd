extends Node
## Screenshot tour for checking layouts: run the game with `-- --shots=/some/dir` and it walks the screens,
## saving a PNG of each. Uses a fixed seed so the pictures are repeatable.
var out_dir := ""

func _ready() -> void:
	await get_tree().process_frame
	var nav = UI.nav
	nav.go("title", {}, "root")
	await _snap("01_title")
	nav.go("new_career")
	await _snap("02_pick_club")
	nav.current.picked = "arsenal"
	nav.current.step = "confirm"
	nav.current.rebuild()
	await _snap("03_confirm")
	Game.career = Sim.new_career(1000, OS.get_environment("CLUB") if OS.get_environment("CLUB") != "" else "arsenal", {"name": "Sudhi"})
	var c: Dictionary = Game.career
	for i in 9:
		Game.kick_off()
		while not Game.engine.done:
			Game.engine.step()
		Game.full_time()
	nav.tab("desk")
	await _snap("04_desk")
	for s in OS.get_environment("SHOTS").split(",", false):
		var parts := s.split(":")
		if parts[0] in ["squad", "tactics", "league", "club", "desk"]:
			nav.tab(parts[0])
		elif parts[0] == "player":
			nav.go("player", {"id": Sim.squad_of(Game.career, Game.career.me)[18].id})
		elif parts[0] == "letter":
			nav.go("moment", {"item": c.desk[int(parts[1]) if parts.size() > 1 else 0]})
		elif parts[0] in ["training", "talk", "scout", "press"]:
			nav.go("moment", {"action": parts[0]})
		else:
			nav.go(parts[0])
		if parts.size() > 1 and nav.current.has_method("test_state"):
			nav.current.test_state(parts[1])
			if parts[1] == "watch":
				for k in 6:
					for i in 50:
						await get_tree().process_frame
					await RenderingServer.frame_post_draw
					get_viewport().get_texture().get_image().save_png(out_dir.path_join("20_watch_%d.png" % k))
		await _snap("10_" + s.replace(":", "_"))
	get_tree().quit()

func _snap(shot: String) -> void:
	for i in 30:
		await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(shot + ".png"))
