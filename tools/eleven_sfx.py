"""Make Touchline Manager's sounds with ElevenLabs' sound generation.

Usage: ELEVEN_KEY=... python3 tools/eleven_sfx.py [key ...]        (SKIP_EXISTING=1 to fill gaps only)

Writes assets/sound/<key>_<n>.mp3. The key is read from the environment only; it never goes in the repo.
Processing (from the Dawn of Dynasties tool): only near-silence at the start is cut, natural tails kept,
short fade out, loudness matched per category with a measured gain + limiter. Ambient beds are seamless loops.
"""
import json, os, re, subprocess, sys, tempfile, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), 'assets/sound')
STYLE = {
    'ui': ', clean premium mobile game interface sound, crisp, modern, subtle, no music, no voices',
    'match': ', realistic football match foley, close and clear, no music, no voices, no crowd',
    'crowd': ', large football stadium crowd, realistic, wide, no music, no announcer',
    'sting': '',
    'ambient': '',
}
LOUD = {'ui': -22, 'match': -19, 'crowd': -18, 'sting': -16, 'ambient': -26}
SFX = {  # key: (variants, seconds, category, prompt)
    # ---- interface: crisp and premium, like a polished console menu ----
    'tap':     (5, 0.5, 'ui', 'a single soft short tap on a glossy button, muted click with a tiny bit of body'),
    'select':  (3, 0.6, 'ui', 'a bright short confirm click with a soft glassy chime'),
    'back':    (3, 0.5, 'ui', 'a soft short descending click, gentle and muted, going back'),
    'swipe':   (3, 0.6, 'ui', 'a quick soft airy whoosh of a card sliding sideways'),
    'card':    (3, 0.7, 'ui', 'a panel popping open, soft whoosh ending in a light padded thud'),
    'error':   (2, 0.6, 'ui', 'a short low muted double buzz, gentle denied sound'),
    'hold':    (2, 0.8, 'ui', 'a short rising charge-up shimmer that builds quickly'),
    'toast':   (2, 0.8, 'ui', 'a clean soft notification ping'),
    'coin':    (3, 1.0, 'ui', 'a short stack of coins clinking and a cash register drawer, money earned'),
    'ach':     (2, 2.0, 'ui', 'an achievement unlocked: a sparkling magical shimmer rising into a bright bell chime'),
    'stamp':   (2, 0.8, 'ui', 'a heavy rubber stamp pressed firmly onto a paper contract, one thump'),
    'camera':  (2, 1.5, 'ui', 'a burst of press photographer camera shutters clicking quickly with flash charge'),
    'phone':   (2, 1.0, 'ui', 'a smartphone message notification, short vibration buzz followed by a soft ping'),
    # ---- on the pitch ----
    'whistle1': (3, 0.8, 'match', 'one short sharp referee whistle blast'),
    'whistle2': (2, 1.5, 'match', 'a referee whistle blowing two short blasts for half time'),
    'whistle3': (2, 2.5, 'match', 'a referee whistle blowing three blasts, the last one long, full time'),
    'kick':     (5, 0.5, 'match', 'a leather football struck hard by a boot, one solid thud'),
    'post':     (2, 1.0, 'match', 'a football smashing against a metal goal post, loud ringing clang'),
    'net':      (3, 1.0, 'match', 'a football hitting the back of a goal net, swishing ripple of the net'),
    # ---- the crowd ----
    'ooh':      (4, 2.0, 'crowd', 'thousands of fans gasping a loud oooh after a near miss shot'),
    'goal':     (4, 5.0, 'crowd', 'a huge stadium crowd erupting in a massive roar and cheering after a goal'),
    'groan':    (3, 3.0, 'crowd', 'home fans groaning in disappointment after conceding a goal, deflated murmur'),
    'applause': (2, 3.0, 'crowd', 'a stadium crowd applauding warmly'),
    'boo':      (2, 3.0, 'crowd', 'a stadium crowd booing loudly'),
    'chant':    (3, 8.0, 'crowd', 'football fans chanting rhythmically with drums and synchronized clapping, wordless'),
    # ---- big moments ----
    'sting_unveil':  (2, 4.0, 'sting', 'a cinematic sports broadcast intro sting, huge drum hit and bold brass swell, crowd roar underneath'),
    'sting_trophy':  (1, 5.0, 'sting', 'a trophy celebration, confetti cannons popping, fireworks and a stadium crowd roaring'),
    'sting_sacked':  (1, 3.0, 'sting', 'a dramatic dark cinematic low impact hit with a deep rumble fading out'),
    'sting_signing': (1, 3.0, 'sting', 'press camera flashes and a short triumphant orchestral swell, a big signing'),
    'sting_deadline':(1, 4.0, 'sting', 'a tense fast ticking clock with a rising suspense pulse, deadline approaching'),
    # ---- ambient beds (seamless loops) ----
    'amb_stadium': (1, 22, 'ambient', 'football stadium crowd ambience during a match, constant crowd murmur, distant chanting and clapping, whistles far away'),
    'amb_menu':    (1, 22, 'ambient', 'outside a football stadium at night before a match, distant crowd hum inside, light wind, faint city traffic, calm'),
}


def gen(key, i, text, dur, cat):
    path = os.path.join(OUT, f'{key}_{i}.mp3'); loop = cat == 'ambient'
    body = {'text': text + STYLE[cat], 'duration_seconds': dur, 'prompt_influence': 0.5}
    if loop: body['loop'] = True
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation', data=json.dumps(body).encode(), method='POST',
        headers={'xi-api-key': os.environ['ELEVEN_KEY'], 'Content-Type': 'application/json'})
    raw = urllib.request.urlopen(req, timeout=180).read()
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t: t.write(raw)
    m = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', t.name, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True, timeout=60).stderr
    found = re.findall(r'I:\s+(-?[\d.]+) LUFS', m)
    gain = (LOUD[cat] - float(found[-1])) if found and float(found[-1]) > -70 else 0
    if loop: af, br, ch = f'volume={gain:.1f}dB,alimiter=limit=0.8', '64k', '2'
    else:
        fade = min(0.25, dur * 0.25)
        af = (f'silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.02,volume={gain:.1f}dB,alimiter=limit=0.89,'
              f'afade=t=out:st={max(0.05, dur - fade):.2f}:d={fade:.2f}')
        br, ch = ('96k', '1') if cat in ('ui', 'match') else ('112k', '2')
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', t.name, '-ac', ch, '-af', af, '-b:a', br, path], check=True, timeout=60)
    os.unlink(t.name)
    return path


def job(args):
    k, i = args; n, dur, cat, p = SFX[k]
    out = os.path.join(OUT, f'{k}_{i}.mp3')
    if os.environ.get('SKIP_EXISTING') and os.path.exists(out): return f'skip {k} {i}'
    try: gen(k, i, p, dur, cat); return f'done {k} {i}'
    except Exception as e: return f'FAIL {k} {i} {e}'


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    keys = sys.argv[1:] or list(SFX)
    work = [(k, i) for k in keys for i in range(1, SFX[k][0] + 1)]
    with ThreadPoolExecutor(4) as ex:
        for r in ex.map(job, work): print(r, flush=True)
