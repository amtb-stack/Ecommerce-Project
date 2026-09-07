"""Stylesheet and client script for the report application.

The report is one self-contained HTML file opened from disk, so everything
ships inline: no build step, no CDN, no network. Python emits a JSON payload
and this app renders it, which is why sorting, filtering and search are
instant on twenty thousand rows.
"""

from __future__ import annotations

CSS = """
:root{
  color-scheme:light;
  --page:#f4f5f8; --surface:#ffffff; --sunken:#eceef3; --raised:#f8f9fb;
  --ink:#14161d; --ink-2:#4a5060; --ink-3:#767d8f; --muted:#8d94a5;
  --line:#e2e5ec; --line-2:#eef0f4; --ring:rgba(91,76,214,.32);
  --accent:#5b4cd6; --accent-ink:#4a3cc4; --accent-soft:#efedfd; --accent-line:#d9d4f8;
  --s1:#2a78d6; --s2:#eb6834; --s3:#1baf7a;
  --o1:#86b6ef; --o2:#5598e7; --o3:#2a78d6; --o4:#1c5cab; --o5:#104281;
  --good:#0ca30c; --good-ink:#0a7a22; --good-bg:#e7f6ea; --good-line:#bfe5c8;
  --warn:#fab219; --warn-ink:#8a5d00; --warn-bg:#fdf3dd; --warn-line:#f4dfae;
  --crit:#d03b3b; --crit-ink:#b02525; --crit-bg:#fdecec; --crit-line:#f6c9c9;
  --info-ink:#1f5f96; --info-bg:#e8f1fa; --info-line:#c6dcf0;
  --sh-1:0 1px 2px rgba(20,22,29,.06);
  --sh-2:0 2px 8px rgba(20,22,29,.08);
  --sh-3:0 12px 32px rgba(20,22,29,.14);
  --nav-w:236px; --top-h:60px;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  color-scheme:dark;
  --page:#0d0f14; --surface:#161922; --sunken:#11141b; --raised:#1c202a;
  --ink:#eef0f5; --ink-2:#adb4c4; --ink-3:#848b9c; --muted:#6f7688;
  --line:#252a35; --line-2:#1e222c; --ring:rgba(139,128,240,.4);
  --accent:#8b80f0; --accent-ink:#a49bf5; --accent-soft:#20203a; --accent-line:#33325c;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70;
  --o1:#cde2fb; --o2:#9ec5f4; --o3:#6da7ec; --o4:#3987e5; --o5:#256abf;
  --good:#0ca30c; --good-ink:#4cc95f; --good-bg:#10241a; --good-line:#1d4128;
  --warn:#fab219; --warn-ink:#e8ab3c; --warn-bg:#2a2113; --warn-line:#463719;
  --crit:#d03b3b; --crit-ink:#f07878; --crit-bg:#2b1618; --crit-line:#4a2326;
  --info-ink:#7cb6e8; --info-bg:#122132; --info-line:#1f3a54;
  --sh-1:0 1px 2px rgba(0,0,0,.4); --sh-2:0 2px 8px rgba(0,0,0,.45);
  --sh-3:0 12px 32px rgba(0,0,0,.6);
}}
:root[data-theme="dark"]{
  color-scheme:dark;
  --page:#0d0f14; --surface:#161922; --sunken:#11141b; --raised:#1c202a;
  --ink:#eef0f5; --ink-2:#adb4c4; --ink-3:#848b9c; --muted:#6f7688;
  --line:#252a35; --line-2:#1e222c; --ring:rgba(139,128,240,.4);
  --accent:#8b80f0; --accent-ink:#a49bf5; --accent-soft:#20203a; --accent-line:#33325c;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70;
  --o1:#cde2fb; --o2:#9ec5f4; --o3:#6da7ec; --o4:#3987e5; --o5:#256abf;
  --good:#0ca30c; --good-ink:#4cc95f; --good-bg:#10241a; --good-line:#1d4128;
  --warn:#fab219; --warn-ink:#e8ab3c; --warn-bg:#2a2113; --warn-line:#463719;
  --crit:#d03b3b; --crit-ink:#f07878; --crit-bg:#2b1618; --crit-line:#4a2326;
  --info-ink:#7cb6e8; --info-bg:#122132; --info-line:#1f3a54;
  --sh-1:0 1px 2px rgba(0,0,0,.4); --sh-2:0 2px 8px rgba(0,0,0,.45);
  --sh-3:0 12px 32px rgba(0,0,0,.6);
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0; background:var(--page); color:var(--ink);
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:14px; line-height:1.55; -webkit-font-smoothing:antialiased;
  font-variant-numeric:tabular-nums;
}
.mono{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
button{font:inherit; color:inherit}
:focus-visible{outline:2px solid var(--accent); outline-offset:2px; border-radius:4px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}

/* ---------------------------------------------------------- app shell -- */
.app{display:grid; grid-template-columns:var(--nav-w) 1fr; min-height:100vh}

.side{
  background:var(--surface); border-right:1px solid var(--line);
  display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto;
}
.brand{padding:18px 18px 14px; border-bottom:1px solid var(--line-2)}
.brand .mark{display:flex; align-items:center; gap:9px}
.brand .glyph{
  width:26px; height:26px; border-radius:7px; background:var(--accent); flex:none;
  display:flex; align-items:center; justify-content:center; color:#fff;
  font-weight:800; font-size:13px; letter-spacing:-.02em;
}
.brand h1{margin:0; font-size:14px; font-weight:700; letter-spacing:-.015em}
.brand .shop{margin:12px 0 0; font-size:12.5px; color:var(--ink-2); font-weight:600;
  line-height:1.35; overflow-wrap:anywhere}
.brand .period{margin:3px 0 0; font-size:11.5px; color:var(--muted)}

.nav{padding:10px; display:flex; flex-direction:column; gap:2px; flex:1}
.nav .grouplabel{
  font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--muted); padding:14px 10px 6px;
}
.nav button{
  display:flex; align-items:center; gap:10px; width:100%; text-align:left;
  background:transparent; border:0; border-radius:7px; padding:8px 10px; cursor:pointer;
  font-size:13.5px; font-weight:600; color:var(--ink-2); transition:background .12s,color .12s;
}
.nav button:hover{background:var(--sunken); color:var(--ink)}
.nav button[aria-current="page"]{background:var(--accent-soft); color:var(--accent-ink)}
.nav button .ic{width:16px; height:16px; flex:none; opacity:.9}
.nav button .cnt{
  margin-left:auto; font-size:11px; font-weight:700; padding:1px 7px; border-radius:20px;
  background:var(--sunken); color:var(--ink-3); min-width:22px; text-align:center;
}
.nav button[aria-current="page"] .cnt{background:var(--surface); color:var(--accent-ink)}
.nav button .cnt.crit{background:var(--crit-bg); color:var(--crit-ink)}
.side footer{padding:12px 16px 16px; border-top:1px solid var(--line-2); font-size:11px;
  color:var(--muted); line-height:1.5}

/* ------------------------------------------------------------- topbar -- */
.main{min-width:0; display:flex; flex-direction:column}
.top{
  position:sticky; top:0; z-index:40; background:var(--surface);
  border-bottom:1px solid var(--line); height:var(--top-h);
  display:flex; align-items:center; gap:14px; padding:0 22px;
}
.top h2{margin:0; font-size:16px; font-weight:700; letter-spacing:-.015em; white-space:nowrap}
.top .sub{font-size:12px; color:var(--muted); white-space:nowrap}
.spacer{flex:1}
.search{position:relative; display:flex; align-items:center}
.search svg{position:absolute; left:10px; width:14px; height:14px; color:var(--muted); pointer-events:none}
.search input{
  width:240px; background:var(--sunken); border:1px solid transparent; border-radius:8px;
  padding:7px 10px 7px 30px; font-size:13px; color:var(--ink); font-family:inherit;
  transition:border-color .12s, background .12s, width .16s;
}
.search input::placeholder{color:var(--muted)}
.search input:focus{outline:none; background:var(--surface); border-color:var(--accent); width:280px}
.search kbd{
  position:absolute; right:8px; font-family:inherit; font-size:10px; font-weight:700;
  color:var(--muted); background:var(--surface); border:1px solid var(--line);
  border-radius:4px; padding:1px 5px; pointer-events:none;
}
.search input:focus + kbd{display:none}
.iconbtn{
  width:32px; height:32px; border-radius:8px; border:1px solid var(--line);
  background:var(--surface); display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:var(--ink-2); flex:none; transition:background .12s,color .12s;
}
.iconbtn:hover{background:var(--sunken); color:var(--ink)}
.iconbtn svg{width:15px; height:15px}

/* --------------------------------------------------------------- views - */
.view{padding:22px; display:none; flex-direction:column; gap:16px; max-width:1500px}
.view.on{display:flex}
.lede{font-size:14px; color:var(--ink-2); max-width:82ch; margin:0}

.card{background:var(--surface); border:1px solid var(--line); border-radius:11px;
  box-shadow:var(--sh-1); overflow:hidden; min-width:0}
.card > header{padding:15px 18px 13px; border-bottom:1px solid var(--line-2);
  display:flex; align-items:center; gap:12px; flex-wrap:wrap}
.card > header h3{margin:0; font-size:14px; font-weight:700; letter-spacing:-.01em;
  display:flex; align-items:center}
.card > header .hint{font-size:12.5px; color:var(--muted); margin:0}
.card .pad{padding:16px 18px}
.card .pad p{margin:0 0 10px; color:var(--ink-2)}
.card .pad p:last-child{margin-bottom:0}
.cols{display:grid; gap:16px; grid-template-columns:1fr 1fr}
.cols.three{grid-template-columns:repeat(3,1fr)}
.cols > *{min-width:0}
@media(max-width:1080px){.cols,.cols.three{grid-template-columns:1fr}}

/* ------------------------------------------------------------ kpi tiles -*/
.kpis{display:grid; grid-template-columns:repeat(6,1fr); gap:12px}
@media(max-width:1240px){.kpis{grid-template-columns:repeat(4,1fr)}}
@media(max-width:840px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--surface); border:1px solid var(--line); border-radius:10px;
  padding:13px 14px 14px; box-shadow:var(--sh-1)}
.kpi .lab{display:flex; align-items:center; font-size:11px; font-weight:700;
  letter-spacing:.045em; text-transform:uppercase; color:var(--muted); margin:0}
.kpi .val{margin:7px 0 0; font-size:23px; font-weight:800; letter-spacing:-.028em; line-height:1.1}
.kpi .val.good{color:var(--good-ink)} .kpi .val.bad{color:var(--crit-ink)}
.kpi .sub{margin:4px 0 0; font-size:11.5px; color:var(--ink-3); display:flex;
  align-items:center; gap:5px}
.delta{font-weight:700; display:inline-flex; align-items:center; gap:3px}
.delta.better{color:var(--good-ink)} .delta.worse{color:var(--crit-ink)}

/* ------------------------------------------------------------ findings - */
.finds{display:flex; flex-direction:column}
.find{display:grid; grid-template-columns:auto 1fr; gap:13px; padding:14px 18px;
  border-bottom:1px solid var(--line-2); align-items:start}
.find:last-child{border-bottom:0}
.find h4{margin:0; font-size:13.5px; font-weight:700; letter-spacing:-.008em}
.find p{margin:4px 0 0; font-size:13px; color:var(--ink-2); max-width:88ch}
.pill{display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:800;
  letter-spacing:.05em; text-transform:uppercase; padding:3px 9px; border-radius:20px;
  white-space:nowrap; border:1px solid transparent}
.pill.critical{background:var(--crit-bg); color:var(--crit-ink); border-color:var(--crit-line)}
.pill.warning{background:var(--warn-bg); color:var(--warn-ink); border-color:var(--warn-line)}
.pill.good{background:var(--good-bg); color:var(--good-ink); border-color:var(--good-line)}
.pill.info{background:var(--info-bg); color:var(--info-ink); border-color:var(--info-line)}
.pill .dot{width:6px; height:6px; border-radius:50%; background:currentColor; flex:none}

/* -------------------------------------------------------------- tables - */
.tablewrap{overflow:auto; max-height:min(70vh,760px)}
table.dt{border-collapse:separate; border-spacing:0; width:100%; font-size:13px}
table.dt th{
  position:sticky; top:0; z-index:2; background:var(--raised); text-align:right;
  font-size:10.5px; font-weight:700; letter-spacing:.055em; text-transform:uppercase;
  color:var(--ink-3); padding:9px 14px; white-space:nowrap;
  border-bottom:1px solid var(--line); cursor:pointer; user-select:none;
}
table.dt th:first-child{text-align:left}
table.dt th:hover{color:var(--ink); background:var(--sunken)}
table.dt th .sortmark{opacity:0; margin-left:5px; font-size:9px}
table.dt th[aria-sort] .sortmark{opacity:1; color:var(--accent)}
table.dt th[aria-sort]{color:var(--ink)}
table.dt td{padding:9px 14px; text-align:right; border-bottom:1px solid var(--line-2);
  white-space:nowrap}
table.dt td:first-child{text-align:left}
table.dt tbody tr:hover td{background:var(--sunken)}
table.dt tbody tr:last-child td{border-bottom:0}
.num{font-variant-numeric:tabular-nums}
.term{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace; font-size:12.5px}
.zero{color:var(--crit-ink); font-weight:700}
.ok{color:var(--good-ink); font-weight:700}
.barcell{width:120px; min-width:100px}
.bar{height:7px; border-radius:4px; background:var(--s1); min-width:2px}
.bar.warn{background:var(--s2)}
.tag{display:inline-block; font-size:10.5px; font-weight:700; padding:2px 8px;
  border-radius:5px; background:var(--sunken); color:var(--ink-2); letter-spacing:.02em}
.tag.exact{background:var(--accent-soft); color:var(--accent-ink)}

.toolbar{display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:11px 18px;
  border-bottom:1px solid var(--line-2); background:var(--raised)}
.chip{font-size:12px; font-weight:600; padding:5px 11px; border-radius:20px;
  border:1px solid var(--line); background:var(--surface); color:var(--ink-2);
  cursor:pointer; transition:all .12s; white-space:nowrap}
.chip:hover{border-color:var(--accent); color:var(--ink)}
.chip[aria-pressed="true"]{background:var(--accent); border-color:var(--accent); color:#fff}
.count{font-size:12px; color:var(--muted); margin-left:auto; white-space:nowrap}
.btn{display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600;
  padding:6px 12px; border-radius:7px; border:1px solid var(--line); background:var(--surface);
  color:var(--ink-2); cursor:pointer; text-decoration:none; transition:all .12s}
.btn:hover{border-color:var(--accent); color:var(--accent-ink); background:var(--accent-soft)}
.btn svg{width:13px; height:13px}
.empty{padding:32px 18px; text-align:center; color:var(--muted); font-size:13px}
.empty strong{display:block; color:var(--ink-2); font-size:14px; margin-bottom:4px}

/* --------------------------------------------------------------- misc -- */
.meta{display:grid; grid-template-columns:repeat(4,1fr); gap:0;
  border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--line)}
@media(max-width:840px){.meta{grid-template-columns:repeat(2,1fr)}}
.meta div{background:var(--surface); padding:11px 14px}
.meta dt{margin:0; font-size:10px; font-weight:700; letter-spacing:.07em;
  text-transform:uppercase; color:var(--muted)}
.meta dd{margin:3px 0 0; font-size:13px; font-weight:600}
.steps{display:grid; grid-template-columns:repeat(3,1fr); gap:0; background:var(--line)}
@media(max-width:900px){.steps{grid-template-columns:1fr}}
.steps > div{background:var(--surface); padding:15px 18px}
.steps h4{margin:0; font-size:13px; font-weight:700; display:flex; gap:8px; align-items:baseline}
.steps h4 em{font-style:normal; color:var(--accent); font-size:11px; font-weight:800}
.steps p{margin:5px 0 0; font-size:12.5px; color:var(--ink-2)}
.legend{display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:12px 18px;
  border-top:1px solid var(--line-2); font-size:12.5px; color:var(--ink-2)}

.i{display:inline-flex; align-items:center; justify-content:center; width:15px; height:15px;
  border-radius:50%; border:1px solid var(--muted); background:transparent; color:var(--muted);
  font-size:9.5px; font-weight:800; font-style:italic; line-height:1; padding:0; margin-left:6px;
  cursor:help; flex:none; vertical-align:middle; transition:all .12s}
.i:hover,.i:focus-visible{border-color:var(--accent); color:var(--accent); background:var(--accent-soft)}
.i[aria-expanded="true"]{border-color:var(--accent); color:#fff; background:var(--accent)}

#tip{position:fixed; z-index:120; pointer-events:none; opacity:0; visibility:hidden;
  transition:opacity .12s; width:max-content; max-width:min(340px,calc(100vw - 24px));
  background:var(--surface); color:var(--ink); border:1px solid var(--line);
  border-radius:9px; padding:14px 16px; box-shadow:var(--sh-3); font-size:12.5px;
  line-height:1.55; text-align:left; left:0; top:0}
#tip.on{opacity:1; visibility:visible}
#tip b{display:block; font-size:13px; font-weight:700; margin-bottom:2px}
#tip .tl{display:block; font-size:9.5px; font-weight:800; letter-spacing:.11em;
  text-transform:uppercase; color:var(--muted); margin:10px 0 2px}

.navtoggle{display:none}
@media(max-width:860px){
  .app{grid-template-columns:1fr}
  .side{position:fixed; left:0; top:0; width:var(--nav-w); z-index:60;
    transform:translateX(-100%); transition:transform .2s; box-shadow:var(--sh-3)}
  .side.open{transform:none}
  .navtoggle{display:flex}
  .top{gap:8px; padding:0 12px}
  .top .sub{display:none}
  .top h2{font-size:14px}
  .search{flex:1; min-width:0}
  .search input,.search input:focus{width:100%}
  .search kbd{display:none}
  .view{padding:14px}
  .kpis{gap:8px}
}
"""


