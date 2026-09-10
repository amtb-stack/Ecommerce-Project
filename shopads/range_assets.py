"""The period picker and the side-by-side comparison.

Everything here runs in the browser against the daily series the report
carries, so choosing a range costs nothing and needs no re-export.

Three rules keep the arithmetic honest, and they are the whole reason this is
not just a date input:

1. Sales, orders, clicks, impressions and spend are additive -- a range is the
   sum of its days. Visitors and buyers are unique counts, so summing them
   counts a shopper who came back on Tuesday twice. The picker uses the true
   period figure when the range matches a submitted export exactly, and says
   it is summing visits when it does not.
2. Rates are recomputed from summed numerators and denominators. Averaging a
   column of daily conversion rates weights a 10-visitor day the same as a
   10,000-visitor one.
3. Product figures have no dates at all -- they are period totals. They follow
   whole submitted exports, and the page says so rather than inventing a slice.
"""

from __future__ import annotations

RANGE_CSS = """
/* ------------------------------------------------------- period picker -- */
.rangebar{display:flex;align-items:stretch;gap:10px;flex-wrap:wrap;
  justify-content:center;margin:26px 0 6px}
.rb{display:flex;align-items:center;gap:10px;background:var(--surface);
  border:1px solid var(--hair);border-radius:14px;padding:9px 12px 9px 14px;
  box-shadow:var(--shadow);min-width:0}
.rb > label{font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;
  color:var(--faint);white-space:nowrap}
.rb select{appearance:none;-webkit-appearance:none;border:0;background:transparent;
  color:var(--ink);font:inherit;font-size:14px;font-weight:700;letter-spacing:-.01em;
  padding:2px 22px 2px 0;cursor:pointer;max-width:270px;text-overflow:ellipsis;
  background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),
    linear-gradient(135deg,currentColor 50%,transparent 50%);
  background-position:calc(100% - 9px) 52%,calc(100% - 4px) 52%;
  background-size:5px 5px,5px 5px;background-repeat:no-repeat}
.rb select:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:5px}
.rb.on{border-color:var(--accent);background:var(--accent-wash)}
.rb .swap{color:var(--faint);font-size:15px}
.custom{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.custom input{border:1px solid var(--hair);background:var(--bg);color:var(--ink);
  border-radius:9px;padding:5px 8px;font:inherit;font-size:13px;color-scheme:inherit}
.custom span{color:var(--faint);font-size:13px}
.rnote{margin:10px auto 0;max-width:62ch;text-align:center;font-size:13px;color:var(--ink-3)}
.rnote b{color:var(--ink)}
.rnote button{border:0;background:var(--accent-wash);color:var(--accent);font:inherit;
  font-size:12.5px;font-weight:800;padding:3px 10px;border-radius:999px;cursor:pointer;
  margin-left:6px}
.rnote button:hover{background:var(--accent);color:#fff}
@media(max-width:620px){
  .rangebar{flex-direction:column;align-items:stretch}
  .rb{width:100%}
  .rb select{max-width:none;flex:1 1 auto;min-width:0}
  .custom{width:100%}
  .custom input{flex:1 1 0;min-width:0}
}

/* --------------------------------------------------------- hero figure -- */
.figure.dual{display:grid;grid-template-columns:1fr auto 1fr;gap:clamp(14px,3vw,40px);
  align-items:center;justify-items:center}
.figure.dual .side{min-width:0;text-align:center}
.figure.dual .big{font-size:clamp(34px,7vw,74px)}
.figure.dual .side.b .big{color:var(--ink-2)}
.figure .plabel{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:var(--faint);margin:0 0 2px}
.vsdelta{text-align:center}
.vsdelta .pc{font-size:clamp(19px,3.4vw,30px);font-weight:800;letter-spacing:-.03em;
  line-height:1;white-space:nowrap}
.vsdelta .pc.up{color:var(--good)}.vsdelta .pc.down{color:var(--crit)}
.vsdelta .abs{margin:5px 0 0;font-size:12px;color:var(--ink-3);white-space:nowrap}
@media(max-width:700px){.figure.dual{grid-template-columns:1fr;gap:18px}}

/* ------------------------------------------------------- compare table -- */
.cmp{background:var(--surface);border:1px solid var(--hair-2);border-radius:20px;
  overflow:hidden;box-shadow:var(--shadow)}
.cmp > header{padding:20px 26px 16px;border-bottom:1px solid var(--hair-2);
  display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.cmp h3{margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em}
.cmp .when{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--ink-3)}
.cmpscroll{overflow-x:auto}
.cmp table{width:100%;border-collapse:collapse;font-size:14px;min-width:540px}
.cmp th,.cmp td{padding:11px 14px;text-align:right;border-top:1px solid var(--hair-2);
  white-space:nowrap}
.cmp th:first-child,.cmp td:first-child{text-align:left;white-space:normal;min-width:170px}
.cmp thead th{border-top:0;font-size:10.5px;font-weight:800;letter-spacing:.07em;
  text-transform:uppercase;color:var(--faint);background:var(--sunken);position:sticky;top:0}
.cmp tbody td{font-variant-numeric:tabular-nums}
.cmp td.k{font-weight:700}
.cmp td.d{font-weight:800}
.cmp td.d.up{color:var(--good)}.cmp td.d.down{color:var(--crit)}
.cmp td.d.flat{color:var(--ink-3)}
.cmp tr.group td{background:var(--sunken);font-size:10.5px;font-weight:800;
  letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);text-align:left}
.cmp .caveat{padding:14px 26px;border-top:1px solid var(--hair-2);font-size:13px;
  color:var(--ink-3)}
.cmp .caveat b{color:var(--ink)}
.empty{padding:34px 26px;text-align:center;color:var(--ink-3);font-size:14.5px}
.empty b{display:block;color:var(--ink);font-size:16px;font-weight:800;margin-bottom:5px;
  letter-spacing:-.015em}
.est{font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
  padding:2px 6px;border-radius:999px;background:var(--warn-wash);color:var(--warn);
  margin-left:6px;vertical-align:2px}

/* ------------------------------------------------------ history chart -- */
.rchart{margin-top:26px;text-align:left}
.rchart svg{width:100%;height:220px;display:block;overflow:visible}
.rline{fill:none;stroke:var(--accent);stroke-width:2.2;vector-effect:non-scaling-stroke;
  stroke-linejoin:round;stroke-linecap:round}
.banda{fill:var(--accent);opacity:.13}
.bandb{fill:var(--ink-3);opacity:.13}
.rticks{display:flex;justify-content:space-between;margin-top:6px;font-size:11.5px;
  color:var(--faint);font-family:"IBM Plex Mono",monospace}
.rw .d.up{color:var(--good)}.rw .d.down{color:var(--crit)}

/* -------------------------------------------- which export a table shows -- */
.psrc{margin:14px 0 0;padding:11px 15px;border-radius:11px;background:var(--sunken);
  color:var(--ink-2);font-size:13.5px;max-width:66ch}
.psrc b{color:var(--ink)}
.psrc:empty{display:none}
"""


