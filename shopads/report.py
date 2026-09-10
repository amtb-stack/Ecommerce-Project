"""Render an analysis as a self-contained report application.

The page is one HTML file opened from disk. Python's job is to serialise the
analysis to JSON and emit the shell; the client script in ``assets`` renders
it, which is what makes sorting, filtering and search instant rather than a
new page render per interaction.
"""

from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .analyze import Analysis
from .assets import APP_JS, CSS
from .glossary import ALL as GLOSSARY
from .glossary import tip as glossary_tip
from .ingest import Export
from .writer import write_atomic

LEVEL_LABEL = {"critical": "Fix now", "warning": "Watch", "good": "Strength", "info": "Note"}

#: id, label, sidebar icon path, page title, page subtitle
VIEWS = [
    ("overview", "Overview", "M2 9.5 8 3l6 6.5M3.6 8.2V13h8.8V8.2",
     "Overview", "everything that matters, worst first"),
    ("keywords", "Keywords", "M2.5 4h11M2.5 8h11M2.5 12h7",
     "Keywords", "what you bid on, and where the money went"),
    ("queries", "Search terms", "M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10Zm3.6.6L14 16",
     "Search terms", "what shoppers actually typed"),
    ("phrases", "Phrases", "M3 4h10M3 8h10M3 12h4M11.5 11.5l2 2",
     "Phrases", "spend rolled up by word, not by whole search"),
    ("audience", "Segments", "M5.5 7a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Zm5.6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM1.6 13c0-2.2 1.7-3.6 3.9-3.6S9.4 10.8 9.4 13m1.2-3.4c2 0 3.8 1 3.8 3.4",
     "Segments & themes", "who is searching, and for what"),
    ("profit", "Profit", "M8 1.5v13M11 4.4A3.3 3.3 0 0 0 8 3C6.3 3 5 3.9 5 5.3c0 3.2 6 1.8 6 5 0 1.5-1.3 2.5-3 2.5a3.4 3.4 0 0 1-3.1-1.6",
     "Profit", "whether the advertising actually made money"),
    ("actions", "Actions", "M6.2 10.4 3.8 8l-.9.9 3.3 3.3 7-7-.9-.9z",
     "Actions", "what to add, and what to block"),
    ("about", "How to read", "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm0-3.2V7.4M8 4.8h.01",
     "How to read this", "a two-minute orientation"),
]


def _e(value: object) -> str:
    return html.escape(str(value), quote=True)


def _round(value: Any, places: int = 4) -> Any:
    return round(float(value), places) if isinstance(value, (int, float)) else value


