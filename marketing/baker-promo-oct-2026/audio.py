"""Synthesises the 15 s soundtrack for the Baker promo, hit-synced to the animation timeline.

120 BPM (beat = 0.5 s). Every sound is generated here - no samples, so no licensing issues.
Usage: python3 audio.py out/soundtrack.wav
"""
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 15.0
N = int(SR * DUR)
t_all = np.arange(N) / SR
rng = np.random.default_rng(3)

L = np.zeros(N)
R = np.zeros(N)
send = np.zeros(N)  # reverb send (mono)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(buf, start, x, gain=1.0):
    i = int(start * SR)
    if i >= N:
        return
    j = min(N, i + len(x))
    buf[i:j] += x[: j - i] * gain


def add(start, x, gain=1.0, pan=0.0, rev=0.0):
    lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    place(L, start, x, gain * lg * 1.414)
    place(R, start, x, gain * rg * 1.414)
    if rev:
        place(send, start, x, gain * rev)


def env(n, a, d, sustain=0.0, curve=6.0):
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / max(a, 1e-4))
    return e * (sustain + (1 - sustain) * np.exp(-np.maximum(0, tt - a) * curve / max(d, 1e-4)))


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def saw(freq, n, detune=0.0):
    ph = np.cumsum(np.full(n, freq * (1 + detune)) / SR) + rng.random()
    return 2 * (ph % 1) - 1


# ---------------- drums ----------------
def kick(big=False):
    n = int(SR * (0.9 if big else 0.45))
    tt = np.arange(n) / SR
    f = 42 + (160 if big else 130) * np.exp(-tt * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (3.2 if big else 7.5))
    click = hp(rng.standard_normal(n), 2000) * np.exp(-tt * 300) * 0.35
    return np.tanh((x + click) * 1.6)


def clap():
    n = int(SR * 0.35)
    tt = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        e += (tt >= off) * np.exp(-np.maximum(0, tt - off) * (120 if k < 2 else 16))
    return nz * e * 0.6


def hat(open_=False):
    n = int(SR * (0.22 if open_ else 0.06))
    tt = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-tt * (18 if open_ else 70)) * 0.35


def crash(length=2.2):
    n = int(SR * length)
    tt = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 4000) * np.exp(-tt * 2.2)
    return x * 0.5


def boom(length=1.6):
    n = int(SR * length)
    tt = np.arange(n) / SR
    f = 30 + 70 * np.exp(-tt * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.4)
    body = lp(rng.standard_normal(n), 900) * np.exp(-tt * 9) * 0.9
    return np.tanh((sub * 1.4 + body) * 1.5)


def whoosh(length, rising=True, lo=300, hi=6000):
    n = int(SR * length)
    tt = np.linspace(0, 1, n)
    nz = rng.standard_normal(n)
    a = lp(nz, lo)
    b = bp(nz, lo, hi)
    mix = tt if rising else 1 - tt
    shape = np.sin(np.pi * tt) ** 1.5
    return (a * (1 - mix) + b * mix) * shape * 0.8


def riser(length):
    n = int(SR * length)
    tt = np.linspace(0, 1, n)
    nz = rng.standard_normal(n)
    x = lp(nz, 1200) * (1 - tt) + hp(nz, 2500) * tt
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * tt ** 2) / SR) * 0.25
    return (x * 0.7 + tone) * tt ** 2


def tick(freq=2400, length=0.03):
    n = int(SR * length)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 180)


def blip(freq, length=0.18):
    n = int(SR * length)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * tt) + 0.3 * np.sin(4 * np.pi * freq * tt)) * np.exp(-tt * 22)


def bell(freq, length=2.2):
    n = int(SR * length)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 1.6), (2.76, .5, 3.5), (5.4, .28, 6), (8.9, .12, 9), (0.5, .25, 1.2)]:
        out += amp * np.sin(2 * np.pi * freq * ratio * tt) * np.exp(-tt * dec)
    return out * np.minimum(1, tt / 0.002) * 0.35


