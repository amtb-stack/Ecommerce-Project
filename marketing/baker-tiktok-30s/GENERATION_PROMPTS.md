# AI generation prompts: one per storyboard shot (9:16)

Use these in the image or video generator you used for the storyboard: ChatGPT / Gemini images, Midjourney, Kling, Veo, Runway, Pika or similar.

**Output:** vertical **9:16**, at least **1080×1920**. For video, **5 s clips** (image-to-video works well: generate the still first, then animate it). For stills, the edit adds a slow push-in automatically.

**Product accuracy (important):** in every shot where the mixer or oven is visible, **attach the real product photo as a reference image**, and say *"use this exact appliance, same colour and design"*.
* Mixer: `SM-A02 RED 1.png` (red Artisan SE 10L)
* Oven: `_OEK6149.png` or `_OEK6146.png` (black and stainless The Baker 100L)

If a generator still changes the product, keep the product out of that shot. The edit already shows the real product photos in the closing scenes.

**Look for every shot:** *photorealistic, cinematic commercial, warm golden-hour window light, shallow depth of field, 35mm, soft film grain, modern Malaysian home kitchen (light wood, cream walls, green plants), natural skin tones, no text, no logos, no watermark.*

Save each result into `clips/` with the file name shown, then run the render (see `README.md`).

| File | Storyboard | Prompt (add the "look" line above) |
|---|---|---|
| `01_bread.mp4` / `.jpg` | 0:00 hook | Extreme close-up of two hands tearing apart a freshly baked golden bread loaf, steam rising from the soft fluffy inside, crumbs falling, dark warm background, slow motion |
| `02_ingredients` | 0:03 | Close-up of flour pouring in a soft cascade and milk streaming into a stainless steel mixing bowl with two bright orange egg yolks. The bowl sits on **the red stand mixer from the reference photo**. Kitchen window light, slow motion |
| `03_mixing` | 0:06 | Close-up of **the red stand mixer from the reference photo** kneading a large batch of soft smooth dough in its 10L stainless bowl, dough hook turning, smooth hypnotic motion |
| `04_portioning` | 0:10 | A smiling Malay mother in a soft pink hijab and her young daughter shaping dough balls onto several baking trays on a wooden kitchen counter, many trays, candid laughter, medium-wide shot |
| `05_loading` | 0:13 | The mother in a pink hijab sliding a tray of shaped buns into **the large black 100L oven from the reference photo**, oven light glowing, tracking shot |
| `06_inside_oven` | 0:17 | View through the glass door into **the black 100L oven from the reference photo**: several trays of buns and cookies rising and turning golden, glowing heating elements, time-lapse feel |
| `07_family` | 0:24 | A Malaysian family at the dining table (father in a songkok and baju Melayu, mother in a hijab, two kids) reaching for fresh golden buns and cookies, laughing, warm candid moment, festive open-house feel |
| `08_pair` (optional) | 0:27 end | **The red stand mixer and the black 100L oven from the reference photos** side by side on a light wood kitchen counter, fresh bakes in front, soft hero lighting, empty space in the top third for text |

**Tips**
* Generate 2–3 versions of each shot and keep the best. Hands, faces and product details are where generators most often slip.
* Horizontal results still work, because the edit crops the centre. To choose the crop, set `focus` in `clips/config.json`: 0 is left, 1 is right.
