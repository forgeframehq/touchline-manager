class_name Crest
extends Control
## A club badge drawn in code: a shield in the club's colours with its three-letter code.

var club: Dictionary
var show_code := true

static func make(c: Dictionary, w := 40.0, code := true) -> Crest:
	var k := Crest.new()
	k.club = c
	k.show_code = code
	k.custom_minimum_size = Vector2(w, w * 1.1)
	k.mouse_filter = Control.MOUSE_FILTER_IGNORE
	k.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	k.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return k

func _draw() -> void:
	var w := size.x
	var h := size.y
	var pts := PackedVector2Array([Vector2(w * 0.07, h * 0.06), Vector2(w * 0.93, h * 0.06), Vector2(w * 0.93, h * 0.55)])
	for i in range(1, 9):   # curved point of the shield
		var t := i / 8.0
		pts.append(Vector2(w * 0.93, h * 0.55).lerp(Vector2(w * 0.5, h * 0.97), t).lerp(Vector2(w * 0.72, h * 0.86), sin(t * PI) * 0.35))
	for i in range(1, 9):
		var t := i / 8.0
		pts.append(Vector2(w * 0.5, h * 0.97).lerp(Vector2(w * 0.07, h * 0.55), t).lerp(Vector2(w * 0.28, h * 0.86), sin(t * PI) * 0.35))
	var a := Color(club.kit[0])
	var b := Color(club.kit[1])
	draw_colored_polygon(pts, a)
	var edge := b if absf(a.get_luminance() - b.get_luminance()) > 0.25 else Color(1, 1, 1, 0.4)
	pts.append(pts[0])
	draw_polyline(pts, edge, maxf(1.5, w * 0.045), true)
	if show_code:
		var f := UI.font("num", 700)
		var fs := int(w * 0.29)
		draw_string(f, Vector2(0, h * 0.47 + fs * 0.36), club.short, HORIZONTAL_ALIGNMENT_CENTER, w, fs, UI.ink_on(a))