RANGE_JS = r"""
(function () {
  "use strict";
  var D = window.__PRODUCTS__ || {};
  var R = D.ranges || {};
  var host = document.getElementById("rangebar");
  if (!host || !R.available || !(R.days || []).length) { return; }

  var CUR = (D.meta && D.meta.currency) || "RM";
  var days = R.days, srcs = R.sources || [], periods = R.periods || [];

  /* ---------------------------------------------------------- helpers -- */
  function iso(d) { return d.toISOString().slice(0, 10); }
  function parse(s) { var p = s.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
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
  function dayLabel(s) {
    var d = parse(s), M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return d.getUTCDate() + " " + M[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  function spanLabel(a, b) {
    if (!a || !b) { return ""; }
    if (a === b) { return dayLabel(a); }
    var x = parse(a), y = parse(b);
    var M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (x.getUTCFullYear() === y.getUTCFullYear() && x.getUTCMonth() === y.getUTCMonth()) {
      return x.getUTCDate() + " – " + y.getUTCDate() + " " +
             M[y.getUTCMonth()] + " " + y.getUTCFullYear();
    }
    if (x.getUTCFullYear() === y.getUTCFullYear()) {
      return x.getUTCDate() + " " + M[x.getUTCMonth()] + " – " +
             y.getUTCDate() + " " + M[y.getUTCMonth()] + " " + y.getUTCFullYear();
    }
    return dayLabel(a) + " – " + dayLabel(b);
  }
  function countDays(a, b) {
    return Math.round((parse(b) - parse(a)) / 86400000) + 1;
  }
  function shiftDays(s, n) {
    var d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d);
  }

  var FIRST = days[0].day, LAST = days[days.length - 1].day;

  /* ------------------------------------------------------ aggregation -- */
  /* Additive measures are summed. Visitors are a unique count inside
     whatever window Shopee reported them for, so a multi-day sum is a count
     of visits, not of people -- it is carried separately and labelled as
     such. Rates are always recomputed from the sums, never averaged. */
  function aggregate(from, to) {
    var t = {sales: 0, orders: 0, clicks: 0, cancelled: 0, visits: 0,
             ad_spend: 0, ad_sales: 0, impressions: 0, covered: 0};
    days.forEach(function (d) {
      if (d.day < from || d.day > to) { return; }
      t.sales += d.sales; t.orders += d.orders; t.clicks += d.clicks;
      t.cancelled += d.cancelled; t.visits += d.visitors; t.covered += 1;
    });
    var byChannel = {}, bySource = {}, adDays = {};
    srcs.forEach(function (r) {
      if (r.day < from || r.day > to) { return; }
      adDays[r.day] = true;
      t.impressions += r.impressions;
      if (r.is_ads) { t.ad_spend += r.ad_spend; t.ad_sales += r.sales; }
      var c = byChannel[r.channel] || (byChannel[r.channel] =
        {name: r.channel, sales: 0, impressions: 0, clicks: 0, orders: 0,
         ad_spend: 0, is_ads: r.is_ads});
      c.sales += r.sales; c.impressions += r.impressions; c.clicks += r.clicks;
      c.orders += r.orders; c.ad_spend += r.ad_spend;
      var key = r.channel + " │ " + r.source;
      var s = bySource[key] || (bySource[key] =
        {name: r.source, channel: r.channel, sales: 0, impressions: 0,
         clicks: 0, orders: 0, ad_spend: 0, is_ads: r.is_ads});
      s.sales += r.sales; s.impressions += r.impressions; s.clicks += r.clicks;
      s.orders += r.orders; s.ad_spend += r.ad_spend;
    });

    t.from = from; t.to = to;
    t.label = spanLabel(from, to);
    t.days = countDays(from, to);
    /* Days inside the range that the export never covered. Dividing by the
       calendar length instead would quietly understate a daily average. */
    t.missing = t.days - t.covered;
    t.sourceDays = Object.keys(adDays).length;
    t.cvr = t.visits ? t.orders / t.visits : 0;
    t.aov = t.orders ? t.sales / t.orders : 0;
    t.ctr = t.impressions ? t.clicks / t.impressions : 0;
    t.roas = t.ad_spend ? t.ad_sales / t.ad_spend : 0;
    t.perDay = t.covered ? t.sales / t.covered : 0;
    t.tacos = t.sales ? t.ad_spend / t.sales : 0;

    /* An exact match on a submitted export means the true period-unique
       visitor count exists -- prefer it over the sum of daily uniques. */
    var exact = periods.filter(function (p) { return p.start === from && p.end === to; })[0];
    t.exact = exact || null;
    t.visitors = exact ? exact.totals.visitors : null;
    if (t.visitors) { t.cvr = t.orders / t.visitors; }
    t.channels = Object.keys(byChannel).map(function (k) { return byChannel[k]; })
      .sort(function (a, b) { return b.sales - a.sales; });
    t.sources = Object.keys(bySource).map(function (k) { return bySource[k]; })
      .sort(function (a, b) { return b.sales - a.sales; });
    t.products = productsFor(from, to);
    return t;
  }

  /* Product rows carry no dates. Whole submitted exports that fall inside the
     range are summed; a range that cuts one in half gets nothing rather than
     a fabricated slice. */
  function productsFor(from, to) {
    var whole = periods.filter(function (p) { return p.start >= from && p.end <= to; });
    var touching = periods.filter(function (p) { return p.start <= to && p.end >= from; });
    var out = {rows: [], used: whole, partial: touching.length !== whole.length,
               touching: touching};
    if (!whole.length) { return out; }
    var by = {};
    whole.forEach(function (p) {
      (p.products || []).forEach(function (r) {
        var e = by[r.id] || (by[r.id] =
          {id: r.id, name: r.name, sales: 0, paid_sales: 0, impressions: 0,
           clicks: 0, orders: 0});
        e.sales += r.sales; e.paid_sales += r.paid_sales;
        e.impressions += r.impressions; e.clicks += r.clicks; e.orders += r.orders;
      });
    });
    out.rows = Object.keys(by).map(function (k) { return by[k]; })
      .sort(function (a, b) { return b.sales - a.sales; });
    out.rows.forEach(function (r) {
      r.ctr = r.impressions ? r.clicks / r.impressions : 0;
      r.cvr = r.clicks ? r.orders / r.clicks : 0;
    });
    return out;
  }

  /* ----------------------------------------------------- the controls -- */
  var presets = [];
  function addPreset(id, label, from, to) {
    if (from < FIRST) { from = FIRST; }
    if (to > LAST) { to = LAST; }
    if (from > to) { return; }
    presets.push({id: id, label: label, from: from, to: to});
  }
  periods.forEach(function (p) {
    addPreset(p.id, p.label + "  ·  " + p.days + " days", p.start, p.end);
  });
  [7, 14, 30, 90].forEach(function (n) {
    if (countDays(FIRST, LAST) > n) {
      addPreset("last" + n, "Last " + n + " days", shiftDays(LAST, -(n - 1)), LAST);
    }
  });
  addPreset("all", "Everything  ·  " + countDays(FIRST, LAST) + " days", FIRST, LAST);

  var state = {
    a: presets[0], b: null, customA: null, customB: null, compare: "off"
  };

  function options(selected, includeAuto) {
    var html = "";
    if (includeAuto) {
      html += '<option value="off"' + (selected === "off" ? " selected" : "") +
        ">Nothing — one period only</option>" +
        '<option value="prev"' + (selected === "prev" ? " selected" : "") +
        ">The period just before it</option>";
    }
    var exports_ = presets.filter(function (p) { return p.id.charAt(0) === "p"; });
    var rest = presets.filter(function (p) { return p.id.charAt(0) !== "p"; });
    if (exports_.length) {
      html += '<optgroup label="Submitted exports">';
      exports_.forEach(function (p) {
        html += '<option value="' + p.id + '"' + (selected === p.id ? " selected" : "") +
          ">" + esc(p.label) + "</option>";
      });
      html += "</optgroup>";
    }
    html += '<optgroup label="Rolling">';
    rest.forEach(function (p) {
      html += '<option value="' + p.id + '"' + (selected === p.id ? " selected" : "") +
        ">" + esc(p.label) + "</option>";
    });
    html += "</optgroup>";
    html += '<option value="custom"' + (selected === "custom" ? " selected" : "") +
      ">Pick my own dates…</option>";
    return html;
  }

  function draw() {
    var aCustom = state.a === "custom", bCustom = state.compare === "custom";
    host.className = "rangebar";
    host.innerHTML =
      '<div class="rb"><label for="ra">Period</label>' +
        '<select id="ra">' + options(aCustom ? "custom" : state.a.id, false) + "</select>" +
        (aCustom ? '<span class="custom"><input type="date" id="ra1" min="' + FIRST +
          '" max="' + LAST + '" value="' + (state.customA ? state.customA.from : FIRST) +
          '"><span>to</span><input type="date" id="ra2" min="' + FIRST + '" max="' + LAST +
          '" value="' + (state.customA ? state.customA.to : LAST) + '"></span>' : "") +
      "</div>" +
      '<div class="rb' + (state.compare !== "off" ? " on" : "") + '">' +
        '<span class="swap">⇄</span><label for="rb">Compare with</label>' +
        '<select id="rb">' + options(state.compare, true) + "</select>" +
        (bCustom ? '<span class="custom"><input type="date" id="rb1" min="' + FIRST +
          '" max="' + LAST + '" value="' + (state.customB ? state.customB.from : FIRST) +
          '"><span>to</span><input type="date" id="rb2" min="' + FIRST + '" max="' + LAST +
          '" value="' + (state.customB ? state.customB.to : LAST) + '"></span>' : "") +
      "</div>";

    document.getElementById("ra").onchange = function () {
      state.a = this.value === "custom" ? "custom" : byId(this.value);
      render();
    };
    document.getElementById("rb").onchange = function () {
      state.compare = this.value;
      render();
    };
    ["ra1", "ra2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.onchange = function () {
          state.customA = {from: document.getElementById("ra1").value,
                           to: document.getElementById("ra2").value};
          render();
        };
      }
    });
    ["rb1", "rb2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.onchange = function () {
          state.customB = {from: document.getElementById("rb1").value,
                           to: document.getElementById("rb2").value};
          render();
        };
      }
    });
  }

  function byId(id) {
    return presets.filter(function (p) { return p.id === id; })[0] || presets[0];
  }

  function rangeA() {
    if (state.a === "custom") {
      var c = state.customA || {from: FIRST, to: LAST};
      return c.from <= c.to ? c : {from: c.to, to: c.from};
    }
    return {from: state.a.from, to: state.a.to};
  }

  function rangeB(a) {
    if (state.compare === "off") { return null; }
    if (state.compare === "prev") {
      var n = countDays(a.from, a.to);
      var to = shiftDays(a.from, -1), from = shiftDays(to, -(n - 1));
      if (to < FIRST) { return null; }
      return {from: from < FIRST ? FIRST : from, to: to};
    }
    if (state.compare === "custom") {
      var c = state.customB || {from: FIRST, to: LAST};
      return c.from <= c.to ? c : {from: c.to, to: c.from};
    }
    var p = byId(state.compare);
    return {from: p.from, to: p.to};
  }

  /* ------------------------------------------------------- the render -- */
  function delta(now, was) {
    if (was === 0 || was == null) { return null; }
    return (now - was) / Math.abs(was);
  }

  function heroHtml(A, B) {
    if (!B) {
      return '<div class="big">' + money(A.sales) + "</div>" +
        '<p class="cap">placed across ' + intf(A.orders) + " orders · " +
        money(A.perDay) + " a day</p>";
    }
    var d = delta(A.sales, B.sales);
    var dir = d == null ? "flat" : d >= 0 ? "up" : "down";
    return '<div class="side a"><p class="plabel">' + esc(A.label) + "</p>" +
      '<div class="big">' + money(A.sales) + "</div>" +
      '<p class="cap">' + intf(A.orders) + " orders</p></div>" +
      '<div class="vsdelta"><div class="pc ' + dir + '">' +
        (d == null ? "—" : (d >= 0 ? "+" : "−") + Math.abs(d * 100).toFixed(1) + "%") +
      '</div><p class="abs">' + (A.sales >= B.sales ? "+" : "−") +
        money(Math.abs(A.sales - B.sales)) + "</p></div>" +
      '<div class="side b"><p class="plabel">' + esc(B.label) + "</p>" +
      '<div class="big">' + money(B.sales) + "</div>" +
      '<p class="cap">' + intf(B.orders) + " orders</p></div>";
  }

  /* Visitors and visits answer different questions. Which one is on screen
     depends on whether the range matches an export exactly, so the tile says
     which it is rather than leaving the reader to assume. */
  function visitorTile(t) {
    if (t.visitors != null) {
      return {label: "Visitors", value: intf(t.visitors), tip: "visitors",
              note: "unique people, this export"};
    }
    return {label: "Visits", value: intf(t.visits), tip: "visitors",
            note: "daily uniques added up", est: true};
  }

  function funnelHtml(t) {
    var v = visitorTile(t);
    var cells = [
      {label: v.label, value: v.value, tip: v.tip, note: v.note, est: v.est},
      {label: "Product clicks", value: intf(t.clicks), tip: "clicks",
       note: (t.visitors || t.visits)
         ? (t.clicks / (t.visitors || t.visits) * 100).toFixed(1) + "% of those"
         : ""},
      {label: "Orders", value: intf(t.orders), tip: "conversions",
       note: pct(t.cvr) + " conversion"},
      {label: "Ad spend", value: money(t.ad_spend), tip: "spend",
       note: t.ad_spend ? times(t.roas) + " ROAS" : "no ads in this range"}
    ];
    /* The class names are the page's own: .n is the number, .l the label,
       .d the caption underneath. */
    return cells.map(function (c) {
      return '<div><p class="n">' + c.value + "</p>" +
        '<p class="l">' + esc(c.label) + info(c.tip) +
        (c.est ? '<span class="est">summed</span>' : "") + "</p>" +
        '<p class="d">' + esc(c.note) + "</p></div>";
    }).join("");
  }

  /* The page's tooltip listeners are delegated on document and read the
     explanation straight out of data-tip, so a button built here works with
     no rebinding -- it just has to carry the same payload. */
  function info(key) {
    var g = D.glossary || {};
    if (!key || !g[key]) { return ""; }
    return ' <button type="button" class="i" aria-label="What this means" ' +
      'aria-expanded="false" data-tip="' + esc(g[key]) + '">i</button>';
  }

  var ROWS = [
    {group: "Money"},
    {k: "sales", label: "Sales placed", fmt: money2, tip: "gmv", better: "up"},
    {k: "orders", label: "Orders", fmt: intf, tip: "conversions", better: "up"},
    {k: "aov", label: "Average order value", fmt: money2, tip: "aov", better: "up"},
    {k: "perDay", label: "Sales a day", fmt: money2, better: "up"},
    {group: "Traffic"},
    {k: "visitsOrVisitors", label: "Visitors", fmt: intf, tip: "visitors", better: "up"},
    {k: "clicks", label: "Product clicks", fmt: intf, tip: "clicks", better: "up"},
    {k: "impressions", label: "Impressions", fmt: intf, tip: "impressions", better: "up"},
    {k: "cvr", label: "Conversion rate", fmt: pct, tip: "cvr", better: "up"},
    {group: "Advertising"},
    {k: "ad_spend", label: "Ad spend", fmt: money2, tip: "spend", better: null},
    {k: "ad_sales", label: "Sales from ads", fmt: money2, tip: "gmv", better: "up"},
    {k: "roas", label: "ROAS", fmt: times, tip: "roas", better: "up"},
    {k: "tacos", label: "TACOS", fmt: pct, tip: "tacos", better: "down"},
    {group: "Care"},
    {k: "cancelled", label: "Cancelled orders", fmt: intf, better: "down"}
  ];

  function pick(t, key) {
    if (key === "visitsOrVisitors") { return t.visitors != null ? t.visitors : t.visits; }
    return t[key];
  }

  function compareHtml(A, B) {
    if (!B) {
      return '<div class="cmp"><div class="empty"><b>Nothing to compare against yet</b>' +
        "Choose a period in <em>Compare with</em> above and the two sit side by side here, " +
        "with the change worked out for every measure.</div></div>";
    }
    var body = ROWS.map(function (r) {
      if (r.group) {
        return '<tr class="group"><td colspan="4">' + esc(r.group) + "</td></tr>";
      }
      var a = pick(A, r.k), b = pick(B, r.k);
      var d = delta(a, b);
      var cls = "flat", text = "—";
      if (d != null && Math.abs(d) >= 0.0005) {
        var better = r.better === null ? null
          : r.better === "up" ? d > 0 : d < 0;
        cls = better === null ? "flat" : better ? "up" : "down";
        text = (d >= 0 ? "+" : "−") + Math.abs(d * 100).toFixed(1) + "%";
      } else if (d != null) {
        text = "no change";
      }
      return "<tr><td class='k'>" + esc(r.label) + info(r.tip) + "</td>" +
        "<td>" + r.fmt(a) + "</td><td>" + r.fmt(b) + "</td>" +
        "<td class='d " + cls + "'>" + text + "</td></tr>";
    }).join("");

    var caveats = [];
    /* The worst case is not both sides being summed -- it is one of each,
       where a period-unique count is set against a sum of daily uniques and
       the percentage between them means nothing at all. */
    if ((A.visitors == null) !== (B.visitors == null)) {
      caveats.push("<b>The visitor rows are not on the same basis.</b> " +
        esc(A.visitors != null ? A.label : B.label) + " matches a submitted export, so it " +
        "uses Shopee's period-unique count; " +
        esc(A.visitors == null ? A.label : B.label) + " does not, so it adds up daily " +
        "uniques instead. Read the visitor and conversion rows as indicative only, or " +
        "pick two whole exports to compare them properly.");
    } else if (A.visitors == null || B.visitors == null) {
      caveats.push("<b>Visitors are a unique count.</b> Where a range is not exactly one " +
        "submitted export, the figure is daily uniques added up, so a shopper who came " +
        "back on three days counts three times. Conversion rate follows the same figure.");
    }
    if (A.days !== B.days) {
      caveats.push("<b>The two periods are different lengths</b> (" + A.days + " days " +
        "against " + B.days + "). Totals are not comparable on their own — read " +
        "<em>Sales a day</em>, <em>Average order value</em>, <em>Conversion rate</em> " +
        "and <em>ROAS</em>, which are not affected by length.");
    }
    if (A.missing || B.missing) {
      caveats.push("<b>Some days in these ranges were never exported</b> (" +
        (A.missing + B.missing) + " in total). They are left out rather than counted as " +
        "zero, and the daily average uses only the days that exist.");
    }

    return '<div class="cmp"><header><h3>' + esc(A.label) + " against " + esc(B.label) +
      '</h3><span class="when">' + A.days + " days vs " + B.days + " days</span></header>" +
      '<div class="cmpscroll"><table><thead><tr><th>Measure</th><th>' + esc(A.label) +
      "</th><th>" + esc(B.label) + "</th><th>Change</th></tr></thead><tbody>" +
      body + "</tbody></table></div>" +
      caveats.map(function (c) { return '<div class="caveat">' + c + "</div>"; }).join("") +
      "</div>" + sourceCompare(A, B);
  }

  function sourceCompare(A, B) {
    var names = {};
    A.sources.forEach(function (s) { names[s.channel + " │ " + s.name] = s; });
    var keys = Object.keys(names);
    B.sources.forEach(function (s) {
      var k = s.channel + " │ " + s.name;
      if (keys.indexOf(k) < 0) { keys.push(k); }
    });
    var bBy = {};
    B.sources.forEach(function (s) { bBy[s.channel + " │ " + s.name] = s; });

    var rows = keys.map(function (k) {
      var a = names[k] || {sales: 0}, b = bBy[k] || {sales: 0};
      return {key: k, name: (names[k] || bBy[k]).name,
              channel: (names[k] || bBy[k]).channel,
              a: a.sales, b: b.sales, d: a.sales - b.sales};
    }).filter(function (r) { return Math.abs(r.d) >= 1 || r.a >= 1 || r.b >= 1; })
      .sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); })
      .slice(0, 12);
    if (!rows.length) { return ""; }

    var body = rows.map(function (r) {
      var d = delta(r.a, r.b);
      var cls = r.d > 0 ? "up" : r.d < 0 ? "down" : "flat";
      return "<tr><td class='k'>" + esc(r.name) +
        "<br><span style='color:var(--faint);font-size:12px'>" + esc(r.channel) +
        "</span></td><td>" + money(r.a) + "</td><td>" + money(r.b) + "</td>" +
        "<td class='d " + cls + "'>" + (r.d >= 0 ? "+" : "−") +
        money(Math.abs(r.d)) + (d == null ? "" :
          " <span style='font-weight:600;opacity:.65'>(" +
          (d >= 0 ? "+" : "−") + Math.abs(d * 100).toFixed(0) + "%)</span>") +
        "</td></tr>";
    }).join("");

    return '<div class="cmp" style="margin-top:18px"><header>' +
      "<h3>Which sources moved the money</h3>" +
      '<span class="when">biggest change first</span></header>' +
      '<div class="cmpscroll"><table><thead><tr><th>Source</th><th>' + esc(A.label) +
      "</th><th>" + esc(B.label) + "</th><th>Change</th></tr></thead><tbody>" +
      body + "</tbody></table></div></div>";
  }

  function noteHtml(A) {
    var bits = [];
    var p = A.products;
    if (p.partial && p.touching.length) {
      var lo = p.touching[p.touching.length - 1].start, hi = p.touching[0].end;
      bits.push("<b>Product figures follow whole exports.</b> Shopee reports them as period " +
        "totals with no dates, so this range cannot be cut into them. " +
        (p.used.length ? "The product sections use the " + p.used.length +
          " export(s) fully inside it." : "No export sits fully inside it.") +
        '<button type="button" id="snap" data-from="' + lo + '" data-to="' + hi +
        '">Widen to ' + esc(spanLabel(lo, hi)) + "</button>");
    }
    if (A.missing) {
      bits.push("<b>" + A.missing + " day(s) in this range were never exported.</b> " +
        "They are left out, not counted as zero.");
    }
    if (!bits.length) { return ""; }
    return bits.map(function (b) { return '<p class="rnote">' + b + "</p>"; }).join("");
  }

  /* --------------------------------------- sections that follow the range -- */
  /* The channel and source panels were rendered once from the newest export.
     They are rebuilt here from the selected range instead, so every number on
     the page belongs to the same period as the headline. */
  function renderSources(A, B) {
    var chans = document.getElementById("channels");
    var subs = document.getElementById("subchannels");
    if (!chans || !subs) { return; }
    var bChan = {}, bSrc = {};
    if (B) {
      B.channels.forEach(function (c) { bChan[c.name] = c.sales; });
      B.sources.forEach(function (c) { bSrc[c.channel + " │ " + c.name] = c.sales; });
    }

    function bar(name, sub, sales, peak, was) {
      var change = "";
      if (was !== undefined) {
        var d = was ? (sales - was) / Math.abs(was) : null;
        var cls = sales >= was ? "up" : "down";
        change = ' <span class="d ' + cls + '" style="font-size:11.5px;font-weight:800">' +
          (d == null ? (sales ? "new" : "") :
            (d >= 0 ? "+" : "−") + Math.abs(d * 100).toFixed(0) + "%") + "</span>";
      }
      return '<div class="rw"><div><div class="cn">' + esc(name) + change + "</div>" +
        '<div class="cs">' + esc(sub) + "</div></div>" +
        '<div class="track"><div class="fill" style="width:' +
        Math.max(sales / peak * 100, 1).toFixed(1) + '%"></div></div>' +
        '<div class="vv">' + (sales ? money(sales) : "—") + "</div></div>";
    }

    var peakC = Math.max.apply(null, A.channels.map(function (c) {
      return c.sales; }).concat([1]));
    chans.innerHTML = A.channels.length ? A.channels.map(function (c) {
      var bits = [];
      if (c.impressions) { bits.push(intf(c.impressions) + " impressions"); }
      if (c.clicks) { bits.push(pct(c.clicks / c.impressions) + " CTR"); }
      bits.push(intf(c.orders) + " orders");
      return bar(c.name, bits.join(" · "), c.sales, peakC,
                 B ? (bChan[c.name] || 0) : undefined);
    }).join("") : '<p class="empty">No traffic recorded in this range.</p>';

    var top = A.sources.slice(0, 10);
    var peakS = Math.max.apply(null, top.map(function (c) { return c.sales; }).concat([1]));
    subs.innerHTML = top.length ? top.map(function (c) {
      var bits = [c.channel];
      if (c.is_ads && c.ad_spend) { bits.push(money(c.ad_spend) + " spent"); }
      if (c.orders) { bits.push(intf(c.orders) + " orders"); }
      return bar(c.name, bits.join(" · "), c.sales, peakS,
                 B ? (bSrc[c.channel + " │ " + c.name] || 0) : undefined);
    }).join("") : '<p class="empty">No named sources in this range.</p>';
  }

  /* ------------------------------------------------------ history chart -- */
  /* The whole recorded history, with the chosen range lit and the comparison
     tinted behind it. Two periods of different lengths cannot share an x axis
     honestly, so they are shown where they actually happened rather than
     stretched onto each other. */
  function rangeChart(A, B) {
    var host = document.getElementById("rangechart");
    if (!host) { return; }
    if (days.length < 2) { host.innerHTML = ""; return; }

    var W = 1000, H = 220, padL = 8, padR = 8, padT = 16, padB = 26;
    var max = Math.max.apply(null, days.map(function (d) { return d.sales; }).concat([1]));
    var n = days.length;
    var x = function (i) { return padL + (W - padL - padR) * (n === 1 ? 0 : i / (n - 1)); };
    var y = function (v) { return padT + (H - padT - padB) * (1 - v / max); };

    function band(range, cls) {
      if (!range) { return ""; }
      var from = -1, to = -1;
      days.forEach(function (d, i) {
        if (d.day >= range.from && d.day <= range.to) {
          if (from < 0) { from = i; }
          to = i;
        }
      });
      if (from < 0) { return ""; }
      var x1 = x(Math.max(from - 0.5, 0)), x2 = x(Math.min(to + 0.5, n - 1));
      return '<rect class="' + cls + '" x="' + x1.toFixed(1) + '" y="' + padT +
        '" width="' + Math.max(x2 - x1, 2).toFixed(1) + '" height="' + (H - padT - padB) +
        '" rx="4"/>';
    }

    var line = days.map(function (d, i) {
      return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.sales).toFixed(1);
    }).join(" ");
    var ticks = [0, Math.floor((n - 1) / 2), n - 1].filter(function (v, i, a) {
      return a.indexOf(v) === i; });

    host.innerHTML =
      '<div class="chartcard rchart"><h3>Every recorded day</h3>' +
      "<p>The whole history. The lit band is the period you picked" +
      (B ? ", the tinted one is what it is being compared against." : ".") + "</p>" +
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" ' +
      'role="img" aria-label="Daily sales across the recorded history">' +
      band(B, "bandb") + band(A, "banda") +
      '<path class="rline" d="' + line + '"/></svg>' +
      '<div class="rticks">' + ticks.map(function (i) {
        return "<span>" + esc(dayLabel(days[i].day)) + "</span>"; }).join("") +
      "</div></div>";
  }

  /* --------------------------------------------------- the whole page -- */
  function render() {
    draw();
    var a = rangeA(), A = aggregate(a.from, a.to);
    var b = rangeB(a), B = b ? aggregate(b.from, b.to) : null;
    if (B && B.covered === 0) { B = null; }

    var period = document.getElementById("heroperiod");
    if (period) {
      period.textContent = A.label + " · " + A.covered + " day" +
        (A.covered === 1 ? "" : "s") + (B ? "  vs  " + B.label : "");
    }
    var fig = document.getElementById("herofig");
    fig.className = "figure" + (B ? " dual" : "");
    fig.innerHTML = heroHtml(A, B);
    document.getElementById("funnel").innerHTML = funnelHtml(A);

    var notes = document.getElementById("rangenotes");
    if (!notes) {
      notes = document.createElement("div");
      notes.id = "rangenotes";
      fig.parentNode.insertBefore(notes, document.getElementById("rangechart"));
    }
    notes.innerHTML = noteHtml(A);
    var snap = document.getElementById("snap");
    if (snap) {
      snap.onclick = function () {
        state.a = "custom";
        state.customA = {from: this.getAttribute("data-from"),
                         to: this.getAttribute("data-to")};
        render();
      };
    }

    document.getElementById("compare-panel").innerHTML = compareHtml(A, B);
    renderSources(A, B);
    rangeChart(A, B);
    labelProductSections(A);
  }

  /* The per-product tables are built from the export this report was written
     from, and cannot follow the picker: Shopee gives product figures as period
     totals with no dates in them. Rather than let the page imply otherwise,
     both product sections say which export they are showing whenever that is
     not the period on screen. */
  function labelProductSections(A) {
    var newest = periods[0];
    var text = "";
    if (newest && !(A.from === newest.start && A.to === newest.end)) {
      text = "<b>These product figures are from " + esc(newest.label) + "</b>, the most " +
        "recent export. Shopee reports product performance as a period total with no " +
        "dates inside it, so unlike everything above, this cannot follow the period " +
        "picker. The numbers above are still the period you chose.";
    }
    ["psrc-groups", "psrc-table"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) { node.innerHTML = text; }
    });
  }

  render();
})();
"""
