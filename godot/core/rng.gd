class_name RNG
extends RefCounted
## Seeded RNG (mulberry32), bit-for-bit the same as the web game's js/rng.js so a career replays identically.

const M := 0xFFFFFFFF
var s: int

func _init(seed_value: int = 1) -> void:
	s = seed_value & M
	if s == 0:
		s = 1

static func imul(a: int, b: int) -> int:
	return ((a & M) * (b & M)) & M

func next() -> float:
	s = (s + 0x6D2B79F5) & M
	var t := s
	t = imul(t ^ (t >> 15), t | 1)
	t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & M)) & M
	return float((t ^ (t >> 14)) & M) / 4294967296.0

func int_in(a: int, b: int) -> int:
	return a + int(floor(next() * (b - a + 1)))

func pick(arr: Array):
	return arr[int(floor(next() * arr.size()))]

func chance(p: float) -> bool:
	return next() < p

## A child stream, so one draw doesn't shift unrelated systems.
func fork(tag: String) -> RNG:
	var h := (s ^ 0x9E3779B9) & M
	for i in tag.length():
		h = imul(h ^ tag.unicode_at(i), 16777619)
	return RNG.new(h)

static func hash_str(t: String) -> int:
	var h := 2166136261
	for i in t.length():
		h = imul(h ^ t.unicode_at(i), 16777619)
	return h
