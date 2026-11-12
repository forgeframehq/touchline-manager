extends Node
## Game data: every rule number, club, squad and name pool. Loaded from data/game.json, which
## tools/export_godot_data.mjs writes from the web game's data files.

var DATA: Dictionary
var NAMES: Dictionary
var countries: Dictionary
var divisions: Dictionary      # id -> division
var division_list: Array = []  # in pack order
var clubs: Array = []
var squads: Dictionary
var legends: Array = []
var _club_by_id := {}

func _ready() -> void:
	var raw: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/game.json"))
	DATA = raw.data
	NAMES = raw.names
	var w: Dictionary = raw.world
	countries = w.countries
	divisions = w.divisions
	for id in divisions:
		var d: Dictionary = divisions[id]
		for k in ["tier", "up", "down", "tv"]:
			d[k] = int(d[k])
		if d.playoff != null:
			d.playoff = [int(d.playoff[0]), int(d.playoff[1])]
		if d.band != null:
			d.band = [int(d.band[0]), int(d.band[1])]
		division_list.append(d)
	clubs = w.clubs
	for c in clubs:
		c.capacity = int(c.capacity)
		c.rep = int(c.rep)
		_club_by_id[c.id] = c
	squads = w.squads
	for id in squads:
		for p in squads[id]:
			_ints(p)
	legends = w.legends
	for p in legends:
		_ints(p)

func _ints(p: Dictionary) -> void:
	p.age = int(p.age)
	p.rating = int(p.rating)
	p.pot = int(p.pot)

func club(id: String) -> Dictionary:
	return _club_by_id[id]

func clubs_in(div_id: String) -> Array:
	return clubs.filter(func(c): return c.div == div_id)

func divisions_of(country: String) -> Array:
	var out := division_list.filter(func(d): return d.country == country)
	out.sort_custom(func(a, b): return a.tier < b.tier)
	return out
