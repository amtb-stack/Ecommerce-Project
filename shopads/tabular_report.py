"""Graphical profile of any tabular file.

Written for a file whose meaning the tool does not know. Every claim is
structural -- shape, type, spread, gaps -- so the page never implies a
business interpretation it has no basis for.
"""

from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path

from .tabular import Dataset, correlations_for, preview_rows
from .writer import write_atomic

LEVEL_LABEL = {"critical": "Problem", "warning": "Check this", "good": "Clean", "info": "Note"}

KIND_HELP = {
    "number": "Numbers. Charted as a distribution so you can see the shape, not just the average.",
    "percentage": "Percentages, stored as fractions so 4.52% is 0.0452.",
    "date": "Dates. Charted as how many rows fall on each day.",
    "category": "A short list of repeating values — something you can group by.",
    "text": "Free text, mostly unique. Usually a name, an ID or a description.",
    "empty": "No values at all in this column.",
}


def _e(v: object) -> str:
    return html.escape(str(v), quote=True)


def _payload(dataset: Dataset) -> dict:
    sheets = []
    for sheet in dataset.sheets:
        sheets.append({
            "name": sheet.name,
            "rows": len(sheet.frame),
            "columns": len(sheet.columns),
            "duplicates": sheet.duplicates,
            "memory": round(sheet.memory, 2),
            "header_row": sheet.header_row,
            "findings": sheet.findings,
            "profile": sheet.columns,
            "correlations": correlations_for(sheet),
            "preview": preview_rows(sheet),
            "fields": [c["name"] for c in sheet.columns],
        })
    return {
        "meta": {
            "source": dataset.source_path.name,
            "kind": dataset.kind.upper(),
            "generated": dataset.read_at.strftime("%d %b %Y, %H:%M"),
            "sheets": len(sheets),
            "rows": dataset.total_rows,
        },
        "labels": LEVEL_LABEL,
        "kindHelp": KIND_HELP,
        "sheets": sheets,
    }


def render(dataset: Dataset) -> str:
    payload = _payload(dataset)
    m = payload["meta"]
    data = json.dumps(payload, ensure_ascii=False, default=str).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(m['source'])} — data profile</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap">
<style>{CSS}</style></head>
<body>
<div class="bar"><div class="wrap">
  <span class="dot"></span><span class="name">Data profile</span>
  <span class="file mono">{_e(m['source'])}</span>
  <span class="spacer"></span>
  <select id="sheetpick" aria-label="Choose a sheet"></select>
  <button type="button" class="ghost" id="theme" aria-label="Change theme">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1
      M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" stroke-linecap="round"/></svg>
  </button>
</div></div>

<header class="hero"><div class="wrap">
  <p class="eyebrow">{_e(m['kind'])} &middot; {m['sheets']} sheet{'s' if m['sheets'] != 1 else ''}
     &middot; read offline {_e(m['generated'])}</p>
  <h1 id="title">Data profile</h1>
  <p class="sub">This file is not one of the Shopee reports the tool recognises, so it has been
     profiled instead: what is in it, what type each column is, and what looks wrong. Nothing here
     assumes what the numbers mean.</p>
  <div class="stats" id="stats"></div>
</div></header>

<section><div class="wrap">
  <div class="head"><p class="kicker">Structure</p><h2>What stands out</h2>
    <p>Only things that are true of the data itself &mdash; gaps, duplicates, columns that never
       change, values that dominate an average.</p></div>
  <div id="findings"></div>
</div></section>

<section><div class="wrap">
  <div class="head"><p class="kicker">Every column</p><h2>Each field, charted</h2>
    <p>Numbers get a distribution, dates get a timeline, categories get their most common values.
       Use the filter to show only one kind.</p></div>
  <div class="chips" id="kindchips"></div>
  <div class="grid" id="columns"></div>
</div></section>

<section id="corrsec"><div class="wrap">
  <div class="head"><p class="kicker">Relationships</p><h2>Columns that move together</h2>
    <p>Numeric pairs correlating at 0.5 or above. This measures association only &mdash; two
       columns can track each other perfectly without one causing the other, and a pair that is
       simply the same quantity twice will read as 1.00.</p></div>
  <div id="corr"></div>
</div></section>

<section><div class="wrap">
  <div class="head"><p class="kicker">The data</p><h2>First rows, as read</h2>
    <p>Exactly what the tool parsed, after finding the header. If this looks wrong, the header
       was detected in the wrong place and everything above it is suspect.</p></div>
  <div class="panel"><div class="tools" id="tabletools"></div>
    <div class="scroll" id="preview"></div></div>
