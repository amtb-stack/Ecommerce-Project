# The Baker "Better Together": 30 s bundle film (9:16)

This is a 30-second premium lifestyle film for **The Baker 100L Oven + Artisan SE 10L Stand Mixer** (The Baker Official Store, Shopee Mall). It's built from the product photos in this repo, in the warm style of the reference storyboard: cream and golden light, italic serif lines, a script "Better Together" and a calm 84 BPM pace. The creative direction is in [`CREATIVE_DIRECTION.md`](CREATIVE_DIRECTION.md).

| File | What it is |
|---|---|
| `out/TheBaker_BetterTogether_30s_1080x1920.mp4` | Master: 1080×1920, 30 fps, H.264 + AAC, −14 LUFS |
| `out/TheBaker_BetterTogether_30s_Shopee_720x1280.mp4` | Lighter upload copy, 720×1280 |
| `out/TheBaker_BetterTogether_30s_poster.jpg` | Cover / thumbnail (end card) |
| `out/voiceover_30s_en.wav` | Guide voiceover on its own, timed to the edit |

## Product fidelity

The oven and mixer appear **exactly as photographed**: no colour grading, tints, stretching or moving parts. Only the room around them (wall, counter, window light, shadows) and the camera are animated. Four lighting touches are layered on top:
* **Window light sweep:** a soft white light passes across the products (S2, S3, S6 and one pass across both in S9).
* **Dial glint:** a small moving glint on the mixer's chrome dial ring (S7a).
* **Interior light:** the oven's interior glows through the glass when it's "on". To keep the window exactly as photographed, set `ovenGlow: false` in `CONFIG` (`index.html`) and re-render.
* **Fan glow:** an amber fan-light pattern behind the glass in the S7b close-up. It's part of the same interior light, so `ovenGlow: false` removes it too.

## Timeline (84 BPM, cuts on the bar)

| Time | Shot | On screen | VO |
|---|---|---|---|
| 0.0–2.9 | Oven window glowing | *A great bake starts…* | A great bake starts, long before the oven… |
| 2.9–5.7 | Red mixer macro | *…before the oven.* | …with a mixer that does the hard work. |
| 5.7–8.6 | Full mixer | *Mix with confidence.* | |
| 8.6–11.4 | Whisk, beater, hook, one per beat | WHISK. BEAT. KNEAD. · 10L stainless bowl | The whole batch, done in one go. |
| 11.4–14.3 | Truck from mixer to oven on one counter | | Then an oven with room for every tray. |
| 14.3–18.6 | Oven front, light comes on | *Bake with confidence.* · 100L capacity | *(music breath)* |
| 18.6–20.0 | Mixer dial (circle match) | *One starts it.* | The mixer starts it. |
| 20.0–21.4 | Oven fan (circle match) | *One finishes it.* | The oven finishes it. |
| 21.4–24.3 | Bell, pull back, room warms to gold | *Less waiting. More sharing.* | So everyone gets to enjoy it, together. |
| 24.3–27.1 | The pair, one light sweep across both | THE BAKER 100L OVEN + ARTISAN SE 10L STAND MIXER · *The complete baking set.* | The Baker Oven, and Artisan SE Mixer. |
| 27.1–30.0 | End card, held still | Logo · ***Better Together*** · [Shop the set on Shopee Mall] | Better together. On Shopee Mall. |

## Audio

* **Score and sound effects** are synthesised in `audio.py`, so there are no samples and no licensing issues. The music builds in layers (piano, then guitar and brush, then pad, bass and pizzicato, then strings and claps), drops to solo piano for "starts it / finishes it", and resolves on "Better together". Sound effects include oven hum and crackle, mixer motor, attachment tinks, tray slide, door thunk, knob clicks, a two-stroke timer bell, plates, and a CTA chime.
* **Voice** is a guide read from the Kokoro TTS model (warm British-English female, the closest available to neutral Malaysian English), made with `voiceover.py`. A quiet "Wah!" and family chatter under the bell scene are also TTS. **For the final version, record a Malaysian voice artist** reading the same script to the same timings (section B of `CREATIVE_DIRECTION.md`), and ideally record the real mixer motor, oven knobs and timer bell.

## Editing and re-rendering

* **Price:** set `CONFIG.price` in `index.html`, for example `'Set price RM 1,999 · <s>RM 2,450 separately</s>'`. It appears small under the CTA.
* **CTA text:** `CONFIG.cta`.
* **Preview:** run `npx http-server` here and open `index.html?t=24.5` to freeze on any moment.

```bash
pip install numpy scipy imageio-ffmpeg kokoro-onnx soundfile   # plus Node 18+ with the `playwright` package
export FFMPEG=$(python3 -c "import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())")
python3 voiceover.py kokoro-v1.0.onnx voices-v1.0.bin out/voiceover_30s_en.wav   # model files: github.com/thewh1teagle/kokoro-onnx releases
python3 audio.py out/voiceover_30s_en.wav out/vo/chatter.wav out/mix.wav
node render.cjs --fps 30 --workers 4                                              # -> out/video_noaudio.mp4
$FFMPEG -i out/video_noaudio.mp4 -i out/mix.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k \
  -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 -shortest -movflags +faststart out/TheBaker_BetterTogether_30s_1080x1920.mp4
```

**Assets** (`assets/`) are trimmed, full-resolution copies of the repo-root photos: `_OEK6146.png` (oven, pair shot), `_OEK6149.png` (oven front), `SM-A02 RED 1.png`, `SM-A02 METAL GRAY 2.png`, and `A02配件*.png` (attachments). There's also a red recolour of the tagline-free logo. **Fonts:** Playfair Display Italic, Montserrat and Allura (SIL Open Font License).
