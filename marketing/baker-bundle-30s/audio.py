"""Score + sound design + final mix for the 30 s "Better Together" film.

84 BPM (1 bar = 2.857 s), D major, warm acoustic lifestyle feel. Every sound is synthesised here, so there are
no samples and no licensing issues. The music builds one layer at a time, drops to solo piano for the
"starts it / finishes it" bar, blooms on the oven bell and resolves on "Better together".
Usage: python3 audio.py out/voiceover_30s_en.wav out/vo/chatter.wav out/mix.wav
"""
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR, DUR = 48000, 30.0
N = int(SR * DUR)
BAR = 60 / 84 * 4
BEAT = BAR / 4
rng = np.random.default_rng(11)
sos = lambda *a, **kw: signal.butter(*a, fs=SR, output='sos', **kw)
lp = lambda x, f, o=2: signal.sosfilt(sos(o, f, 'low'), x)
hp = lambda x, f, o=2: signal.sosfilt(sos(o, f, 'high'), x)
bp = lambda x, lo, hi, o=2: signal.sosfilt(sos(o, [lo, hi], 'band'), x)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


class Bus:
    def __init__(self):
        self.L, self.R = np.zeros(N), np.zeros(N)

    def add(self, start, x, gain=1.0, pan=0.0):
        i = int(start * SR)
        if i >= N or i + len(x) <= 0:
            return
        x = x[max(0, -i):]; i = max(0, i)
        j = min(N, i + len(x))
        self.L[i:j] += x[: j - i] * gain * np.cos((pan + 1) * np.pi / 4) * 1.414
        self.R[i:j] += x[: j - i] * gain * np.sin((pan + 1) * np.pi / 4) * 1.414


music, sfx = Bus(), Bus()


# ---------------- instruments ----------------
def piano(m, dur=2.2, vel=1.0):
    n = int(SR * dur); t = np.arange(n) / SR; f = hz(m)
    x = np.zeros(n)
    for h, a in enumerate([1, .45, .25, .12, .07, .04], 1):
        fh = f * h * np.sqrt(1 + .0004 * h * h)
        x += a * np.sin(2 * np.pi * fh * t + rng.random()) * np.exp(-t * (1.1 + .9 * h) * (1 + f / 1200))
    hammer = lp(rng.standard_normal(n), 1800) * np.exp(-t * 90) * .05
    x = (x + hammer) * np.minimum(1, t / .004) * vel
    return lp(x, 2600 + 900 * vel)  # felt: soft top end


def pluck(m, dur=1.4, bright=.5, decay=.996):  # Karplus-Strong nylon guitar / pizzicato
    n = int(SR * dur); p = int(SR / hz(m))
    buf = lp(rng.standard_normal(p), 1500 + 5000 * bright)
    out = np.zeros(n); b = buf.copy()
    for i in range(n):
        out[i] = b[i % p]
        b[i % p] = decay * .5 * (b[i % p] + b[(i + 1) % p])
    return lp(out, 3500) * np.minimum(1, np.arange(n) / SR / .002)


def ensemble(ms, dur, att=.8, rel=1.0, cutoff=1400, detune=.006):  # pad / strings
    n = int(SR * dur); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for d in (-detune, 0, detune):
            ph = np.cumsum(np.full(n, hz(m) * (1 + d)) * (1 + .002 * np.sin(2 * np.pi * 5 * t + rng.random() * 6))) / SR
            x += 2 * (ph % 1) - 1
    x = lp(x / (3 * len(ms)), cutoff, 2)
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (dur - t) / rel))
    return x * env


def bass(m, dur):
    n = int(SR * dur); t = np.arange(n) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)
    return x * np.minimum(1, t / .02) * np.exp(-t * .5) * np.minimum(1, np.maximum(0, (dur - t) / .15))


def brush():
    n = int(SR * .35); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 2500, 9000) * np.minimum(1, t / .03) * np.exp(-t * 11)


def softkick():
    n = int(SR * .4); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(48 + 60 * np.exp(-t * 30)) / SR) * np.exp(-t * 9)


def clap():
    n = int(SR * .3); t = np.arange(n) / SR; e = np.zeros(n)
    for off in (0, .009, .019):
        e += (t >= off) * np.exp(-np.maximum(0, t - off) * 60)
    return bp(rng.standard_normal(n), 1000, 4500) * (e + .3 * np.exp(-t * 14))


# ---------------- harmony (start bar, bass, chord tones) ----------------
CH = [
    (0.0, 38, [62, 66, 69, 74]),    # D
    (1.0, 37, [61, 64, 69, 73]),    # A/C#
    (2.0, 35, [59, 62, 66, 71]),    # Bm
    (3.0, 31, [59, 62, 67, 71]),    # G
    (4.0, 38, [62, 66, 69, 74]),    # D
    (5.0, 33, [61, 64, 69, 73]),    # A
    (6.0, 31, [59, 62, 67, 71]),    # G (half bar)
    (6.5, 28, [59, 62, 67, 71]),    # Em7 (solo piano: the realisation)
    (7.5, 31, [59, 62, 67, 74]),    # G  (full: the bell)
    (8.5, 33, [62, 64, 69, 73]),    # Asus -> A
    (9.5, 38, [62, 66, 69, 74]),    # D  (resolve on "together")
]
bars = [c[0] for c in CH] + [DUR / BAR]