</div></section>

<footer class="end"><div class="wrap">
  Profiled offline from <span class="mono">{_e(m['source'])}</span>. Nothing was uploaded.<br>
  Drop a Shopee ads or shop-statistics export instead and you get the full analysis rather than
  this profile.
</div></footer>
<div id="tip" role="tooltip"></div>
<script>window.__PROFILE__ = {data};</script>
<script>{JS}</script>
</body></html>"""


def write_tabular_report(dataset: Dataset, out_dir: Path) -> Path:
    """Profiles keep dated names, in their own folder.

    Unlike the two reports, these are one-offs about one file rather than a
    running view of the shop, so there is nothing for a later one to refresh.
    They are kept out of the reports folder so it only ever holds the two.
    """
    stamp = datetime.now().strftime("%Y-%m-%d")
    slug = "".join(c if c.isalnum() else "-" for c in dataset.source_path.stem)[:50].strip("-")
    path = out_dir / f"{stamp}_profile_{slug}.html"
    counter = 2
    while path.exists():
        path = out_dir / f"{stamp}_profile_{slug}_{counter}.html"
        counter += 1
    return write_atomic(path, render(dataset))


CSS = """
:root{color-scheme:light;
 --bg:#fbfbfd;--surface:#fff;--sunken:#f2f2f5;--ink:#17171a;--ink-2:#6b6b73;--ink-3:#8b8b93;
 --faint:#a8a8b0;--hair:#e4e4ea;--hair-2:#eeeef2;
 --accent:#4c5fd7;--accent-wash:#eeeffc;--accent-line:#d4d8f6;
 --num:#2a78d6;--cat:#eb6834;--dat:#1baf7a;--txt:#8b8b93;
 --good:#1a7f37;--good-w:#e7f5eb;--warn:#9a6100;--warn-w:#fdf3e2;--crit:#c1121f;--crit-w:#fdecee;
 --sh:0 1px 3px rgba(23,23,26,.06);--sh-lg:0 10px 36px rgba(23,23,26,.12)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;
 --bg:#0b0b0e;--surface:#161619;--sunken:#1f1f24;--ink:#f2f2f5;--ink-2:#a6a6ae;--ink-3:#88888f;
 --faint:#6a6a72;--hair:#28282e;--hair-2:#212127;
 --accent:#8b95f0;--accent-wash:#1b1c33;--accent-line:#2e3059;
 --num:#3987e5;--cat:#d95926;--dat:#199e70;--txt:#88888f;
 --good:#43c463;--good-w:#10241a;--warn:#e0a83c;--warn-w:#2a2110;--crit:#f07070;--crit-w:#2b1416;
 --sh:0 1px 3px rgba(0,0,0,.5);--sh-lg:0 10px 36px rgba(0,0,0,.6)}}
:root[data-theme="dark"]{color-scheme:dark;
 --bg:#0b0b0e;--surface:#161619;--sunken:#1f1f24;--ink:#f2f2f5;--ink-2:#a6a6ae;--ink-3:#88888f;
 --faint:#6a6a72;--hair:#28282e;--hair-2:#212127;
 --accent:#8b95f0;--accent-wash:#1b1c33;--accent-line:#2e3059;
 --num:#3987e5;--cat:#d95926;--dat:#199e70;--txt:#88888f;
 --good:#43c463;--good-w:#10241a;--warn:#e0a83c;--warn-w:#2a2110;--crit:#f07070;--crit-w:#2b1416;
 --sh:0 1px 3px rgba(0,0,0,.5);--sh-lg:0 10px 36px rgba(0,0,0,.6)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-size:15px;line-height:1.55;
 font-family:Manrope,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;
 font-variant-numeric:tabular-nums;letter-spacing:-.005em}
h1,h2,h3,h4{margin:0;text-wrap:balance}
.mono{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;letter-spacing:0}
button,select{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
.wrap{max-width:1180px;margin:0 auto;padding:0 30px}
@media(max-width:640px){.wrap{padding:0 18px}}
.bar{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 85%,transparent);
 backdrop-filter:saturate(180%) blur(18px);border-bottom:1px solid var(--hair-2)}
