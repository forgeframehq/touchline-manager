extends Node
## The career in play: saving, loading, and the steps of a week that the screens call.

const SAVE := "user://manager.save"
var career = null              # Dictionary once a career is loaded
var engine: MatchEngine        # my match while it is being played
var fixture = null
var last_summary = null

func has_save() -> bool:
	return FileAccess.file_exists(SAVE)

func new_game(club_id: String, manager_name: String) -> void:
	career = Sim.new_career(int(Time.get_unix_time_from_system()) & 0x7FFFFFFF, club_id, {"name": manager_name})
	engine = null
	save()

func save() -> void:
	if career == null:
		return
	var c: Dictionary = career.duplicate()
	c.erase("_sq")
	c.erase("_cl")
	var f := FileAccess.open(SAVE, FileAccess.WRITE)
	f.store_var(c)
	f.close()

func load_game() -> bool:
	if not has_save():
		return false
	var f := FileAccess.open(SAVE, FileAccess.READ)
	var c = f.get_var()
	f.close()
	if typeof(c) != TYPE_DICTIONARY or int(c.get("version", 0)) != 30:
		return false
	career = c
	Sim.reindex(career)
	engine = null
	return true

func my_club() -> Dictionary:
	return Sim.club_of(career, career.me)

func season_over() -> bool:
	return career.week >= Sim.my_weeks(career)

## Plays the week's other fixtures and sets up my match. Returns false on a free week.
func kick_off() -> bool:
	if engine != null:
		return true
	fixture = Sim.play_others(career)
	if fixture == null:
		return false
	engine = MatchEngine.new(MatchEngine.team(career, fixture.h, fixture.h != career.me), MatchEngine.team(career, fixture.a, fixture.a != career.me),
		career.seed ^ (career.season * 31) ^ (career.week * 7919))
	return true

func full_time() -> Dictionary:
	var res: Dictionary = engine.result()
	res.merge(fixture)
	Sim.finish_week(career, res)
	engine = null
	save()
	return res

func free_week() -> void:
	Sim.finish_week(career, null)
	save()

func next_season() -> Dictionary:
	last_summary = Sim.end_season(career)
	save()
	return last_summary
