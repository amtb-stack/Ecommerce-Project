# Shop Ads Analyser

Offline analysis and tracking for Shopee **Shop+ Ads** keyword exports.

Drop an export into `drop/`. There are two reports in `reports/` and there
always will be — **Shop Performance Report.html** and **Keywords Ads
Report.html** — and each export refreshes the one it belongs to rather than
adding a file. Every run is stored in a local SQLite database, so the **next**
export gets compared against it: the trend a single export can never show you.

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
| `Open-Reports.bat` | Opens the `reports` folder, so you never have to hunt for the file. |
| `Schedule-Daily.bat` | Registers a Windows task so the analyser runs itself every morning. |

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

## The report

Each report is a small offline application, not a document: a sidebar of
sections, sortable tables, filter chips, a search box (`/` to focus) and a
CSV export that hands you exactly what is on screen — filters and sort
included. Light, dark and system themes; your choice is remembered.

## What the report tells you

Every metric carries a small **i** button. Hover it (or tap, on a phone) and it
explains in plain words what the number is, how it was worked out, why it
matters and what a healthy value looks like — so someone who has never run an
ad account can read the report unaided. Press Escape to dismiss.

Findings are generated with the figure that triggered each one, so you can
disagree with a rule and still see the number behind it.

- **Overview** — the headline metrics and every finding, graded *fix now /
  watch / strength / note*, worst first.
- **Trend** — every headline metric against your previous export.
- **Keywords** — including **on-theme spend**: the share of a keyword's budget
  that reached queries in its own product category. Below 20% the keyword is
  not targeting its subject; it is a broad-match funnel wearing a product name.
- **Search terms** — what shoppers actually typed, with block-ready terms flagged.
- **Segments** — brand, competitor, Malay, Chinese and generic demand, separated,
  plus where demand sits by product theme.
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

## Two reports, at fixed names

The tool reads the export and works out which report it belongs to. Both files
exist from install, before anything has been analysed, showing a page that says
what to drop:

| File | Filled in by | What it holds |
|---|---|---|
| `reports/Shop Performance Report.html` | Shop statistics workbook (`…shopeeshopstats….xlsx`) | All twelve tabs joined into one row per product, the four-group split of traffic against conversion, channel and paid-placement breakdowns, the placed-to-paid gap, and the daily tracker. |
| `reports/Keywords Ads Report.html` | Shop+ Ads keyword export | What you bid on against what shoppers typed, phrase-level spend, and what to add or block. |

Each export **replaces** the contents of its report. The folder never grows a
file, and a browser tab left open on a report only needs reloading. Writes are
atomic — a reload during a run sees the old report or the new one, never half
of each.

**Anything else tabular** → a data profile, written to `reports/other/` so the
reports folder itself only ever holds the two. Every column typed and charted, a
distribution for numbers, a timeline for dates, top values for categories, plus
duplicates, gaps, constant columns and strong correlations. It does not know
what your columns mean, so it only reports what is structurally true. These keep
dated names: each is about one file, so there is nothing for a later one to
refresh.

Upgrading from a version that wrote dated reports? The first run moves the old
files into `reports/previous/`. They are moved, not deleted.

## Choosing a period, and comparing two

Both reports open with a period picker, and everything on the page follows it.

**Shop Performance Report.** The statistics workbook carries a date series, so
any range at all can be cut from it: a submitted export, the last 7, 14, 30 or
90 days, everything recorded, or two dates you pick yourself. Set *Compare
with* and the headline splits into two figures with the change between them,
and a table puts every measure side by side — sales, orders, AOV, sales a day,
visitors, clicks, impressions, conversion rate, ad spend, ROAS, TACOS,
cancellations — followed by which traffic sources moved the money.

**Keywords Ads Report.** The keyword export has no date column at all, only a
period in its header, so an export is the smallest slice there is. The Compare
view lists every export submitted and puts two of them side by side: reach,
cost, return and coverage, then the keywords and search terms whose spend and
revenue moved most, with new and dropped keywords marked as such.