.bar .wrap{display:flex;align-items:center;gap:12px;height:54px}
.bar .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);flex:none}
.bar .name{font-weight:800;font-size:15px;letter-spacing:-.02em;white-space:nowrap}
.bar .file{font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;
 text-overflow:ellipsis;max-width:34ch}
.spacer{flex:1}
select{background:var(--sunken);border:1px solid var(--hair);border-radius:9px;
 padding:7px 11px;font-size:13px;font-weight:600;max-width:200px}
.ghost{width:32px;height:32px;border-radius:9px;border:1px solid var(--hair);background:transparent;
 display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-2);flex:none}
.ghost:hover{background:var(--sunken);color:var(--ink)}.ghost svg{width:15px;height:15px}
.hero{padding:60px 0 44px}
.eyebrow{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
 color:var(--accent);margin:0 0 14px}
h1{font-size:clamp(30px,4.6vw,44px);font-weight:800;letter-spacing:-.032em;line-height:1.06}
.sub{margin:16px 0 0;font-size:17px;color:var(--ink-2);max-width:70ch}
.stats{margin-top:34px;display:grid;grid-template-columns:repeat(5,1fr);gap:1px;
 background:var(--hair);border:1px solid var(--hair);border-radius:14px;overflow:hidden}
@media(max-width:820px){.stats{grid-template-columns:repeat(2,1fr)}}
.stats div{background:var(--surface);padding:16px 18px}
.stats .n{font-size:25px;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.stats .l{margin-top:4px;font-size:11.5px;color:var(--ink-3);font-weight:600}
section{padding:56px 0;border-top:1px solid var(--hair-2)}
.head{max-width:66ch;margin-bottom:26px}
.kicker{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
 color:var(--accent);margin:0 0 10px}
.head h2{font-size:clamp(23px,3vw,31px);font-weight:800;letter-spacing:-.026em;line-height:1.15}
.head p{margin:12px 0 0;font-size:15.5px;color:var(--ink-2)}
.find{display:grid;grid-template-columns:auto 1fr;gap:14px;padding:17px 0;
 border-top:1px solid var(--hair-2);align-items:start}
.find:first-child{border-top:0}
.find h4{font-size:15px;font-weight:700;letter-spacing:-.016em}
.find p{margin:5px 0 0;font-size:14.5px;color:var(--ink-2);max-width:80ch}
.badge{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
 padding:4px 10px;border-radius:999px;white-space:nowrap}
.badge.critical,.badge.warning{background:var(--warn-w);color:var(--warn)}
.badge.good{background:var(--good-w);color:var(--good)}
.badge.info{background:var(--sunken);color:var(--ink-3)}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.chip{font-size:12.5px;font-weight:700;padding:6px 13px;border-radius:999px;cursor:pointer;
 border:1px solid var(--hair);background:transparent;color:var(--ink-2);white-space:nowrap}
.chip:hover{border-color:var(--accent);color:var(--ink)}
.chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.col{background:var(--surface);border:1px solid var(--hair);border-radius:16px;padding:18px 20px;
 box-shadow:var(--sh);min-width:0}
.col header{display:flex;align-items:baseline;gap:8px;margin-bottom:3px}
.col h3{font-size:14.5px;font-weight:800;letter-spacing:-.016em;overflow-wrap:anywhere;flex:1}
.kind{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
 padding:3px 8px;border-radius:5px;white-space:nowrap}
.kind.number,.kind.percentage{background:color-mix(in srgb,var(--num) 14%,transparent);color:var(--num)}
.kind.category{background:color-mix(in srgb,var(--cat) 15%,transparent);color:var(--cat)}
.kind.date{background:color-mix(in srgb,var(--dat) 15%,transparent);color:var(--dat)}
.kind.text,.kind.empty{background:var(--sunken);color:var(--txt)}
.meta{font-size:12px;color:var(--ink-3);margin:0 0 12px}
.meta b{color:var(--ink-2);font-weight:700}
.gapbar{height:4px;border-radius:99px;background:var(--sunken);overflow:hidden;margin:0 0 12px}
.gapbar i{display:block;height:100%;background:var(--warn)}
.hist{display:flex;align-items:flex-end;gap:2px;height:76px}
.hist i{flex:1;background:var(--num);border-radius:2px 2px 0 0;min-height:2px;display:block}
.axis{display:flex;justify-content:space-between;font-size:10.5px;color:var(--faint);
 margin-top:6px;font-family:"IBM Plex Mono",monospace}
.cats{display:flex;flex-direction:column;gap:7px}
.cat{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;font-size:12.5px}
.cat .lb{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-2)}
.cat .track{grid-column:1/-1;height:5px;border-radius:99px;background:var(--sunken);overflow:hidden}
.cat .track i{display:block;height:100%;background:var(--cat);border-radius:99px}
.cat .vv{font-weight:700;font-size:12px}
.spark{display:flex;align-items:flex-end;gap:1px;height:56px}
.spark i{flex:1;background:var(--dat);border-radius:1px;min-height:2px;display:block}
.statline{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 14px;margin-top:12px;
 font-size:12.5px}
