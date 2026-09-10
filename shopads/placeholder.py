"""The page each report shows before anything has been dropped in.

Both reports exist from the moment the tool is installed. An empty folder on
day one reads as a failed install; a page that names the file to drop and where
to put it does not, and it is the same page the report falls back to if the
history is ever cleared.
"""

from __future__ import annotations

KINDS = {
    "shop": {
        "title": "Shop Performance Report",
        "lede": "Nothing analysed yet.",
        "what": "your shop statistics workbook",
        "where": "Shopee Seller Centre → Business Insights → Export",
        "looks": "thebaker.os.shopee-shop-stats.20260901-20260908.xlsx",
        "gives": [
            ("Every tab in one table",
             "All twelve sheets joined into one row per product, so a product's "
             "traffic, conversion and sales sit side by side instead of in "
             "twelve places."),
            ("The four groups",
             "Each product placed by its traffic against its conversion, split "
             "at your shop's own medians. A product nobody sees and a product "
             "everybody sees and rejects need opposite work."),
            ("A day-by-day tracker",
             "Drop one every morning and the report opens with what moved since "
             "yesterday, what is unusual for your shop, and what to look at "
             "first. Days are stored by date, so overlapping exports correct "
             "each other rather than double-counting."),
        ],
    },
    "ads": {
        "title": "Keywords Ads Report",
        "lede": "Nothing analysed yet.",
        "what": "your Shop+ Ads keyword export",
        "where": "Shopee Seller Centre → Marketing Centre → Shop Ads → Export",
        "looks": "ShopAdsData_01_06_2026-01_09_2026.csv",
        "gives": [
            ("What you bid on against what shoppers typed",
             "Keyword and search-query performance side by side, which is the "
             "only way to see a broad match spending on the wrong thing."),
            ("Phrase-level spend",
             "Spend rolled up by one-, two- and three-word phrases, so a leak "
             "spread thinly across fifty queries still shows up as one number."),
            ("What to add, and what to block",
             "Queries worth their own keyword, and queries that have taken "
             "enough impressions to have proven they will not convert."),
        ],
    },
}

CSS = """
:root{color-scheme:light;--bg:#fbfbfd;--surface:#fff;--sunken:#f4f4f7;--ink:#111114;
 --ink-2:#5f5f68;--ink-3:#86868b;--faint:#a6a6ad;--hair:#e6e6eb;--accent:#ff6b00;
 --accent-wash:#fff2e8;--shadow:0 1px 3px rgba(17,17,20,.05),0 8px 28px rgba(17,17,20,.05)}
:root:not([data-theme="light"]){}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){
 color-scheme:dark;--bg:#08080a;--surface:#141417;--sunken:#1c1c20;--ink:#f4f4f6;
 --ink-2:#a3a3ac;--ink-3:#86868b;--faint:#6a6a72;--hair:#28282e;--accent:#ff8534;
 --accent-wash:#2a1a0d;--shadow:0 1px 3px rgba(0,0,0,.4),0 8px 28px rgba(0,0,0,.45)}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#08080a;--surface:#141417;--sunken:#1c1c20;
 --ink:#f4f4f6;--ink-2:#a3a3ac;--ink-3:#86868b;--faint:#6a6a72;--hair:#28282e;
 --accent:#ff8534;--accent-wash:#2a1a0d;
 --shadow:0 1px 3px rgba(0,0,0,.4),0 8px 28px rgba(0,0,0,.45)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
 -webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:64px 20px 96px}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
 color:var(--accent);margin:0 0 10px}
h1{margin:0;font-size:clamp(30px,6vw,44px);font-weight:800;letter-spacing:-.035em;line-height:1.08}
.lede{margin:14px 0 0;font-size:18px;color:var(--ink-2);max-width:52ch}
.card{background:var(--surface);border:1px solid var(--hair);border-radius:20px;
 padding:26px 28px;margin-top:34px;box-shadow:var(--shadow)}
.card h2{margin:0 0 4px;font-size:19px;font-weight:800;letter-spacing:-.02em}
ol{margin:16px 0 0;padding:0;list-style:none;counter-reset:s}
ol li{counter-increment:s;position:relative;padding:0 0 0 40px;margin:0 0 18px}
ol li:last-child{margin-bottom:0}
ol li::before{content:counter(s);position:absolute;left:0;top:0;width:26px;height:26px;
 border-radius:50%;background:var(--accent-wash);color:var(--accent);font-size:13px;
 font-weight:800;display:flex;align-items:center;justify-content:center}
ol li b{display:block;font-size:15.5px;font-weight:700;letter-spacing:-.01em}
ol li p{margin:3px 0 0;color:var(--ink-2);font-size:14.5px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;
 background:var(--sunken);padding:2px 7px;border-radius:6px}
/* A filename is one token. Left to wrap it breaks mid-word across three lines,
   so it gets its own line and scrolls sideways inside it instead. */
code.file{display:block;margin:8px 0 0;padding:9px 12px;border-radius:9px;
 white-space:nowrap;overflow-x:auto;color:var(--ink-2)}
.give{border-top:1px solid var(--hair);padding-top:18px;margin-top:18px}
.give:first-of-type{border-top:0;padding-top:0;margin-top:16px}
.give b{display:block;font-size:15.5px;font-weight:700;letter-spacing:-.01em}
.give p{margin:3px 0 0;color:var(--ink-2);font-size:14.5px}
.note{margin-top:34px;padding:16px 20px;border-radius:14px;background:var(--sunken);
 color:var(--ink-2);font-size:14px}
.note b{color:var(--ink)}
"""


def _e(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def waiting_page(kind: str) -> str:
    """The full HTML of a report that has nothing to show yet."""
    k = KINDS[kind]
    gives = "".join(
        f'<div class="give"><b>{_e(title)}</b><p>{_e(body)}</p></div>'
        for title, body in k["gives"]
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(k['title'])}</title>
<meta name="generator" content="shopads-waiting">
<style>{CSS}</style></head><body>
<div class="wrap">
  <p class="eyebrow">{_e(k['title'])}</p>
  <h1>{_e(k['lede'])}</h1>
  <p class="lede">This file is where {_e(k['what'])} will be analysed. It stays at
     this name and refreshes itself every time you drop a new one, so you can keep
     this tab open and just reload it.</p>

  <div class="card">
    <h2>To fill it in</h2>
    <ol>
      <li><b>Export {_e(k['what'])} from Shopee</b>
          <p>{_e(k['where'])}</p></li>
      <li><b>Drop the file into the <code>drop</code> folder</b>
          <p>The tool works out which report a file belongs to by reading it, so
             you never have to say. Yours will be named something like:</p>
          <code class="file">{_e(k['looks'])}</code></li>
      <li><b>Reload this page</b>
          <p>The file moves itself into <code>drop/processed</code> and this report
             fills in. Nothing is uploaded anywhere.</p></li>
    </ol>
  </div>

  <div class="card">
    <h2>What it will tell you</h2>
    {gives}
  </div>

  <p class="note"><b>Two reports, always.</b> This one and the other never
     multiply into a folder of dated files. Each new export replaces the contents
     of the report it belongs to, so the newest reading is the only one open.</p>
</div>
</body></html>
"""
