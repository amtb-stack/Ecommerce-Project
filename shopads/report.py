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
from .glossary import tip as glossary_tip
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
 border-radius:3px;overflow:hidden;grid-template-columns:repeat(4,1fr)}
@media(max-width:820px){.plate{grid-template-columns:repeat(2,1fr)}}
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
/* the little "i" that explains a metric */
.i{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;
 border-radius:50%;border:1px solid var(--muted);background:transparent;color:var(--muted);
 font-family:"IBM Plex Sans",sans-serif;font-size:10px;font-weight:700;font-style:italic;
 line-height:1;padding:0;margin-left:6px;cursor:help;flex:none;vertical-align:middle;
 transition:color .12s,border-color .12s,background .12s}
.i:hover,.i:focus-visible{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
.i[aria-expanded="true"]{border-color:var(--accent);color:var(--surface);background:var(--accent)}
th .i{margin-left:5px}
.kpi .lab{display:flex;align-items:center}
#tip{position:fixed;z-index:90;pointer-events:none;opacity:0;visibility:hidden;
 transition:opacity .12s;width:max-content;max-width:min(340px,calc(100vw - 24px));
 background:var(--surface);color:var(--ink);border:1px solid var(--rule);border-radius:5px;
 padding:14px 16px;box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:13px;line-height:1.55;
 text-align:left;left:0;top:0}
#tip.on{opacity:1;visibility:visible}
#tip b{display:block;font-family:Archivo,sans-serif;font-size:13.5px;font-weight:600;
 margin-bottom:2px;color:var(--ink)}
#tip .tl{display:block;font-family:"IBM Plex Mono",monospace;font-size:9.5px;font-weight:500;
 letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:10px 0 2px}
/* how-to-read opener */
.howto{margin-top:16px;background:var(--surface);border:1px solid var(--rule);border-radius:4px;
 box-shadow:var(--shadow);overflow:hidden}
.howto>header{padding:17px 22px 15px;border-bottom:1px solid var(--rule)}
.howto h2{font-size:18px;font-weight:600;letter-spacing:-.012em}
.howto>header p{margin:6px 0 0;font-size:14px;color:var(--ink-2);max-width:76ch}
.howto .grid{display:grid;gap:1px;background:var(--rule);grid-template-columns:repeat(3,1fr)}
@media(max-width:820px){.howto .grid{grid-template-columns:1fr}}
.howto .grid>div{background:var(--surface);padding:16px 22px}
.howto .grid h3{font-size:13.5px;font-weight:600;display:flex;align-items:baseline;gap:8px}
.howto .grid h3 em{font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:10px;
 color:var(--accent);letter-spacing:.1em}
.howto .grid p{margin:6px 0 0;font-size:13.5px;color:var(--ink-2)}
.legendrow{display:flex;flex-wrap:wrap;gap:10px;padding:14px 22px;background:var(--surface);
 border-top:1px solid var(--rule);align-items:center}
.legendrow span:not(.tagx){font-size:13px;color:var(--ink-2)}
"""

TOOLTIP_HTML = """<div id="tip" role="tooltip"></div>
<script>
(function () {
  "use strict";
  var tip = document.getElementById("tip");
  var pinned = null;

  function place(button) {
    var r = button.getBoundingClientRect();
    var t = tip.getBoundingClientRect();
    var pad = 10;
    var left = r.left;
    var top = r.bottom + 8;
    if (left + t.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - t.width - pad);
    }
    if (top + t.height > window.innerHeight - pad) {
      top = r.top - t.height - 8;           // flip above when there is no room below
    }
    if (top < pad) { top = pad; }
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  function show(button) {
    tip.innerHTML = button.getAttribute("data-tip");
    tip.classList.add("on");
    place(button);
    button.setAttribute("aria-expanded", "true");
  }

  function hide(button) {
    tip.classList.remove("on");
    if (button) { button.setAttribute("aria-expanded", "false"); }
  }

  Array.prototype.forEach.call(document.querySelectorAll(".i"), function (button) {
    button.addEventListener("mouseenter", function () {
      if (!pinned) { show(button); }
    });
    button.addEventListener("mouseleave", function () {
      if (pinned !== button) { hide(button); }
    });
    button.addEventListener("focus", function () { show(button); });
    button.addEventListener("blur", function () {
      if (pinned !== button) { hide(button); }
    });
    // Tap to pin on touch screens, where there is no hover.
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (pinned === button) {
        pinned = null;
        hide(button);
      } else {
        if (pinned) { hide(pinned); }
        pinned = button;
        show(button);
      }
    });
  });

  document.addEventListener("click", function () {
    if (pinned) { hide(pinned); pinned = null; }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") { return; }
    if (pinned) { hide(pinned); pinned = null; } else { hide(document.activeElement); }
  });
  window.addEventListener("scroll", function () {
    if (pinned) { place(pinned); }
  }, { passive: true });
})();
</script>
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