.statline div{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--hair-2);
 padding-top:5px}
.statline span{color:var(--ink-3)}.statline b{font-weight:700}
.corrgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.corr{background:var(--surface);border:1px solid var(--hair);border-radius:14px;padding:15px 17px;
 box-shadow:var(--sh)}
.corr .p{font-size:13.5px;font-weight:700;overflow-wrap:anywhere}
.corr .r{font-size:22px;font-weight:800;letter-spacing:-.03em;margin-top:4px}
.corr .r.pos{color:var(--num)}.corr .r.neg{color:var(--cat)}
.corr .d{font-size:12px;color:var(--ink-3);margin-top:2px}
.panel{background:var(--surface);border:1px solid var(--hair);border-radius:16px;overflow:hidden;
 box-shadow:var(--sh)}
.tools{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:14px 18px;
 border-bottom:1px solid var(--hair-2)}
.tools input{background:var(--sunken);border:1px solid transparent;border-radius:999px;
 padding:7px 14px;font:inherit;font-size:13px;width:200px}
.tools input:focus{outline:none;border-color:var(--accent)}
.count{font-size:12.5px;color:var(--faint);font-weight:600;margin-left:auto}
.dl{font-size:12.5px;font-weight:700;padding:6px 13px;border-radius:999px;border:1px solid var(--hair);
 background:transparent;color:var(--ink-2);cursor:pointer;text-decoration:none}
.dl:hover{border-color:var(--accent);color:var(--accent)}
.scroll{overflow:auto;max-height:min(70vh,700px)}
table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}
th{position:sticky;top:0;z-index:2;background:var(--surface);text-align:left;font-size:10.5px;
 font-weight:800;letter-spacing:.055em;text-transform:uppercase;color:var(--ink-3);
 padding:11px 14px;white-space:nowrap;border-bottom:1px solid var(--hair)}
td{padding:10px 14px;border-bottom:1px solid var(--hair-2);white-space:nowrap;max-width:280px;
 overflow:hidden;text-overflow:ellipsis}
tbody tr:hover td{background:var(--sunken)}
td.null{color:var(--faint);font-style:italic}
.empty{padding:40px;text-align:center;color:var(--faint)}
footer.end{padding:40px 0 70px;color:var(--faint);font-size:13px;text-align:center;
 border-top:1px solid var(--hair-2)}
#tip{position:fixed;z-index:120;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .12s;
 max-width:min(320px,calc(100vw - 28px));background:var(--surface);border:1px solid var(--hair);
 border-radius:12px;padding:13px 15px;box-shadow:var(--sh-lg);font-size:13px;line-height:1.5}
