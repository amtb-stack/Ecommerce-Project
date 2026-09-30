"""Builds bold, cinematic 9:16 product plates for every storyboard slot, from the real product photos.

The photos are placed exactly as photographed (no colour changes): only the dark warm studio around them,
contact shadows, a faint floor reflection and background bokeh are drawn. Output goes to clips/NN_plate.jpg.
A real clip with the same slot number (e.g. clips/01_bread.mp4) sorts first and replaces the plate.
Usage: python3 make_plates.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).parent
A = ROOT.parent / 'baker-bundle-30s' / 'assets'
OUT = ROOT / 'clips'
W, H = 1080, 1920
rng = np.random.default_rng(3)

mixer = Image.open(A / 'mixer_red.webp').convert('RGBA')
oven = Image.open(A / 'oven_pair.webp').convert('RGBA')
ovenF = Image.open(A / 'oven_front.webp').convert('RGBA')
acc = [Image.open(A / f'acc_{n}.webp').convert('RGBA') for n in ('whisk', 'beater', 'hook')]


def studio(floor_y, light=(360, 520), warm=1.0):
    """Dark warm studio: spotlight on the back wall, a floor plane and soft bokeh."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - light[0]) / 900) ** 2 + ((y - light[1]) / 1100) ** 2)
    g = np.clip(1 - d, 0, 1) ** 1.6
    base = np.array([14, 10, 8], np.float32)
    lit = np.array([96, 62, 38], np.float32) * warm
    img = base + g[..., None] * lit
    fl = y >= floor_y
    fade = np.clip((y - floor_y) / 700, 0, 1)
    img[fl] = (img[fl] * .55 + np.array([30, 21, 15]) * .45) * (1 - .55 * fade[fl][..., None])
    edge = np.exp(-((y - floor_y) / 3) ** 2)[..., None] * 40 * g[..., None]
    img = np.clip(img + edge, 0, 255).astype(np.uint8)
    im = Image.fromarray(img, 'RGB').convert('RGBA')
    # bokeh
    bok = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    arr = np.zeros((H, W, 4), np.float32)
    for _ in range(18):
        cx, cy, r = rng.uniform(0, W), rng.uniform(80, floor_y - 120), rng.uniform(30, 110)
        a = rng.uniform(.05, .16)
        m = np.clip(1 - np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r, 0, 1) ** .6
        arr[..., :3] += m[..., None] * np.array([255, 196, 120]) * a
        arr[..., 3] += m * a * 255
    bok = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(6))
    im.alpha_composite(bok)
    return im


def place(bg, prod, x, y, w, floor_y=None, refl=.14, shadow=True):
    """Paste the product photo unchanged, with a contact shadow and a faint floor reflection."""
    h = round(prod.height * w / prod.width)
    p = prod.resize((w, h), Image.LANCZOS)
    if shadow:
        sh = Image.new('RGBA', (w + 200, 120), (0, 0, 0, 0))
        a = np.zeros((120, w + 200), np.float32)
        yy, xx = np.mgrid[0:120, 0:w + 200]
        a = np.clip(1 - np.sqrt(((xx - (w + 200) / 2) / ((w + 60) / 2)) ** 2 + ((yy - 60) / 22) ** 2), 0, 1) * 200
        sh.putalpha(Image.fromarray(a.astype(np.uint8)))
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        bg.alpha_composite(sh, (x - 100, y + h - 60))
    if refl and floor_y is not None:
        r = p.transpose(Image.FLIP_TOP_BOTTOM)
        ra = np.array(r.getchannel('A'), np.float32)
        ra *= np.linspace(refl, 0, r.height)[:, None] ** 1.0
        r.putalpha(Image.fromarray(ra.astype(np.uint8)))
        bg.alpha_composite(r, (x, y + h))
    bg.alpha_composite(p, (x, y))
    return bg


def crop_place(bg, prod, scale_w, cx_frac, cy_frac, sx, sy):
    """Macro: scale the photo to scale_w px wide and put photo point (cx_frac, cy_frac) at screen (sx, sy)."""
    h = round(prod.height * scale_w / prod.width)
    p = prod.resize((scale_w, h), Image.LANCZOS)
    bg.alpha_composite(p, (round(sx - cx_frac * scale_w), round(sy - cy_frac * h)))
    return bg


def save(im, name):
    OUT.mkdir(exist_ok=True)
    im.convert('RGB').save(OUT / name, quality=94)
    print('wrote', OUT / name)


# 01 hook: red mixer macro, head and bowl rim in a warm spotlight
save(place(studio(1083, (620, 520)), mixer, -120, 30, 1250, 1083), '01_plate.jpg')
# 02 the joy begins: the 10L stainless bowl, close
save(crop_place(studio(1600, (420, 700)), mixer, 2700, .30, .45, 600, 820), '02_plate.jpg')
# 03 mix more, stress less: full mixer hero
save(place(studio(1130, (540, 640)), mixer, 110, 360, 860, 1130), '03_plate.jpg')
# 04 more batches: the three attachments, bold and large
bg = studio(1180, (540, 620))
for im_, x, w in zip(acc, (70, 400, 770), (290, 300, 210)):
    place(bg, im_, x, 1150 - round(im_.height * w / im_.width), w, 1180, refl=.1)
save(bg, '04_plate.jpg')
# 05 ready for the next step: the 100L oven hero
save(place(studio(1110, (540, 620)), oven, 60, 1110 - round(oven.height * 960 / oven.width), 960, 1110), '05_plate.jpg')
# 06 bake with confidence: oven front, window and controls up close
save(crop_place(studio(1500, (500, 600)), ovenF, 1900, .42, .45, 560, 600), '06_plate.jpg')
# 07 better baking brings us together: the pair, warm and close
bg = studio(1100, (540, 600), 1.15)
ow = 600; oh = round(oven.height * ow / oven.width)
place(bg, oven, 30, 1100 - oh, ow, 1100)
mw = 420; mh = round(mixer.height * mw / mixer.width)
place(bg, mixer, 640, 1100 - mh, mw, 1100)
save(bg, '07_plate.jpg')
# 08 pair for the closing scenes: products lower, room for the title above
bg = studio(1150, (540, 760), 1.1)
place(bg, oven, 30, 1150 - oh, ow, 1150)
place(bg, mixer, 640, 1150 - mh, mw, 1150)
save(bg, '08_plate.jpg')
