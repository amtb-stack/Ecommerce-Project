"""Render the product-performance analysis as a self-contained page."""

from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path

from .glossary import ALL as GLOSSARY
from .glossary import tip as glossary_tip
from .product_assets import PRODUCT_CSS, PRODUCT_JS
from .products import QUADRANTS, ProductAnalysis
from .shopstats import ShopStats
from .writer import write_atomic

LEVEL_LABEL = {"critical": "Fix now", "warning": "Watch", "good": "Strength", "info": "Note"}


def _e(value: object) -> str:
    return html.escape(str(value), quote=True)


def _payload(stats: ShopStats, analysis: ProductAnalysis, config: dict,
             tracker: dict | None = None) -> dict:
    cur = config.get("currency", "RM")
    t = analysis.totals

    funnel = [
        {"label": "Visitors", "value": t["visitors"], "kind": "int", "tip": "visitors",
         "note": "came to the shop"},
        {"label": "Product clicks", "value": t["clicks"], "kind": "int", "tip": "clicks",
         "note": f"{t['clicks'] / t['visitors']:.1%} of visitors" if t["visitors"] else ""},
        {"label": "Orders", "value": t["orders"], "kind": "int", "tip": "conversions",
         "note": f"{t['cvr']:.2%} conversion"},
        {"label": "Paid", "value": t["paid_sales"], "kind": "money0", "tip": "paid_gap",
         "note": f"{t['leak']:.1%} did not pay" if t["leak"] > 0.001 else "all orders paid"},
    ]

    by_id = {p["id"]: p for p in analysis.products}
    quadrants = []
    for key, (label, what, todo) in QUADRANTS.items():
        items = []
        for pid in analysis.quadrants.get(key, []):
            p = by_id[pid]
            if key == "fix":
                metric = f"{p['impressions']:,.0f} seen · {p['cvr']:.2%} buy"
            elif key == "feed":
                metric = f"{p['cvr']:.2%} buy · only {p['impressions']:,.0f} seen"
            elif key == "scale":
                metric = f"{cur}{p['sales']:,.0f} · {p['cvr']:.2%} buy"
            else:
                metric = f"{p['impressions']:,.0f} seen"
            items.append({"name": p["name"], "metric": metric})
        quadrants.append({"key": key, "label": label, "what": what, "todo": todo,
                          "items": items})

    return {
        "meta": {
            "shop": stats.shop or "Shop",
            "period": stats.period_label,
            "days": stats.days,
            "currency": cur,
            "source": stats.source_path.name,
            "sheets": stats.sheets,
            "generated": datetime.now().strftime("%d %b %Y, %H:%M"),
            "shop_cvr": t["cvr"],
        },
        "labels": LEVEL_LABEL,
        "glossary": {k: glossary_tip(k) for k in GLOSSARY},
        "totals": t,
        "funnel": funnel,
        "quadrants": quadrants,
        "products": analysis.products,
        "channels": analysis.channels,
        "subchannels": analysis.subchannels,
        "channels_ads": [c for c in analysis.subchannels if c["is_ads"]],
        "daily": analysis.daily,
        "findings": analysis.findings,
        "tracker": tracker or {"available": False},
    }


def render(stats: ShopStats, analysis: ProductAnalysis, config: dict,
           tracker: dict | None = None) -> str:
    payload = _payload(stats, analysis, config, tracker)
    m, t = payload["meta"], payload["totals"]
    cur = m["currency"]
    data = json.dumps(payload, ensure_ascii=False, default=str).replace("</", "<\\/")
    tabs = "".join(f"<span>{_e(s)}</span>" for s in m["sheets"])

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shop Performance Report — {_e(m['shop'])}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap">
<style>{PRODUCT_CSS}</style></head>
<body>

<div class="bar"><div class="wrap">
  <span class="dot"></span><span class="name">Product performance</span>
  <nav>
    <a href="#today">Today</a><a href="#groups">Groups</a><a href="#table">All products</a>
    <a href="#sources">Sources</a><a href="#trend">Trend</a><a href="#notes">Findings</a>
  </nav>
  <span class="spacer"></span>
  <button type="button" class="ghost" id="theme" aria-label="Change theme">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1
      M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" stroke-linecap="round"/></svg>
  </button>
</div></div>

