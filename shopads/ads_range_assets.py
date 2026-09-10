"""The keyword report's export picker and side-by-side comparison.

The keyword export carries no date column at all -- only a period stamped in
its header -- so unlike the shop workbook there is nothing to slice. An export
is the smallest unit there is, and this picker deals in whole exports for that
reason rather than pretending otherwise with a date input that could not be
honoured.

Two exports may be added together only when their periods do not touch.
Shopee's periods are inclusive at both ends, so a file ending 1 June and one
starting 1 June share a day; combining those would count it twice, and the
picker refuses rather than quietly producing a wrong total.
"""

from __future__ import annotations

ADS_RANGE_CSS = """
.arb{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 22px}
.arb .grp{display:flex;align-items:center;gap:9px;background:var(--surface);
  border:1px solid var(--line);border-radius:12px;padding:8px 12px}
.arb .grp.on{border-color:var(--accent)}
.arb label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);white-space:nowrap}
.arb select{appearance:none;-webkit-appearance:none;border:0;background:transparent;
  color:var(--ink);font:inherit;font-size:13.5px;font-weight:600;padding:2px 20px 2px 0;
  cursor:pointer;max-width:260px;text-overflow:ellipsis;
  background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),
    linear-gradient(135deg,currentColor 50%,transparent 50%);
  background-position:calc(100% - 8px) 53%,calc(100% - 4px) 53%;
  background-size:5px 5px,5px 5px;background-repeat:no-repeat}
.arb select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.arb .swap{color:var(--muted)}
@media(max-width:620px){.arb{flex-direction:column;align-items:stretch}
  .arb .grp{width:100%}.arb select{max-width:none;flex:1 1 auto;min-width:0}}

.cwarn{margin:0 0 18px;padding:13px 16px;border-radius:11px;background:var(--warn-w);
  color:var(--ink);font-size:13.5px;border-left:3px solid var(--warn)}
.cwarn b{font-weight:700}
.cnone{padding:44px 24px;text-align:center;color:var(--muted);font-size:14.5px;
  border:1px dashed var(--line);border-radius:14px}
.cnone b{display:block;color:var(--ink);font-size:16.5px;font-weight:700;margin-bottom:6px}
.ctab table.dt th{cursor:default}
.ctab table.dt th:hover{color:var(--ink-3);background:var(--raised)}
.ctab table.dt td.d{font-weight:700;font-variant-numeric:tabular-nums}
.ctab table.dt td.d.up{color:var(--good-ink,var(--good))}
.ctab table.dt td.d.down{color:var(--crit-ink,var(--crit))}
.ctab table.dt td.d.flat{color:var(--ink-3)}
.ctab table.dt tr.grp td{background:var(--sunken);font-size:10px;font-weight:700;
  letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3);text-align:left}
.cbadge{display:inline-block;margin-left:7px;font-size:9.5px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;padding:2px 6px;border-radius:999px;
  background:var(--accent-w);color:var(--accent)}
.cgone{background:var(--crit-w);color:var(--crit)}
"""


