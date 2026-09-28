"""Builds the 40 s cinematic-trailer guide voiceover (voice only) from VOICEOVER_SCRIPT.md.

Piper TTS reads each fragment slowly; every "…" in the script becomes a real, timed pause.
The voice is then pitched down ~5 semitones with formants preserved (deep but human), slowed, warmed with EQ, gently compressed
and placed in a hall reverb for a "movie trailer narrator" feel.
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
PAUSE = 0.75  # length of each "…" pause
LINES = [  # (start time, text with "…" pauses): keep in sync with VOICEOVER_SCRIPT.md
    (0.5, "In every kitchen…"),
    (3.3, "there comes a moment… when one is simply not enough."),
    (9.0, "A one-hundred-litre oven."),
    (12.0, "Two hundred and fifty degrees… of pure heat."),
    (17.4, "And beside it…"),
    (19.5, "fifteen hundred watts… of power."),
    (24.0, "Together… they are unstoppable."),
    (28.5, "Buy both. And get so much more."),
    (33.0, "Welcome… to The Baker Bundle."),
    (37.0, "Only on Shopee."),
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
    return x[max(0, idx[0] - 200): idx[-1] + 3000] if len(idx) else x


def say(text, td, k):
    raw, deep = Path(td) / f'r{k}.wav', Path(td) / f'd{k}.wav'
    subprocess.run([sys.executable, '-m', 'piper', '-m', voice, '-f', str(raw), '--length-scale', '1.45',
                    '--noise-scale', '0.72', '--noise-w-scale', '0.9', '--sentence-silence', '0.35'],
                   input=text, text=True, check=True, capture_output=True)
    # deeper + slower, still human: a slight formant drop (bigger chest), then a formant-preserving
    # pitch shift down and a 15% slower tempo via Rubber Band
    subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(raw), '-af',
                    'asetrate=22050*0.93,aresample=48000,'
                    'rubberband=pitch=0.74:tempo=0.92:formant=preserved:pitchq=quality:transients=smooth:window=long',
                    str(deep)], check=True)
    return trim(load(deep))


N = int(DUR * SR)
dry = np.zeros(N)
pos = 0.0
with tempfile.TemporaryDirectory() as td:
    k = 0
    for start, text in LINES:
        pos = max(start, pos + 0.4)   # never overlap: push later if the previous line ran long
        t0 = pos
        frags = [f.strip() for f in text.split('…') if f.strip()]
        for fi, frag in enumerate(frags):
            clip = say(frag, td, k)
            k += 1
            i = int(pos * SR)
            j = min(N, i + len(clip))
            dry[i:j] += clip[: j - i]
            pos += len(clip) / SR + (PAUSE if fi < len(frags) - 1 else 0)
        print(f'{t0:5.2f}-{pos:5.2f}s  {text}')
if pos > DUR - 0.3:
    print(f'WARNING: voice runs to {pos:.2f}s')

# tone: high-pass rumble, warm low-mid body, tame harshness, a little air
dry = signal.sosfilt(signal.butter(2, 70, 'high', fs=SR, output='sos'), dry)
body = signal.sosfilt(signal.butter(2, [110, 320], 'band', fs=SR, output='sos'), dry)
harsh = signal.sosfilt(signal.butter(2, [2500, 5000], 'band', fs=SR, output='sos'), dry)
dry = dry + 0.55 * body - 0.35 * harsh
dry /= np.max(np.abs(dry)) + 1e-9
dry = np.tanh(dry * 1.6) / np.tanh(1.6)  # gentle compression

# hall reverb (stereo, 2.6 s decay, pre-delay 35 ms)
rng = np.random.default_rng(7)
irn = int(2.6 * SR)
tt = np.arange(irn) / SR
ir = []
for _ in range(2):
    x = rng.standard_normal(irn) * np.exp(-tt * 2.6)
    x = signal.sosfilt(signal.butter(2, 5000, 'low', fs=SR, output='sos'), x)
    x[: int(0.035 * SR)] = 0
    ir.append(x / np.sqrt(np.sum(x ** 2)))
wetL = signal.fftconvolve(dry, ir[0])[:N]
wetR = signal.fftconvolve(dry, ir[1])[:N]
mix = np.stack([dry + 0.22 * wetL, dry + 0.22 * wetR], axis=1)
fade = np.ones(N)
fade[-int(0.5 * SR):] = np.linspace(1, 0, int(0.5 * SR))
mix *= fade[:, None]
mix *= 0.89 / np.max(np.abs(mix))
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out, f'{N / SR:.1f}s')
