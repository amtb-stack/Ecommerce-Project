# Drop your clips here

Name each file by its storyboard slot. Any video format, or a still image (.jpg/.png/.webp, e.g. AI-generated), vertical or horizontal. Prompts for each shot are in ../GENERATION_PROMPTS.md:

| File name starts with | Storyboard | Clip |
|---|---|---|
| `01` | 0:00 | Bread torn apart, steam rising |
| `02` | 0:03 | Flour, eggs, milk into the Artisan SE bowl |
| `03` | 0:06 | Artisan SE mixing dough, close-up |
| `04` | 0:10 | Mum & daughter shaping dough on trays |
| `05` | 0:13 | Loading trays into the 100L oven |
| `06` | 0:17 | Inside the oven, pastries rising |
| `07` | 0:24 | Family enjoying the fresh bakes |
| `08` | 0:27 | Oven + mixer side by side in the kitchen (optional: the product photos are used if missing) |

Optional `config.json` to pick the best moment and framing: `{"03": {"in": 2.5, "focus": 0.4}}`
(`in` = start second, `focus` = 0 left … 1 right for horizontal clips).