def pop(freq=520):
    n = int(SR * 0.16)
    tt = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-tt * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28)


def thud():
    n = int(SR * 0.5)
    tt = np.arange(n) / SR
    f = 55 + 90 * np.exp(-tt * 25)
    return np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)) + lp(rng.standard_normal(n), 500) * np.exp(-tt * 30) * .5


def clack():
    n = int(SR * 0.12)
    tt = np.arange(n) / SR
    return bp(rng.standard_normal(n), 1500, 6000) * np.exp(-tt * 90) + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 60) * .4


# ---------------- music ----------------
CHORDS = [  # (start, end, midi notes)
    (0.0, 2.0, [57, 60, 64, 71]),     # Am(add9) intro pad
    (2.0, 4.0, [57, 60, 64]),         # Am
    (4.0, 6.0, [53, 57, 60]),         # F
    (6.0, 8.0, [48, 52, 55]),         # C
    (8.0, 10.0, [55, 59, 62]),        # G
    (10.0, 11.0, [53, 57, 60]),       # F
    (11.0, 12.5, [55, 59, 62]),       # G
    (12.5, 15.0, [48, 52, 55, 59]),   # Cmaj7 resolve
]


def chord_at(t):
    for s, e, notes in CHORDS:
        if s <= t < e:
            return notes
    return CHORDS[-1][2]


# pad
pad = np.zeros(N)
for s, e, notes in CHORDS:
    n = int((e - s + 0.4) * SR)
    x = np.zeros(n)
    for nt in notes:
        f = midi(nt + 12)
        for dt in (-0.006, 0.0, 0.007):
            x += saw(f, n, dt)
    ee = env(n, 0.04 if s > 0 else 1.6, 3.0, 0.75, 1.0)
    rel = np.ones(n)
    rl = int(0.4 * SR)
    rel[-rl:] = np.linspace(1, 0, rl)
    place(pad, s, x * ee * rel * 0.05)
pad_dark = lp(pad, 500, 2)
pad_open = lp(pad, 4200, 2)
open_env = np.clip((t_all - 0.2) / 1.8, 0, 1) ** 2
open_env[t_all >= 2.0] = 0.55
open_env[(t_all >= 12.5)] = 0.8
pad_mix = pad_dark * (1 - open_env) + pad_open * open_env

# sidechain from kicks
kicks = [2.0 + 0.5 * i for i in range(int((12.25 - 2.0) / 0.5) + 1)] + [12.5 + 0.5 * i for i in range(4)]
duck = np.ones(N)
for k in kicks:
    i = int(k * SR)
    n = int(0.35 * SR)
    j = min(N, i + n)
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.7 * np.exp(-np.arange(j - i) / SR / 0.09))

add(0, pad_mix * duck, 1.0, 0.0, 0.35)

# bass (8ths)
bass = np.zeros(N)
for i in range(int((12.5 - 2.0) / 0.25)):
    st = 2.0 + i * 0.25
    root = chord_at(st + 1e-3)[0] - 24
    n = int(0.24 * SR)
    f = midi(root)
    x = saw(f, n) * 0.6 + np.sin(2 * np.pi * f * np.arange(n) / SR)
    place(bass, st, x * env(n, 0.005, 0.22, 0.5, 3))
for st in (12.5,):
    n = int(2.4 * SR)
    f = midi(36)
    x = saw(f, n) * 0.5 + np.sin(2 * np.pi * f * np.arange(n) / SR)
    place(bass, st, x * env(n, 0.005, 2.4, 0.0, 2.2))
bass = lp(bass, 700, 2)
add(0, bass * duck, 0.32)

# arpeggio pluck (16ths)
arp = np.zeros(N)
pattern = [0, 1, 2, 1, 2, 0, 1, 2]
for i in range(int((12.4 - 2.0) / 0.125)):
    st = 2.0 + i * 0.125
    notes = chord_at(st + 1e-3)
    nt = notes[pattern[i % len(pattern)] % len(notes)] + 24
    n = int(0.2 * SR)
    f = midi(nt)
    x = (saw(f, n) + saw(f, n, 0.004)) * 0.5
    place(arp, st, lp(x, 3500, 1) * env(n, 0.002, 0.16, 0, 5))