### What it refuses to do

The picker is built to be arithmetically honest rather than maximally
flexible, so four things are handled explicitly rather than quietly:

- **Visitors are a unique count, not an additive one.** Summing daily visitors
  counts a shopper who came back on Tuesday twice. Where a range matches a
  submitted export exactly, the report uses Shopee's true period-unique figure
  and says so; where it does not, the tile reads *Visits · summed* instead, and
  conversion rate follows the same figure. Comparing one of each is called out
  as not the same basis.
- **Rates are recomputed from the totals**, never averaged across days. An
  average of daily conversion rates weights a 10-visitor day the same as a
  10,000-visitor one.
- **Product figures have no dates.** Shopee reports them as a period total, so
  they follow whole submitted exports. Pick a range that cuts one in half and
  the page says so and offers to widen the range rather than inventing a slice.
- **Overlapping periods are not silently added.** Shopee's periods include both
  end dates, so an export ending 1 June and one starting 1 June share a day.
  Combining those would double-count it, and the report warns instead.

Different-length periods are compared without complaint, but the page says
which rows are safe to read: totals are not comparable across 31 days and 8,
while sales a day, AOV, conversion rate and ROAS are.

## The daily tracker

Drop a shop statistics workbook every morning and the product report grows a
**Today** section at the top: what moved since yesterday, whether the move is
outside its normal range, and what to look at first.

It builds itself. Each workbook carries a date series rather than a single
snapshot, and consecutive exports overlap, so every day is stored keyed by its
date and updated in place. Re-dropping an overlapping export **corrects** the
days it covers instead of duplicating them — there is nothing to reconcile by
hand and no way to double-count a day.

What it works out for you:

- **Look at these first** — the moves ranked by size × how much the metric
  matters, not by percentage alone, so a swing in a small number cannot
  outrank a real move in revenue. Each one says what it means and what to do.
- **Unusual** — a day is flagged when it sits more than two robust standard
  deviations from its own recent typical value. The spread uses the median
  absolute deviation, which a single spike cannot inflate.
- **Level, not just direction** — a day can beat yesterday and still sit far
  below where the shop normally runs. It says so, rather than letting a rebound
  off a bad day read as a recovery.
- **Where the change came from** — traffic sources ranked by how much money
  they moved, so a drop in sales points at the channel that caused it.
- **Sales, every recorded day** — the whole history, not just this export's
  window.

Run **`Schedule-Daily.bat`** and Windows does the dropping for you.

It is honest about what it cannot say. Fewer than seven days recorded and it
says so: day-to-day swings on a young history are mostly noise, and the
comparisons only become trustworthy at about two weeks. A metric the export
did not measure that day is left out rather than reported as zero.

## Supported input

Any `.csv`, `.tsv`, `.txt`, `.xlsx` or `.json`. Shopee keyword exports and shop
statistics workbooks get their dedicated analysis; everything else gets
profiled. Every sheet of a workbook is profiled separately.

Files with no table in them — PDFs, Word documents, images, slide decks — are
recognised and rejected with a plain explanation rather than an error.

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
- **The period picker cannot slice products or keywords.** Both are period
  totals in the source files, so they follow whole exports. Only the shop and
  traffic-source figures have a date series behind them.
- **The daily tracker runs at shop and traffic-source level only.** The
  statistics workbook gives per-day figures for the shop and for each traffic
  source and ad placement, but product figures are period totals — there is no
  per-product daily history in the file to track.
- The per-source sheets sometimes stop a day earlier than the shop-level one.
  Where they do, "Where the change came from" uses the newest day they cover
  and says so, rather than reporting every source as having dropped to zero.

## Layout

```
drop/          put exports here      (processed/ and failed/ created as needed)
reports/       Shop Performance Report.html
               Keywords Ads Report.html
               other/     profiles of files that are neither
               previous/  dated reports from an older version, if you had any
data/          shopads.db — your run history
shopads/       the package
tests/         pytest suite
```

## Tests

```bash
python -m pytest tests/ -q
```
