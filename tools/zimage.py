"""Generate Touchline art with Kie's Z-Image model (0.8 credits an image).

Usage: KIE_KEY=... python3 tools/zimage.py tools/art_jobs/<jobs>.json [stem,stem]

Jobs file: {"out": "assets/art/src", "style": "...appended to every prompt...", "jobs": [[stem, aspect, prompt, variants], ...]}
Writes <out>/<stem>_<n>.png. Existing files are skipped, so a run can be repeated to fill gaps.
All jobs are queued first (they render in parallel on Kie), then collected. The key is read from the environment only.
"""
import json, os, sys, time, urllib.request

KEY = os.environ['KIE_KEY']; API = 'https://api.kie.ai/api/v1/jobs'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)


def credits():
    req = urllib.request.Request('https://api.kie.ai/api/v1/chat/credit', headers={'Authorization': 'Bearer ' + KEY})
    with urllib.request.urlopen(req, timeout=60) as r: return json.load(r).get('data')


def main():
    spec = json.load(open(sys.argv[1])); only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
    out = os.path.join(ROOT, spec['out']); os.makedirs(out, exist_ok=True); style = spec.get('style', '')
    print('credits before', credits(), flush=True)
    queued = []
    for stem, aspect, prompt, n in spec['jobs']:
        if only and stem not in only: continue
        for i in range(1, n + 1):
            path = os.path.join(out, f'{stem}_{i}.png')
            if os.path.exists(path): continue
            try:
                r = call('/createTask', {'model': 'z-image', 'input': {'prompt': prompt + ' ' + style, 'aspect_ratio': aspect}})
                if r.get('code') != 200: raise RuntimeError(r)
                queued.append((path, r['data']['taskId'])); print('queued', stem, i, flush=True)
            except Exception as e: print('QUEUE FAIL', stem, i, repr(e)[:200], flush=True)
            time.sleep(.4)
    pending = dict(queued); t0 = time.time()
    while pending and time.time() - t0 < 900:
        time.sleep(6)
        for path, tid in list(pending.items()):
            try: d = call('/recordInfo?taskId=' + tid).get('data') or {}
            except Exception: continue
            st = (d.get('state') or '').lower()
            if st in ('success', 'succeeded'):
                res = d.get('resultJson'); res = json.loads(res) if isinstance(res, str) else res
                urllib.request.urlretrieve((res.get('resultUrls') or [])[0], path); del pending[path]; print('got', os.path.basename(path), flush=True)
            elif st in ('fail', 'failed'):
                del pending[path]; print('FAIL', os.path.basename(path), str(d.get('failMsg'))[:150], flush=True)
    for p in pending: print('TIMEOUT', os.path.basename(p))
    print('credits after', credits(), flush=True)


if __name__ == '__main__':
    main()
