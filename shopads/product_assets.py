"""Stylesheet and client script for the product-performance report.

A deliberately different visual language from the ads report: generous
vertical rhythm, one very large figure per idea, hairline rules instead of
boxes, and a single warm accent. Restraint carries the hierarchy, so almost
nothing is coloured and the few things that are, matter.
"""

from __future__ import annotations

PRODUCT_CSS = """
:root{
  color-scheme:light;
  --bg:#fbfbfd; --surface:#ffffff; --sunken:#f5f5f7; --raised:#ffffff;
  --ink:#1d1d1f; --ink-2:#6e6e73; --ink-3:#86868b; --faint:#a1a1a6;
  --hair:#d2d2d7; --hair-2:#e8e8ed;
  --accent:#ff6900; --accent-ink:#c04e00; --accent-wash:#fff3ec;
  --good:#248a3d; --good-wash:#e8f6ec;
  --warn:#a85400; --warn-wash:#fff4e5;
  --crit:#c9000f; --crit-wash:#ffeceb;
  --s1:#2a78d6; --s2:#eb6834; --s3:#1baf7a;
  --shadow:0 1px 3px rgba(0,0,0,.05); --shadow-lg:0 10px 40px rgba(0,0,0,.10);
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  color-scheme:dark;
  --bg:#000000; --surface:#1c1c1e; --sunken:#2c2c2e; --raised:#242426;
  --ink:#f5f5f7; --ink-2:#a1a1a6; --ink-3:#8e8e93; --faint:#6e6e73;
  --hair:#38383a; --hair-2:#2c2c2e;
  --accent:#ff7a1a; --accent-ink:#ff9147; --accent-wash:#2a1608;
  --good:#40c463; --good-wash:#10251a;
  --warn:#ffa23a; --warn-wash:#2a1d0a;
  --crit:#ff5f57; --crit-wash:#2b1211;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70;
  --shadow:0 1px 3px rgba(0,0,0,.5); --shadow-lg:0 10px 40px rgba(0,0,0,.6);
}}
:root[data-theme="dark"]{
  color-scheme:dark;
  --bg:#000000; --surface:#1c1c1e; --sunken:#2c2c2e; --raised:#242426;
  --ink:#f5f5f7; --ink-2:#a1a1a6; --ink-3:#8e8e93; --faint:#6e6e73;
  --hair:#38383a; --hair-2:#2c2c2e;
  --accent:#ff7a1a; --accent-ink:#ff9147; --accent-wash:#2a1608;
  --good:#40c463; --good-wash:#10251a;
  --warn:#ffa23a; --warn-wash:#2a1d0a;
  --crit:#ff5f57; --crit-wash:#2b1211;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70;
  --shadow:0 1px 3px rgba(0,0,0,.5); --shadow-lg:0 10px 40px rgba(0,0,0,.6);
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--bg); color:var(--ink);
  font-family:Manrope,system-ui,-apple-system,"SF Pro Text","Segoe UI",sans-serif;
  font-size:16px; line-height:1.55; -webkit-font-smoothing:antialiased;
  font-variant-numeric:tabular-nums; letter-spacing:-.006em;
}
.mono{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  letter-spacing:0; font-variant-numeric:normal}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:6px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}

.wrap{max-width:1120px; margin:0 auto; padding:0 32px}
@media(max-width:640px){.wrap{padding:0 20px}}

/* ------------------------------------------------------------- chrome -- */
.bar{position:sticky; top:0; z-index:50; background:color-mix(in srgb,var(--bg) 82%,transparent);
  backdrop-filter:saturate(180%) blur(20px); -webkit-backdrop-filter:saturate(180%) blur(20px);
  border-bottom:1px solid var(--hair-2)}
.bar .wrap{display:flex; align-items:center; gap:16px; height:52px}
.bar .name{font-size:15px; font-weight:800; letter-spacing:-.02em; white-space:nowrap}
.bar .dot{width:5px;height:5px;border-radius:50%;background:var(--accent);flex:none}
.bar nav{display:flex; gap:2px; margin-left:8px; overflow-x:auto; scrollbar-width:none}
.bar nav::-webkit-scrollbar{display:none}
.bar nav a{font-size:13.5px; font-weight:600; color:var(--ink-2); text-decoration:none;
  padding:6px 11px; border-radius:8px; white-space:nowrap; transition:color .15s,background .15s}
.bar nav a:hover{color:var(--ink); background:var(--sunken)}
.spacer{flex:1}
.ghost{width:32px;height:32px;border-radius:9px;border:1px solid var(--hair);background:transparent;
  display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-2);flex:none;
  transition:background .15s,color .15s}
.ghost:hover{background:var(--sunken); color:var(--ink)}
.ghost svg{width:15px;height:15px}

/* --------------------------------------------------------------- hero -- */
.hero{padding:84px 0 64px; text-align:center}
.eyebrow{font-size:12px; font-weight:800; letter-spacing:.14em; text-transform:uppercase;
  color:var(--accent); margin:0 0 18px}
.hero h1{margin:0; font-size:clamp(38px,6.4vw,64px); font-weight:800; letter-spacing:-.035em;
  line-height:1.04; text-wrap:balance}
.hero .sub{margin:20px auto 0; font-size:20px; color:var(--ink-2); max-width:60ch;
  font-weight:500; letter-spacing:-.012em}
@media(max-width:640px){.hero{padding:56px 0 44px}.hero .sub{font-size:17px}}

.figure{margin:56px 0 0; display:flex; flex-direction:column; align-items:center}
.figure .big{font-size:clamp(64px,12vw,116px); font-weight:800; letter-spacing:-.045em;
  line-height:.94; background:linear-gradient(180deg,var(--ink) 30%,var(--ink-2));
  -webkit-background-clip:text; background-clip:text; color:transparent}
.figure .cap{margin-top:14px; font-size:15px; color:var(--ink-3); font-weight:600}

.funnel{margin:60px 0 0; display:grid; grid-template-columns:repeat(4,1fr); gap:0;
  border-top:1px solid var(--hair-2)}
@media(max-width:720px){.funnel{grid-template-columns:repeat(2,1fr)}}
.funnel > div{padding:26px 18px; text-align:center; border-right:1px solid var(--hair-2)}
.funnel > div:last-child{border-right:0}
@media(max-width:720px){.funnel>div:nth-child(2){border-right:0}
  .funnel>div:nth-child(-n+2){border-bottom:1px solid var(--hair-2)}}
.funnel .n{font-size:30px; font-weight:800; letter-spacing:-.03em; line-height:1.1}
.funnel .l{margin-top:6px; font-size:12.5px; color:var(--ink-3); font-weight:600;
  display:flex; align-items:center; justify-content:center}
.funnel .d{margin-top:3px; font-size:11.5px; color:var(--faint)}

/* ------------------------------------------------------------ section -- */
section{padding:76px 0; border-top:1px solid var(--hair-2)}
@media(max-width:640px){section{padding:52px 0}}
.head{max-width:66ch; margin:0 0 36px}
.kicker{font-size:12px; font-weight:800; letter-spacing:.14em; text-transform:uppercase;
  color:var(--accent); margin:0 0 12px}
.head h2{margin:0; font-size:clamp(27px,3.6vw,38px); font-weight:800; letter-spacing:-.028em;
  line-height:1.12; text-wrap:balance}
.head p{margin:16px 0 0; font-size:17px; color:var(--ink-2); line-height:1.6}

/* ---------------------------------------------------------- quadrants -- */
.quads{display:grid; grid-template-columns:1fr 1fr; gap:18px}
@media(max-width:860px){.quads{grid-template-columns:1fr}}
.quad{background:var(--surface); border:1px solid var(--hair-2); border-radius:20px;
  padding:26px 26px 20px; box-shadow:var(--shadow)}
.quad header{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap}
.quad h3{margin:0; font-size:20px; font-weight:800; letter-spacing:-.022em}
.quad .n{font-size:13px; font-weight:700; color:var(--faint)}
.quad .what{margin:8px 0 0; font-size:14.5px; color:var(--ink-2)}
.quad .do{margin:12px 0 0; font-size:13.5px; color:var(--ink-2); padding:11px 14px;
  background:var(--sunken); border-radius:12px}
.quad .do b{color:var(--ink)}
.quad ul{list-style:none; margin:18px 0 0; padding:0; display:flex; flex-direction:column}
.quad li{padding:11px 0; border-top:1px solid var(--hair-2); display:flex; gap:12px;
  align-items:baseline}
.quad li .nm{flex:1; font-size:14px; font-weight:600; min-width:0; overflow-wrap:anywhere}
.quad li .mt{font-size:12.5px; color:var(--ink-3); white-space:nowrap; font-weight:600}
.quad.scale{border-color:color-mix(in srgb,var(--good) 30%,var(--hair-2))}
.quad.fix{border-color:color-mix(in srgb,var(--crit) 32%,var(--hair-2))}
.quad.scale h3{color:var(--good)} .quad.fix h3{color:var(--crit)}
.quad.feed h3{color:var(--accent)}
.quad.empty-q ul{display:none}
.quad .none{margin:18px 0 0; font-size:13.5px; color:var(--faint); font-style:italic}

/* -------------------------------------------------------------- table -- */
.panel{background:var(--surface); border:1px solid var(--hair-2); border-radius:20px;
  overflow:hidden; box-shadow:var(--shadow)}
.tools{display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:16px 20px;
  border-bottom:1px solid var(--hair-2)}
.chip{font-size:13px; font-weight:700; padding:7px 14px; border-radius:999px;
  border:1px solid var(--hair); background:transparent; color:var(--ink-2); cursor:pointer;
  transition:all .15s; white-space:nowrap; letter-spacing:-.01em}
.chip:hover{border-color:var(--ink-3); color:var(--ink)}
.chip[aria-pressed="true"]{background:var(--ink); border-color:var(--ink); color:var(--bg)}
.srch{position:relative; display:flex; align-items:center; margin-left:auto}
.srch svg{position:absolute; left:11px; width:14px; height:14px; color:var(--faint);
  pointer-events:none}
.srch input{width:190px; background:var(--sunken); border:1px solid transparent;
  border-radius:999px; padding:8px 14px 8px 32px; font:inherit; font-size:13.5px;
  color:var(--ink); transition:width .18s,border-color .15s}
.srch input:focus{outline:none; border-color:var(--accent); width:230px}
.dlbtn{font-size:13px; font-weight:700; padding:7px 14px; border-radius:999px;
  border:1px solid var(--hair); background:transparent; color:var(--ink-2); cursor:pointer;
  display:inline-flex; align-items:center; gap:6px; text-decoration:none}
.dlbtn:hover{border-color:var(--ink-3); color:var(--ink)}
.dlbtn svg{width:13px;height:13px}
.scroll{overflow:auto; max-height:min(74vh,780px)}
table{border-collapse:separate; border-spacing:0; width:100%; font-size:14px}
th{position:sticky; top:0; z-index:2; background:var(--surface); text-align:right;
  font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
  color:var(--ink-3); padding:13px 16px; white-space:nowrap; cursor:pointer;
  border-bottom:1px solid var(--hair); user-select:none}
th:first-child{text-align:left}
th:hover{color:var(--ink)}
th[aria-sort]{color:var(--ink)}
th .sm{opacity:0; margin-left:5px; font-size:9px}
th[aria-sort] .sm{opacity:1; color:var(--accent)}
td{padding:14px 16px; text-align:right; border-bottom:1px solid var(--hair-2); white-space:nowrap}
td:first-child{text-align:left; white-space:normal; min-width:260px; max-width:330px}
tbody tr:hover td{background:var(--sunken)}
tbody tr:last-child td{border-bottom:0}
/* Shopee product titles run to 20 words; two lines is enough to identify one,
   and the full text stays in the tooltip and the CSV. */
.pname{font-weight:700; letter-spacing:-.012em; line-height:1.35; display:-webkit-box;
  -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.pid{display:block; margin-top:3px; font-size:11.5px; color:var(--faint)}
.qtag{display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:800;
  padding:4px 10px; border-radius:999px; letter-spacing:.02em; white-space:nowrap}
.qtag.scale{background:var(--good-wash); color:var(--good)}
.qtag.fix{background:var(--crit-wash); color:var(--crit)}
.qtag.feed{background:var(--accent-wash); color:var(--accent-ink)}
.qtag.review{background:var(--sunken); color:var(--ink-3)}
.zero{color:var(--faint)}
.strong{font-weight:700}
.meter{height:6px; border-radius:999px; background:var(--accent); min-width:3px}
.meterwrap{width:110px; min-width:90px}
.count{font-size:13px; color:var(--faint); font-weight:600}
.none-row{padding:44px 20px; text-align:center; color:var(--faint); font-size:14.5px}

/* ------------------------------------------------------------- charts -- */
.chartcard{background:var(--surface); border:1px solid var(--hair-2); border-radius:20px;
  padding:26px 28px 20px; box-shadow:var(--shadow)}
.chartcard h3{margin:0 0 4px; font-size:16px; font-weight:800; letter-spacing:-.018em;
  display:flex; align-items:center}
.chartcard p{margin:0 0 20px; font-size:13.5px; color:var(--ink-3)}
.two{display:grid; grid-template-columns:1fr 1fr; gap:18px}
@media(max-width:860px){.two{grid-template-columns:1fr}}
svg{display:block; max-width:100%}
.gl{stroke:var(--hair-2); stroke-width:1}
.ax{font-size:11px; fill:var(--faint); font-weight:600}

/* ----------------------------------------------------------- channels -- */
.rows{display:flex; flex-direction:column}
.rw{display:grid; grid-template-columns:1fr 130px 96px; gap:16px; align-items:center;
  padding:16px 0; border-top:1px solid var(--hair-2)}
.rw:first-child{border-top:0}
.rw .cn{font-size:15px; font-weight:700; letter-spacing:-.014em}
.rw .cs{font-size:12.5px; color:var(--ink-3); margin-top:2px}
.rw .track{height:8px; background:var(--sunken); border-radius:999px; overflow:hidden}
.rw .fill{height:100%; border-radius:999px; background:var(--accent)}
.rw .vv{text-align:right; font-size:15px; font-weight:700}
@media(max-width:640px){.rw{grid-template-columns:1fr 80px}.rw .track{display:none}}

/* ----------------------------------------------------------- findings -- */
.find{display:grid; grid-template-columns:auto 1fr; gap:16px; padding:22px 0;
  border-top:1px solid var(--hair-2); align-items:start}
.find:first-child{border-top:0}
.find h4{margin:0; font-size:17px; font-weight:800; letter-spacing:-.02em}
.find p{margin:7px 0 0; font-size:15px; color:var(--ink-2); max-width:78ch; line-height:1.6}
.badge{font-size:11px; font-weight:800; letter-spacing:.05em; text-transform:uppercase;
  padding:5px 11px; border-radius:999px; white-space:nowrap}
.badge.critical{background:var(--crit-wash); color:var(--crit)}
.badge.warning{background:var(--warn-wash); color:var(--warn)}
.badge.good{background:var(--good-wash); color:var(--good)}
.badge.info{background:var(--sunken); color:var(--ink-3)}

/* -------------------------------------------------------------- misc --- */
.tabs{display:flex; flex-wrap:wrap; gap:8px; margin-top:26px}
.tabs span{font-size:12px; font-weight:700; padding:6px 12px; border-radius:999px;
  background:var(--sunken); color:var(--ink-3); font-family:"IBM Plex Mono",monospace;
  letter-spacing:0}
footer.end{padding:44px 0 72px; color:var(--faint); font-size:13px; text-align:center}
footer.end .mono{font-size:12px}

/* ------------------------------------------------------------- tracker -- */
.focus{background:var(--surface);border:1px solid var(--hair-2);border-radius:20px;
  overflow:hidden;box-shadow:var(--shadow);margin-bottom:18px}
.focus > header{padding:20px 26px 16px;border-bottom:1px solid var(--hair-2);
  display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.focus h3{margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em}
.focus .when{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--ink-3)}
.fitem{display:grid;grid-template-columns:28px 1fr;gap:14px;padding:18px 26px;
  border-top:1px solid var(--hair-2);align-items:start}
.fitem:first-of-type{border-top:0}
.fitem .rank{font-family:Archivo,sans-serif;font-size:13px;font-weight:800;color:var(--faint);
  padding-top:2px}
.fitem h4{margin:0;font-size:16px;font-weight:800;letter-spacing:-.018em;display:flex;
  align-items:center;gap:9px;flex-wrap:wrap}
.fitem p{margin:6px 0 0;font-size:14.5px;color:var(--ink-2);max-width:80ch}
.fitem .todo{margin:9px 0 0;font-size:14px;color:var(--ink);background:var(--sunken);
  padding:10px 14px;border-radius:11px;max-width:80ch}
.arrow{font-size:12px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap}
.arrow.better{background:var(--good-wash);color:var(--good)}
.arrow.worse{background:var(--crit-wash);color:var(--crit)}
.arrow.flat,.arrow.neutral{background:var(--sunken);color:var(--ink-3)}
.deltas{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--hair-2);
  border:1px solid var(--hair-2);border-radius:18px;overflow:hidden;margin-bottom:18px}
.deltas.c2{grid-template-columns:repeat(2,1fr)}
.deltas.c3{grid-template-columns:repeat(3,1fr)}
.dl.pad{background:var(--surface)}
@media(max-width:820px){.deltas,.deltas.c2,.deltas.c3{grid-template-columns:repeat(2,1fr)}}
.dl{background:var(--surface);padding:16px 18px}
.dl .k{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
  color:var(--ink-3);display:flex;align-items:center;margin:0}
.dl .v{margin:7px 0 0;font-size:23px;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.dl .c{margin:4px 0 0;font-size:12.5px;font-weight:700}
.dl .c.better{color:var(--good)}.dl .c.worse{color:var(--crit)}
.dl .c.flat,.dl .c.neutral{color:var(--ink-3)}
.dl .t{margin:2px 0 0;font-size:11.5px;color:var(--faint)}
.unusual{display:inline-block;margin-left:6px;font-size:9.5px;font-weight:800;
  letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:999px;
  background:var(--warn-wash);color:var(--warn)}
.thin{margin-top:14px;padding:14px 18px;border-radius:12px;background:var(--warn-wash);
  color:var(--ink);font-size:14px;border-left:3px solid var(--warn)}
.movers{margin-top:18px}
.i{display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px;
  border-radius:50%; border:1px solid var(--faint); background:transparent; color:var(--faint);
  font-size:10px; font-weight:800; font-style:italic; line-height:1; padding:0; margin-left:7px;
  cursor:help; flex:none; vertical-align:middle; transition:all .15s; letter-spacing:0}
.i:hover,.i:focus-visible{border-color:var(--accent); color:var(--accent);
  background:var(--accent-wash)}
.i[aria-expanded="true"]{border-color:var(--accent); background:var(--accent); color:#fff}
#tip{position:fixed; z-index:120; pointer-events:none; opacity:0; visibility:hidden;
  transition:opacity .14s; width:max-content; max-width:min(330px,calc(100vw - 28px));
  background:var(--surface); color:var(--ink); border:1px solid var(--hair);
  border-radius:14px; padding:16px 18px; box-shadow:var(--shadow-lg); font-size:13.5px;
  line-height:1.55; text-align:left; left:0; top:0}
#tip.on{opacity:1; visibility:visible}
#tip b{display:block; font-size:14px; font-weight:800; margin-bottom:3px; letter-spacing:-.015em}
#tip .tl{display:block; font-size:10px; font-weight:800; letter-spacing:.11em;
  text-transform:uppercase; color:var(--faint); margin:12px 0 2px}
"""


