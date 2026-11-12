extends Node
## The running career, saving and loading, and the week flow the screens call.

const SAVE := "user://career.save"
var career = null          # Dictionary once a career is loaded
var live = null            # my match this week while it is being played
var last_result = null     # my last finished match
var last_summary = null    # the season summary while the end-of-season screen is open

signal changed

func has_save() -> bool:
	return FileAccess.file_exists(SAVE)

func new_game(club_id: String, manager_name: String, legends := false) -> void:
	var seed_value := int(Time.get_unix_time_from_system()) & 0x7FFFFFFF
	career = Sim.new_career(seed_value, club_id, {"name": manager_name, "legends": legends})
	live = null
	last_result = null
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
	if typeof(c) != TYPE_DICTIONARY or int(c.get("version", 0)) != int(DB.DATA.version):
		return false
	career = c
	Sim.reindex(career)
	live = null
	return true

func my_club() -> Dictionary:
	return Sim.club_of(career, career.me)

## True once my own division has played its last round (lower divisions may still have weeks left; ending the season plays them).
func season_over() -> bool:
	return career.week >= my_weeks()

func my_weeks() -> int:
	return career.fixtures[Sim.my_div(career)].size()

## Simulates the rest of this week's fixtures and returns my live match (null on a bye week).
func kick_off():
	if live != null:        # already under way; never settle the week's other fixtures twice
		return live
	live = Sim.start_week(career)
	return live

func full_time():
	last_result = Sim.finish_week(career, live)
	live = null
	save()
	changed.emit()
	return last_result

func next_season() -> Dictionary:
	var s := Sim.end_season(career)
	last_summary = s
	save()
	changed.emit()
	return s
