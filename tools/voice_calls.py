#!/usr/bin/env python3
"""Voiced commentary calls (no player names) with ElevenLabs text-to-speech.
Key from env ELEVEN_KEY. Output: assets/sound/vc_<call>_<n>.mp3 (mono, loudness-normalised). Skips files that exist."""
import os, json, subprocess, urllib.request, concurrent.futures as cf
KEY = os.environ['ELEVEN_KEY']; VOICE = os.environ.get('VOICE', 'onwK4e9ZLuTAKqWW03F9')   # Daniel, steady British broadcaster
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'sound')
CALLS = {
  'goal': ["GOOOAL! What a finish!", "It's in! They've scored!", "GOAL! Absolutely brilliant!"],
  'save': ["What a save!", "Brilliant stop from the keeper!"],
  'post': ["Off the post!", "Oh! It's hit the woodwork!"],
  'chance': ["Ooh, so close!", "Just wide!"],
  'red': ["He's been sent off!", "Red card! He's off!"],
  'penalty': ["Penalty! The referee points to the spot!"],
  'penmiss': ["He's missed it! The penalty is missed!"],
  'var': ["VAR are checking this one..."],
  'nogoal': ["No goal! It's been ruled out!"],
  'kickoff': ["And we're under way!"],
  'ht': ["That's half-time."],
  'ft': ["And that's full time!"],
}
def job(call, i, text):
    dst = os.path.join(OUT, f'vc_{call}_{i}.mp3')
    if os.path.exists(dst): return dst, 'skip'
    excited = call in ('goal', 'red', 'penalty', 'post', 'save', 'nogoal')
    body = json.dumps({ 'text': text, 'model_id': 'eleven_multilingual_v2',
      'voice_settings': { 'stability': .28 if excited else .5, 'similarity_boost': .8, 'style': .75 if excited else .35, 'use_speaker_boost': True } }).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128', data=body, headers={ 'xi-api-key': KEY, 'Content-Type': 'application/json' })
    raw = urllib.request.urlopen(req, timeout=120).read(); tmp = dst + '.raw.mp3'; open(tmp, 'wb').write(raw)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-14:TP=-1.5', '-b:a', '64k', dst], check=True); os.remove(tmp)
    return dst, 'ok'
with cf.ThreadPoolExecutor(2) as ex:
    for f in [ex.submit(job, c, i + 1, t) for c, ts in CALLS.items() for i, t in enumerate(ts)]: print(*f.result())