for idx, (b0, root, tones) in enumerate(CH):
    b1 = bars[idx + 1]; t0, t1 = b0 * BAR, min(b1 * BAR, DUR)
    full = b0 >= 7.5
    # piano: bass note + broken chord (quarters for 2 bars, then eighths)
    step = BEAT if b0 < 2 or b0 == 6.5 else BEAT / 2
    music.add(t0, piano(root + 12, 3.2, .8), .5, -.15)
    pat = [0, 1, 2, 3, 2, 1, 2, 3]
    k, t = 0, t0
    while t < t1 - 1e-6:
        m = tones[pat[k % len(pat)]]
        if b0 == 8.5 and t >= t0 + BAR / 2 and m == 62:
            m = 61  # sus4 resolves to the 3rd
        music.add(t, piano(m + 12 * (b0 >= 7.5 and k % 4 == 3), 2.0, .55 + .12 * (k % 2 == 0)), .42, .15 * np.sin(k))
        t += step; k += 1
    if 2 <= b0 < 6.5 or full:   # nylon guitar on the offbeats
        t = t0 + BEAT / 2
        while t < t1 - 1e-6:
            music.add(t, pluck(tones[int((t - t0) / BEAT) % 4] - 12, 1.2, .35), .16, .35)
            t += BEAT
    if 2 <= b0 < 6.5 or full:   # brushed pulse + soft kick
        for q in range(int(round((t1 - t0) / BEAT))):
            tq = t0 + q * BEAT
            if q % 4 == 0: music.add(tq, softkick(), .35)
            music.add(tq + (BEAT / 2 if q % 2 else 0), brush(), .05 + .03 * (q % 2), .3)
    if 4 <= b0 < 6.5 or full:   # pad + bass
        music.add(t0, ensemble([m - 12 for m in tones[:3]], t1 - t0 + .6, 1.0, .8, 1100), .22)
        music.add(t0, bass(root, t1 - t0), .32)
    if 4 <= b0 < 6.5:           # pizzicato
        for q in range(int(round((t1 - t0) / BEAT))):
            music.add(t0 + q * BEAT, pluck(tones[(q * 2 + 1) % 4] + 12, .5, .8, .99), .1, -.35)
    if full:                    # strings + light claps at the peak
        top = {7.5: [74, 71, 67], 8.5: [76, 73, 69], 9.5: [78, 74, 69]}[b0]
        music.add(t0, ensemble(top, t1 - t0 + (1.5 if b0 == 9.5 else .5), .9 if b0 < 9.5 else .5, 1.2, 2200, .004), .2, .1)
        if b0 < 9.5:
            for q in (1, 3):
                for bb in range(int(round((t1 - t0) / BAR))):
                    music.add(t0 + bb * BAR + q * BEAT, clap(), .07, -.2)
music.add(29.25, piano(86, 2.5, .7), .45)   # final high D rings under the CTA

# music reverb
def reverb(L, R, dec=2.2, wet=.25, seed=5):
    r = np.random.default_rng(seed); tt = np.arange(int(dec * SR)) / SR; out = []
    for x in (L, R):
        ir = lp(r.standard_normal(len(tt)) * np.exp(-tt * 3.2), 6000)
        ir[: int(.02 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
        out.append(x + wet * signal.fftconvolve(x, ir)[:N])
    return out
music.L, music.R = reverb(music.L, music.R)


# ---------------- sound effects ----------------
def noise(d): return rng.standard_normal(int(SR * d))
def tvec(d): return np.arange(int(SR * d)) / SR
def fade(x, a=.05, r=.1):
    n = len(x); e = np.ones(n); ia, ir = int(a * SR), int(r * SR)
    e[:ia] = np.linspace(0, 1, ia); e[n - ir:] = np.linspace(1, 0, ir); return x * e


# S1 oven fan hum + crust crackle
t = tvec(2.9); sfx.add(0, fade(lp(noise(2.9), 220) * .6 + .15 * np.sin(2 * np.pi * 100 * t), .01, .4), .10)
for c in rng.uniform(.1, 2.7, 22):
    x = hp(noise(.02), 1500) * np.exp(-tvec(.02) * 250); sfx.add(c, x, rng.uniform(.03, .08), rng.uniform(-.6, .6))
# S2 flour whoosh + egg crack
t = tvec(1.2); sfx.add(3.0, fade(bp(noise(1.2), 400, 3000) * np.sin(np.pi * t / 1.2) ** 2, .05, .2), .06, -.2)
t = tvec(.12); sfx.add(3.7, hp(noise(.12), 900) * np.exp(-t * 60) + .5 * np.sin(2 * np.pi * 180 * t) * np.exp(-t * 80), .1, .2)
# S3 mixer motor spin-up (real recording recommended) + kneading thuds
d = 2.7; t = tvec(d); f = 35 + 55 * (1 - np.exp(-t * 2.5)); ph = np.cumsum(f) / SR
motor = np.sign(np.sin(2 * np.pi * ph)) * .5 + np.sin(2 * np.pi * 3 * ph) * .3
sfx.add(5.8, fade(lp(motor, 900) + .15 * lp(noise(d), 1200), .25, .6), .05)
for tq in (6.43, 7.86):
    t = tvec(.3); sfx.add(tq, np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18) + .2 * lp(noise(.3), 600) * np.exp(-t * 25), .14)
# S4 attachment "tinks" on the beats (tuned to A, D, F#)
for i, (tq, m) in enumerate(zip((3 * BAR, 3 * BAR + BEAT, 3 * BAR + 2 * BEAT), (81, 86, 90))):
    t = tvec(1.2); f = hz(m)
    x = np.sin(2 * np.pi * f * t + 1.8 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 8)) * np.exp(-t * 4.5)
    sfx.add(tq, x, .06, (i - 1) * .4)
