# The Baker Bundle Promo: 15 s video (Shopee, October 2026)

A 15-second bundle promo for the **100L Electric Oven (ESMX-100P)** + **10L Stand Mixer (Artisan SE)**. It uses the real product photos and logo, in the brand palette of **dark red, black and white**.

| File | What it is |
|---|---|
| `out/TheBakerPromo_1080p60.mp4` | Master: 1920×1080, 60 fps, H.264 + AAC |
| `out/TheBakerPromo_Shopee_720p30.mp4` | Shopee upload copy: 1280×720, 30 fps, small file |
| `out/TheBakerPromo_poster.jpg` | Cover / thumbnail (end card) |

## Concept: one continuous take, "tap to explore"

There are no slides or page cuts. A virtual camera flies through a single dark-red studio where both products stand on a reflective floor, and a finger taps hotspots on the real photos to reveal each feature, like an interactive product viewer.

| Time | What happens | Copy |
|---|---|---|
| 0.0–2.0 s | Red light streak. The chef-hat icon pops, the wordmark wipes in and a light glints across it. The **BUNDLE PROMO** stamp slams down, then the camera flies *through* the logo into the studio | *Bake bigger · Mix stronger* |
| 2.0–5.4 s | Oven. **100L** counts up. Tap the window: the M-shape elements glow, the interior light flickers on and heat spills onto the floor. Tap the knob: it turns, and the gauge counts 70→**250 °C**. Tap the timer: **120 MIN**, and the bell rings. Tap the fan: rotisserie + convection. Double-layer glass door | *Family-size · Whole roasts. Multiple trays. One go.* |
| 5.4–6.0 s | Whip-pan with motion blur | **WHY STOP AT ONE?** |
| 6.0–9.6 s | The mixer drops in with a flour puff. Tap the speed dial: power rings, and **1500W** counts up. Tap the bowl: **10L** and **1.5 KG max**. The 3 attachments burst out of the bowl and orbit. Tap the swatches: a live red ⇄ metal-gray colour swap. Spec card: 472×272×380 mm · 7.9 kg · 220–240V 50/60Hz | *Of pure mixing muscle · Ready for any recipe* |
| 9.6–12.4 s | Camera pulls back to both products | **BETTER TOGETHER → THE BAKER BUNDLE** · *Buy 2 · Save more* · *100L oven + 10L mixer. One unbeatable bundle.* · stamp **BUY 2 · GET MORE VALUE** |
| 12.4–15 s | End card. The finger taps the CTA | **ONE KITCHEN. TWO LEGENDS.** · **GRAB THE BUNDLE ON SHOPEE** · *October 2026 · Limited time only* |

The soundtrack (`audio.py`) is synthesised, so it contains no licensed samples. It runs at 120 BPM, with a sound for every tap, knob click, the heat whoosh, the timer bell, the whip-pan, the mixer landing, the motor, the colour-swap shimmer, the stamp boom and the CTA chime.

## Editing & re-rendering

* **Prices:** none were supplied, so none are shown. Set `bundlePrice` / `normalPrice` in the `CONFIG` block in `index.html`. The stamp then reads `BUNDLE RM…` and the end card shows the struck-through "was" price.
* **CTA / campaign line:** `CONFIG.cta`, `CONFIG.campaign`.
* **Assets:** `assets/` holds trimmed WebP copies of the photos at the repo root (`_OEK6149.png` oven, `SM-A02 RED/METAL GRAY` mixers, `A02配件*.png` attachments) and a white logo cut from `The Baker 2019 new logo.jpg`.
* **Preview:** run `npx http-server` in this folder and open `index.html?t=7.5` to freeze on any moment (it has to be served over HTTP, not opened as a file).

```bash
pip install numpy scipy imageio-ffmpeg pillow   # plus Node 18+ with the `playwright` package
export FFMPEG=$(python3 -c "import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())")
python3 audio.py out/soundtrack.wav
node render.cjs --fps 60 --workers 4             # -> out/video_noaudio.mp4
$FFMPEG -i out/video_noaudio.mp4 -i out/soundtrack.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out/TheBakerPromo_1080p60.mp4
```