PRODUCT_JS = r"""
(function () {
  "use strict";
  var D = window.__PRODUCTS__;
  var cur = D.meta.currency;

  function fmt(v, kind) {
    if (v === null || v === undefined || v === "") { return "—"; }
    var n = Number(v);
    if (isNaN(n)) { return String(v); }
    switch (kind) {
      case "money":  return cur + n.toLocaleString("en-MY", {minimumFractionDigits: 2, maximumFractionDigits: 2});
      case "money0": return cur + Math.round(n).toLocaleString("en-MY");
      case "pct":    return (n * 100).toFixed(2) + "%";
      case "pct1":   return (n * 100).toFixed(1) + "%";
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
    return t ? '<button type="button" class="i" aria-label="What this means" ' +
      'aria-expanded="false" data-tip="' + esc(t) + '">i</button>' : "";
  }

  /* ---------------------------------------------------------- tooltips -- */
  var tip = document.getElementById("tip"), pinned = null;
  function place(b) {
    var r = b.getBoundingClientRect(), t = tip.getBoundingClientRect(), pad = 12;
    var left = Math.min(r.left, window.innerWidth - t.width - pad);
    var top = r.bottom + 10;
    if (top + t.height > window.innerHeight - pad) { top = r.top - t.height - 10; }
    tip.style.left = Math.max(pad, left) + "px";
    tip.style.top = Math.max(pad, top) + "px";
  }
  function showTip(b) {
    tip.innerHTML = b.getAttribute("data-tip");
    tip.classList.add("on"); place(b); b.setAttribute("aria-expanded", "true");
  }
  function hideTip(b) {
    tip.classList.remove("on");
    if (b && b.setAttribute) { b.setAttribute("aria-expanded", "false"); }
  }
  document.addEventListener("mouseover", function (e) {
    var b = e.target.closest && e.target.closest(".i"); if (b && !pinned) { showTip(b); }
  });
  document.addEventListener("mouseout", function (e) {
    var b = e.target.closest && e.target.closest(".i"); if (b && pinned !== b) { hideTip(b); }
  });
  document.addEventListener("focusin", function (e) {
    var b = e.target.closest && e.target.closest(".i"); if (b) { showTip(b); }
  });
  document.addEventListener("focusout", function (e) {
    var b = e.target.closest && e.target.closest(".i"); if (b && pinned !== b) { hideTip(b); }
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
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pinned) { hideTip(pinned); pinned = null; }
  });

  /* ------------------------------------------------------------- hero -- */
  (function () {
    var f = document.getElementById("funnel");
    D.funnel.forEach(function (s) {
      var d = el("div");
      d.innerHTML = '<p class="n">' + esc(fmt(s.value, s.kind)) + "</p>" +
        '<p class="l">' + esc(s.label) + info(s.tip) + "</p>" +
        '<p class="d">' + esc(s.note) + "</p>";
      f.appendChild(d);
    });
  })();

  /* --------------------------------------------------------- quadrants -- */
  (function () {
    var host = document.getElementById("quads");
    D.quadrants.forEach(function (q) {
      var c = el("div", "quad " + q.key + (q.items.length ? "" : " empty-q"));
      var items = q.items.map(function (p) {
        return '<li><span class="nm">' + esc(p.name) + '</span>' +
               '<span class="mt">' + esc(p.metric) + "</span></li>";
      }).join("");
      c.innerHTML =
        "<header><h3>" + esc(q.label) + '</h3><span class="n">' +
        q.items.length + (q.items.length === 1 ? " product" : " products") + "</span></header>" +
        '<p class="what">' + esc(q.what) + "</p>" +
        '<p class="do"><b>Do this:</b> ' + esc(q.todo) + "</p>" +
        (q.items.length ? "<ul>" + items + "</ul>"
                        : '<p class="none">Nothing here this period.</p>');
      host.appendChild(c);
    });
  })();

  /* ------------------------------------------------------------ table -- */
  (function () {
    var state = {sort: "sales", dir: "desc", q: "", chips: {}};
    var rows = D.products;
    var peak = Math.max.apply(null, rows.map(function (r) { return r.sales; }).concat([1]));
    var chips = [
      {key: "scale", label: "Scale", test: function (r) { return r.quadrant === "scale"; }},
      {key: "fix", label: "Fix the listing", test: function (r) { return r.quadrant === "fix"; }},
      {key: "feed", label: "Feed traffic", test: function (r) { return r.quadrant === "feed"; }},
      {key: "review", label: "Review", test: function (r) { return r.quadrant === "review"; }},
      {key: "selling", label: "Sold something", test: function (r) { return r.sales > 0; }}
    ];
    var cols = [
      {key: "name", label: "Product", text: true, render: function (r) {
        return '<span class="pname" title="' + esc(r.name) + '">' + esc(r.name) + "</span>" +
               '<span class="pid mono">' + esc(r.id) + " · " + esc(r.status) + "</span>"; }},
      {key: "quadrant", label: "Group", tip: "quadrant", render: function (r) {
        return '<span class="qtag ' + r.quadrant + '">' + esc(r.quadrant_label) + "</span>"; }},
      {key: "sales", label: "Sales", tip: "sales", render: function (r) {
        return r.sales ? '<span class="strong">' + fmt(r.sales, "money") + "</span>"
                       : '<span class="zero">—</span>'; }},
      {key: "sales", label: "", render: function (r) {
        return '<div class="meter" style="width:' +
               Math.max(r.sales / peak * 100, 1.5).toFixed(1) + '%"></div>'; }, cls: "meterwrap"},
      {key: "share", label: "Share", render: function (r) {
        return r.share ? fmt(r.share, "pct1") : '<span class="zero">—</span>'; }},
      {key: "impressions", label: "Impressions", kind: "int", tip: "impressions"},
      {key: "clicks", label: "Clicks", kind: "int", tip: "clicks"},
      {key: "ctr", label: "CTR", tip: "ctr", render: function (r) {
        return r.impressions ? fmt(r.ctr, "pct") : '<span class="zero">—</span>'; }},
      {key: "cvr", label: "Conv. rate", tip: "cvr", render: function (r) {
        if (!r.clicks) { return '<span class="zero">—</span>'; }
        return '<span class="' + (r.cvr >= D.meta.shop_cvr ? "strong" : "") + '">' +
               fmt(r.cvr, "pct") + "</span>"; }},
      {key: "orders", label: "Orders", kind: "int"},
      {key: "units", label: "Units", kind: "int", tip: "units"},
      {key: "paid_sales", label: "Paid", tip: "paid_gap", render: function (r) {
        return r.paid_sales ? fmt(r.paid_sales, "money") : '<span class="zero">—</span>'; }},
      {key: "leak", label: "Unpaid", tip: "paid_gap", render: function (r) {
        if (!r.sales) { return '<span class="zero">—</span>'; }
        return r.leak > 0.001
          ? '<span style="color:var(--crit);font-weight:700">' + fmt(r.leak, "pct1") + "</span>"
          : "0.0%"; }},
      {key: "aov", label: "Per order", tip: "sales", render: function (r) {
        return r.orders ? fmt(r.aov, "money") : '<span class="zero">—</span>'; }},
      {key: "channels", label: "Sources", text: true, tip: "channel", render: function (r) {
        return r.channels.length ? esc(r.channels.join(", ")) : '<span class="zero">—</span>'; }}
    ];

    var tools = document.getElementById("tabletools");
    chips.forEach(function (c) {
      var b = el("button", "chip", c.label);
      b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        state.chips[c.key] = !state.chips[c.key];
        b.setAttribute("aria-pressed", state.chips[c.key] ? "true" : "false");
        draw();
      });
      tools.appendChild(b);
    });
    var srch = el("div", "srch");
    srch.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8"><circle cx="7" cy="7" r="4.4"/><path d="M10.4 10.4 14 14" ' +
      'stroke-linecap="round"/></svg><input type="search" placeholder="Find a product…" ' +
      'aria-label="Find a product">';
    var input = srch.querySelector("input");
    input.addEventListener("input", function () { state.q = input.value; draw(); });
    tools.appendChild(srch);
    var count = el("span", "count");
    tools.appendChild(count);
    var dl = el("a", "dlbtn", '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round"><path d="M8 2v8m0 0L5 7m3 3 3-3M2.5 12.5v1h11v-1"/>' +
      "</svg>CSV");
    dl.href = "#";
    dl.addEventListener("click", function (e) {
      e.preventDefault();
      var data = visible();
      var use = cols.filter(function (c) { return c.label; });
      var csv = [use.map(function (c) { return c.label; }).join(",")].concat(
        data.map(function (r) {
          return use.map(function (c) {
            var v = r[c.key];
            if (Array.isArray(v)) { v = v.join(" | "); }
            return '"' + String(v === undefined || v === null ? "" : v).replace(/"/g, '""') + '"';
          }).join(",");
        })).join("\n");
      var url = URL.createObjectURL(new Blob([csv], {type: "text/csv"}));
      var a = document.createElement("a");
      a.href = url; a.download = "product-performance.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    });
    tools.appendChild(dl);

    function visible() {
      var q = state.q.toLowerCase();
      var on = chips.filter(function (c) { return state.chips[c.key]; });
      var out = rows.filter(function (r) {
        if (q && (r.name + " " + r.id).toLowerCase().indexOf(q) < 0) { return false; }
        return !on.length || on.some(function (c) { return c.test(r); });
      });
      var k = state.sort, sign = state.dir === "asc" ? 1 : -1;
      return out.slice().sort(function (a, b) {
        var x = a[k], y = b[k];
        if (typeof x === "string" || typeof y === "string") {
          return sign * String(x).localeCompare(String(y));
        }
        return sign * ((x || 0) - (y || 0));
      });
    }

    var host = document.getElementById("ptable");
    function draw() {
      var data = visible();
      count.textContent = data.length + (data.length === 1 ? " product" : " products");
      if (!data.length) {
        host.innerHTML = '<div class="none-row">No product matches that.</div>';
        return;
      }
      var t = el("table");
      var tr = el("tr");
      cols.forEach(function (c) {
        var th = el("th", null, esc(c.label) + info(c.tip) +
          (c.label ? '<span class="sm">' + (state.dir === "asc" ? "▲" : "▼") + "</span>" : ""));
        if (state.sort === c.key && c.label) { th.setAttribute("aria-sort", state.dir + "ending"); }
        th.addEventListener("click", function (e) {
          if (e.target.closest(".i") || !c.label) { return; }
          if (state.sort === c.key) { state.dir = state.dir === "desc" ? "asc" : "desc"; }
          else { state.sort = c.key; state.dir = c.text ? "asc" : "desc"; }
          draw();
        });
        tr.appendChild(th);
      });
      var thead = el("thead"); thead.appendChild(tr); t.appendChild(thead);
      var tb = el("tbody");
      data.forEach(function (r) {
        var row = el("tr");
        cols.forEach(function (c) {
          row.appendChild(el("td", c.cls || "", c.render ? c.render(r) : fmt(r[c.key], c.kind)));
        });
        tb.appendChild(row);
      });
      t.appendChild(tb);
      host.innerHTML = ""; host.appendChild(t);
    }
    draw();
  })();

  /* ----------------------------------------------------------- channels -- */
  (function () {
    var host = document.getElementById("channels");
    var peak = Math.max.apply(null, D.channels.map(function (c) { return c.sales; }).concat([1]));
    D.channels.forEach(function (c) {
      var r = el("div", "rw");
      var bits = [];
      if (c.has_impressions) {
        bits.push(fmt(c.impressions, "int") + " " + c.impression_label.toLowerCase());
      }
      if (c.has_clicks) { bits.push(fmt(c.ctr, "pct") + " CTR"); }
      bits.push(fmt(c.orders, "int") + " orders");
      r.innerHTML =
        '<div><div class="cn">' + esc(c.channel) + "</div>" +
        '<div class="cs">' + bits.join(" · ") + "</div></div>" +
        '<div class="track"><div class="fill" style="width:' +
        Math.max(c.sales / peak * 100, 1).toFixed(1) + '%"></div></div>' +
        '<div class="vv">' + (c.sales ? fmt(c.sales, "money0") : "—") + "</div>";
      host.appendChild(r);
    });
    var subs = document.getElementById("subchannels");
    D.subchannels.slice(0, 10).forEach(function (c) {
      var r = el("div", "rw");
      var sb = [esc(c.parent)];
      if (c.has_clicks) { sb.push(fmt(c.ctr, "pct") + " CTR"); }
      if (c.is_ads && c.ad_spend) { sb.push(fmt(c.ad_spend, "money0") + " spent"); }
      sb.push(fmt(c.cvr, "pct") + " conversion");
      r.innerHTML =
        '<div><div class="cn">' + esc(c.channel) + "</div>" +
        '<div class="cs">' + sb.join(" · ") + "</div></div>" +
        '<div class="track"><div class="fill" style="width:' +
        Math.max(c.share * 100, 1).toFixed(1) + '%"></div></div>' +
        '<div class="vv">' + fmt(c.sales, "money0") + "</div>";
      subs.appendChild(r);
    });
  })();

  /* ----------------------------------------------------------- tracker -- */
  (function () {
    var host = document.getElementById("tracker"), T = D.tracker || {};
    if (!host) { return; }
    if (!T.available) {
      host.innerHTML = '<div class="chartcard"><h3>Nothing to compare yet</h3>' +
        "<p>Drop another export tomorrow and this becomes a day-by-day tracker: what moved, " +
        "whether it is outside its normal range, and what to look at first.</p></div>";
      return;
    }
    document.getElementById("trackhead").textContent =
      "How " + (T.day_label || T.day) + " compares";
    document.getElementById("tracksub").textContent =
      T.days_recorded + " days recorded so far. Every export is merged into one running " +
      "daily record, so this builds itself — overlapping exports correct the days they " +
      "cover rather than double-counting them.";

    var html = "";
    if (T.focus && T.focus.length) {
      html += '<div class="focus"><header><h3>Look at these first</h3>' +
        '<span class="when">' + esc(T.day_label || T.day) +
        (T.previous_day ? " vs " + esc(T.previous_day_label || T.previous_day) : "") +
        "</span></header>";
      T.focus.forEach(function (f, i) {
        html += '<div class="fitem"><span class="rank">' + (i + 1) + "</span><div>" +
          "<h4>" + esc(f.title) + '<span class="arrow ' + f.verdict + '">' +
          (f.verdict === "worse" ? "worse" : f.verdict === "better" ? "better"
            : f.verdict === "neutral" ? "changed" : "flat") +
          "</span></h4><p>" + esc(f.detail) + '</p><p class="todo">' +
          esc(f.action) + "</p></div></div>";
      });
      html += "</div>";
    }

    var tiles = T.metrics || [];
    // Pick a column count that divides the tiles evenly. The grid draws its
    // hairlines with a 1px gap over a tinted background, so a half-empty last
    // row shows as a grey slab rather than as nothing.
    var cols = tiles.length % 4 === 0 ? 4 : tiles.length % 3 === 0 ? 3
      : tiles.length % 2 === 0 ? 2 : Math.min(tiles.length, 4);
    html += '<div class="deltas' + (cols === 4 ? "" : " c" + cols) + '">';
    tiles.forEach(function (m) {
      var c = m.vs_yesterday;
      var change = c !== null ? (c >= 0 ? "+" : "") + (c * 100).toFixed(1) + "% vs yesterday"
        : m.yesterday === 0 ? "none yesterday"
        : m.yesterday !== null ? "no comparison"
        : T.previous_day ? "not measured yesterday" : "no prior day";
      html += '<div class="dl"><p class="k">' + esc(m.label) + info(m.metric) +
        (m.unusual ? '<span class="unusual">unusual</span>' : "") + "</p>" +
        '<p class="v">' + esc(fmtKind(m.value, m.kind)) + "</p>" +
        '<p class="c ' + m.verdict + '">' + esc(change) + "</p>" +
        '<p class="t">' + (m.typical !== null
          ? "usually " + esc(fmtKind(m.typical, m.kind)) : "&nbsp;") + "</p></div>";
    });
    for (var pad = tiles.length % cols; pad && pad < cols; pad++) {
      html += '<div class="dl pad"></div>';
    }
    html += "</div>";

    if (!T.reliable) {
      html += '<div class="thin"><b>Only ' + T.days_recorded +
        " days recorded.</b> Day-to-day swings on a young history are mostly noise. " +
        "The comparisons get trustworthy at about two weeks, and a same-weekday " +
        "comparison needs three.</div>";
    }

    var mv = T.movers || {};
    if (mv.rows && mv.rows.length) {
      html += '<div class="chartcard movers"><h3>Where the change came from</h3>' +
        "<p>Traffic sources by how much their sales moved, " +
        esc(mv.day_label || mv.day) + " against " + esc(mv.previous_label || mv.previous) +
        "." + (mv.lagging ? " The per-source sheets in this export stop before " +
          esc(T.day_label || T.day) + ", so this is the newest day they cover." : "") +
        "</p><div class=\"rows\">";
      var peak = Math.max.apply(null, mv.rows.map(function (m) {
        return Math.abs(m.delta); }).concat([1]));
      mv.rows.forEach(function (m) {
        var up = m.delta >= 0;
        html += '<div class="rw"><div><div class="cn">' + esc(m.source) + "</div>" +
          '<div class="cs">' + esc(m.channel) + " · " + fmt(m.was, "money0") + " → " +
          fmt(m.sales, "money0") +
          (m.is_ads && m.spend_delta ? " · spend " + (m.spend_delta >= 0 ? "+" : "−") +
            fmt(Math.abs(m.spend_delta), "money0") : "") + "</div></div>" +
          '<div class="track"><div class="fill" style="width:' +
          Math.max(Math.abs(m.delta) / peak * 100, 2).toFixed(1) + "%;background:" +
          (up ? "var(--good)" : "var(--crit)") + '"></div></div>' +
          '<div class="vv" style="color:' + (up ? "var(--good)" : "var(--crit)") + '">' +
          (up ? "+" : "−") + fmt(Math.abs(m.delta), "money0") + "</div></div>";
      });
      html += "</div></div>";
    }
    host.innerHTML = html;

    if (T.series && T.series.length > 1) {
      var card = el("div", "chartcard");
      card.style.marginTop = "18px";
      card.innerHTML = "<h3>Sales, every recorded day</h3><p>The whole history, not just " +
        "this export's window.</p><div id=\"chart-history\"></div>";
      host.appendChild(card);
      lineChart("chart-history", T.series.map(function (d) {
        return {label: d.day_label || d.day.slice(5), v: d.sales}; }), "money0", "var(--accent)");
    }
  })();

  function fmtKind(v, kind) {
    if (kind === "money") { return fmt(v, "money"); }
    if (kind === "pct") { return fmt(v, "pct"); }
    if (kind === "x") { return v.toFixed(1) + "×"; }
    return fmt(v, "int");
  }

  /* --------------------------------------------------------------- ads -- */
  (function () {
    var host = document.getElementById("adspanel");
    var ads = D.channels_ads || [];
    if (!host || !ads.length) { return; }
    var rows = ads.map(function (a) {
      var dead = a.ad_spend > 0 && a.sales <= 0;
      return "<tr><td><span class=\"pname\">" + esc(a.channel) + "</span></td>" +
        "<td>" + fmt(a.ad_spend, "money") + "</td>" +
        "<td>" + (a.sales ? fmt(a.sales, "money") : '<span class="zero">—</span>') + "</td>" +
        "<td>" + (dead
          ? '<span style="color:var(--crit);font-weight:700">0.00×</span>'
          : '<span class="strong">' + a.ad_roas.toFixed(2) + "×</span>") + "</td>" +
        "<td>" + fmt(a.orders, "int") + "</td>" +
        "<td>" + fmt(a.impressions, "int") + "</td></tr>";
    }).join("");
    host.innerHTML =
      '<div class="chartcard" style="margin-top:18px"><h3>Paid placements' + info("channel") +
      "</h3><p>Spend and return by ad type, taken from the Shopee Ads tab. " +
      "Total " + fmt(D.totals.ad_spend, "money") + " for " +
      fmt(D.totals.ad_sales, "money") + " at a blended " +
      D.totals.ad_roas.toFixed(2) + "×.</p>" +
      '<div class="scroll"><table><thead><tr><th>Placement</th><th>Spend</th>' +
      "<th>Sales</th><th>ROAS" + info("roas") + "</th><th>Orders</th>" +
      "<th>Impressions</th></tr></thead><tbody>" + rows + "</tbody></table></div></div>";
  })();

  /* ------------------------------------------------------------- charts -- */
  function lineChart(hostId, series, kind, colour) {
    var host = document.getElementById(hostId);
    if (!host || !series.length) { return; }
    var W = 520, H = 190, L = 52, R = 30, T = 16, B = 30;
    var max = Math.max.apply(null, series.map(function (d) { return d.v; })) || 1;
    var stepX = (W - L - R) / Math.max(series.length - 1, 1);
    var X = function (i) { return L + i * stepX; };
    var Y = function (v) { return T + (1 - v / max) * (H - T - B); };
    var pts = series.map(function (d, i) { return X(i) + "," + Y(d.v).toFixed(1); });
    var svg = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img">'];
    [0, 0.5, 1].forEach(function (f) {
      var y = Y(max * f);
      svg.push('<line class="gl" x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (W - R) +
               '" y2="' + y.toFixed(1) + '"/>');
      svg.push('<text class="ax" x="' + (L - 8) + '" y="' + (y + 3.5).toFixed(1) +
               '" text-anchor="end">' +
               (kind === "pct" ? fmt(max * f, "pct")
                               : Math.round(max * f).toLocaleString("en-MY")) + "</text>");
    });
    svg.push('<path d="M' + pts.join("L") + "L" + X(series.length - 1) + "," + Y(0) +
             "L" + X(0) + "," + Y(0) + 'Z" fill="' + colour + '" fill-opacity=".10"/>');
    svg.push('<path d="M' + pts.join("L") + '" fill="none" stroke="' + colour +
             '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
    series.forEach(function (d, i) {
      if (i === series.length - 1) {
        svg.push('<circle cx="' + X(i) + '" cy="' + Y(d.v).toFixed(1) +
                 '" r="4.5" fill="' + colour + '"/>');
      }
      var last = i === series.length - 1;
      if (i % Math.ceil(series.length / 5) === 0 || last) {
        svg.push('<text class="ax" x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="' +
                 (last ? "end" : i === 0 ? "start" : "middle") + '">' + esc(d.label) + "</text>");
      }
    });
    svg.push("</svg>");
    host.innerHTML = svg.join("");
  }
  lineChart("chart-sales", D.daily.map(function (d) {
    return {label: d.label, v: d.sales}; }), "money0", "var(--accent)");
  lineChart("chart-cvr", D.daily.map(function (d) {
    return {label: d.label, v: d.cvr}; }), "pct", "var(--s1)");

  /* ---------------------------------------------------------- findings -- */
  (function () {
    var host = document.getElementById("findings");
    D.findings.forEach(function (f) {
      var d = el("div", "find");
      d.innerHTML = '<span class="badge ' + f.level + '">' + esc(D.labels[f.level]) + "</span>" +
        "<div><h4>" + esc(f.title) + "</h4><p>" + esc(f.detail) + "</p></div>";
      host.appendChild(d);
    });
  })();

  /* ------------------------------------------------------------- theme -- */
  var order = ["system", "light", "dark"], mode = "system";
  try { mode = localStorage.getItem("shopads.ptheme") || "system"; } catch (e) { /* ignore */ }
  function apply(m) {
    if (m === "system") { document.documentElement.removeAttribute("data-theme"); }
    else { document.documentElement.setAttribute("data-theme", m); }
    try { localStorage.setItem("shopads.ptheme", m); } catch (e) { /* ignore */ }
  }
  apply(mode);
  var btn = document.getElementById("theme");
  btn.title = "Theme: " + mode;
  btn.addEventListener("click", function () {
    mode = order[(order.indexOf(mode) + 1) % order.length];
    apply(mode); btn.title = "Theme: " + mode;
  });
})();
"""