# S5 tray slide + door thunk
t = tvec(.9); sfx.add(12.0, fade(bp(noise(.9), 1800, 6000) * (.5 + .5 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * t / .9), .02, .15), .05, .3)
t = tvec(.5); sfx.add(13.8, np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-t * 25)) / SR) * np.exp(-t * 12) + .25 * lp(noise(.5), 500) * np.exp(-t * 30), .22)
# S6 knob ratchet, element tick, warm-up hum
for i in range(4):
    t = tvec(.03); sfx.add(14.6 + i * .08, bp(noise(.03), 2000, 7000) * np.exp(-t * 200), .12, .4)
t = tvec(.05); sfx.add(15.2, hp(noise(.05), 3000) * np.exp(-t * 120), .08, .2)
t = tvec(3.3); sfx.add(15.2, fade(lp(noise(3.3), 180) + .2 * np.sin(2 * np.pi * 100 * t), .6, .5), .08)
# S7 rotary swish + fan whirr
t = tvec(.6); sfx.add(18.6, fade(bp(noise(.6), 700, 2500) * np.sin(np.pi * t / .6), .02, .1), .05, .4)
t = tvec(1.45); sfx.add(20.0, fade(bp(noise(1.45), 300, 1400) * (1 + .4 * np.sin(2 * np.pi * 14 * t)), .15, .2), .05, -.3)
# S8 THE BELL: two-stroke timer bell
for k2, tb in enumerate((21.6, 21.78)):
    t = tvec(2.5); f = 2350
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dd) for r, a, dd in ((1, 1, 1.6), (2.76, .35, 3), (5.4, .15, 5), (.5, .2, 2)))
    sfx.add(tb, x * np.minimum(1, t / .001), .09 if k2 == 0 else .05, .15)
# plates clinking softly in the family scene
for tq, g in ((22.9, .03), (23.55, .025)):
    t = tvec(.6); f = rng.uniform(2800, 3600)
    sfx.add(tq, np.sin(2 * np.pi * f * t) * np.exp(-t * 14) + .5 * np.sin(2 * np.pi * f * 1.51 * t) * np.exp(-t * 20), g, rng.uniform(-.5, .5))
# S9 shimmer under the light sweep
t = tvec(1.4); sh = sum(np.sin(2 * np.pi * hz(m) * t) for m in (86, 90, 93, 98)) / 4
sfx.add(24.7, sh * np.sin(np.pi * t / 1.4) ** 2, .03, 0)
# S10 soft CTA chime (A5 -> D6)
for tq, m in ((28.05, 81), (28.2, 86)):
    t = tvec(1.5); sfx.add(tq, np.sin(2 * np.pi * hz(m) * t) * np.exp(-t * 3) * np.minimum(1, t / .002), .06, .2)
sfx.L, sfx.R = reverb(sfx.L, sfx.R, 1.2, .15, 9)


# ---------------- mix ----------------
def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / 32768.0
    if x.ndim == 1: x = np.stack([x, x], 1)
    if sr != SR: x = signal.resample_poly(x, SR, sr, axis=0)
    out = np.zeros((N, 2)); out[: min(N, len(x))] = x[:N]; return out


vo, chat = load(sys.argv[1]), load(sys.argv[2])
# duck music ~8 dB under the voice
env = np.abs(vo).mean(1)
env = signal.sosfilt(sos(1, 4, 'low'), env)
env = np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)
duck = 1 - .6 * env
m = np.stack([music.L, music.R], 1) / (np.max(np.abs(music.L)) + 1e-9)
s = np.stack([sfx.L, sfx.R], 1)
mix = .55 * m * duck[:, None] + 2.0 * s + .95 * vo + .5 * chat
tail = np.ones(N); tail[-int(.35 * SR):] = np.linspace(1, 0, int(.35 * SR)) ** 2
mix *= tail[:, None]
mix *= .9 / np.max(np.abs(mix))
wavfile.write(sys.argv[3], SR, (mix * 32767).astype(np.int16))
print('wrote', sys.argv[3])