ADS_RANGE_JS = r"""
(function () {
  "use strict";
  var D = window.__REPORT__ || {};
  var R = (D.ranges || {});
  var periods = R.periods || [];
  var bar = document.getElementById("ads-rangebar");
  var out = document.getElementById("ads-compare");
  if (!bar || !out) { return; }

  var CUR = (D.meta && D.meta.currency) || "RM";
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c];
    });
  }
  function money(v) { return CUR + Math.round(v).toLocaleString(); }
  function money2(v) {
    return CUR + v.toLocaleString(undefined, {minimumFractionDigits: 2,
                                              maximumFractionDigits: 2});
  }
  function intf(v) { return Math.round(v).toLocaleString(); }
  function pct(v) { return (v * 100).toFixed(2) + "%"; }
  function times(v) { return v.toFixed(2) + "×"; }

  if (periods.length < 2) {
    bar.innerHTML = "";
    out.innerHTML = '<div class="cnone"><b>One export so far</b>' +
      "This is where two periods sit side by side. Drop a second Shop+ Ads export into " +
      "the drop folder — any period you like — and this fills in: totals against totals, " +
      "and the keywords and search terms that moved the most money between them." +
      (periods.length ? "<br><br>Recorded so far: " + esc(periods[0].label) : "") +
      "</div>";
    return;
  }

  var state = {a: periods[0].id, b: periods[1].id};

  function find(id) {
    return periods.filter(function (p) { return p.id === id; })[0] || periods[0];
  }

  /* Inclusive at both ends: a file ending 1 Jun and one starting 1 Jun share
     that day, so they are not a clean pair to add together. */
  function touches(a, b) {
    return a.start <= b.end && b.start <= a.end;
  }

  function totals(p) {
    var t = p.totals;
    return {
      label: p.label, days: p.days, source: p.source,
      impressions: t.impressions, clicks: t.clicks, spend: t.spend,
      gmv: t.gmv, conversions: t.conversions,
      keywords: t.keywords, queries: t.queries, rows: t.rows,
      ctr: t.impressions ? t.clicks / t.impressions : 0,
      cpc: t.clicks ? t.spend / t.clicks : 0,
      cvr: t.clicks ? t.conversions / t.clicks : 0,
      roas: t.spend ? t.gmv / t.spend : 0,
      acos: t.gmv ? t.spend / t.gmv : 0,
      cpa: t.conversions ? t.spend / t.conversions : 0,
      perDay: p.days ? t.spend / p.days : 0
    };
  }

  var ROWS = [
    {group: "Reach"},
    {k: "impressions", label: "Impressions", fmt: intf, tip: "impressions", better: "up"},
    {k: "clicks", label: "Clicks", fmt: intf, tip: "clicks", better: "up"},
    {k: "ctr", label: "Click-through rate", fmt: pct, tip: "ctr", better: "up"},
    {group: "Cost"},
    {k: "spend", label: "Spend", fmt: money2, tip: "spend", better: null},
    {k: "perDay", label: "Spend a day", fmt: money2, better: null},
    {k: "cpc", label: "Cost per click", fmt: money2, tip: "cpc", better: "down"},
    {k: "cpa", label: "Cost per conversion", fmt: money2, tip: "cpa", better: "down"},
    {group: "Return"},
    {k: "conversions", label: "Conversions", fmt: intf, tip: "conversions", better: "up"},
    {k: "cvr", label: "Conversion rate", fmt: pct, tip: "cvr", better: "up"},
    {k: "gmv", label: "GMV", fmt: money2, tip: "gmv", better: "up"},
    {k: "roas", label: "ROAS", fmt: times, tip: "roas", better: "up"},
    {k: "acos", label: "ACOS", fmt: pct, tip: "acos", better: "down"},
    {group: "Coverage"},
    {k: "keywords", label: "Keywords bid on", fmt: intf, better: null},
    {k: "queries", label: "Distinct search terms", fmt: intf, better: null}
  ];

  function info(key) {
    var g = D.glossary || {};
    if (!key || !g[key]) { return ""; }
    return ' <button type="button" class="i" aria-label="What this means" ' +
      'aria-expanded="false" data-tip="' + esc(g[key]) + '">i</button>';
  }

  function change(now, was, better) {
    if (was === 0 || was == null) {
      return {cls: "flat", text: now ? "new" : "—"};
    }
    var d = (now - was) / Math.abs(was);
    if (Math.abs(d) < 0.0005) { return {cls: "flat", text: "no change"}; }
    var good = better === null ? null : better === "up" ? d > 0 : d < 0;
    return {
      cls: good === null ? "flat" : good ? "up" : "down",
      text: (d >= 0 ? "+" : "−") + Math.abs(d * 100).toFixed(1) + "%"
    };
  }

  function totalsTable(A, B) {
    var body = ROWS.map(function (r) {
      if (r.group) { return '<tr class="grp"><td colspan="4">' + esc(r.group) + "</td></tr>"; }
      var c = change(A[r.k], B[r.k], r.better);
      return "<tr><td>" + esc(r.label) + info(r.tip) + "</td><td class='num'>" +
        r.fmt(A[r.k]) + "</td><td class='num'>" + r.fmt(B[r.k]) +
        "</td><td class='num d " + c.cls + "'>" + c.text + "</td></tr>";
    }).join("");
    return '<div class="card ctab"><header><h3>' + esc(A.label) + " against " +
      esc(B.label) + "</h3><p class='hint'>" + A.days + " days against " + B.days +
      " days. Rates are recomputed from the totals, never averaged.</p></header>" +
      "<div class='tablewrap'><table class='dt'><thead><tr><th>Measure</th><th class='num'>" +
      esc(A.label) + "</th><th class='num'>" + esc(B.label) +
      "</th><th class='num'>Change</th></tr></thead><tbody>" + body +
      "</tbody></table></div></div>";
  }

  /* What actually moved, keyword by keyword. A keyword present in one export
     and not the other is the interesting case, so it is kept and labelled
     rather than dropped for having nothing to divide by. */
  function movers(a, b, key, label, metric, fmt, better) {
    var A = {}, B = {};
    (a[key] || []).forEach(function (r) { A[r[label]] = r; });
    (b[key] || []).forEach(function (r) { B[r[label]] = r; });
    var names = Object.keys(A);
    Object.keys(B).forEach(function (n) { if (names.indexOf(n) < 0) { names.push(n); } });

    var rows = names.map(function (n) {
      var x = A[n] || {}, y = B[n] || {};
      var now = x[metric] || 0, was = y[metric] || 0;
      return {name: n, now: now, was: was, d: now - was,
              missing: !A[n] ? "gone" : !B[n] ? "new" : "",
              nowSpend: x.spend || 0, wasSpend: y.spend || 0,
              nowGmv: x.gmv || 0, wasGmv: y.gmv || 0};
    }).filter(function (r) { return Math.abs(r.d) > 0.005; })
      .sort(function (p, q) { return Math.abs(q.d) - Math.abs(p.d); })
      .slice(0, 15);
    if (!rows.length) { return ""; }

    var body = rows.map(function (r) {
      var c = change(r.now, r.was, better);
      return "<tr><td>" + esc(r.name) +
        (r.missing === "new" ? '<span class="cbadge">new</span>' : "") +
        (r.missing === "gone" ? '<span class="cbadge cgone">gone</span>' : "") +
        "</td><td class='num'>" + fmt(r.now) + "</td><td class='num'>" + fmt(r.was) +
        "</td><td class='num d " + (r.d >= 0 ? "up" : "down") + "'>" +
        (r.d >= 0 ? "+" : "−") + fmt(Math.abs(r.d)) +
        "</td><td class='num d " + c.cls + "'>" + c.text + "</td></tr>";
    }).join("");

    return body;
  }

  function moverCard(a, b, A, B, key, label, metric, fmt, better, title, hint) {
    var body = movers(a, b, key, label, metric, fmt, better);
    if (!body) { return ""; }
    return '<div class="card ctab" style="margin-top:20px"><header><h3>' + esc(title) +
      "</h3><p class='hint'>" + esc(hint) + "</p></header>" +
      "<div class='tablewrap'><table class='dt'><thead><tr><th>" +
      (label === "keyword" ? "Keyword" : "Search term") + "</th><th class='num'>" +
      esc(A.label) + "</th><th class='num'>" + esc(B.label) +
      "</th><th class='num'>Change</th><th class='num'>%</th></tr></thead><tbody>" +
      body + "</tbody></table></div></div>";
  }

  function draw() {
    function opts(selected) {
      return periods.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === selected ? " selected" : "") +
          ">" + esc(p.label) + "  ·  " + p.days + " days</option>";
      }).join("");
    }
    bar.className = "arb";
    bar.innerHTML =
      '<div class="grp"><label for="aa">Export</label>' +
        '<select id="aa">' + opts(state.a) + "</select></div>" +
      '<div class="grp on"><span class="swap">⇄</span>' +
        '<label for="ab">Compare with</label>' +
        '<select id="ab">' + opts(state.b) + "</select></div>";
    document.getElementById("aa").onchange = function () { state.a = this.value; render(); };
    document.getElementById("ab").onchange = function () { state.b = this.value; render(); };
  }

  function render() {
    draw();
    var a = find(state.a), b = find(state.b);
    if (a.id === b.id) {
      out.innerHTML = '<div class="cnone"><b>Same export on both sides</b>' +
        "Pick a different one in either box and the comparison appears here.</div>";
      return;
    }
    var A = totals(a), B = totals(b);
    var warn = "";
    if (touches(a, b)) {
      warn = '<p class="cwarn"><b>These two periods overlap.</b> ' + esc(a.label) +
        " and " + esc(b.label) + " share at least one day, because Shopee's periods " +
        "include both end dates. The comparison below is still exact for each side, but " +
        "do not read it as one period following the other — part of it is the same days " +
        "counted twice.</p>";
    }
    out.innerHTML = warn + totalsTable(A, B) +
      moverCard(a, b, A, B, "keywords", "keyword", "spend", money2, null,
                "Where the spend moved", "Keywords by how much their spend changed.") +
      moverCard(a, b, A, B, "keywords", "keyword", "gmv", money2, "up",
                "Where the revenue moved", "Keywords by how much their GMV changed.") +
      moverCard(a, b, A, B, "queries", "query", "spend", money2, null,
                "Which search terms moved",
                "What shoppers typed, by how much it cost you.");
  }

  render();
})();
"""