def _payload(
    export: Export,
    analysis: Analysis,
    config: dict,
    trend: list[dict] | None,
    previous_label: str | None,
) -> dict:
    """Everything the client app needs, as plain JSON."""
    t, conf, econ = analysis.totals, analysis.confidence, analysis.economics
    cur = config.get("currency", "RM")
    block_floor = int(config["thresholds"].get("block_after_impressions", 1000))

    kpis = [
        {"label": "Spend", "value": t["spend"], "kind": "money0",
         "sub": f"{cur}{t['spend_per_day']:,.2f} / day", "trend": "spend", "tip": "cpc"},
        {"label": "GMV", "value": t["gmv"], "kind": "money0",
         "sub": f"direct {cur}{t['direct_gmv']:,.0f}", "trend": "gmv", "tip": "gmv"},
        {"label": "ROAS", "value": t["roas"], "kind": "x",
         "sub": f"range {conf['roas_low']:.1f}–{conf['roas_high']:.1f}",
         "trend": "roas", "tip": "roas"},
        {"label": "ACOS", "value": t["acos"], "kind": "pct",
         "sub": "spend / GMV", "trend": "acos", "tip": "acos"},
        {"label": "Orders", "value": t["conversions"], "kind": "int",
         "sub": "too few to trust" if not conf["reliable"] else "enough to act on",
         "trend": "conversions", "tip": "conversions",
         "tone": "bad" if not conf["reliable"] else "good"},
        {"label": "Cost / order", "value": t["cpa"] if t["conversions"] else None,
         "kind": "money", "sub": "per order", "trend": None, "tip": "cpa"},
        {"label": "Impressions", "value": t["impressions"], "kind": "int",
         "sub": f"{t['rows']:,} rows", "trend": "impressions", "tip": "impressions"},
        {"label": "Share of voice", "value": t["sov"], "kind": "pct",
         "sub": "of auctions won", "trend": "sov", "tip": "sov"},
        {"label": "CTR", "value": t["ctr"], "kind": "pct",
         "sub": f"{t['clicks']:,.0f} clicks", "trend": "ctr", "tip": "ctr"},
        {"label": "Conv. rate", "value": t["cvr"], "kind": "pct",
         "sub": "clicks that ordered", "trend": "cvr", "tip": "cvr"},
        {"label": "CPC", "value": t["cpc"], "kind": "money",
         "sub": "per click", "trend": "cpc", "tip": "cpc"},
        {"label": "Product CTR", "value": t["product_ctr"], "kind": "pct3",
         "sub": f"{t['product_clicks']:,.0f} tile clicks", "trend": "product_ctr",
         "tip": "product_ctr",
         "tone": "bad" if t["product_ctr"] < config["thresholds"]["target_product_ctr"] else ""},
    ]

    econ_tiles = []
    if econ.get("has_margin"):
        poas = econ["poas"]
        econ_tiles += [
            {"label": "Profit on ad spend", "value": f"{poas:,.1f}×", "tip": "poas",
             "sub": "above 1.0 makes money" if poas >= 1 else "below 1.0 loses money",
             "tone": "good" if poas >= 1 else "bad"},
            {"label": "Break-even ROAS", "value": f"{econ['breakeven_roas']:,.1f}×",
             "sub": f"at {econ['contribution_margin']:.0%} margin", "tip": "breakeven_roas"},
            {"label": "Contribution", "value": f"{cur}{econ['contribution']:,.2f}",
             "sub": "before ad cost", "tip": "contribution_margin"},
            {"label": "Profit after ads", "value": f"{cur}{econ['profit_after_ads']:,.2f}",
             "sub": "contribution minus spend", "tip": "poas",
             "tone": "good" if econ["profit_after_ads"] >= 0 else "bad"},
        ]
    if econ.get("has_revenue"):
        econ_tiles += [
            {"label": "TACOS", "value": f"{econ['tacos'] * 100:,.2f}%",
             "sub": "spend / all revenue", "tip": "tacos"},
            {"label": "Ad share of revenue", "value": f"{econ['ad_share_of_revenue'] * 100:,.1f}%",
             "sub": "the rest is organic", "tip": "tacos"},
        ]

    queries = [
        {**{k: _round(v) for k, v in q.items() if k != "query"},
         "query": q["query"],
         "blockable": q["impressions"] >= block_floor and q["conversions"] <= 0}
        for q in analysis.queries
    ]

    blocked = {b["query"] for b in analysis.blocklist}
    block_rows = (
        [{**b, "why": f"{block_floor:,}+ impressions, no order"} for b in analysis.blocklist]
        + [{**n, "why": "matches your off-catalogue list"}
           for n in analysis.negatives if n["query"] not in blocked]
    )

    return {
        "meta": {
            "shop": export.shop_name or "Shop Ads report",
            "shop_id": export.shop_id or "—",
            "period": export.period_label,
            "days": t["days"],
            "bidding": export.bidding_method or "—",
            "rows": t["rows"], "keywords": t["keywords"], "queries": t["queries"],
            "currency": cur,
            "source": export.source_path.name,
            "generated": datetime.now().strftime("%d %b %Y, %H:%M"),
            "previous": previous_label,
            "block_floor": block_floor,
        },
        "labels": LEVEL_LABEL,
        "glossary": {key: glossary_tip(key) for key in GLOSSARY},
        "kpis": kpis,
        "trend": {d["metric"]: d for d in (trend or [])},
        "findings": analysis.findings,
        "keywords": [{
            "keyword": k["keyword"], "theme": k["theme"], "queries": k["queries"],
            "impressions": k["impressions"], "clicks": k["clicks"],
            "spend": _round(k["spend"], 2), "gmv": _round(k["gmv"], 2),
            "conversions": k["conversions"], "ctr": _round(k["ctr"]),
            "cpc": _round(k["cpc"]), "roas": _round(k["roas"], 2),
            "on_theme": _round(k["on_theme_spend"]) if k["on_theme_spend"] is not None else None,
        } for k in analysis.keywords],
        "queries": queries,
        "ngrams": [{k: _round(v) if k != "phrase" else v for k, v in n.items()}
                   for n in analysis.ngrams],
        "segments": [{k: _round(v) if k != "segment" else v for k, v in s.items()}
                     for s in analysis.segments],
        "themes": [{k: _round(v) if k != "theme" else v for k, v in x.items()}
                   for x in analysis.themes],
        "cpc_bands": analysis.cpc_bands,
        "tail_bands": analysis.tail_bands,
        "candidates": analysis.candidates,
        "blocklist": block_rows,
        "negatives": [],
        "winners": analysis.winners,
        "pareto": {k: v for k, v in analysis.pareto.items() if k != "points"},
        "confidence": {k: _round(v) for k, v in conf.items()},
        "economics": {"tiles": econ_tiles},
    }