<header class="hero"><div class="wrap">
  <p class="eyebrow">{_e(m['period'])} &middot; {m['days']} days</p>
  <h1>{_e(m['shop'])}</h1>
  <p class="sub">Twelve tabs of shop statistics, joined into one view of
     {t['products']} products &mdash; every order state and every traffic source on a single row.</p>
  <div class="figure">
    <div class="big">{cur}{t['sales']:,.0f}</div>
    <p class="cap">placed across {t['orders']:,.0f} orders &middot;
       {cur}{t['sales_per_day']:,.0f} a day</p>
  </div>
  <div class="funnel" id="funnel"></div>
</div></header>

<section id="today"><div class="wrap">
  <div class="head">
    <p class="kicker">Day by day</p>
    <h2 id="trackhead">How today compares</h2>
    <p id="tracksub">Every export you drop is merged into one running daily record, so this
       builds itself. Overlapping exports correct the days they cover rather than
       double-counting them.</p>
  </div>
  <div id="tracker"></div>
</div></section>

<section id="groups"><div class="wrap">
  <div class="head">
    <p class="kicker">The four groups</p>
    <h2>A sales ranking hides the difference that matters</h2>
    <p>A product nobody sees and a product everybody sees and rejects can sit side by side on
       a sales list. They need opposite work. Each product is placed by its traffic against its
       conversion, split at this shop&rsquo;s own medians.</p>
  </div>
  <div class="quads" id="quads"></div>
</div></section>

<section id="table"><div class="wrap">
  <div class="head">
    <p class="kicker">One combined table</p>
    <h2>Every product, every number, one row each</h2>
    <p>This is the join you asked for. Placed, confirmed and paid order states plus every
       traffic source, merged onto one row per product. Sort any column, filter by group,
       or export what you see.</p>
  </div>
  <div class="panel">
    <div class="tools" id="tabletools"></div>
    <div class="scroll" id="ptable"></div>
  </div>
  <div class="tabs">{tabs}</div>
</div></section>

<section id="sources"><div class="wrap">
  <div class="head">
    <p class="kicker">Where sales come from</p>
    <h2>Channels fail independently</h2>
    <p>Two products with identical sales can depend on completely different surfaces.
       Concentration in one channel carries the same risk as concentration in one product.</p>
  </div>
  <div class="two">
    <div class="chartcard">
      <h3>By channel</h3>
      <p>Placed sales attributed to each surface.</p>
      <div class="rows" id="channels"></div>
    </div>
    <div class="chartcard">
      <h3>Named sources</h3>
      <p>The specific placements inside those channels, top ten by sales.</p>
      <div class="rows" id="subchannels"></div>
    </div>
  </div>
  <div id="adspanel"></div>
</div></section>

<section id="trend"><div class="wrap">
  <div class="head">
    <p class="kicker">Across the {m['days']} days</p>
    <h2>Sales and conversion, day by day</h2>
    <p>Two separate scales, drawn as two charts rather than forced onto one axis, so the
       shapes can be compared without inventing a relationship between them.</p>
  </div>
  <div class="two">
    <div class="chartcard"><h3>Sales</h3><p>Placed order value per day, in {cur}.</p>
      <div id="chart-sales"></div></div>
    <div class="chartcard"><h3>Conversion rate</h3><p>Orders as a share of clicks.</p>
      <div id="chart-cvr"></div></div>
  </div>
</div></section>

<section id="notes"><div class="wrap">
  <div class="head">
    <p class="kicker">Findings</p>
    <h2>What the combined view shows</h2>
    <p>Generated from the numbers above. Each one names the figure that triggered it, so you
       can disagree with the reasoning and still see the evidence.</p>
  </div>
  <div id="findings"></div>
</div></section>

<footer class="end"><div class="wrap">
  Built offline from <span class="mono">{_e(m['source'])}</span> &middot; {_e(m['generated'])}<br>
  Nothing in this file was sent anywhere. Hover any <b>i</b> for a plain explanation.
</div></footer>

<div id="tip" role="tooltip"></div>
<script>window.__PRODUCTS__ = {data};</script>
<script>{PRODUCT_JS}</script>
</body></html>"""


def write_product_report(
    stats: ShopStats, analysis: ProductAnalysis, config: dict, destination: Path,
    tracker: dict | None = None,
) -> Path:
    """Refresh the shop report in place, at its fixed name."""
    return write_atomic(destination, render(stats, analysis, config, tracker))
