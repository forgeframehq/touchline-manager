class_name Icon
extends Control
## Line icons drawn in code on a 24-unit grid. Icon.make("squad", 22, color).

const SHAPES := {
	"office": [[3, 10.5, 12, 3, 21, 10.5, 21, 21, 15, 21, 15, 15, 9, 15, 9, 21, 3, 21, 3, 10.5]],
	"squad": [[4, 20, 4, 18, 6, 15, 12, 15, 14, 18, 14, 20], [6, 8, 9, 5, 12, 8, 9, 11, 6, 8], [17, 15, 20, 17, 20, 20], [15, 5, 18, 8, 15, 11]],
	"tactics": [[4, 4, 20, 4, 20, 20, 4, 20, 4, 4], [4, 12, 20, 12], [9.5, 12, 12, 9.5, 14.5, 12, 12, 14.5, 9.5, 12]],
	"league": [[5, 20, 5, 12], [12, 20, 12, 5], [19, 20, 19, 9], [3, 20, 21, 20]],
	"club": [[12, 3, 4, 6, 4, 12, 7, 17, 12, 21, 17, 17, 20, 12, 20, 6, 12, 3]],
	"back": [[15, 5, 8, 12, 15, 19]],
	"next": [[9, 5, 16, 12, 9, 19]],
	"menu": [[4, 7, 20, 7], [4, 12, 20, 12], [4, 17, 20, 17]],
	"arrow": [[5, 12, 19, 12], [13, 6, 19, 12, 13, 18]],
	"mail": [[3, 6, 21, 6, 21, 18, 3, 18, 3, 6], [3, 7, 12, 13, 21, 7]],
	"swap": [[7, 4, 3, 8, 7, 12], [3, 8, 17, 8], [17, 12, 21, 16, 17, 20], [21, 16, 7, 16]],
}
var shape := "office"
var color := Color.WHITE
var weight := 1.8

static func make(s: String, w := 22.0, c := Color.WHITE) -> Icon:
	var i := Icon.new()
	i.shape = s
	i.color = c
	i.custom_minimum_size = Vector2(w, w)
	i.mouse_filter = Control.MOUSE_FILTER_IGNORE
	i.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	i.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return i

func _draw() -> void:
	var k := minf(size.x, size.y) / 24.0
	var off := (size - Vector2(24, 24) * k) / 2.0
	for path in SHAPES.get(shape, []):
		var pts := PackedVector2Array()
		for i in range(0, path.size(), 2):
			pts.append(off + Vector2(path[i], path[i + 1]) * k)
		draw_polyline(pts, color, weight * k, true)