#tip.on{opacity:1;visibility:visible}
"""

JS = r"""
(function () {
  "use strict";
  var D = window.__PROFILE__, current = 0;
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function el(t,c,h){var n=document.createElement(t);if(c)n.className=c;
    if(h!==undefined)n.innerHTML=h;return n;}
  function n(v,d){return v===null||v===undefined?"—":
    Number(v).toLocaleString("en-MY",{maximumFractionDigits:d===undefined?2:d});}

  var pick=document.getElementById("sheetpick");
  D.sheets.forEach(function(s,i){
    var o=document.createElement("option");o.value=i;
    o.textContent=s.name+" ("+n(s.rows,0)+" rows)";pick.appendChild(o);});
  if(D.sheets.length<2){pick.style.display="none";}
  pick.addEventListener("change",function(){current=+pick.value;draw();});

  var kinds={}, activeKind=null;
  function draw(){
    var s=D.sheets[current];
    document.getElementById("title").textContent=
      D.sheets.length>1?s.name:D.meta.source;

    var st=document.getElementById("stats");
    st.innerHTML="";
    [["Rows",n(s.rows,0)],["Columns",n(s.columns,0)],
     ["Duplicate rows",n(s.duplicates,0)],
     ["Header found on row",n(s.header_row+1,0)],
     ["Size in memory",s.memory+" MB"]].forEach(function(p){
      st.appendChild(el("div",null,'<p class="n">'+p[1]+'</p><p class="l">'+p[0]+"</p>"));});

    var f=document.getElementById("findings");f.innerHTML="";
    s.findings.forEach(function(x){
      f.appendChild(el("div","find",'<span class="badge '+x.level+'">'+
        esc(D.labels[x.level])+"</span><div><h4>"+esc(x.title)+"</h4><p>"+
        esc(x.detail)+"</p></div>"));});

    kinds={};
    s.profile.forEach(function(c){kinds[c.kind]=(kinds[c.kind]||0)+1;});
    var kc=document.getElementById("kindchips");kc.innerHTML="";
    Object.keys(kinds).forEach(function(k){
      var b=el("button","chip",k+" ("+kinds[k]+")");b.type="button";
      b.setAttribute("aria-pressed",activeKind===k?"true":"false");
      b.title=D.kindHelp[k]||"";
      b.addEventListener("click",function(){activeKind=activeKind===k?null:k;draw();});
      kc.appendChild(b);});

    var g=document.getElementById("columns");g.innerHTML="";
    s.profile.filter(function(c){return !activeKind||c.kind===activeKind;})
      .forEach(function(c){g.appendChild(columnCard(c,s.rows));});

    var cs=document.getElementById("corrsec"),cw=document.getElementById("corr");
    cw.innerHTML="";
    if(!s.correlations.length){cs.style.display="none";}
    else{
      cs.style.display="";
      var grid=el("div","corrgrid");
      s.correlations.forEach(function(p){
        grid.appendChild(el("div","corr",
          '<p class="p">'+esc(p.a)+" &middot; "+esc(p.b)+"</p>"+
          '<p class="r '+(p.r>0?"pos":"neg")+'">'+p.r.toFixed(2)+"</p>"+
          '<p class="d">'+(p.r>0?"rise and fall together":"one rises as the other falls")+
          (Math.abs(p.r)>0.97?" — near-identical, likely the same quantity twice":"")+"</p>"));});
      cw.appendChild(grid);
    }
    preview(s);
  }

  function columnCard(c,rows){
    var card=el("div","col");
    var head='<header><h3>'+esc(c.name)+'</h3><span class="kind '+c.kind+'">'+
      c.kind+"</span></header>";
    var meta='<p class="meta"><b>'+n(c.unique,0)+"</b> distinct";
    if(c.missing){meta+=" &middot; <b>"+n(c.missing,0)+"</b> missing ("+
      (c.missing_share*100).toFixed(0)+"%)";}
    meta+="</p>";
    var gap=c.missing_share>0?'<div class="gapbar"><i style="width:'+
      (c.missing_share*100).toFixed(1)+'%"></i></div>':"";
    var body="",stats="";
    if(c.chart&&c.chart.type==="histogram"){
      var mx=Math.max.apply(null,c.chart.bins.map(function(b){return b.count;}))||1;
      body='<div class="hist">'+c.chart.bins.map(function(b){
        return '<i style="height:'+Math.max(b.count/mx*100,2).toFixed(1)+'%" title="'+
          n(b.from)+" – "+n(b.to)+": "+n(b.count,0)+' rows"></i>';}).join("")+"</div>"+
        '<div class="axis"><span>'+n(c.chart.bins[0].from)+"</span><span>"+
        n(c.chart.bins[c.chart.bins.length-1].to)+"</span></div>";
    }else if(c.chart&&c.chart.type==="categories"){
      var top=c.chart.items[0]?c.chart.items[0].count:1;
      body='<div class="cats">'+c.chart.items.map(function(i){
        return '<div class="cat"><span class="lb">'+esc(i.label)+'</span>'+
          '<span class="vv">'+n(i.count,0)+"</span>"+
          '<span class="track"><i style="width:'+(i.count/top*100).toFixed(1)+'%"></i></span></div>';
      }).join("")+"</div>"+(c.chart.other?'<p class="meta" style="margin-top:10px">+ '+
        n(c.chart.other,0)+" in other values</p>":"");
    }else if(c.chart&&c.chart.type==="timeline"){
      var pm=Math.max.apply(null,c.chart.points.map(function(p){return p.count;}))||1;
      body='<div class="spark">'+c.chart.points.map(function(p){
        return '<i style="height:'+Math.max(p.count/pm*100,3).toFixed(1)+'%" title="'+
          esc(p.label)+": "+n(p.count,0)+'"></i>';}).join("")+"</div>"+
        '<div class="axis"><span>'+esc(c.stats.first)+"</span><span>"+
        esc(c.stats.last)+"</span></div>";
    }else if(c.chart&&c.chart.type==="constant"){
      body='<p class="meta">Every row is '+n(c.chart.value)+".</p>";
    }else if(c.kind==="empty"){
      body='<p class="meta">Nothing to chart — the column is empty.</p>';
    }else{
      body='<p class="meta">'+(c.examples||[]).slice(0,3).map(esc).join(" · ")+"</p>";
    }
    var s=c.stats||{};
    function row(k,v){return "<div><span>"+k+"</span><b>"+v+"</b></div>";}
    if(c.kind==="number"||c.kind==="percentage"){
      var pc=c.kind==="percentage";
      stats='<div class="statline">'+
        row("min",pc?(s.min*100).toFixed(2)+"%":n(s.min))+
        row("max",pc?(s.max*100).toFixed(2)+"%":n(s.max))+
        row("median",pc?(s.median*100).toFixed(2)+"%":n(s.median))+
        row("mean",pc?(s.mean*100).toFixed(2)+"%":n(s.mean))+
        row("zeros",n(s.zeros,0))+row("total",pc?"—":n(s.sum))+"</div>";
    }else if(c.kind==="date"){
      stats='<div class="statline">'+row("first",esc(s.first))+row("last",esc(s.last))+
        row("span",n(s.span_days,0)+" days")+row("rows",n(rows,0))+"</div>";
    }else if(s.top!==undefined){
      stats='<div class="statline">'+row("most common",esc(String(s.top).slice(0,18)))+
        row("its share",(s.top_share*100).toFixed(1)+"%")+"</div>";
    }
    card.innerHTML=head+meta+gap+body+stats;
    return card;
  }

  function preview(s){
    var host=document.getElementById("preview"),tools=document.getElementById("tabletools");
    tools.innerHTML="";
    var input=el("input");input.type="search";input.placeholder="Search these rows…";
    var count=el("span","count");
    var dl=el("a","dl","Download CSV");dl.href="#";
    tools.appendChild(input);tools.appendChild(count);tools.appendChild(dl);
    function rows(){var q=input.value.toLowerCase();
      return !q?s.preview:s.preview.filter(function(r){
        return s.fields.some(function(f){
          return String(r[f]===null?"":r[f]).toLowerCase().indexOf(q)>=0;});});}
    function paint(){
      var data=rows();
      count.textContent=n(data.length,0)+" of "+n(s.rows,0)+" rows shown";
      if(!data.length){host.innerHTML='<div class="empty">Nothing matches.</div>';return;}
      var t=el("table");
      t.innerHTML="<thead><tr>"+s.fields.map(function(f){
        return "<th>"+esc(f)+"</th>";}).join("")+"</tr></thead>";
      var tb=el("tbody");
      data.forEach(function(r){
        var tr=el("tr");
        s.fields.forEach(function(f){
          var v=r[f];
          tr.appendChild(el("td",v===null?"null":"",v===null?"empty":esc(String(v))));});
        tb.appendChild(tr);});
      t.appendChild(tb);host.innerHTML="";host.appendChild(t);
    }
    input.addEventListener("input",paint);
    dl.addEventListener("click",function(e){
      e.preventDefault();
      var data=rows();
      var csv=[s.fields.join(",")].concat(data.map(function(r){
        return s.fields.map(function(f){
          return '"'+String(r[f]===null?"":r[f]).replace(/"/g,'""')+'"';}).join(",");
      })).join("\n");
      var url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
      var a=document.createElement("a");a.href=url;a.download=s.name+".csv";
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url);},500);});
    paint();
  }

  var order=["system","light","dark"],mode="system";
  try{mode=localStorage.getItem("shopads.ptheme")||"system";}catch(e){}
  function apply(m){if(m==="system")document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme",m);
    try{localStorage.setItem("shopads.ptheme",m);}catch(e){}}
  apply(mode);
  var tb=document.getElementById("theme");tb.title="Theme: "+mode;
  tb.addEventListener("click",function(){
    mode=order[(order.indexOf(mode)+1)%order.length];apply(mode);tb.title="Theme: "+mode;});

  draw();
})();
"""
