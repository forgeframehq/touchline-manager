# Touchline Manager — Godot version

The remake of the game in Godot 4.5 (GDScript). The web game in the repo root stays as it is until this catches up.

- `core/` — the game itself, no UI: `sim.gd` (matches, weeks, seasons; a line-for-line port of `js/sim.js` that gives identical results for the same seed), `rng.gd`, `db.gd` (data), `game.gd` (career, saving), `commentary.gd`.
- `data/game.json` — every rule number, club, squad and legend. Written by `node tools/export_godot_data.mjs` from the web game's data files; don't edit by hand.
- `ui/` — the look (`ui.gd`: colours, fonts, builders), the screen frame and tab bar (`nav.gd`), crests, icons and the live 2D pitch.
- `screens/` — one file per screen. Every screen fits the phone and never scrolls; long lists page.
- `tests/` — `season.tscn` (headless season, compare with `node tools/export_godot_data.mjs ref`) and `shots.gd` (screenshot tour).

Run the checks:

    godot --headless --path godot --import
    godot --headless --path godot res://tests/season.tscn
    xvfb-run godot --path godot --rendering-method gl_compatibility --resolution 390x844 -- --shots=/some/dir

Android APK: push a commit whose message contains `[godot]`; `.github/workflows/godot-android.yml` builds it and attaches it to a GitHub Release.

Not ported yet (still only in the web game): the FM layer (`js/fm.js`: roles, contracts, transfers, cups, stats), match day v2 (`js/matchsim.js`: xG, cards, penalties, VAR) and career depth (`js/career.js`: training, happiness, staff, loans, sponsors, records).
