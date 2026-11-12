class_name Commentary
extends RefCounted
## Turns match events into commentary lines. Returns {min, text, kind}; kind is "goal", "warn" or "".

const GOAL := ["GOAL! %s scores for %s!", "GOAL! %s finds the net for %s!", "It's in! %s puts %s on the board!", "GOAL! A fine finish from %s for %s!"]
const SAVE := ["%s shoots, and %s saves.", "%s is denied by a fine stop from %s.", "%s forces a save from %s.", "%s tests %s, who holds on."]
const LOST := ["%s is crowded out on the edge of the box.", "The move breaks down as %s loses it.", "%s is flagged offside.", "%s's cross is headed clear.", "A last-ditch tackle stops %s."]
const MISS := ["%s shoots just wide.", "%s drags his shot past the post.", "%s blazes over the bar.", "%s has a go, but it is off target.", "A chance for %s, and it is wasted."]
const QUIET := ["%s keep the ball in midfield.", "%s are patient in possession.", "Neat passing from %s.", "%s look for an opening.", "%s win it back and go again."]

static func _pick(a: Array) -> String:
	return a[randi() % a.size()]

static func line(ev: Dictionary, m: Dictionary, career: Dictionary) -> Dictionary:
	var side: String = ev.get("side", "H")
	var team: String = m[side].club.name
	var text := ""
	var kind := ""
	match ev.type:
		"goal":
			text = _pick(GOAL) % [ev.who, team]
			if ev.assist != null:
				text += " Assist: %s." % UI.short_name(ev.assist)
			text += " %s %s %s." % [m.H.club.short, ev.score.replace("-", "–"), m.A.club.short]
			kind = "goal"
		"save":
			text = _pick(SAVE) % [ev.who, ev.keeper]
		"chance":
			text = (_pick(MISS) if ev.get("shot", true) else _pick(LOST)) % ev.who
		"sub":
			text = "%s substitution: %s on for %s." % [team, ev.on, ev.off]
		"ht":
			text = "Half-time: %s %d–%d %s." % [m.H.club.name, m.gH, m.gA, m.A.club.name]
			kind = "warn"
		"ft":
			text = "Full time: %s %d–%d %s." % [m.H.club.name, m.gH, m.gA, m.A.club.name]
			kind = "warn"
		"shout":
			text = "The manager shouts: “%s”" % DB.DATA.shouts[ev.key].label
		"injury":
			text = "%s has picked up an injury." % ev.who
			kind = "warn"
	return {"min": ev.min, "text": text, "kind": kind}

static func quiet(minute: int, team: String) -> Dictionary:
	return {"min": minute, "text": _pick(QUIET) % team, "kind": ""}
