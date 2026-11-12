# Touchline Manager (Godot)

A football manager game where you are the manager: your desk, your week, your matchday. Godot 4.5, GDScript, portrait phone.
The older web game in the repo root is a separate, earlier game.

- `core/sim.gd` — the world and your week: players (attributes 1–20, personality, morale, trust), squads and line-ups, league, money, the board,
  what lands on your desk, how you spend your three blocks of time (training, one-to-one, scouting, press), transfers, end of season.
- `core/engine.gd` — the match engine. Each step the player on the ball passes, dribbles, crosses or shoots; outcomes come from his attributes
  against the nearest opponents, pressure, condition, morale, tactics and the week's preparation. What the pitch shows is the engine's own state.
- `core/game.gd` — the running career and saving. `core/db.gd` + `data/game.json` — clubs, squads and name pools (from `tools/export_godot_data.mjs`).
- `ui/` — look and builders (`ui.gd`; the accent is your club's colour), navigation, crests, icons, the live pitch.
- `screens/` — one file per screen. Screens never scroll; long lists page.
- `tests/balance.tscn` — headless: engine sample across league fixtures and a full season. `tests/shots.gd` — screenshot tour.

Checks:

    godot --headless --path godot --import
    godot --headless --path godot res://tests/balance.tscn      # expect about 2.5 goals a match in the top division, 11 shots a team
    SHOTS="letter:0,training,talk:pick,scout,match:live,match:ft" xvfb-run godot --path godot --rendering-method gl_compatibility --resolution 390x844 -- --shots=/some/dir

APK: push a commit whose message contains `[godot]`.
