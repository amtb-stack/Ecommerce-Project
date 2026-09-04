"""Render an analysis as a self-contained, offline HTML report.

Charts are inline SVG generated here rather than a JavaScript library, so a
report stays readable with no network and no dependencies -- open the file
years later and it still draws.
"""

from __future__ import annotations

import html
from datetime import datetime
from pathlib import Path

from .analyze import Analysis
from .ingest import Export

# Validated categorical + ordinal steps (light / dark), see docs/DESIGN.md.
CSS = """
:root{color-scheme:light;
 --page:#eaeef0;--surface:#fbfcfc;--inset:#e6ebed;--ink:#0e1417;--ink-2:#4c5860;--muted:#7d8a92;
 --rule:#d8dfe2;--hair:#e6ebed;--accent:#0d3b4f;--accent-soft:#dfeaef;
 --s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--o1:#86b6ef;--o3:#2a78d6;--o5:#104281;
 --good-ink:#046b04;--warn-ink:#8a6000;--crit-ink:#a32323;
 --good-bg:#e8f5e8;--warn-bg:#fdf3dd;--crit-bg:#fbe9e9;--info-bg:#e7eef5;--info-ink:#12466f;
 --shadow:0 1px 2px rgba(14,20,23,.05);}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;
 --page:#080b0d;--surface:#14191c;--inset:#101619;--ink:#f4f7f8;--ink-2:#b3c0c7;--muted:#7d8a92;
 --rule:#283135;--hair:#222a2e;--accent:#7ab8d0;--accent-soft:#132b35;
 --s1:#3987e5;--s2:#d95926;--s3:#199e70;--o1:#cde2fb;--o3:#6da7ec;--o5:#256abf;
 --good-ink:#3fc93f;--warn-ink:#f0b53a;--crit-ink:#f07070;
 --good-bg:#102511;--warn-bg:#2a2110;--crit-bg:#2b1414;--info-bg:#0f2231;--info-ink:#8cc4e8;
 --shadow:0 1px 2px rgba(0,0,0,.35);}}
:root[data-theme="dark"]{color-scheme:dark;
 --page:#080b0d;--surface:#14191c;--inset:#101619;--ink:#f4f7f8;--ink-2:#b3c0c7;--muted:#7d8a92;
 --rule:#283135;--hair:#222a2e;--accent:#7ab8d0;--accent-soft:#132b35;
 --s1:#3987e5;--s2:#d95926;--s3:#199e70;--o1:#cde2fb;--o3:#6da7ec;--o5:#256abf;
 --good-ink:#3fc93f;--warn-ink:#f0b53a;--crit-ink:#f07070;
 --good-bg:#102511;--warn-bg:#2a2110;--crit-bg:#2b1414;--info-bg:#0f2231;--info-ink:#8cc4e8;
 --shadow:0 1px 2px rgba(0,0,0,.35);}
*{box-sizing:border-box}
body{background:var(--page);color:var(--ink);margin:0;font-size:15px;line-height:1.6;
 font-family:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1160px;margin:0 auto;padding:0 26px 80px}
h1,h2,h3{font-family:Archivo,"IBM Plex Sans",system-ui,sans-serif;margin:0;text-wrap:balance}
.mono,.q{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace}
header.mast{padding:52px 0 0}
.eyebrow{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.16em;
 text-transform:uppercase;color:var(--accent);margin:0}
h1{font-size:clamp(30px,4.6vw,46px);font-weight:700;letter-spacing:-.022em;line-height:1.06;margin:12px 0 0}
.dek{font-size:18px;color:var(--ink-2);max-width:62ch;margin:16px 0 0}
.plate{margin-top:26px;display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);
 border-radius:3px;overflow:hidden;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.plate div{background:var(--surface);padding:10px 13px}
.plate dt{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.13em;
 text-transform:uppercase;color:var(--muted);margin:0}
.plate dd{margin:3px 0 0;font-size:13.5px;font-weight:500;font-variant-numeric:tabular-nums}
.kpis{margin-top:14px;display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);
 border-radius:3px;overflow:hidden;grid-template-columns:repeat(6,1fr)}
@media(max-width:1040px){.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--surface);padding:14px 15px 15px}
.kpi .lab{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.12em;
 text-transform:uppercase;color:var(--muted);margin:0}
.kpi .val{font-family:Archivo,sans-serif;font-size:24px;font-weight:600;letter-spacing:-.02em;
 margin:5px 0 0;font-variant-numeric:tabular-nums;line-height:1.1}
.kpi .sub{font-size:11.5px;color:var(--muted);margin:3px 0 0;font-variant-numeric:tabular-nums}
.kpi .sub.better{color:var(--good-ink)}.kpi .sub.worse{color:var(--crit-ink)}
section{margin-top:56px}
.shead{border-top:2px solid var(--ink);padding-top:13px;margin-bottom:18px}
.shead h2{font-size:25px;font-weight:600;letter-spacing:-.018em;margin-top:7px}
.shead p{margin:9px 0 0;color:var(--ink-2);max-width:80ch;font-size:15px}
.panel{background:var(--surface);border:1px solid var(--rule);border-radius:3px;
 padding:20px 22px;box-shadow:var(--shadow);margin-top:14px;min-width:0}
.panel h3{font-size:15px;font-weight:600}
.panel .cap{font-size:13px;color:var(--muted);margin:5px 0 16px;max-width:84ch;line-height:1.5}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid2>*{min-width:0}
@media(max-width:880px){.grid2{grid-template-columns:1fr}}
.scroll{overflow-x:auto;max-width:100%}
table{border-collapse:collapse;width:max-content;min-width:100%;font-size:13.5px;
 font-variant-numeric:tabular-nums}
th{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:.11em;
 text-transform:uppercase;color:var(--muted);text-align:right;padding:0 0 8px;
 border-bottom:1px solid var(--rule);white-space:nowrap}
th:first-child{text-align:left}
td{padding:8px 0;border-bottom:1px solid var(--hair);text-align:right;white-space:nowrap}
td:first-child{text-align:left}
td+td,th+th{padding-left:18px}
tr:last-child td{border-bottom:none}
.q{font-size:12.5px}
.zero{color:var(--crit-ink);font-weight:600}.ok{color:var(--good-ink);font-weight:600}
.find{display:flex;gap:14px;padding:15px 0;border-top:1px solid var(--hair);align-items:flex-start}
.find:first-child{border-top:none}
.find .tagx{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:.08em;
 text-transform:uppercase;padding:3px 8px;border-radius:2px;white-space:nowrap;flex:none;margin-top:2px}
.tagx.critical{background:var(--crit-bg);color:var(--crit-ink)}
.tagx.warning{background:var(--warn-bg);color:var(--warn-ink)}
.tagx.good{background:var(--good-bg);color:var(--good-ink)}
.tagx.info{background:var(--info-bg);color:var(--info-ink)}
.find h4{margin:0;font-size:14.5px;font-weight:600;font-family:Archivo,sans-serif}
.find p{margin:4px 0 0;font-size:13.5px;color:var(--ink-2);max-width:82ch}
.trend{display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);border-radius:3px;
 overflow:hidden;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-top:14px}
.trend div{background:var(--surface);padding:11px 14px}
.trend .m{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.1em;
 text-transform:uppercase;color:var(--muted);margin:0}
.trend .d{margin:4px 0 0;font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;
 font-family:Archivo,sans-serif}
.trend .d.better{color:var(--good-ink)}.trend .d.worse{color:var(--crit-ink)}
.trend .p{margin:2px 0 0;font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.bar{height:9px;border-radius:0 3px 3px 0;background:var(--s1);min-width:2px}
.barcell{width:26%;min-width:90px}
.foot{margin-top:56px;border-top:1px solid var(--rule);padding-top:20px}
.foot h3{font-size:13px}
.foot .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px;margin-top:12px}
.foot p{margin:0;font-size:12.5px;color:var(--muted);line-height:1.6}
.foot b{color:var(--ink-2)}
.empty{color:var(--muted);font-size:13px;font-style:italic}
"""

