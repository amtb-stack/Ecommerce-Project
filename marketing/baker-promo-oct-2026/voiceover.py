"""Builds the 40 s guide voiceover (voice only) from the VOICEOVER_SCRIPT.md timings.

Each line is synthesised with Piper TTS; lines are laid back-to-back with natural pauses and one
global pitch-preserving `atempo` makes the read fill an exact 40.0 s track.
Usage: python3 voiceover.py <piper-voice.onnx> out/voiceover_40s_en.wav
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 40.0
LINES = [  # (start, end, text): keep in sync with VOICEOVER_SCRIPT.md
    (0.3, 3.5, "Love baking at home? Then this is the deal you've been waiting for."),
    (3.8, 6.3, "Introducing, The Baker Bundle Promo!"),
    (6.6, 12.4, "First, a massive one-hundred-litre electric oven. Big enough for whole roasts and multiple trays, "
                "with heat from seventy, all the way up to two hundred and fifty degrees."),
    (12.6, 17.8, "Twin M-shaped stainless steel elements. Rotisserie and convection, for a crisp, even finish. "
                 "A one-hundred-and-twenty-minute timer with bell, and a double-layer glass door."),
    (18.2, 19.7, "But why stop at one?"),
    (20.0, 27.3, "Add the Artisan S E stand mixer. Fifteen hundred watts of power, a ten-litre stainless bowl, "
                 "and room for up to one point five kilos of dough. Whisk, beat, or knead, it handles it all."),
    (27.7, 33.2, "Together, they're your complete home bakery. Buy both in one bundle, and get so much more value."),
    (33.7, 39.6, "The Baker Bundle. Only on Shopee, this October. Grab yours, before it's gone!"),
]

voice, out = sys.argv[1:3]
ffmpeg = subprocess.run([sys.executable, '-c', 'import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())'],
                        capture_output=True, text=True).stdout.strip()


def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim > 1:
        x = x.mean(axis=1)
    return signal.resample_poly(x, SR, sr) if sr != SR else x


def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr * np.max(np.abs(x)))[0]
    return x[max(0, idx[0] - 200): idx[-1] + 2400] if len(idx) else x


N = int(DUR * SR)
GAPS = [0.35, 0.45, 0.45, 0.35, 0.55, 0.45, 0.45, 0.55]   # pause before each line (breaths / beat changes)
TAIL = 0.6                                                # silence left at the end
with tempfile.TemporaryDirectory() as td:
    clips = []
    for k, (_, _, text) in enumerate(LINES):
        raw = Path(td) / f'l{k}.wav'
        subprocess.run([sys.executable, '-m', 'piper', '-m', voice, '-f', str(raw), '--length-scale', '0.95',
                        '--sentence-silence', '0.15'], input=text, text=True, check=True, capture_output=True)
        clips.append(trim(load(raw)))
    speech = sum(len(c) for c in clips) / SR
    tempo = speech / (DUR - sum(GAPS) - TAIL)   # one global, pitch-preserving tempo so the read fills 40 s evenly
    print(f'natural speech {speech:.2f}s -> tempo x{tempo:.3f}')
    if abs(tempo - 1) > 0.01:
        for k, c in enumerate(clips):
            src, fast = Path(td) / f's{k}.wav', Path(td) / f'f{k}.wav'
            wavfile.write(src, SR, (c * 32767).astype(np.int16))
            subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(src), '-filter:a', f'atempo={tempo:.4f}', str(fast)], check=True)
            clips[k] = trim(load(fast))
vo = np.zeros(N)
pos = 0.0
for (_, _, text), gap, c in zip(LINES, GAPS, clips):
    pos += gap
    i = int(pos * SR)
    j = min(N, i + len(c))
    vo[i:j] += c[: j - i]
    print(f'{pos:5.2f}-{pos + len(c) / SR:5.2f}s  {text}')
    pos += len(c) / SR

# polish: high-pass, presence lift, gentle saturation-compression, -1 dBFS peak
vo = signal.sosfilt(signal.butter(2, 90, 'high', fs=SR, output='sos'), vo)
vo = vo + 0.3 * signal.sosfilt(signal.butter(2, [2500, 6000], 'band', fs=SR, output='sos'), vo)
vo /= np.max(np.abs(vo)) + 1e-9
vo = np.tanh(vo * 2.0) / np.tanh(2.0) * 0.89
wavfile.write(out, SR, (np.stack([vo, vo], axis=1) * 32767).astype(np.int16))
print('wrote', out, f'{N / SR:.1f}s')
