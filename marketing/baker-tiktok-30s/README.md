# The Baker: TikTok 9:16 storyboard cut (30 s)

This edit follows the pasted storyboard (`reference/storyboard.webp`) shot for shot, in a 1080×1920 TikTok frame. It uses the storyboard's captions, an English voiceover, and the storyboard's end graphics: the Complete Baking Setup card, BUNDLE SAVINGS, Shop Now on Shopee Mall, and Quality Products · Warranty Support · Nationwide Delivery.

**Status:** `out/TheBaker_TikTok_30s_PREVIEW_placeholders.mp4` is a timing preview only. Every lifestyle shot is a blurred, labelled placeholder cut from the storyboard. Drop the real clips into `clips/` (see `clips/README.md`) and re-render to get the final video.

## Final render once the clips are in
```bash
pip install numpy scipy imageio-ffmpeg pillow            # plus Node 18+ with the `playwright` package
export FFMPEG=$(python3 -c "import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())")
python3 prepare.py                                        # clips -> 9:16 frames (centre crop; see clips/config.json)
node render.cjs --fps 30 --workers 4                      # -> out/video_noaudio.mp4
$FFMPEG -i out/video_noaudio.mp4 -i out/mix.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k \
  -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 -shortest -movflags +faststart out/TheBaker_TikTok_30s.mp4
```
The audio (`out/mix.wav`) is rebuilt with `python3 voiceover.py <kokoro-v1.0.onnx> <voices-v1.0.bin> out/voiceover_30s_en.wav`, then `python3 audio.py out/voiceover_30s_en.wav out/vo/chatter.wav out/mix.wav`.

## Timeline

| Time | Clip | Caption | VO |
|---|---|---|---|
| 0.0–2.9 | 01 bread | Every great bake starts with a simple idea. | Every great bake starts with a simple idea. |
| 2.9–5.6 | 02 ingredients | The joy begins here. | The joy begins long before the oven. |
| 5.6–9.4 | 03 mixing | Mix More. Stress Less. | When everything flows, baking becomes something you look forward to. |
| 9.4–12.9 | 04 portioning | More batches. Less repetition. | More done in one go. Less repeating the same steps. |
| 12.9–15.8 | 05 loading oven | Ready for the next step. | And when it's time to bake, everything is ready. |
| 15.8–17.9 | 06 inside oven | Bake with confidence. | *(music)* |
| 17.9–20.9 | 03 + 06 split screen | One prepares. One finishes. | One prepares the bake. One brings it to life. |
| 20.9–23.5 | 07 family | Better baking brings us together. | Because the best part of baking is sharing it. |
| 23.5–25.9 | 08 (or product photos) | The Baker 100L Oven + Artisan SE 10L Stand Mixer · *Better Together* | The oven and the mixer. Better together. |
| 25.9–28.0 | card | The Complete Baking Setup · 4 icons · BUNDLE SAVINGS | A complete setup. More value together. |
| 28.0–30.0 | 08 (or product photos) | Logo · *Better Together* · Shop Now on Shopee Mall · trust row | Shop now on Shopee Mall. |

* **Voice:** a Kokoro TTS read (af_heart, English).
* **Music and sound effects:** synthesised in `audio.py` (84 BPM), so there are no licensing issues. The chords change on the cuts.
* **Product photos:** used exactly as photographed, with no colour changes.
