"""Builds the 30 s English voiceover (voice only) for the TikTok storyboard cut, timed to the edit.

Uses the Kokoro TTS model (af_heart: warm, natural English female),
then a light EQ, gentle compression and a small room. Also writes a quiet "family in the kitchen" chatter stem for S8.
Usage: python3 voiceover.py <kokoro-v1.0.onnx> <voices-v1.0.bin> out/voiceover_30s_en.wav
Model files: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
"""
import sys
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro
from scipy import signal
from scipy.io import wavfile

SR, DUR = 48000, 30.0
VOICE, LANG = 'af_heart', 'en-us'
LINES = [  # (start s, text, speed): storyboard VO, trimmed to fit 30 s
    (0.25, 'Every great bake starts with a simple idea.', 1.0),
    (3.05, 'The joy begins long before the oven.', 1.0),
    (5.75, 'When everything flows, baking becomes something you look forward to.', 1.0),
    (9.55, 'More done in one go. Less repeating the same steps.', 1.0),
    (13.05, "And when it's time to bake, everything is ready.", 1.0),
    (18.10, 'One prepares the bake. One brings it to life.', 1.0),
    (21.10, 'Because the best part of baking is sharing it.', 1.0),
    (23.70, 'The oven and the mixer. Better together.', 1.0),
    (26.05, 'A complete setup. More value together.', 1.0),
    (28.45, 'Shop now on Shopee Mall.', 1.0),
]
CHATTER = [  # (start s, text, voice, lang, gain, pan): family at the table, S8
    (20.92, 'Wah!', 'af_sky', 'en-us', .5, -.4),
    (22.20, 'Mmm, still warm!', 'bf_lily', 'en-gb', .2, .5),
    (23.10, 'Can I have another one?', 'af_nicole', 'en-us', .16, -.6),
]

onnx, voices, out = sys.argv[1:4]
k = Kokoro(onnx, voices)


def tts(text, voice, lang, speed):
    a, sr = k.create(text, voice=voice, speed=speed, lang=lang)
    a = signal.resample_poly(np.asarray(a, dtype=np.float64), SR, sr)
    idx = np.where(np.abs(a) > .01 * np.max(np.abs(a)))[0]
    return a[max(0, idx[0] - 200): idx[-1] + 2400]


N = int(DUR * SR)
dry = np.zeros(N)
end = 0
for start, text, speed in LINES:
    a = tts(text, VOICE, LANG, speed)
    i = int(start * SR)
    if i < end:
        print(f'WARNING: "{text}" overlaps the previous line by {(end - i) / SR:.2f}s')
    j = min(N, i + len(a))
    dry[i:j] += a[: j - i]
    end = j
    print(f'{start:6.2f}-{j / SR:6.2f}s  {text}')
if end / SR > DUR - .1:
    print(f'WARNING: voice runs to {end / SR:.2f}s')

# tone: high-pass, a little warmth, tame 3 kHz edge, gentle compression
sos = lambda *a, **kw: signal.butter(*a, fs=SR, output='sos', **kw)
dry = signal.sosfilt(sos(2, 80, 'high'), dry)
dry = dry + .35 * signal.sosfilt(sos(2, [150, 400], 'band'), dry) - .2 * signal.sosfilt(sos(2, [2800, 4500], 'band'), dry)
dry /= np.max(np.abs(dry)) + 1e-9
dry = np.tanh(dry * 1.4) / np.tanh(1.4)

# small warm room (0.6 s)
rng = np.random.default_rng(4)
tt = np.arange(int(.6 * SR)) / SR
irs = []
for _ in range(2):
    x = rng.standard_normal(len(tt)) * np.exp(-tt * 9)
    x = signal.sosfilt(sos(2, 4500, 'low'), x)
    x[: int(.012 * SR)] = 0
    irs.append(x / np.sqrt(np.sum(x ** 2)))
mix = np.stack([dry + .08 * signal.fftconvolve(dry, irs[0])[:N], dry + .08 * signal.fftconvolve(dry, irs[1])[:N]], axis=1)
mix *= .89 / np.max(np.abs(mix))
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out)

# chatter stem: distant, low-passed, roomy
ch = np.zeros((N, 2))
for start, text, voice, lang, g, pan in CHATTER:
    a = tts(text, voice, lang, 1.05)
    a = signal.sosfilt(sos(2, [250, 3200], 'band'), a) * g / (np.max(np.abs(a)) + 1e-9)
    i = int(start * SR); j = min(N, i + len(a))
    ch[i:j, 0] += a[: j - i] * np.cos((pan + 1) * np.pi / 4)
    ch[i:j, 1] += a[: j - i] * np.sin((pan + 1) * np.pi / 4)
for c in range(2):
    ch[:, c] += .35 * signal.fftconvolve(ch[:, c], irs[c])[:N]
stem = Path(out).parent / 'vo' / 'chatter.wav'
stem.parent.mkdir(exist_ok=True)
wavfile.write(stem, SR, (np.clip(ch, -1, 1) * 32767).astype(np.int16))
print('wrote', stem)