def _nav(payload: dict) -> str:
    counts = {
        "overview": sum(1 for f in payload["findings"] if f["level"] == "critical"),
        "keywords": len(payload["keywords"]),
        "queries": len(payload["queries"]),
        "phrases": len(payload["ngrams"]),
        "audience": len(payload["segments"]) + len(payload["themes"]),
        "profit": len(payload["economics"]["tiles"]),
        "actions": len(payload["candidates"]) + len(payload["blocklist"]),
        "about": 0,
    }
    out = []
    for view_id, label, icon, title, sub in VIEWS:
        count = counts.get(view_id, 0)
        badge = ""
        if count:
            cls = "cnt crit" if view_id == "overview" else "cnt"
            badge = f'<span class="{cls}">{count:,}</span>'
        out.append(
            f'<button type="button" data-view="{view_id}" data-title="{_e(title)}" '
            f'data-sub="{_e(sub)}">'
            f'<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
            f'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" '
            f'aria-hidden="true"><path d="{icon}"/></svg>'
            f'<span>{_e(label)}</span>{badge}</button>'
        )
    return "\n".join(out)


def render(
    export: Export,
    analysis: Analysis,
    config: dict,
    trend: list[dict] | None = None,
    previous_label: str | None = None,
) -> str:
    payload = _payload(export, analysis, config, trend, previous_label)
    m = payload["meta"]
    data = json.dumps(payload, ensure_ascii=False, default=str).replace("</", "<\\/")

    meta_cells = "".join(
        f"<div><dt>{_e(k)}</dt><dd>{_e(v)}</dd></div>" for k, v in [
            ("Shop", m["shop"]), ("Shop ID", m["shop_id"]), ("Period", m["period"]),
            ("Days", m["days"]), ("Bidding", m["bidding"]), ("Rows", f"{m['rows']:,}"),
            ("Keywords", f"{m['keywords']:,}"), ("Search terms", f"{m['queries']:,}"),
        ]
    )
    trend_note = (
        f"Compared against {_e(m['previous'])}." if m["previous"]
        else "This is the first export stored for this shop, so there is nothing to compare "
             "against yet. Drop a second one in and every figure above gains a change-since number."
    )

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Keywords Ads Report — {_e(m['shop'])}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<style>{CSS}</style></head>
<body>
<div class="app">

  <aside class="side">
    <div class="brand">
      <div class="mark"><span class="glyph">SA</span><h1>Shop Ads</h1></div>
      <p class="shop">{_e(m['shop'])}</p>
      <p class="period">{_e(m['period'])} &middot; {m['days']} days</p>
    </div>
    <nav class="nav" aria-label="Report sections">
      {_nav(payload)}
    </nav>
    <footer>
      Generated offline<br>{_e(m['generated'])}<br>
      <span class="mono">{_e(m['source'])}</span>
    </footer>
  </aside>

  <div class="main">
    <header class="top">
      <button type="button" class="iconbtn navtoggle" aria-label="Show sections">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round"><path d="M2.5 4h11M2.5 8h11M2.5 12h11"/></svg>
      </button>
      <div>
        <h2 id="viewtitle">Overview</h2>
      </div>
      <span class="sub" id="viewsub"></span>
      <span class="spacer"></span>
      <div class="search">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
          <circle cx="7" cy="7" r="4.6"/><path d="M10.5 10.5 14 14" stroke-linecap="round"/></svg>
        <input id="q" type="search" placeholder="Search any table…" aria-label="Search tables">
        <kbd>/</kbd>
      </div>
      <button type="button" class="iconbtn" id="theme" aria-label="Change theme">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1
          M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1"
          stroke-linecap="round"/></svg>
      </button>
    </header>

    <!-- ------------------------------------------------------ overview -->
    <section class="view on" id="view-overview">
      <div class="kpis" id="kpis"></div>
      <div class="card">
        <header><h3>What this export is telling you</h3>
          <p class="hint">Worst first. Every finding carries the number that triggered it.</p>
        </header>
        <div class="finds" id="findings"></div>
        <div class="legend">
          <span class="pill critical"><span class="dot"></span>Fix now</span> costing you money
          <span class="pill warning"><span class="dot"></span>Watch</span> act on soon
          <span class="pill good"><span class="dot"></span>Strength</span> keep doing it
          <span class="pill info"><span class="dot"></span>Note</span> context only
        </div>
      </div>
      <div class="card">
        <header><h3>This export</h3><p class="hint">{trend_note}</p></header>
        <div class="pad"><div class="meta">{meta_cells}</div></div>
      </div>
    </section>

    <!-- ------------------------------------------------------ keywords -->
    <section class="view" id="view-keywords">
      <p class="lede"><strong>On-theme</strong> is the share of a keyword's budget that reached
         searches about that keyword's own product. Below 20% the keyword is not targeting
         anything &mdash; it is a broad-match funnel wearing a product name. Click any column to
         sort; use the filters to isolate the problems.</p>
      <div class="card">
        <header><h3>Your keywords</h3>
          <p class="hint">Everything you bid on, and what it returned.</p></header>
        <div id="t-keywords"></div>
      </div>
    </section>

    <!-- -------------------------------------------------- search terms -->
    <section class="view" id="view-queries">
      <p class="lede">These are the real searches your ads were shown against &mdash; not the
         keywords you chose. The gap between the two is where broad match spends your money.
         <strong>Block-ready</strong> marks terms shown {m['block_floor']:,}+ times that never
         produced an order.</p>
      <div class="card">
        <header><h3>What shoppers typed</h3>
          <p class="hint">Top {len(payload['queries']):,} by spend. Search box filters this table.</p>
        </header>
        <div id="t-queries"></div>
      </div>
    </section>

    <!-- ------------------------------------------------------- phrases -->
    <section class="view" id="view-phrases">
      <p class="lede">Spend added up by word and phrase instead of by whole search term. One word
         can drain budget across hundreds of searches while looking harmless in every one of them
         &mdash; this is the only view that catches it. Filter to <strong>Never converts</strong>
         to find your next negative keywords.</p>
      <div class="card">
        <header><h3>Phrase spend</h3>
          <p class="hint">One, two and three-word phrases across all search terms.</p></header>
        <div id="t-ngrams"></div>
      </div>
    </section>

    <!-- ------------------------------------------------------ segments -->
    <section class="view" id="view-audience">
      <p class="lede">Two ways of grouping the same demand: by <strong>who</strong> is searching
         (your brand, a competitor's, a language) and by <strong>what</strong> they want. A theme
         with strong click-through that you do not advertise is the cleanest opportunity here.</p>
      <div class="card">
        <header><h3>Intent segments</h3>
          <p class="hint">Grouped by what the wording suggests the shopper wanted.</p></header>
        <div id="t-segments"></div>
      </div>
      <div class="card">
        <header><h3>Product themes</h3>
          <p class="hint">Where demand actually is, whether or not you bid on it.</p></header>
        <div id="t-themes"></div>
      </div>
    </section>

    <!-- -------------------------------------------------------- profit -->
    <section class="view" id="view-profit">
      <p class="lede">ROAS counts revenue, and revenue is not profit. A shop at 25% contribution
         margin needs 4&times; ROAS just to break even. These figures need two numbers only you
         have.</p>
      <div id="econ"></div>
      <div class="card">
        <header><h3>How to fill this in</h3></header>
        <div class="pad">
          <p>Open <span class="mono">shopads.config.json</span> in Notepad and find the
             <span class="mono">"business"</span> section.</p>
          <p><strong>contribution_margin</strong> — what is left of a sale after product cost,
             shipping, payment fees and returns. Write <span class="mono">0.32</span> for 32%.
             Getting it roughly right matters far more than getting it exactly right.</p>
          <p><strong>total_shop_revenue</strong> — everything the shop earned in this period,
             advertised or not. This is what turns ACOS into TACOS.</p>
        </div>
      </div>
    </section>

    <!-- ------------------------------------------------------- actions -->
    <section class="view" id="view-actions">
      <p class="lede">Two lists to work from. Confirm both against your real catalogue before
         acting &mdash; this export records what people searched for, never what you stock.</p>
      <div class="card">
        <header><h3>Keywords worth adding</h3>
          <p class="hint">Ranked by clicks, click-through rate, specification intent and any
             recorded order.</p></header>
        <div id="t-candidates"></div>
      </div>
      <div class="card">
        <header><h3>Terms worth blocking</h3>
          <p class="hint">Add these as negative keywords in Seller Centre.</p></header>
        <div id="t-block"></div>
      </div>
      <div class="card">
        <header><h3>Every order in this period</h3>
          <p class="hint">The keyword you bid on beside the search that actually produced the
             sale. A wide gap between the two is broad-match drift, not a keyword that earned
             it.</p></header>
        <div id="t-winners"></div>
      </div>
    </section>

    <!-- ---------------------------------------------------------- about -->
    <section class="view" id="view-about">
      <p class="lede">You do not need to understand advertising to use this. Hover the small
         <span class="mono">i</span> beside any metric and it explains what the number is, how it
         was worked out, why it matters and what a healthy value looks like. On a phone, tap it.
         Press <span class="mono">Escape</span> to close.</p>
      <div class="card">
        <header><h3>Three habits that make this useful</h3></header>
        <div class="steps">
          <div><h4><em>1</em>Start with Overview</h4>
            <p>It lists what is wrong and what is working, worst first. Everything else in the
               sidebar is the supporting evidence.</p></div>
          <div><h4><em>2</em>Trust rates, not totals</h4>
            <p>A big spend number means nothing alone. Click-through, conversion rate and cost per
               click are what tell you whether the money worked.</p></div>
          <div><h4><em>3</em>Compare to yourself</h4>
            <p>Ignore what other shops achieve. The useful comparison is this export against your
               last, which appears from your second export onward.</p></div>
        </div>
      </div>
      <div class="card">
        <header><h3>Getting around</h3></header>
        <div class="pad">
          <p><strong>Search</strong> — press <span class="mono">/</span> anywhere to jump to the
             search box. It filters whichever table you are looking at.</p>
          <p><strong>Sort</strong> — click any column heading. Click again to reverse it.</p>
          <p><strong>Filter</strong> — the pill buttons above each table narrow it to the rows
             that matter, like keywords with no revenue.</p>
          <p><strong>Export CSV</strong> — downloads exactly what you can see, filters and sort
             included, for a spreadsheet.</p>
          <p><strong>Theme</strong> — the sun button cycles system, light and dark. Your choice is
             remembered.</p>
        </div>
      </div>
      <div class="card">
        <header><h3>How the numbers are worked out</h3></header>
        <div class="pad">
          <p><strong>Rates are computed, never averaged.</strong> Click-through is total clicks
             divided by total impressions. Averaging {m['rows']:,} row-level percentages of wildly
             unequal volume gives a wrong answer.</p>
          <p><strong>ROAS carries a range.</strong> It comes from resampling your own rows
             thousands of times. Below about 30 orders that range is wide, and the report says so
             rather than pretending to precision.</p>
          <p><strong>Attribution is generous.</strong> Shopee's conversions include halo orders.
             Direct GMV is reported separately; treat the headline as the optimistic reading.</p>
          <p><strong>Nothing left this computer.</strong> The file was built offline from
             <span class="mono">{_e(m['source'])}</span> and makes no network calls.</p>
        </div>
      </div>
    </section>

  </div>
</div>
<div id="tip" role="tooltip"></div>
<script>window.__REPORT__ = {data};</script>
<script>{APP_JS}</script>
</body></html>"""


def write_report(
    export: Export,
    analysis: Analysis,
    config: dict,
    destination: Path,
    trend: list[dict] | None = None,
    previous_label: str | None = None,
) -> Path:
    """Refresh the keyword report in place, at its fixed name."""
    return write_atomic(
        destination, render(export, analysis, config, trend, previous_label)
    )