APP_JS = r"""
(function () {
  "use strict";
  var D = window.__REPORT__;
  var money = D.meta.currency;

  /* ------------------------------------------------------- formatting -- */
  function fmt(v, kind) {
    if (v === null || v === undefined || v === "") { return "—"; }
    var n = Number(v);
    if (isNaN(n)) { return String(v); }
    switch (kind) {
      case "money":  return money + n.toLocaleString("en-MY", {minimumFractionDigits: 2, maximumFractionDigits: 2});
      case "money0": return money + Math.round(n).toLocaleString("en-MY");
      case "pct":    return (n * 100).toFixed(2) + "%";
      case "pct1":   return (n * 100).toFixed(1) + "%";
      case "pct3":   return (n * 100).toFixed(3) + "%";
      case "x":      return n.toFixed(1) + "×";
      case "int":    return Math.round(n).toLocaleString("en-MY");
      default:       return n.toLocaleString("en-MY", {maximumFractionDigits: 2});
    }
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
    });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (html !== undefined) { n.innerHTML = html; }
    return n;
  }
  function info(key) {
    var t = D.glossary[key];
    if (!t) { return ""; }
    return '<button type="button" class="i" aria-label="What this means" ' +
           'aria-expanded="false" data-tip="' + esc(t) + '">i</button>';
  }

  /* ---------------------------------------------------------- tooltips -- */
  var tip = document.getElementById("tip");
  var pinned = null;
  function place(btn) {
    var r = btn.getBoundingClientRect(), t = tip.getBoundingClientRect(), pad = 10;
    var left = Math.min(r.left, window.innerWidth - t.width - pad);
    var top = r.bottom + 8;
    if (top + t.height > window.innerHeight - pad) { top = r.top - t.height - 8; }
    tip.style.left = Math.max(pad, left) + "px";
    tip.style.top = Math.max(pad, top) + "px";
  }
  function showTip(btn) {
    tip.innerHTML = btn.getAttribute("data-tip");
    tip.classList.add("on");
    place(btn);
    btn.setAttribute("aria-expanded", "true");
  }
  function hideTip(btn) {
    tip.classList.remove("on");
    if (btn && btn.setAttribute) { btn.setAttribute("aria-expanded", "false"); }
  }
  document.addEventListener("mouseover", function (e) {
    var b = e.target.closest && e.target.closest(".i");
    if (b && !pinned) { showTip(b); }
  });
  document.addEventListener("mouseout", function (e) {
    var b = e.target.closest && e.target.closest(".i");
    if (b && pinned !== b) { hideTip(b); }
  });
  document.addEventListener("focusin", function (e) {
    var b = e.target.closest && e.target.closest(".i");
    if (b) { showTip(b); }
  });
  document.addEventListener("focusout", function (e) {
    var b = e.target.closest && e.target.closest(".i");
    if (b && pinned !== b) { hideTip(b); }
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".i");
    if (b) {
      e.preventDefault(); e.stopPropagation();
      if (pinned === b) { pinned = null; hideTip(b); }
      else { if (pinned) { hideTip(pinned); } pinned = b; showTip(b); }
      return;
    }
    if (pinned) { hideTip(pinned); pinned = null; }
  });

  /* ------------------------------------------------------ table engine -- */
  /* One renderer for every table: sort by clicking a header, filter by the
     toolbar chips, search across the text columns, export what you can see. */
  function DataTable(host, spec) {
    var state = {sort: spec.sort || null, dir: spec.dir || "desc", q: "", chips: {}};
    var wrap = el("div", "tablewrap");
    var bar = el("div", "toolbar");
    var count = el("span", "count");

    (spec.chips || []).forEach(function (c) {
      var b = el("button", "chip", c.label);
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        state.chips[c.key] = !state.chips[c.key];
        b.setAttribute("aria-pressed", state.chips[c.key] ? "true" : "false");
        draw();
      });
      bar.appendChild(b);
    });

    var dl = el("a", "btn", '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round"><path d="M8 2v8m0 0L5 7m3 3l3-3M2.5 12.5v1h11v-1"/>' +
      '</svg>Export CSV');
    dl.href = "#";
    dl.addEventListener("click", function (e) {
      e.preventDefault();
      var rows = visible();
      // Columns with no heading are decoration (the inline bars); a
      // spreadsheet wants the data columns only.
      var cols = spec.columns.filter(function (c) { return c.label; });
      var head = cols.map(function (c) { return c.label; });
      var body = rows.map(function (r) {
        return cols.map(function (c) {
          var v = r[c.key];
          return '"' + String(v === undefined || v === null ? "" : v).replace(/"/g, '""') + '"';
        }).join(",");
      });
      var blob = new Blob([head.join(",") + "\n" + body.join("\n")], {type: "text/csv"});
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = (spec.name || "table") + ".csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    });

    bar.appendChild(count);
    bar.appendChild(dl);

    function visible() {
      var q = state.q.toLowerCase();
      var out = spec.rows.filter(function (r) {
        if (q) {
          var hit = spec.columns.some(function (c) {
            return c.text && String(r[c.key] || "").toLowerCase().indexOf(q) >= 0;
          });
          if (!hit) { return false; }
        }
        return (spec.chips || []).every(function (c) {
          return !state.chips[c.key] || c.test(r);
        });
      });
      if (state.sort) {
        var k = state.sort, sign = state.dir === "asc" ? 1 : -1;
        out = out.slice().sort(function (a, b) {
          var x = a[k], y = b[k];
          if (typeof x === "string" || typeof y === "string") {
            return sign * String(x).localeCompare(String(y));
          }
          return sign * ((x || 0) - (y || 0));
        });
      }
      return out;
    }

    function draw() {
      var rows = visible();
      var limited = rows.slice(0, spec.limit || 400);
      count.textContent = "Showing " + limited.length.toLocaleString("en-MY") +
        (rows.length > limited.length ? " of " + rows.length.toLocaleString("en-MY") : "") +
        (rows.length === 1 ? " row" : " rows");

      var t = el("table", "dt");
      var thead = el("thead");
      var tr = el("tr");
      spec.columns.forEach(function (c) {
        var th = el("th", null, esc(c.label) + info(c.tip) + (c.label
          ? '<span class="sortmark">' + (state.dir === "asc" ? "▲" : "▼") + "</span>"
          : ""));
        if (state.sort === c.key) { th.setAttribute("aria-sort", state.dir + "ending"); }
        th.addEventListener("click", function (e) {
          if (e.target.closest(".i")) { return; }
          if (state.sort === c.key) { state.dir = state.dir === "desc" ? "asc" : "desc"; }
          else { state.sort = c.key; state.dir = c.text ? "asc" : "desc"; }
          draw();
        });
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      t.appendChild(thead);

      var tb = el("tbody");
      if (!limited.length) {
        wrap.innerHTML = "";
        wrap.appendChild(el("div", "empty",
          "<strong>Nothing matches</strong>Clear the search box or the filters above."));
        return;
      }
      limited.forEach(function (r) {
        var row = el("tr");
        spec.columns.forEach(function (c) {
          row.appendChild(el("td", c.cls || "num", c.render ? c.render(r) : fmt(r[c.key], c.kind)));
        });
        tb.appendChild(row);
      });
      t.appendChild(tb);
      wrap.innerHTML = "";
      wrap.appendChild(t);
    }

    host.appendChild(bar);
    host.appendChild(wrap);
    draw();
    return {search: function (q) { state.q = q; draw(); }, redraw: draw};
  }

  /* ------------------------------------------------------------- views -- */
  var tables = [];
  function card(title, hint, tipKey) {
    var c = el("div", "card");
    var h = el("header");
    h.appendChild(el("h3", null, esc(title) + info(tipKey)));
    if (hint) { h.appendChild(el("p", "hint", esc(hint))); }
    c.appendChild(h);
    return c;
  }
  function bar(value, peak, cls) {
    var w = peak ? Math.max((value / peak) * 100, 1.5) : 1.5;
    return '<div class="bar ' + (cls || "") + '" style="width:' + w.toFixed(1) + '%"></div>';
  }
  function mount(id, spec) {
    var host = document.getElementById(id);
    if (!host) { return; }
    tables.push(DataTable(host, spec));
  }

  /* ---- overview -------------------------------------------------------- */
  (function () {
    var host = document.getElementById("kpis");
    D.kpis.forEach(function (k) {
      var d = D.trend[k.trend];
      var sub = k.sub;
      var cls = "";
      if (d) {
        sub = (d.delta >= 0 ? "+" : "") + d.delta.toFixed(1) + d.unit + " vs last";
        cls = d.verdict === "better" ? "better" : d.verdict === "worse" ? "worse" : "";
      }
      var tile = el("div", "kpi");
      tile.innerHTML =
        '<p class="lab">' + esc(k.label) + info(k.tip) + "</p>" +
        '<p class="val ' + (k.tone || "") + '">' + esc(fmt(k.value, k.kind)) + "</p>" +
        '<p class="sub"><span class="delta ' + cls + '">' + esc(sub) + "</span></p>";
      host.appendChild(tile);
    });

    var f = document.getElementById("findings");
    D.findings.forEach(function (x) {
      var row = el("div", "find");
      row.innerHTML =
        '<span class="pill ' + x.level + '"><span class="dot"></span>' + esc(D.labels[x.level]) + "</span>" +
        "<div><h4>" + esc(x.title) + "</h4><p>" + esc(x.detail) + "</p></div>";
      f.appendChild(row);
    });
  })();

  /* ---- data tables ----------------------------------------------------- */
  var peakKw = Math.max.apply(null, D.keywords.map(function (r) { return r.spend; }).concat([0]));
  mount("t-keywords", {
    name: "keywords", rows: D.keywords, sort: "spend",
    chips: [
      {key: "dead", label: "No revenue", test: function (r) { return !r.gmv; }},
      {key: "drift", label: "Drifting (<20% on-theme)",
       test: function (r) { return r.on_theme !== null && r.on_theme < 0.2; }}
    ],
    columns: [
      {key: "keyword", label: "Keyword", text: true, cls: "term",
       render: function (r) { return esc(r.keyword); }},
      {key: "spend", label: "Spend", kind: "money"},
      {key: "spend", label: "", cls: "barcell",
       render: function (r) { return bar(r.spend, peakKw); }},
      {key: "on_theme", label: "On-theme", tip: "on_theme_spend",
       render: function (r) {
         if (r.on_theme === null) { return "—"; }
         return '<span class="' + (r.on_theme < 0.2 ? "zero" : "") + '">' +
                fmt(r.on_theme, "pct1") + "</span>";
       }},
      {key: "ctr", label: "CTR", kind: "pct", tip: "ctr"},
      {key: "cpc", label: "CPC", kind: "money", tip: "cpc"},
      {key: "gmv", label: "GMV", tip: "gmv",
       render: function (r) { return r.gmv ? fmt(r.gmv, "money") : '<span class="zero">—</span>'; }},
      {key: "conversions", label: "Orders", tip: "conversions",
       render: function (r) { return r.conversions ? fmt(r.conversions, "int") : '<span class="zero">0</span>'; }},
      {key: "roas", label: "ROAS", tip: "roas",
       render: function (r) { return r.gmv ? fmt(r.roas, "x") : '<span class="zero">0.0×</span>'; }},
      {key: "queries", label: "Queries", kind: "int"}
    ]
  });

  var peakQ = Math.max.apply(null, D.queries.map(function (r) { return r.spend; }).concat([0]));
  mount("t-queries", {
    name: "search-terms", rows: D.queries, sort: "spend", limit: 500,
    chips: [
      {key: "noconv", label: "No orders", test: function (r) { return !r.conversions; }},
      {key: "clicked", label: "Had clicks", test: function (r) { return r.clicks > 0; }},
      {key: "block", label: "Block-ready", test: function (r) { return r.blockable; }}
    ],
    columns: [
      {key: "query", label: "What the shopper typed", text: true, cls: "term",
       render: function (r) { return esc(r.query); }},
      {key: "impressions", label: "Impr.", kind: "int", tip: "impressions"},
      {key: "clicks", label: "Clicks", kind: "int", tip: "clicks"},
      {key: "ctr", label: "CTR", kind: "pct", tip: "ctr"},
      {key: "spend", label: "Spend", kind: "money"},
      {key: "spend", label: "", cls: "barcell",
       render: function (r) { return bar(r.spend, peakQ, r.conversions ? "" : "warn"); }},
      {key: "conversions", label: "Orders", tip: "conversions",
       render: function (r) { return r.conversions ? fmt(r.conversions, "int") : '<span class="zero">0</span>'; }},
      {key: "gmv", label: "GMV",
       render: function (r) { return r.gmv ? fmt(r.gmv, "money") : "—"; }}
    ]
  });

  var peakN = Math.max.apply(null, D.ngrams.map(function (r) { return r.spend; }).concat([0]));
  mount("t-ngrams", {
    name: "phrases", rows: D.ngrams, sort: "spend",
    chips: [
      {key: "one", label: "Single words", test: function (r) { return r.size === 1; }},
      {key: "two", label: "Two words", test: function (r) { return r.size === 2; }},
      {key: "three", label: "Three words", test: function (r) { return r.size === 3; }},
      {key: "dead", label: "Never converts", test: function (r) { return !r.conversions; }}
    ],
    columns: [
      {key: "phrase", label: "Phrase", text: true, cls: "term", tip: "ngram",
       render: function (r) { return esc(r.phrase); }},
      {key: "size", label: "Words", kind: "int"},
      {key: "spend", label: "Spend", kind: "money"},
      {key: "spend", label: "", cls: "barcell",
       render: function (r) { return bar(r.spend, peakN, r.conversions ? "" : "warn"); }},
      {key: "queries", label: "In queries", kind: "int"},
      {key: "clicks", label: "Clicks", kind: "int"},
      {key: "ctr", label: "CTR", kind: "pct", tip: "ctr"},
      {key: "conversions", label: "Orders",
       render: function (r) { return r.conversions ? fmt(r.conversions, "int") : '<span class="zero">0</span>'; }}
    ]
  });

  mount("t-segments", {
    name: "segments", rows: D.segments, sort: "spend",
    columns: [
      {key: "segment", label: "Segment", text: true, tip: "segment",
       render: function (r) { return esc(r.segment); }},
      {key: "spend", label: "Spend", kind: "money"},
      {key: "spend_share", label: "Share", kind: "pct1"},
      {key: "ctr", label: "CTR", kind: "pct", tip: "ctr"},
      {key: "cpc", label: "CPC", kind: "money", tip: "cpc"},
      {key: "conversions", label: "Orders",
       render: function (r) { return r.conversions ? fmt(r.conversions, "int") : '<span class="zero">0</span>'; }},
      {key: "roas", label: "ROAS", tip: "roas",
       render: function (r) { return r.gmv ? fmt(r.roas, "x") : '<span class="zero">0.0×</span>'; }}
    ]
  });

  mount("t-themes", {
    name: "themes", rows: D.themes, sort: "impressions",
    columns: [
      {key: "theme", label: "Theme", text: true, tip: "theme",
       render: function (r) { return esc(r.theme); }},
      {key: "queries", label: "Queries", kind: "int"},
      {key: "impressions", label: "Impr.", kind: "int", tip: "impressions"},
      {key: "clicks", label: "Clicks", kind: "int"},
      {key: "ctr", label: "CTR", kind: "pct", tip: "ctr"},
      {key: "spend", label: "Spend", kind: "money"},
      {key: "product_clicks", label: "Tile clicks", kind: "int", tip: "product_ctr"},
      {key: "conversions", label: "Orders",
       render: function (r) { return r.conversions ? fmt(r.conversions, "int") : '<span class="zero">0</span>'; }}
    ]
  });

  mount("t-candidates", {
    name: "keywords-to-add", rows: D.candidates, sort: "clicks",
    chips: [{key: "exact", label: "Exact match only", test: function (r) { return r.match === "Exact"; }}],
    columns: [
      {key: "query", label: "Add this keyword", text: true, cls: "term",
       render: function (r) { return esc(r.query); }},
      {key: "match", label: "Match", tip: "match_type", cls: "",
       render: function (r) {
         return '<span class="tag ' + (r.match === "Exact" ? "exact" : "") + '">' + esc(r.match) + "</span>";
       }},
      {key: "impressions", label: "Impr.", kind: "int"},
      {key: "clicks", label: "Clicks", kind: "int"},
      {key: "ctr", label: "CTR", tip: "ctr",
       render: function (r) {
         return '<span class="' + (r.ctr >= 0.08 ? "ok" : "") + '">' + fmt(r.ctr, "pct1") + "</span>";
       }},
      {key: "product_clicks", label: "Tile clicks", kind: "int"},
      {key: "reason", label: "Why", text: true, cls: "",
       render: function (r) { return esc(r.reason); }}
    ]
  });

  mount("t-block", {
    name: "keywords-to-block", rows: D.blocklist.concat(D.negatives), sort: "spend",
    columns: [
      {key: "query", label: "Block this term", text: true, cls: "term", tip: "negative_keyword",
       render: function (r) { return esc(r.query); }},
      {key: "why", label: "Reason", text: true, cls: "",
       render: function (r) { return esc(r.why || "No orders"); }},
      {key: "impressions", label: "Impr.", kind: "int"},
      {key: "clicks", label: "Clicks", kind: "int"},
      {key: "spend", label: "Spend", kind: "money"}
    ]
  });

  if (D.winners.length) {
    mount("t-winners", {
      name: "orders", rows: D.winners, sort: "gmv",
      columns: [
        {key: "query", label: "What the shopper typed", text: true, cls: "term",
         render: function (r) { return esc(r.query); }},
        {key: "keyword", label: "You bid on", text: true, cls: "term",
         render: function (r) { return esc(r.keyword); }},
        {key: "clicks", label: "Clicks", kind: "int"},
        {key: "spend", label: "Cost", kind: "money"},
        {key: "gmv", label: "Revenue", kind: "money"}
      ]
    });
  }

  /* ---- profit ---------------------------------------------------------- */
  (function () {
    var host = document.getElementById("econ");
    if (!host) { return; }
    if (!D.economics.tiles.length) {
      host.innerHTML = '<div class="card"><div class="empty"><strong>Two numbers away from ' +
        'profit analysis</strong>Open <span class="mono">shopads.config.json</span>, find ' +
        '<span class="mono">"business"</span>, and fill in your contribution margin and total ' +
        "shop revenue. Neither exists in a Shopee export, so only you can supply them.</div></div>";
      return;
    }
    var grid = el("div", "kpis");
    D.economics.tiles.forEach(function (t) {
      var tile = el("div", "kpi");
      tile.innerHTML = '<p class="lab">' + esc(t.label) + info(t.tip) + "</p>" +
        '<p class="val ' + (t.tone || "") + '">' + esc(t.value) + "</p>" +
        '<p class="sub">' + esc(t.sub) + "</p>";
      grid.appendChild(tile);
    });
    host.appendChild(grid);
  })();

  /* ------------------------------------------------------------ router -- */
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));
  var navs = Array.prototype.slice.call(document.querySelectorAll(".nav button"));
  var titleEl = document.getElementById("viewtitle");
  var subEl = document.getElementById("viewsub");
  function go(id) {
    views.forEach(function (v) { v.classList.toggle("on", v.id === "view-" + id); });
    navs.forEach(function (b) {
      var on = b.dataset.view === id;
      if (on) { b.setAttribute("aria-current", "page"); } else { b.removeAttribute("aria-current"); }
      if (on) {
        titleEl.textContent = b.dataset.title;
        subEl.textContent = b.dataset.sub || "";
      }
    });
    document.querySelector(".side").classList.remove("open");
    try { localStorage.setItem("shopads.view", id); } catch (e) { /* private mode */ }
    window.scrollTo(0, 0);
  }
  navs.forEach(function (b) {
    b.addEventListener("click", function () { go(b.dataset.view); });
  });
  var start = "overview";
  try { start = localStorage.getItem("shopads.view") || "overview"; } catch (e) { /* ignore */ }
  if (!document.getElementById("view-" + start)) { start = "overview"; }
  go(start);

  /* ------------------------------------------------------------ search -- */
  var search = document.getElementById("q");
  search.addEventListener("input", function () {
    tables.forEach(function (t) { t.search(search.value); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === "Escape") {
      if (pinned) { hideTip(pinned); pinned = null; }
      else if (document.activeElement === search) { search.value = ""; search.blur();
        tables.forEach(function (t) { t.search(""); }); }
    }
  });

  /* ------------------------------------------------------------- theme -- */
  var themeBtn = document.getElementById("theme");
  function applyTheme(mode) {
    if (mode === "system") { document.documentElement.removeAttribute("data-theme"); }
    else { document.documentElement.setAttribute("data-theme", mode); }
    try { localStorage.setItem("shopads.theme", mode); } catch (e) { /* ignore */ }
  }
  var order = ["system", "light", "dark"];
  var current = "system";
  try { current = localStorage.getItem("shopads.theme") || "system"; } catch (e) { /* ignore */ }
  applyTheme(current);
  themeBtn.addEventListener("click", function () {
    current = order[(order.indexOf(current) + 1) % order.length];
    applyTheme(current);
    themeBtn.title = "Theme: " + current;
  });
  themeBtn.title = "Theme: " + current;

  document.querySelector(".navtoggle").addEventListener("click", function (e) {
    e.stopPropagation();
    document.querySelector(".side").classList.toggle("open");
  });
})();
"""