arp_env = np.clip((t_all - 2.0) / 1.0, 0, 1) * 0.9
add(0, arp * arp_env * duck, 0.07, 0.25, 0.3)

# ---------------- drums placement ----------------
for k in kicks:
    add(k, kick(), 0.85)
for i in range(int((12.25 - 2.0) / 0.5) + 1):
    add(2.25 + 0.5 * i, hat(open_=(i % 4 == 3)), 0.55, 0.3)
    add(2.0 + 0.5 * i + 0.125, hat(), 0.18, -0.3)
    add(2.0 + 0.5 * i + 0.375, hat(), 0.22, -0.3)
for i in range(int((12.0 - 2.5) / 1.0) + 1):
    add(2.5 + i * 1.0, clap(), 0.5, 0, 0.3)
# snare roll build 11.5 -> 12.4
tt = 11.5
step = 0.125
while tt < 12.4:
    k = (tt - 11.5) / 0.9
    add(tt, clap(), 0.2 + 0.35 * k, 0, 0.2)
    tt += step
    if tt > 11.99:
        step = 0.0625
# groove continues on end card
for i in range(4):
    add(12.75 + 0.5 * i, hat(), 0.4, 0.3)
for i in range(2):
    add(13.0 + i * 1.0, clap(), 0.35, 0, 0.3)

# ---------------- FX synced to picture ----------------
add(0.0, riser(1.0), 0.25, 0, 0.3)
for i in range(5):                          # letters rising
    add(0.18 + i * 0.07, whoosh(0.25, True, 800, 7000), 0.10, -0.6 + i * 0.3)
add(0.78, whoosh(0.24, True, 400, 8000), 0.35)
add(1.0, boom(), 0.8, 0, 0.4)                 # PROMO slam
add(1.0, crash(1.4), 0.35, 0.2, 0.3)
add(1.05, whoosh(0.5, False, 2000, 9000), 0.12, 0.4)
add(1.62, whoosh(0.5, True, 300, 7000), 0.45, -0.5)   # wipe
add(2.0, crash(2.4), 0.45, -0.2, 0.3)
add(2.0, boom(1.0), 0.5)
add(2.05, whoosh(0.6, False, 200, 3000), 0.25, 0.6)   # oven slides in
add(2.55, lp(rng.standard_normal(int(SR * 1.2)), 400) * np.sin(np.linspace(0, np.pi, int(SR * 1.2))) * 0.8, 0.35, 0.3)  # ignite
add(2.8, tick(3200, 0.02), 0.25, 0.4)          # lamp click
for i in range(20):                            # 100L counter ticks
    tt = 2.3 + (i / 20) ** 1.6 * 0.95
    add(tt, tick(1800 + i * 60), 0.12, -0.4)
add(3.25, pop(640), 0.4, -0.4, 0.2)            # "L"
add(3.35, pop(520), 0.22, -0.6)
add(3.47, pop(560), 0.22, -0.3)
for i in range(4):                             # callouts
    add(3.95 + i * 0.22, blip(midi(79 + [0, 3, 7, 10][i])), 0.16, 0.2 + i * 0.15, 0.4)
add(4.95, bell(midi(88)), 0.5, -0.2, 0.6)      # timer bell ring
add(5.12, bell(midi(88)), 0.3, -0.2, 0.6)
add(5.62, whoosh(0.7, True, 250, 9000), 0.5, 0.3)      # iris
add(6.05, whoosh(0.45, True, 150, 2000), 0.25)         # mixer falling
add(6.5, thud(), 0.75, -0.3, 0.2)
add(6.5, boom(0.8), 0.35)
for i in range(22):                            # 1500W counter ticks
    tt = 6.45 + (i / 22) ** 1.6 * 1.0
    add(tt, tick(2000 + i * 50), 0.10, 0.4)
