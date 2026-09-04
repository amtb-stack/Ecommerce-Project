# Design notes

Why the tool is shaped the way it is. Read this before changing the analysis.

## Rates are computed, never averaged

Every rate — CTR, CVR, ROAS, ACOS, product CTR — is recomputed from summed
numerators and denominators in `analyze._totals`. A Shopee export has tens of
thousands of rows with volumes spanning four orders of magnitude, so the mean
of the row-level `CTR` column is not the account CTR and is not close to it.

## On-theme spend is the headline keyword metric

`analyze._keywords` classifies both the keyword and every query it matched into
a product theme, then reports the share of the keyword's budget that landed on
its own theme. This is what exposes broad-match drift: a keyword can look busy,
spend heavily and even show a high ROAS while sending almost none of its budget
to its own subject. Rank and ROAS both hide that; on-theme spend does not.

## Confidence is reported, not assumed

`analyze._confidence` bootstraps row-level GMV to put an interval around ROAS,
and flags `reliable = False` below 30 conversions. High-ticket Shopee accounts
routinely show spectacular ROAS built on a handful of orders; a tool that
prints `17.4×` without the interval invites exactly the wrong decision.

## Findings carry their evidence

`analyze._findings` emits a level, a title and a detail string containing the
number that fired the rule. Thresholds live in `shopads.config.json` so a user
who disagrees with a rule can change it — and can always see the figure behind
it rather than a verdict.

## Storage exists to create a trend

A single export is a snapshot with no date dimension. `store` keeps every run
so `store.compare` can produce a change-since figure for the next one. Rates
are compared in percentage points, absolute counts in percent, and each metric
declares the direction that counts as an improvement (`store.TRENDED`).

Files are identified by SHA-256 of their contents, so re-dropping the same
export is skipped rather than double-counted.

## Reports are self-contained

`report.render` emits one HTML file with inline CSS and inline SVG charts. No
JavaScript, no chart library, no build step. A report opened in five years with
no network still draws. Fonts are the one remote asset and degrade to a system
stack.

### Colour

Charts use a validated categorical palette (`--s1` blue, `--s2` orange,
`--s3` aqua) and a single-hue ordinal ramp (`--o1`…`--o5`), each checked for
colourblind separation and contrast against both the light and dark surfaces.
Status colours (good / warning / critical) are reserved for findings and never
reused as a series colour, and every status is paired with a text label so
meaning is never carried by colour alone.

Both themes are defined at token level: `:root` carries the full light palette,
with dark redefined under both `prefers-color-scheme` and `[data-theme="dark"]`
so an explicit choice wins in either direction.

## Polling, not filesystem events

`watch` polls and checks that a file's size has stopped changing before reading
it. On Windows a file appears in the folder before the copy into it finishes,
and an event-driven watcher reads a truncated file. Polling also keeps the
dependency list to three packages.

## Failure is visible, never silent

`pipeline.process_file` catches everything, prints the reason, and moves the
file to `drop/failed/`. A watcher that dies on one malformed export is worse
than useless — you stop trusting it and stop using it.
