"""Turns the raw clips in clips/ into 1080x1920 (9:16) frame sequences for the edit.

Put each clip in clips/ named by its storyboard slot, e.g. clips/01_bread.mp4, clips/03_mixing.mov.
Any extension ffmpeg reads works, and any orientation: horizontal clips are cropped to the centre
(or to the "focus" you set in clips/config.json). A slot with no clip gets a clearly labelled
placeholder cut from the storyboard, so the edit can still be previewed.

Optional clips/config.json: {"03": {"in": 2.5, "focus": 0.4}}  in = start second, focus = 0 (left) .. 1 (right)
Usage: python3 prepare.py
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).parent
CLIPS, WORK = ROOT / 'clips', ROOT / 'work'
FFMPEG = subprocess.run([sys.executable, '-c', 'import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())'],
                        capture_output=True, text=True).stdout.strip()
W, H, FPS = 1080, 1920, 30

# slot -> (seconds needed, storyboard panel box on reference/storyboard.webp, description)
SLOTS = {
    '01': (3.2, (0, 73, 382, 276), 'Bread torn apart, steam rising'),
    '02': (3.0, (386, 73, 766, 276), 'Flour, eggs, milk into the Artisan SE bowl'),
    '03': (7.2, (770, 73, 1151, 276), 'Artisan SE mixing dough, close-up'),
    '04': (3.8, (1154, 73, 1536, 276), 'Mum & daughter shaping dough on trays'),
    '05': (3.2, (0, 383, 382, 580), 'Loading trays into the 100L oven'),
    '06': (5.6, (386, 383, 766, 580), 'Inside the oven, pastries rising'),
    '07': (3.0, (1154, 383, 1536, 580), 'Family enjoying the fresh bakes'),
    '08': (4.8, None, 'Oven + mixer side by side in the kitchen'),   # falls back to the product photos
}
EXT = ('.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.mts')


def find_clip(slot):
    for p in sorted(CLIPS.iterdir()) if CLIPS.exists() else []:
        if p.name.startswith(slot) and p.suffix.lower() in EXT:
            return p
    return None


def probe_size(path):
    out = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    import re
    m = re.search(r'Video:.*?(\d{2,5})x(\d{2,5})', out)
    rot = re.search(r'rotation of (-?\d+)', out) or re.search(r'rotate\s*:\s*(-?\d+)', out)
    w, h = int(m.group(1)), int(m.group(2))
    if rot and abs(int(rot.group(1))) % 180 == 90:
        w, h = h, w
    return w, h


def extract(slot, clip, need, cfg):
    d = WORK / slot
    d.mkdir(parents=True, exist_ok=True)
    for f in d.glob('*.jpg'):
        f.unlink()
    w, h = probe_size(clip)
    s = max(W / w, H / h)
    sw, sh = round(w * s / 2) * 2, round(h * s / 2) * 2
    fx = cfg.get('focus', .5)
    x = int((sw - W) * min(1, max(0, fx)))
    y = int((sh - H) * min(1, max(0, cfg.get('focusY', .5))))
    vf = f'scale={sw}:{sh}:flags=lanczos,crop={W}:{H}:{x}:{y},fps={FPS},setsar=1'
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-ss', str(cfg.get('in', 0)), '-i', str(clip), '-t', str(need),
                    '-vf', vf, '-q:v', '3', str(d / 'f%04d.jpg')], check=True)
    n = len(list(d.glob('f*.jpg')))
    print(f'{slot}: {clip.name} -> {n} frames ({n / FPS:.1f}s of {need:.1f}s needed)')
    return {'mode': 'seq', 'n': n, 'file': clip.name}


def placeholder(slot, box, desc):
    d = WORK / slot
    d.mkdir(parents=True, exist_ok=True)
    sb = Image.open(ROOT / 'reference' / 'storyboard.webp').convert('RGB').crop(box)
    s = max(W / sb.width, H / sb.height)
    im = sb.resize((round(sb.width * s), round(sb.height * s)), Image.LANCZOS)
    im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    im = im.filter(ImageFilter.GaussianBlur(6))
    dr = ImageDraw.Draw(im, 'RGBA')
    dr.rectangle((0, 90, W, 250), fill=(0, 0, 0, 150))
    try:
        f1 = ImageFont.truetype('DejaVuSans-Bold.ttf', 44)
        f2 = ImageFont.truetype('DejaVuSans.ttf', 34)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    dr.text((60, 110), f'PLACEHOLDER: CLIP {slot} NEEDED', font=f1, fill=(255, 220, 90))
    dr.text((60, 180), desc, font=f2, fill=(255, 255, 255))
    im.save(d / 'still.jpg', quality=88)
    print(f'{slot}: no clip in clips/ -> storyboard placeholder')
    return {'mode': 'still', 'placeholder': True}


cfg_all = json.loads((CLIPS / 'config.json').read_text()) if (CLIPS / 'config.json').exists() else {}
manifest = {}
for slot, (need, box, desc) in SLOTS.items():
    clip = find_clip(slot)
    cfg = cfg_all.get(slot, {})
    if clip:
        manifest[slot] = extract(slot, clip, need, cfg)
    elif box:
        manifest[slot] = placeholder(slot, box, desc)
    else:
        manifest[slot] = {'mode': 'packshot'}
        print(f'{slot}: no clip -> product photos on a warm set')
(WORK / 'manifest.json').write_text(json.dumps(manifest, indent=1))
print('wrote', WORK / 'manifest.json')
