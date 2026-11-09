"""Interface sounds: real recorded clicks from Kenney's UI pack (CC0, public domain, github.com/iwenzhou/kenney)
layered with soft synthesised chimes, thumps and whooshes. Short, quiet and premium; replaces the AI-made UI set.

    python3 tools/ui_sfx.py <path to "UI sounds (50 sounds)">

Writes assets/sound/{tap,select,back,swipe,card,error,hold,toast}_<n>.mp3.
"""
import os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100; ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, 'assets/sound')
SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/vendor/kenney/Audio (295 files)/UI sounds (50 sounds)'


def load(name, pitch=1.0):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: pass
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', os.path.join(SRC, name + '.ogg'), '-ac', '1',
                    '-af', f'asetrate={int(SR * pitch)},aresample={SR}', '-ar', str(SR), t.name], check=True)
    sr, x = wavfile.read(t.name); os.unlink(t.name)
    x = x.astype(np.float32) / (32768 if x.dtype == np.int16 else 1)
    return x / (np.max(np.abs(x)) + 1e-9)


def t(d): return np.arange(int(SR * d)) / SR
def env(n, a=.003, d=.2): tt = np.arange(n) / SR; return np.minimum(1, tt / a) * np.exp(-tt / d)
def tone(f, d, dec=.2, a=.003, harm=.18):
    tt = t(d); return (np.sin(2 * np.pi * f * tt) + harm * np.sin(4 * np.pi * f * tt)) * env(len(tt), a, dec)
def lp(x, f): return sosfilt(butter(4, f, 'low', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def mix(*parts):
    n = max(len(p) + int(o * SR) for p, o, g in parts); y = np.zeros(n, np.float32)
    for p, o, g in parts: s = int(o * SR); y[s:s + len(p)] += p * g
    return y
def whoosh(d=.22, lo=700, hi=3200, seed=1):
    rng = np.random.default_rng(seed); n = int(SR * d); x = rng.standard_normal(n).astype(np.float32); y = np.zeros(n, np.float32); seg = 512
    for i in range(0, n, seg):
        k = i / n; f = lo * (hi / lo) ** k; y[i:i + seg] = bp(x[max(0, i - 2048):i + seg], f * .7, min(f * 1.4, SR / 2 - 100))[-len(x[i:i + seg]):]
    return y * np.sin(np.pi * np.arange(n) / n) ** 1.5


def save(name, y, peak_db):
    y = y / (np.max(np.abs(y)) + 1e-9) * 10 ** (peak_db / 20)
    fade = int(.01 * SR); y[-fade:] *= np.linspace(1, 0, fade)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf: wavfile.write(tf.name, SR, (y * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', tf.name, '-b:a', '96k', os.path.join(OUT, name + '.mp3')], check=True); os.unlink(tf.name)


def build():
    for f in os.listdir(OUT):
        if f.split('_')[0] in ('tap', 'select', 'back', 'swipe', 'card', 'error', 'hold', 'toast'): os.remove(os.path.join(OUT, f))
    thump = lambda f=170: tone(f, .06, .022, .002, 0)
    for i, p in enumerate([.92, .97, 1.0, 1.05], 1):          # tap: soft click with a little body
        save(f'tap_{i}', mix((lp(load('click3', p), 6500), 0, 1), (thump(165 * p), 0, .35)), -11)
    for i, p in enumerate([1.0, 1.04, .96], 1):               # select: click + glassy two-note chime
        save(f'select_{i}', mix((lp(load('click1', p), 7000), 0, .8), (tone(1046.5 * p, .35, .16), .01, .32), (tone(1568 * p, .4, .2), .055, .26)), -10)
    for i, p in enumerate([1.0, .96, 1.04], 1):               # back: softer click + falling chime
        save(f'back_{i}', mix((lp(load('rollover2', .85 * p), 6000), 0, .9), (tone(1318.5 * p, .25, .12), .0, .2), (tone(880 * p, .3, .15), .05, .2)), -13)
    for i, (lo, hi) in enumerate([(700, 3200), (600, 2800), (800, 3600)], 1):  # swipe: short airy whoosh
        save(f'swipe_{i}', whoosh(.2, lo, hi, i), -16)
    for i, p in enumerate([1.0, .95, 1.05], 1):               # card: whoosh into a padded pop
        save(f'card_{i}', mix((whoosh(.16, 900, 3000, 10 + i), 0, .6), (lp(load('switch2', p), 5000), .12, .9), (thump(140 * p), .12, .5)), -11)
    for i, f in enumerate([220, 196], 1):                      # error: two low soft blips
        b = lp(np.sign(np.sin(2 * np.pi * f * t(.07))) * env(int(SR * .07), .002, .05), 1400)
        save(f'error_{i}', mix((b, 0, 1), (b, .11, .9)), -13)
    for i, (f0, f1) in enumerate([(380, 880), (420, 990)], 1):  # hold: rising shimmer
        tt = t(.6); fr = f0 * (f1 / f0) ** (tt / .6); ph = 2 * np.pi * np.cumsum(fr) / SR
        y = (np.sin(ph) + .3 * np.sin(2 * ph)) * (tt / .6) ** .7 * (1 + .25 * np.sin(2 * np.pi * 14 * tt)); y[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
        save(f'hold_{i}', y, -17)
    for i, (a, b) in enumerate([(1318.5, 1975.5), (1174.7, 1760)], 1):  # toast: clean ping
        save(f'toast_{i}', mix((tone(a, .6, .25, .004, .1), 0, .6), (tone(b, .6, .3, .004, .05), .06, .4)), -12)
    print('ui sounds written')


if __name__ == '__main__':
    build()