add(6.98, clack(), 0.5, -0.3, 0.2)             # head locks down
# motor whir 7.0 -> 9.7
n = int(SR * 2.7)
tt = np.arange(n) / SR
f = 70 + 60 * np.clip(tt / 0.5, 0, 1)
ph = np.cumsum(f) / SR
motor = np.sign(np.sin(2 * np.pi * ph)) * 0.4 + np.sin(4 * np.pi * ph) * 0.4
motor = lp(motor, 900) * np.clip(tt / 0.3, 0, 1) * np.clip((2.7 - tt) / 0.3, 0, 1)
add(7.0, motor, 0.10, -0.4)
add(7.4, pop(700), 0.4, 0.4, 0.2)              # "W"
for i in range(3):
    add(7.55 + i * 0.14, pop(480 + i * 80), 0.28, 0.3 + i * 0.2)
add(9.45, whoosh(0.7, True, 250, 8000), 0.5, 0.5)       # wipe
add(10.0, crash(1.8), 0.35, 0.3, 0.3)
add(10.0, whoosh(0.5, False, 200, 3000), 0.3, -0.7)     # oven in
add(10.06, whoosh(0.5, False, 200, 3000), 0.3, 0.7)     # mixer in
add(10.3, pop(600), 0.35, 0, 0.3)               # plus
add(10.55, riser(0.45), 0.3)
add(11.0, boom(1.8), 0.9, 0, 0.4)               # INCREDIBLE VALUE
add(11.0, crash(2.2), 0.45, 0, 0.3)
spark = hp(rng.standard_normal(int(SR * 1.3)), 6000) * np.exp(-np.arange(int(SR * 1.3)) / SR * 3) * (rng.random(int(SR * 1.3)) > 0.97)
add(11.02, spark, 0.9, 0.2, 0.3)
add(11.4, riser(1.1), 0.45, 0, 0.2)             # build to end card
add(12.5, boom(2.0), 1.0, 0, 0.5)               # end-card hit
add(12.5, kick(big=True), 0.8)
add(12.5, crash(2.5), 0.5, 0, 0.4)
add(12.95, thud(), 0.45, 0.3, 0.3)              # PROMO stamp
add(13.3, pop(540), 0.3, 0.4, 0.3)              # CTA
add(13.75, whoosh(0.5, True, 3000, 12000), 0.12, 0.5)   # CTA shine
add(14.04, tick(4200, 0.02), 0.5, 0.5)          # click
for i, nt in enumerate([84, 88, 91, 96]):       # chime
    add(14.06 + i * 0.07, bell(midi(nt), 1.2), 0.22, 0.2 + i * 0.1, 0.6)

# ---------------- reverb + master ----------------
ir_n = int(SR * 2.0)
ir_t = np.arange(ir_n) / SR
irL = lp(rng.standard_normal(ir_n), 6000) * np.exp(-ir_t * 3.2)
irR = lp(rng.standard_normal(ir_n), 6000) * np.exp(-ir_t * 3.2)
irL[: int(0.012 * SR)] = 0
irR[: int(0.017 * SR)] = 0
sendf = hp(send, 250)
L += signal.fftconvolve(sendf, irL)[:N] * 0.035
R += signal.fftconvolve(sendf, irR)[:N] * 0.035

mix = np.stack([L, R], axis=1)
mix = np.stack([hp(mix[:, 0], 28), hp(mix[:, 1], 28)], axis=1)
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.8) / np.tanh(1.8)
fade = np.ones(N)
fade[: int(0.005 * SR)] = np.linspace(0, 1, int(0.005 * SR))
fl = int(0.6 * SR)
fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
mix *= fade[:, None]
mix *= 0.89 / np.max(np.abs(mix))

out = sys.argv[1] if len(sys.argv) > 1 else 'out/soundtrack.wav'
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out)
