# Shop Ads Analyser

Offline analysis and tracking for Shopee **Shop+ Ads** keyword exports.

Drop an export into `drop/`. A dated HTML report appears in `reports/`, and the
run is stored in a local SQLite database so the **next** export gets compared
against it — the trend a single export can never show you.

Nothing leaves your machine. No API keys, no accounts, no network calls.

---

## Quick start (Windows)

1. Install [Python 3.10 or newer](https://www.python.org/downloads/) — tick
   **"Add python.exe to PATH"** on the installer's first screen.
2. Double-click **`Setup.bat`** (once). It checks your Python, installs what
   it needs, and finishes by proving the install works.
3. Double-click **`Start-Watcher.bat`** and leave the window open.
4. Drag your Shopee export into the **`drop`** folder.

A report lands in `reports/` a second later. That's the whole loop.

**Other launchers**

| File | What it does |
|---|---|
| `Setup.bat` | Creates `.venv` and installs dependencies. Run once. |
| `Start-Watcher.bat` | Watches `drop/` until you close the window. |
| `Analyse-Now.bat` | Processes whatever is waiting, then exits. You can also **drag files onto it**. |
| `History.bat` | Lists every export analysed so far. |
| `Check-Setup.bat` | Diagnoses your setup and explains anything wrong, in plain English. |

### Python version

Anything from **3.10 to 3.14** works. On 3.14 the version floors in
`requirements.txt` matter: numpy 2.5.0 and pandas 3.0.2 were the first releases
to ship ready-built 3.14 packages, and without those floors pip may try to
*compile* an older release from source — which fails on a normal Windows
machine. The floors are set with version markers, so older Pythons are
unaffected.

## Quick start (macOS / Linux)

```bash
./run.sh              # sets up on first run, then watches drop/
./run.sh once         # process what's waiting and exit
./run.sh history      # list stored runs
```

## Command line

```bash
python -m shopads watch                    # watch drop/ until Ctrl+C
python -m shopads once                     # process what's waiting, then exit
python -m shopads analyze report.csv --open  # analyse a file in place and open it
python -m shopads history --limit 40       # list stored runs
python -m shopads doctor                   # check the setup, explain problems
python -m shopads where                    # print the folders in use
```

PowerShell users can call `.\bin\shopads.ps1 <command>` instead.

---

## What the report tells you

Every metric carries a small **i** button. Hover it (or tap, on a phone) and it
explains in plain words what the number is, how it was worked out, why it
matters and what a healthy value looks like — so someone who has never run an
ad account can read the report unaided. Press Escape to dismiss.

Findings are generated with the figure that triggered each one, so you can
disagree with a rule and still see the number behind it.

- **Read this first** — how to use the report, and what the severity colours mean.
- **Diagnosis** — automatic findings graded *fix now / watch / strength / note*.
- **Trend** — every headline metric against your previous export.
- **Keywords** — including **on-theme spend**: the share of a keyword's budget
  that reached queries in its own product category. Below 20% the keyword is
  not targeting its subject; it is a broad-match funnel wearing a product name.
- **Intent** — brand, competitor, Malay, Chinese and generic demand, separated.
- **Themes** — where demand actually is, regardless of what you bid on.
- **Bidding** — whether higher CPCs are buying better traffic, and how much of
  your spend sits in a long tail that never converts.
- **Phrases** — spend rolled up to every one-, two- and three-word phrase. A word
  can drain budget across hundreds of queries while looking harmless in each one.
- **Profit** — profit on ad spend, break-even ROAS and TACOS, once you supply
  your contribution margin and total shop revenue in the config.
- **Action** — queries worth their own keyword, queries that have earned a
  block, and queries worth blocking.

### On trusting the numbers

Rates are recomputed from summed numerators and denominators, never averaged
across rows — averaging thousands of row-level percentages of unequal volume
gives a wrong answer.

ROAS carries a bootstrap confidence interval, and the report says plainly when
your order count is too small to optimise on. Below ~30 conversions, steer on
CTR, share of voice and waste instead.

---

## Tuning it to your shop

`shopads.config.json` is written on first run and is meant to be edited:

| Key | What it controls |
|---|---|
| `brand_patterns` | Regexes that identify your own brand in a query. |
| `competitor_names` | Brands you compete against, for conquest analysis. |
| `malay_patterns` | Malay vocabulary marking local-language demand. |
| `themes` | Product categories, as regexes. Drives on-theme spend. |
| `off_catalogue_patterns` | Things you do not sell. Becomes the negatives list. |
| `thresholds` | When a finding fires, and what counts as high intent. |
| `business` | Your contribution margin and total shop revenue. Neither exists in a Shopee export, so both have to come from you — and they unlock the profit section. |

The themes and brand patterns are the two worth getting right first — they
drive the segment and drift analysis.

---

## Supported input

Shopee Shop+ Ads **keyword** exports as `.csv`, `.xlsx`, `.tsv` or `.txt`.

The header row is located by content, not by a fixed line number, so exports
with a different number of preamble lines still work. Currency symbols,
thousands separators and `%` signs are all handled. Files are matched by
content hash, so re-dropping the same export is skipped rather than
double-counted.

A file that cannot be read is moved to `drop/failed/` with the reason printed;
successfully analysed files move to `drop/processed/`.

## When something goes wrong

Run **`Check-Setup.bat`** (or `python -m shopads doctor`). It checks your
Python version, the installed components, folder permissions and the history
database, then prints exactly what to do about anything it finds.

## Known limits

- Shopee's keyword export has **no date column**, so no seasonality or
  day-part analysis is possible from one file. Trend comes from comparing
  stored runs.
- Reported conversions include halo orders. Direct GMV is shown separately;
  treat the headline ROAS as the generous reading.
- Product-tile clicks are used as a *proxy* for catalogue relevance. That is
  suggestive, not proof — this export records searches, never your inventory.
- Screenshot input is not supported. OCR on dense ad tables misreads numbers
  too often to trust for money decisions.

## Layout

```
drop/          put exports here      (processed/ and failed/ created as needed)
reports/       generated HTML reports
data/          shopads.db — your run history
shopads/       the package
tests/         pytest suite
```

## Tests

```bash
python -m pytest tests/ -q
```