def _info(key: str) -> str:
    """A small "i" button carrying the plain-language explanation of a metric."""
    text = glossary_tip(key)
    if not text:
        return ""
    return (
        f'<button type="button" class="i" aria-label="What this means" '
        f'aria-expanded="false" data-tip="{html.escape(text, quote=True)}">i</button>'
    )


def _table(headers, rows: list[list[str]], empty: str = "No rows.") -> str:
    if not rows:
        return f'<p class="empty">{_e(empty)}</p>'
    head = "".join(
        f"<th>{_e(h[0])}{_info(h[1])}</th>" if isinstance(h, tuple) else f"<th>{_e(h)}</th>"
        for h in headers
    )
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


def _economics_section(economics: dict, totals: dict, cur: str, money) -> str:
    """Profit and TACOS — only rendered once the shop supplies its own figures."""
    if not (economics.get("has_margin") or economics.get("has_revenue")):
        return (
            '<section><div class="shead"><p class="eyebrow">Profit</p>'
            "<h2>Two numbers away from profit analysis</h2>"
            "<p>ROAS counts revenue, and revenue is not profit. Open "
            '<span class="mono">shopads.config.json</span> and fill in <span class="mono">'
            'business.contribution_margin</span> (what is left of a sale after product cost, '
            "shipping, payment fees and returns) and <span class=\"mono\">"
            "business.total_shop_revenue</span> (all revenue for this period, ads or not). "
            "The next report will then show profit on ad spend, your break-even ROAS, and "
            "TACOS.</p></div></section>"
        )

    tiles = []
    if economics.get("has_margin"):
        poas = economics["poas"]
        tiles += [
            ("Profit on ad spend", f"{poas:,.1f}×",
             "above 1.0 makes money" if poas >= 1 else "below 1.0 loses money",
             "win" if poas >= 1 else "flag", "poas"),
            ("Break-even ROAS", f"{economics['breakeven_roas']:,.1f}×",
             f"at {economics['contribution_margin']:.0%} margin", "", "breakeven_roas"),
            ("Contribution", money(economics["contribution"]), "before ad cost",
             "", "contribution_margin"),
            ("Profit after ads", money(economics["profit_after_ads"]),
             "contribution minus spend",
             "win" if economics["profit_after_ads"] >= 0 else "flag", "poas"),
        ]
    if economics.get("has_revenue"):
        tiles += [
            ("TACOS", f"{economics['tacos'] * 100:,.2f}%", "spend / all revenue", "", "tacos"),
            ("Ad share of revenue", f"{economics['ad_share_of_revenue'] * 100:,.1f}%",
             "rest is organic", "", "tacos"),
        ]

    cells = "".join(
        f'<div class="kpi"><p class="lab">{_e(label)}{_info(key)}</p>'
        f'<p class="val" style="{"color:var(--good-ink)" if cls == "win" else "color:var(--crit-ink)" if cls == "flag" else ""}">{_e(value)}</p>'
        f'<p class="sub">{_e(note)}</p></div>'
        for label, value, note, cls, key in tiles
    )
    return (
        '<section><div class="shead"><p class="eyebrow">Profit</p>'
        f"<h2>Whether the advertising actually made money{_info('poas')}</h2>"
        "<p>ROAS counts revenue. These count what is left after the cost of the goods, and what "
        "advertising costs against the whole shop rather than only its attributed sales.</p></div>"
        f'<div class="kpis">{cells}</div></section>'
    )


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

    def kpi(label, value, sub, metric=None, tip_key=None):
        note, cls = sub, ""
        if metric and metric in trend_by_metric:
            d = trend_by_metric[metric]
            sign = "+" if d["delta"] >= 0 else ""
            note = f"{sign}{d['delta']:.1f}{d['unit']} vs last"
            cls = d["verdict"] if d["verdict"] in {"better", "worse"} else ""
        return (f'<div class="kpi"><p class="lab">{_e(label)}{_info(tip_key or metric or "")}</p>'
                f'<p class="val">{value}</p>'
                f'<p class="sub {cls}">{_e(note)}</p></div>')

    kpis = "".join([
        kpi("Spend", _fmt(t["spend"], "money0", cur), f"{money(t['spend_per_day'])} / day", "spend", "cpc"),
        kpi("GMV", _fmt(t["gmv"], "money0", cur), f"direct {_fmt(t['direct_gmv'], 'money0', cur)}", "gmv", "gmv"),
        kpi("ROAS", _fmt(t["roas"], "x"), f"CI {c['roas_low']:.1f}–{c['roas_high']:.1f}", "roas", "roas"),
        kpi("ACOS", _fmt(t["acos"], "pct"), "spend / GMV", "acos", "acos"),
        kpi("AOV", _fmt(t["aov"], "money0", cur) if t["conversions"] else "—", "per order", None, "aov"),
        kpi("Cost / order", money(t["cpa"]) if t["conversions"] else "—",
            "n too small" if not c["reliable"] else "per order", None, "cpa"),
        kpi("Impressions", _fmt(t["impressions"], "int"), f"{t['rows']:,} rows", "impressions", "impressions"),
        kpi("Share of voice", _fmt(t["sov"], "pct"), "impression-weighted", "sov", "sov"),
        kpi("CTR", _fmt(t["ctr"], "pct"), f"{_fmt(t['clicks'], 'int')} clicks", "ctr", "ctr"),
        kpi("Conv. rate", _fmt(t["cvr"], "pct"), f"{t['conversions']:,.0f} orders", "cvr", "cvr"),
        kpi("CPC", money(t["cpc"]), "per click", "cpc", "cpc"),
        kpi("Product CTR", _fmt(t["product_ctr"], "pct3"),
            f"{t['product_clicks']:,.0f} tile clicks", "product_ctr", "product_ctr"),
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

    gram = lambda n: [[
        f'<span class="q">{_e(x["phrase"])}</span>', money(x["spend"]),
        f'{x["queries"]:,.0f}', _fmt(x["clicks"], "int"), _fmt(x["ctr"], "pct"),
        f'{x["conversions"]:,.0f}' if x["conversions"] else '<span class="zero">0</span>',
    ] for x in analysis.ngrams if x["size"] == n][:14]
    gram1_rows, gram2_rows = gram(1), gram(2)

    dead_rows = [[
        f'<span class="q">{_e(x["phrase"])}</span>', f'{x["size"]}', money(x["spend"]),
        f'{x["queries"]:,.0f}', _fmt(x["clicks"], "int"), _fmt(x["ctr"], "pct"),
    ] for x in analysis.ngrams
        if x["conversions"] == 0 and x["queries"] >= 5 and x["spend"] >= 5][:20]

    block_rows = [[
        f'<span class="q">{_e(b["query"])}</span>', _fmt(b["impressions"], "int"),
        _fmt(b["clicks"], "int"), money(b["spend"]), _fmt(b["ctr"], "pct"),
    ] for b in analysis.blocklist[:25]]

    economics_block = _economics_section(analysis.economics, t, cur, money)

    _INFO_POAS = _info("poas")
    _INFO_NGRAM = _info("ngram")
    _INFO_ONTHEME = _info("on_theme_spend")
    _INFO_SEGMENT = _info("segment")
    _INFO_CONC = _info("spend_concentration")

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

<div class="howto">
  <header>
    <h2>New to this report? Read this first.</h2>
    <p>Every number here comes from your own Shopee export. You do not need to understand
       advertising to use it &mdash; hover the small <span class="mono">i</span> beside any metric and
       it explains, in plain words, what the number is, how it was worked out, why it matters and
       what a healthy value looks like. On a phone, tap it instead.</p>
  </header>
  <div class="grid">
    <div><h3><em>1</em>Start with the diagnosis</h3>
      <p>The next section lists what is wrong and what is working, worst first. If you only read one
         part of this report, read that one. Everything below it is the supporting evidence.</p></div>
    <div><h3><em>2</em>Trust rates, not totals</h3>
      <p>A big spend number means nothing on its own. The rates &mdash; click-through, conversion,
         cost per click &mdash; are what tell you whether the money worked.</p></div>
    <div><h3><em>3</em>Compare to yourself</h3>
      <p>Ignore what other shops achieve. The useful comparison is this export against your last one,
         which appears automatically from your second export onward.</p></div>
  </div>
  <div class="legendrow">
    <span class="tagx critical">Fix now</span><span>costing you money or misleading you</span>
    <span class="tagx warning">Watch</span><span>worth acting on soon</span>
    <span class="tagx good">Strength</span><span>keep doing it</span>
    <span class="tagx info">Note</span><span>context, no action needed</span>
  </div>
</div>

<section>
  <div class="shead"><p class="eyebrow">Diagnosis</p><h2>What this export is telling you</h2>
  <p>Findings are generated from thresholds in <span class="mono">shopads.config.json</span>.
     Each carries the figure that triggered it, so you can disagree with the rule and still
     see the number.</p></div>
  <div class="panel">{findings}</div>
</section>

{trend_block}

<section>
  <div class="shead"><p class="eyebrow">Keywords</p><h2>Where the money went{_INFO_ONTHEME}</h2>
  <p><strong>On-theme</strong> is the share of a keyword&rsquo;s budget that reached queries in its
     own product category. Below 20&percnt; the keyword is not targeting its subject &mdash; it is a
     broad-match funnel wearing a product name.</p></div>
  <div class="panel">
    {_table(["Keyword", "Spend", "", ("On-theme", "on_theme_spend"), ("CTR", "ctr"),
            ("CPC", "cpc"), ("GMV", "gmv"), ("Orders", "conversions"), ("ROAS", "roas"),
            "Queries"], kw_rows)}
  </div>
</section>

<section>
  <div class="shead"><p class="eyebrow">Intent</p><h2>Who is actually searching{_INFO_SEGMENT}</h2>
  <p>Segments are derived from the query text and are mutually exclusive, brand first.
     Edit the patterns in the config to match how your buyers really search.</p></div>
  <div class="grid2">
    <div class="panel"><h3>Segment performance</h3>
      <p class="cap">Rates recomputed from summed totals, never averaged across rows.</p>
      {_table([("Segment", "segment"), "Spend", "Share", ("CTR", "ctr"), ("CPC", "cpc"),
                ("Orders", "conversions"), ("GMV", "gmv"), ("ROAS", "roas")], seg_rows)}</div>
    <div class="panel"><h3>Click-through by segment</h3>
      <p class="cap">The segment that earns clicks most cheaply is usually where to defend first.</p>
      {seg_chart}</div>
  </div>
  <div class="grid2">
    <div class="panel"><h3>Demand by product theme</h3>
      <p class="cap">Themes are regex rules in the config. Tile clicks are the closest signal this
         export offers that your catalogue matched the search.</p>
      {_table([("Theme", "theme"), "Queries", ("Impr.", "impressions"), ("Clicks", "clicks"),
                ("CTR", "ctr"), "Spend", ("Tile", "product_ctr"),
                ("Orders", "conversions")], theme_rows)}</div>
    <div class="panel"><h3>Impression volume by theme</h3>
      <p class="cap">Where the demand actually is, regardless of what you currently bid on.</p>
      {theme_chart}</div>
  </div>
</section>

{economics_block}

<section>
  <div class="shead"><p class="eyebrow">Phrases</p><h2>What single words are costing you{_INFO_NGRAM}</h2>
  <p>Spend rolled up to every one-, two- and three-word phrase across all
     {t['queries']:,} search queries. A word can drain budget across hundreds of queries while
     looking harmless in each one; only this view catches that.</p></div>
  <div class="grid2">
    <div class="panel"><h3>Single words</h3>
      <p class="cap">Ranked by spend. <strong>Queries</strong> is how many distinct searches
         contained the word.</p>
      {_table([("Word", "ngram"), "Spend", "Queries", ("Clicks", "clicks"), ("CTR", "ctr"),
                ("Orders", "conversions")], gram1_rows)}</div>
    <div class="panel"><h3>Two-word phrases</h3>
      <p class="cap">Usually the most actionable level — specific enough to act on, broad enough
         to matter.</p>
      {_table([("Phrase", "ngram"), "Spend", "Queries", ("Clicks", "clicks"), ("CTR", "ctr"),
                ("Orders", "conversions")], gram2_rows)}</div>
  </div>
  <div class="panel"><h3>Phrases that never convert</h3>
    <p class="cap">Spend across five or more queries, no orders anywhere. Check each against your
       catalogue: a phrase you do stock needs a listing fix, one you don't is a negative.</p>
    {_table([("Phrase", "ngram"), "Words", "Spend", "Queries", ("Clicks", "clicks"),
             ("CTR", "ctr")], dead_rows,
            "Every phrase with meaningful spend has converted at least once.")}</div>
</section>

<section>
  <div class="shead"><p class="eyebrow">Bidding</p><h2>Price, concentration and the tail{_INFO_CONC}</h2>
  <p>{p.get('queries_for_50pct', 0):,} queries carry half your spend, out of
     {p.get('paying_queries', 0):,} that charged you at all &mdash; a list small enough to govern by hand.</p></div>
  <div class="grid2">
    <div class="panel"><h3>Does paying more buy better traffic?</h3>
      <p class="cap">Rows bucketed by realised cost per click.</p>
      {_table([("CPC band", "cpc"), "Spend", "Share", ("CTR", "ctr"),
                ("Orders", "conversions"), ("ROAS", "roas")], cpc_rows)}</div>
    <div class="panel"><h3>Spend by query rank</h3>
      <p class="cap">Watch for a deep tail that is cheap and engaged but never converts.</p>
      {_table([("Band", "spend_concentration"), "Queries", "Spend", "Share", ("CTR", "ctr"),
                ("Orders", "conversions")], tail_rows)}</div>
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
    {_table(["Query", ("Match", "match_type"), ("Impr.", "impressions"), ("Clicks", "clicks"),
             ("CTR", "ctr"), ("Tile", "product_ctr"), "Why"], cand_rows)}</div>
  <div class="grid2">
    <div class="panel"><h3>Highest-spend queries with no order</h3>
      <p class="cap">Not all are negatives &mdash; core category terms here need a landing fix,
         not a block.</p>
      {_table(["Query", ("Impr.", "impressions"), ("Clicks", "clicks"), "Spend",
                ("CTR", "ctr"), ""], waste_rows)}</div>
    <div class="panel"><h3>Off-catalogue matches</h3>
      <p class="cap">Matched your off-catalogue patterns and returned nothing. Safe negatives.</p>
      {_table([("Query", "negative_keyword"), ("Impr.", "impressions"), ("Clicks", "clicks"),
                "Spend"], neg_rows, "No off-catalogue spend found.")}</div>
  </div>
  <div class="panel"><h3>Queries that have earned a block</h3>
    <p class="cap">Shown at least {int(config['thresholds'].get('block_after_impressions', 1000)):,}
       times each and never converted. A term with that much exposure and no order has answered
       the question — this is the safest negative list in the report.</p>
    {_table([("Query", "negative_keyword"), ("Impr.", "impressions"), ("Clicks", "clicks"),
            "Spend", ("CTR", "ctr")], block_rows,
            "No query has passed the impression threshold without converting.")}</div>
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

</div>
{TOOLTIP_HTML}
</body></html>"""


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