_LEVEL_LABEL = {"critical": "Fix now", "warning": "Watch", "good": "Strength", "info": "Note"}


def _e(value: object) -> str:
    return html.escape(str(value), quote=True)


def _fmt(value: float, kind: str = "num", currency: str = "RM") -> str:
    try:
        value = float(value)
    except (TypeError, ValueError):
        return "—"
    if kind == "money":
        return f"{currency}{value:,.2f}"
    if kind == "money0":
        return f"{currency}{value:,.0f}"
    if kind == "pct":
        return f"{value * 100:.2f}%"
    if kind == "pct3":
        return f"{value * 100:.3f}%"
    if kind == "x":
        return f"{value:,.1f}×"
    if kind == "int":
        return f"{value:,.0f}"
    return f"{value:,.2f}"


def _table(headers: list[str], rows: list[list[str]], empty: str = "No rows.") -> str:
    if not rows:
        return f'<p class="empty">{_e(empty)}</p>'
    head = "".join(f"<th>{_e(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="scroll"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def _bar(value: float, peak: float) -> str:
    width = (value / peak * 100) if peak else 0
    return f'<div class="bar" style="width:{max(width, 1.2):.1f}%"></div>'


def _hbar_svg(rows: list[tuple[str, float, str]], peak: float, width: int = 440) -> str:
    """Small labelled horizontal bar chart. `rows` is (label, value, display)."""
    if not rows:
        return '<p class="empty">Nothing to plot.</p>'
    row_h, pad_l, pad_r = 26, 168, 58
    height = len(rows) * row_h + 8
    parts = [
        f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" '
        f'style="display:block;max-width:100%">'
    ]
    for i, (label, value, display) in enumerate(rows):
        y = i * row_h
        bar_w = max((value / peak) * (width - pad_l - pad_r), 2) if peak else 2
        parts.append(
            f'<text x="{pad_l - 12}" y="{y + 17}" text-anchor="end" '
            f'style="font:11.5px \'IBM Plex Sans\',sans-serif;fill:var(--ink-2)">{_e(label)}</text>'
            f'<rect x="{pad_l}" y="{y + 6}" width="{bar_w:.1f}" height="14" rx="3" fill="var(--s1)"/>'
            f'<text x="{pad_l + bar_w + 8:.1f}" y="{y + 17}" '
            f'style="font:11px \'IBM Plex Mono\',monospace;fill:var(--ink);font-weight:500">'
            f'{_e(display)}</text>'
        )
    parts.append("</svg>")
    return "".join(parts)


def render(
    export: Export,
    analysis: Analysis,
    config: dict,
    trend: list[dict] | None = None,
    previous_label: str | None = None,
) -> str:
    cur = config.get("currency", "RM")
    t = analysis.totals
    c = analysis.confidence
    trend = trend or []
    money = lambda v: _fmt(v, "money", cur)

    # -- masthead ---------------------------------------------------------
    plate = "".join(
        f"<div><dt>{_e(k)}</dt><dd>{_e(v)}</dd></div>"
        for k, v in [
            ("Shop", export.shop_name or "—"),
            ("Shop ID", export.shop_id or "—"),
            ("Period", export.period_label),
            ("Days", t["days"]),
            ("Bidding", export.bidding_method or "—"),
            ("Rows", f"{t['rows']:,}"),
            ("Keywords", f"{t['keywords']:,}"),
            ("Queries", f"{t['queries']:,}"),
        ]
    )

    trend_by_metric = {d["metric"]: d for d in trend}

    def kpi(label, value, sub, metric=None, flag=""):
        note, cls = sub, ""
        if metric and metric in trend_by_metric:
            d = trend_by_metric[metric]
            sign = "+" if d["delta"] >= 0 else ""
            note = f"{sign}{d['delta']:.1f}{d['unit']} vs last"
            cls = d["verdict"] if d["verdict"] in {"better", "worse"} else ""
        return (f'<div class="kpi"><p class="lab">{_e(label)}</p>'
                f'<p class="val"{flag}>{value}</p>'
                f'<p class="sub {cls}">{_e(note)}</p></div>')

    kpis = "".join([
        kpi("Spend", _fmt(t["spend"], "money0", cur), f"{money(t['spend_per_day'])} / day", "spend"),
        kpi("GMV", _fmt(t["gmv"], "money0", cur), f"direct {_fmt(t['direct_gmv'], 'money0', cur)}", "gmv"),
        kpi("ROAS", _fmt(t["roas"], "x"), f"CI {c['roas_low']:.1f}–{c['roas_high']:.1f}", "roas"),
        kpi("ACOS", _fmt(t["acos"], "pct"), "spend / GMV", "acos"),
        kpi("AOV", _fmt(t["aov"], "money0", cur) if t["conversions"] else "—", "per order"),
        kpi("Cost / order", money(t["cpa"]) if t["conversions"] else "—",
            "n too small" if not c["reliable"] else "per order"),
        kpi("Impressions", _fmt(t["impressions"], "int"), f"{t['rows']:,} rows", "impressions"),
        kpi("Share of voice", _fmt(t["sov"], "pct"), "impression-weighted", "sov"),
        kpi("CTR", _fmt(t["ctr"], "pct"), f"{_fmt(t['clicks'], 'int')} clicks", "ctr"),
        kpi("Conv. rate", _fmt(t["cvr"], "pct"), f"{t['conversions']:,.0f} orders", "cvr"),
        kpi("CPC", money(t["cpc"]), "per click", "cpc"),
        kpi("Product CTR", _fmt(t["product_ctr"], "pct3"),
            f"{t['product_clicks']:,.0f} tile clicks", "product_ctr"),
    ])

    # -- trend strip ------------------------------------------------------
    if trend:
        cells = "".join(
            f'<div><p class="m">{_e(d["metric"].replace("_", " "))}</p>'
            f'<p class="d {d["verdict"] if d["verdict"] in {"better", "worse"} else ""}">'
            f'{"+" if d["delta"] >= 0 else ""}{d["delta"]:.1f}{d["unit"]}</p>'
            f'<p class="p">{d["previous"]:,.3f} &rarr; {d["current"]:,.3f}</p></div>'
            for d in trend
        )
        trend_block = (
            '<section><div class="shead"><p class="eyebrow">Trend</p>'
            f'<h2>Change since {_e(previous_label or "the previous export")}</h2>'
            "<p>Percentage-point change for rates, percentage change for totals. "
            "Colour marks the direction that is better for that metric.</p></div>"
            f'<div class="trend">{cells}</div></section>'
        )
    else:
        trend_block = (
            '<section><div class="shead"><p class="eyebrow">Trend</p>'
            "<h2>No history yet</h2><p>This is the first export stored for this shop. "
            "Drop a second export in and every metric above gains a change-since figure, "
            "which is the comparison a single export can never give you.</p></div></section>"
        )

    # -- findings ---------------------------------------------------------
    findings = "".join(
        f'<div class="find"><span class="tagx {_e(f["level"])}">'
        f'{_e(_LEVEL_LABEL.get(f["level"], f["level"]))}</span>'
        f'<div><h4>{_e(f["title"])}</h4><p>{_e(f["detail"])}</p></div></div>'
        for f in analysis.findings
    ) or '<p class="empty">No findings triggered.</p>'

    # -- tables -----------------------------------------------------------
    peak_kw = max((k["spend"] for k in analysis.keywords), default=0)
    kw_rows = [[
        f'<span class="q">{_e(k["keyword"])}</span>',
        money(k["spend"]), _bar(k["spend"], peak_kw),
        (f'<span class="{"zero" if k["on_theme_spend"] < 0.20 else ""}">'
         f'{k["on_theme_spend"] * 100:.1f}%</span>') if k["on_theme_spend"] is not None else "—",
        _fmt(k["ctr"], "pct"), money(k["cpc"]),
        money(k["gmv"]) if k["gmv"] else '<span class="zero">—</span>',
        f'{k["conversions"]:,.0f}' if k["conversions"] else '<span class="zero">0</span>',
        _fmt(k["roas"], "x") if k["gmv"] else '<span class="zero">0.0×</span>',
        f'{k["queries"]:,}',
    ] for k in analysis.keywords]

    seg_rows = [[
        _e(s["segment"]), money(s["spend"]), _fmt(s["spend_share"], "pct"),
        _fmt(s["ctr"], "pct"), money(s["cpc"]),
        f'{s["conversions"]:,.0f}' if s["conversions"] else '<span class="zero">0</span>',
        money(s["gmv"]) if s["gmv"] else "—",
        _fmt(s["roas"], "x") if s["gmv"] else '<span class="zero">0.0×</span>',
    ] for s in analysis.segments]

    theme_rows = [[
        _e(x["theme"]), f'{x["queries"]:,}', _fmt(x["impressions"], "int"),
        _fmt(x["clicks"], "int"), _fmt(x["ctr"], "pct"), money(x["spend"]),
        f'{x["product_clicks"]:,.0f}',
        f'{x["conversions"]:,.0f}' if x["conversions"] else '<span class="zero">0</span>',
    ] for x in analysis.themes]

    cpc_rows = [[
        f'{cur} {_e(b["band"])}', money(b["spend"]), _fmt(b["spend_share"], "pct"),
        _fmt(b["ctr"], "pct"),
        f'{b["conversions"]:,.0f}' if b["conversions"] else '<span class="zero">0</span>',
        _fmt(b["roas"], "x") if b["gmv"] else "—",
    ] for b in analysis.cpc_bands]

    tail_rows = [[
        _e(b["band"]), f'{b["queries"]:,}', money(b["spend"]), _fmt(b["spend_share"], "pct"),
        _fmt(b["ctr"], "pct"),
        f'{b["conversions"]:,.0f}' if b["conversions"] else '<span class="zero">0</span>',
    ] for b in analysis.tail_bands]

    peak_waste = max((w["spend"] for w in analysis.waste), default=0)
    waste_rows = [[
        f'<span class="q">{_e(w["query"])}</span>', _fmt(w["impressions"], "int"),
        _fmt(w["clicks"], "int"), money(w["spend"]), _fmt(w["ctr"], "pct"),
        _bar(w["spend"], peak_waste),
    ] for w in analysis.waste]

    cand_rows = [[
        f'<span class="q">{_e(x["query"])}</span>', _e(x["match"]),
        _fmt(x["impressions"], "int"), _fmt(x["clicks"], "int"),
        (f'<span class="ok">{x["ctr"] * 100:.1f}%</span>'
         if x["ctr"] >= config["thresholds"]["high_intent_ctr"] else f'{x["ctr"] * 100:.1f}%'),
        f'{x["product_clicks"]:,.0f}' if x["product_clicks"] else "—",
        _e(x["reason"]),
    ] for x in analysis.candidates[:60]]

    neg_rows = [[
        f'<span class="q">{_e(n["query"])}</span>', _fmt(n["impressions"], "int"),
        _fmt(n["clicks"], "int"), money(n["spend"]),
    ] for n in analysis.negatives[:30]]

    win_rows = [[
        f'<span class="q">{_e(w["query"])}</span>',
        f'<span class="q">{_e(w["keyword"])}</span>',
        _fmt(w["clicks"], "int"), money(w["spend"]), money(w["gmv"]),
    ] for w in analysis.winners]

    seg_chart = _hbar_svg(
        [(s["segment"], s["ctr"], f'{s["ctr"] * 100:.2f}%') for s in analysis.segments],
        max((s["ctr"] for s in analysis.segments), default=0),
    )
    theme_chart = _hbar_svg(
        [(x["theme"], x["impressions"], f'{x["impressions"]:,.0f}') for x in analysis.themes[:8]],
        max((x["impressions"] for x in analysis.themes), default=0),
    )

    p = analysis.pareto
    generated = datetime.now().strftime("%d %b %Y, %H:%M")

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shop Ads Report &mdash; {_e(export.shop_name or export.source_path.stem)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>{CSS}</style></head><body><div class="wrap">

<header class="mast">
  <p class="eyebrow">Shop&plus; Ads diagnostic &middot; generated offline {_e(generated)}</p>
  <h1>{_e(export.shop_name or "Shop Ads Report")}</h1>
  <p class="dek">{_e(export.period_label)} &middot; {t['rows']:,} keyword&times;query rows &middot;
     {money(t['spend'])} spend against {money(t['gmv'])} GMV.</p>
  <dl class="plate">{plate}</dl>
</header>

<div class="kpis">{kpis}</div>

<section>
  <div class="shead"><p class="eyebrow">Diagnosis</p><h2>What this export is telling you</h2>
  <p>Findings are generated from thresholds in <span class="mono">shopads.config.json</span>.
     Each carries the figure that triggered it, so you can disagree with the rule and still
     see the number.</p></div>
  <div class="panel">{findings}</div>
</section>

{trend_block}

<section>
  <div class="shead"><p class="eyebrow">Keywords</p><h2>Where the money went</h2>
  <p><strong>On-theme</strong> is the share of a keyword&rsquo;s budget that reached queries in its
     own product category. Below 20&percnt; the keyword is not targeting its subject &mdash; it is a
     broad-match funnel wearing a product name.</p></div>
  <div class="panel">
    {_table(["Keyword", "Spend", "", "On-theme", "CTR", "CPC", "GMV", "Orders", "ROAS", "Queries"], kw_rows)}
  </div>
</section>

<section>
  <div class="shead"><p class="eyebrow">Intent</p><h2>Who is actually searching</h2>
  <p>Segments are derived from the query text and are mutually exclusive, brand first.
     Edit the patterns in the config to match how your buyers really search.</p></div>
  <div class="grid2">
    <div class="panel"><h3>Segment performance</h3>
      <p class="cap">Rates recomputed from summed totals, never averaged across rows.</p>
      {_table(["Segment", "Spend", "Share", "CTR", "CPC", "Orders", "GMV", "ROAS"], seg_rows)}</div>
    <div class="panel"><h3>Click-through by segment</h3>
      <p class="cap">The segment that earns clicks most cheaply is usually where to defend first.</p>
      {seg_chart}</div>
  </div>
  <div class="grid2">
    <div class="panel"><h3>Demand by product theme</h3>
      <p class="cap">Themes are regex rules in the config. Tile clicks are the closest signal this
         export offers that your catalogue matched the search.</p>
      {_table(["Theme", "Queries", "Impr.", "Clicks", "CTR", "Spend", "Tile", "Orders"], theme_rows)}</div>
    <div class="panel"><h3>Impression volume by theme</h3>
      <p class="cap">Where the demand actually is, regardless of what you currently bid on.</p>
      {theme_chart}</div>
  </div>
</section>

<section>
  <div class="shead"><p class="eyebrow">Bidding</p><h2>Price, concentration and the tail</h2>
  <p>{p.get('queries_for_50pct', 0):,} queries carry half your spend, out of
     {p.get('paying_queries', 0):,} that charged you at all &mdash; a list small enough to govern by hand.</p></div>
  <div class="grid2">
    <div class="panel"><h3>Does paying more buy better traffic?</h3>
      <p class="cap">Rows bucketed by realised cost per click.</p>
      {_table(["CPC band", "Spend", "Share", "CTR", "Orders", "ROAS"], cpc_rows)}</div>
    <div class="panel"><h3>Spend by query rank</h3>
      <p class="cap">Watch for a deep tail that is cheap and engaged but never converts.</p>
      {_table(["Band", "Queries", "Spend", "Share", "CTR", "Orders"], tail_rows)}</div>
  </div>
</section>

<section>
  <div class="shead"><p class="eyebrow">Action</p><h2>What to change next</h2>
  <p>Two lists to work from: queries worth their own exact-match keyword, and queries worth
     blocking. Confirm both against your real catalogue before acting &mdash; this export records
     searches, not your inventory.</p></div>
  <div class="panel"><h3>Promote to their own keyword</h3>
    <p class="cap">Ranked by a score combining clicks, click-through rate, specification intent
       and any recorded order. Top 60 shown.</p>
    {_table(["Query", "Match", "Impr.", "Clicks", "CTR", "Tile", "Why"], cand_rows)}</div>
  <div class="grid2">
    <div class="panel"><h3>Highest-spend queries with no order</h3>
      <p class="cap">Not all are negatives &mdash; core category terms here need a landing fix,
         not a block.</p>
      {_table(["Query", "Impr.", "Clicks", "Spend", "CTR", ""], waste_rows)}</div>
    <div class="panel"><h3>Off-catalogue matches</h3>
      <p class="cap">Matched your off-catalogue patterns and returned nothing. Safe negatives.</p>
      {_table(["Query", "Impr.", "Clicks", "Spend"], neg_rows, "No off-catalogue spend found.")}</div>
  </div>
  <div class="panel"><h3>Every order in the period</h3>
    <p class="cap">The keyword you bid on beside the query the shopper typed. A wide gap between
       the two is broad-match drift, not a keyword that earned the sale.</p>
    {_table(["Shopper typed", "You bid on", "Clicks", "Cost", "Revenue"], win_rows,
            "No conversions recorded in this period.")}</div>
</section>

<div class="foot">
  <h3>Method &amp; caveats</h3>
  <div class="cols">
    <p><b>Aggregation.</b> Every rate is recomputed from summed numerators and denominators.
       Averaging {t['rows']:,} row-level percentages of unequal volume gives a wrong answer.</p>
    <p><b>Confidence.</b> ROAS interval from
       {config['thresholds']['bootstrap_samples']:,} bootstrap resamples of row-level GMV;
       CVR interval is a normal approximation. Both widen sharply below ~30 orders.</p>
    <p><b>Attribution.</b> Reported conversions include halo orders. Direct GMV is
       {money(t['direct_gmv'])} of {money(t['gmv'])}, so treat the ROAS above as the
       generous reading.</p>
    <p><b>Catalogue.</b> Product-tile clicks are used as a relevance proxy. That is suggestive,
       not proof &mdash; this file records searches, never your inventory.</p>
    <p><b>Not in this export.</b> No date dimension, so no seasonality or day-part analysis.
       Trend comes from comparing stored runs instead.</p>
    <p><b>Source.</b> <span class="mono">{_e(export.source_path.name)}</span> &middot;
       analysed offline, no data left this machine.</p>
  </div>
</div>

</div></body></html>"""


def write_report(
    export: Export,
    analysis: Analysis,
    config: dict,
    out_dir: Path,
    trend: list[dict] | None = None,
    previous_label: str | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = (export.period_end or datetime.now().date()).isoformat()
    slug = "".join(ch if ch.isalnum() else "-" for ch in export.source_path.stem)[:60].strip("-")
    path = out_dir / f"{stamp}_{slug}.html"
    counter = 2
    while path.exists():
        path = out_dir / f"{stamp}_{slug}_{counter}.html"
        counter += 1
    path.write_text(render(export, analysis, config, trend, previous_label), encoding="utf-8")
    return path
