# The Baker Promo: 15 s motion graphics (Shopee, October 2026)

A 15-second promo for the **100L Electric Oven (ESMX-100P)** + **10L Stand Mixer (Artisan SE)** bundle.

| File | What it is |
|---|---|
| `out/TheBakerPromo_1080p60.mp4` | Master: 1920×1080, 60 fps, H.264 + AAC. Use for YouTube, Facebook, and screens. |
| `out/TheBakerPromo_Shopee_720p30.mp4` | Upload copy: 1280×720, 30 fps. Small enough for Shopee's product-video limit (≤ 30 MB). |
| `out/TheBakerPromo_poster.jpg` | Thumbnail/cover, taken from the end card. |

## Storyboard (120 BPM, cuts land on the beat)

| Time | Scene | Content |
|---|---|---|
| 0.0 – 2.0 s | Intro | "The **BAKER**" letter reveal, "PROMO" stamp slam, *Bake bigger · Mix stronger* |
| 2.0 – 6.0 s | 01 The Oven | Oven flies in. The **100L** counter runs, the elements heat up, the lamp flickers on, the fan and rotisserie turn. The temperature gauge sweeps **70→250 °C**, the **120-min timer** fills and the bell rings. Callouts: interior light, 2× "M" stainless heating elements, double-layer glass door, rotisserie + convection |
| 6.0 – 10.0 s | 02 The Mixer | Iris wipe to cream. The mixer drops in, its head locks and the whisk spins up. **1500W** counter with a power meter. Cards: **10L** bowl, **1.5KG** max capacity, **7.9KG** build. Dimension lines 472 × 380 mm (W 272 mm). Spec ticker: 220–240V · 50/60Hz · 8.5 kg gross |
| 10.0 – 12.5 s | 03 The Bundle | Oven **+** mixer, "2 POWERHOUSES. 1 INCREDIBLE DEAL." and an **INCREDIBLE VALUE** stamp with a confetti burst |
| 12.5 – 15.0 s | 04 End card | The Baker PROMO lockup, "SHOP NOW ON SHOPEE" CTA with a cursor click, OCTOBER 2026 |

The soundtrack is synthesised in `audio.py`, so it contains no licensed samples. Hits are synced to the picture: the stamp booms, a tick for each counter step, the timer bell, the mixer landing, the head clack, the motor whir and the CTA click.

## Editing & re-rendering

Everything is code, so any text, timing or colour can be changed and the video re-rendered.

* **Prices:** none were supplied, so none are shown. Set `bundlePrice` / `normalPrice` in the `CONFIG` block at the top of the `<script>` in `index.html`. The bundle stamp then shows the price, and the end card adds a struck-through "was" price.
* **CTA / campaign line:** set `CONFIG.cta` and `CONFIG.campaign`.
* **Live preview:** open `index.html` in Chrome and it loops in real time. Add `?t=7.5` to freeze on any moment.

```bash
pip install numpy scipy imageio-ffmpeg        # plus Node 18+ with the `playwright` package
export FFMPEG=$(python3 -c "import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())")
python3 audio.py out/soundtrack.wav
node render.cjs --fps 60 --workers 4           # -> out/video_noaudio.mp4
$FFMPEG -i out/video_noaudio.mp4 -i out/soundtrack.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/TheBakerPromo_1080p60.mp4
```

The products are drawn as vector illustrations in `index.html` (`ovenSVG()` / `mixerSVG()`) because no product photos were supplied. The mixer colour (red) is a stylistic choice. Swap it in the `mxBody`/`mxBase` gradients to match the actual unit.
