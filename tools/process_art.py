"""Turn raw Z-Image output (assets/art/src) into game-ready art (assets/art/*).

- scenes, stadiums, facilities, people -> compressed WebP sized for phones
- shirt, trophies, medal               -> white background removed (flood fill from the edges), cropped PNG
- crest frames                         -> rim.png (empty centre cut out) + mask.png (just the centre), so clubs can be dyed in code
- emblems (white on black)             -> white silhouette with luminance as alpha
"""
import os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, 'assets/art/src'); OUT = os.path.join(ROOT, 'assets/art')
PICK = {  # which variant to ship
    'bg_menu': 2, 'bg_stands': 1, 'bg_page': 1, 'bg_office': 2, 'bg_tunnel': 1, 'bg_dressing': 1, 'bg_press': 1, 'bg_board': 1, 'bg_trophy': 2, 'card_match': 1,
    'st_giant': 1, 'st_large': 1, 'st_mid': 2, 'st_compact': 1, 'st_small': 2, 'st_nonleague': 1,
    'f_training': 1, 'f_academy': 2, 'f_scouting': 1, 'f_medical': 1, 'f_expansion': 1,
    'p_scout': 1, 'p_coach': 1, 'p_journalist': 1, 'p_chairman': 1, 'p_physio': 1, 'p_agent': 1,
}
FRAMES = {'crown': 'crestframe_1', 'star': 'frame_modern_1', 'pointed': 'frame_pointed_1', 'round': 'frame_round_1', 'winged': 'frame_winged_1', 'crown2': 'crestframe_2'}


def src(stem): return Image.open(os.path.join(SRC, stem + '.png')).convert('RGB')


def webp(stem, n, size, name, q=72):
    im = src(f'{stem}_{n}'); im.thumbnail(size, Image.LANCZOS); im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=q, method=6)


def flood(mask_ok, seeds):
    h, w = mask_ok.shape; seen = np.zeros((h, w), bool); q = deque()
    for y, x in seeds:
        if mask_ok[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask_ok[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
    return seen


def cut_white(im, tol=10):
    a = np.asarray(im).astype(int); h, w, _ = a.shape
    bg = a[2, 2]; near = (np.abs(a - bg).max(axis=2) <= tol)
    edge = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    out_bg = flood(near, edge)
    alpha = np.where(out_bg, 0, 255).astype(np.uint8)
    rgba = np.dstack([a.astype(np.uint8), alpha]); img = Image.fromarray(rgba, 'RGBA')
    return img.crop(img.getbbox())


def frame(stem, name):
    im = src(stem); im.thumbnail((360, 360), Image.LANCZOS); a = np.asarray(im).astype(int); h, w, _ = a.shape
    mx, mn = a.max(axis=2), a.min(axis=2); greyish = (mx - mn < 22) & (mx > 150) & (mx < 250)
    centre = flood(greyish, [(h // 2, w // 2), (int(h * .55), w // 2), (int(h * .45), w // 2)])
    whole = cut_white(im, 12); bbox = Image.fromarray(np.dstack([a.astype(np.uint8), np.full((h, w), 255, np.uint8)]), 'RGBA').getbbox()
    full = np.asarray(Image.fromarray(np.dstack([a.astype(np.uint8), np.asarray(cut_white_full(im, 12))]), 'RGBA'))
    rim = full.copy(); rim[centre, 3] = 0
    mask = np.zeros((h, w, 4), np.uint8); mask[..., :3] = 255; mask[centre, 3] = 255
    box = Image.fromarray(full, 'RGBA').getbbox()
    Image.fromarray(rim, 'RGBA').crop(box).save(os.path.join(OUT, f'crest_{name}_rim.png'), optimize=True)
    Image.fromarray(mask, 'RGBA').crop(box).save(os.path.join(OUT, f'crest_{name}_mask.png'), optimize=True)
    void = whole, bbox


def cut_white_full(im, tol):
    a = np.asarray(im).astype(int); h, w, _ = a.shape; bg = a[2, 2]; near = (np.abs(a - bg).max(axis=2) <= tol)
    edge = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    return Image.fromarray(np.where(flood(near, edge), 0, 255).astype(np.uint8), 'L')


def shirt_on_black(stem, name, sz):
    from scipy import ndimage
    a = np.asarray(src(stem)).astype(float); lum = a.mean(axis=2); fg = lum > 38
    lab, k = ndimage.label(fg); sizes = ndimage.sum(fg, lab, range(1, k + 1)); big = ndimage.binary_fill_holes(lab == (np.argmax(sizes) + 1))
    alpha = np.clip((lum - 20) * 255 / 45, 0, 255) * big
    im = Image.fromarray(np.dstack([a.astype(np.uint8), alpha.astype(np.uint8)]), 'RGBA'); im = im.crop(im.getbbox()); im.thumbnail((sz, sz), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.png'), optimize=True)


def emblem(stem, name):
    im = src(stem).convert('L'); im.thumbnail((256, 256), Image.LANCZOS); a = np.asarray(im).astype(float)
    alpha = np.clip((a - 40) * 255 / 170, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([np.full_like(alpha, 255)] * 3 + [alpha]), 'RGBA'); img = img.crop(img.getbbox())
    img.save(os.path.join(OUT, f'em_{name}.png'), optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    for stem, n in PICK.items():
        size = (720, 1280) if stem.startswith('bg_') else (512, 512) if stem.startswith('p_') else (960, 540)
        webp(stem, n, size, stem)
    for name, stem in FRAMES.items(): frame(stem, name)
    shirt_on_black('shirtk_1', 'shirt', 320)
    for stem, name, sz in [('tr_league_1', 'trophy_league', 360), ('tr_cup_1', 'trophy_cup', 360), ('tr_medal_1', 'trophy_medal', 300)]:
        im = src(stem); im.thumbnail((sz * 2, sz * 2), Image.LANCZOS); c = cut_white(im, 10 if stem.startswith('shirt') else 14); c.thumbnail((sz, sz), Image.LANCZOS); c.save(os.path.join(OUT, name + '.png'), optimize=True)
    for f in sorted(os.listdir(SRC)):
        if f.startswith('em_'): emblem(f[:-4], f[3:].rsplit('_', 1)[0])
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if os.path.isfile(os.path.join(OUT, f)))
    print('art ready', len([f for f in os.listdir(OUT) if os.path.isfile(os.path.join(OUT, f))]), 'files', round(total / 1024), 'KB')


if __name__ == '__main__':
    main()
