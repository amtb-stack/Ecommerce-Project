"""Everything the reports need to be re-cut over a date range the reader picks.

Two granularities exist in the data, and pretending otherwise is how a
dashboard starts lying:

* **Day level.** The statistics workbook carries a date series for the shop and
  for every traffic source, so those can be summed over any range at all.
* **Export level.** Product figures and every keyword figure are period totals
  with no date attached. They can only be selected a whole export at a time,
  and only summed across exports whose periods do not overlap.

One trap sits inside the day level too. Sales, orders, clicks, impressions and
spend are additive: a week is the sum of its days. Visitors and buyers are
unique counts, so summing them counts a shopper who came back on Tuesday
twice. Both figures are real and they answer different questions, so the range
carries both and says which one it is using.
"""

from __future__ import annotations

import sqlite3
from datetime import date

#: Day-level measures that may simply be added up.
ADDITIVE = ("sales", "orders", "clicks", "cancelled")
#: Day-level measures that are unique counts within whatever window Shopee
#: reported them for. Summing them over-counts, so they are named differently.
UNIQUE = ("visitors", "new_buyers")


def _day_label(day: str) -> str:
    """An ISO day as a short "9 Sep 2026" label, without strftime's %-d.

    The dash modifier that strips a leading zero is a glibc extension and
    Windows raises ValueError: Invalid format string on it.
    """
    try:
        d = date.fromisoformat(day)
    except (ValueError, TypeError):
        return day or ""
    return f"{d.day} {d.strftime('%b %Y')}"


def range_label(start: str, end: str) -> str:
    """"1 – 31 Aug 2026", collapsing whatever the two ends share."""
    if not start or not end:
        return start or end or ""
    if start == end:
        return _day_label(start)
    try:
        a, b = date.fromisoformat(start), date.fromisoformat(end)
    except ValueError:
        return f"{start} – {end}"
    if (a.year, a.month) == (b.year, b.month):
        return f"{a.day} – {b.day} {b.strftime('%b %Y')}"
    if a.year == b.year:
        return f"{a.day} {a.strftime('%b')} – {b.day} {b.strftime('%b %Y')}"
    return f"{_day_label(start)} – {_day_label(end)}"


def shop_days(conn: sqlite3.Connection) -> list[dict]:
    """Every recorded day, shop level, oldest first."""
    return [
        {
            "day": r["day"],
            "sales": float(r["sales"] or 0),
            "orders": float(r["orders"] or 0),
            "visitors": float(r["visitors"] or 0),
            "clicks": float(r["clicks"] or 0),
            "cancelled": float(r["cancelled"] or 0),
        }
        for r in conn.execute("SELECT * FROM daily_shop ORDER BY day")
    ]


#: A source block lists the channel's own total as a row named after the
#: channel, beside the breakdown under it. Counting both doubles the channel.
_NOT_A_ROLLUP = """NOT (source = channel AND EXISTS (
        SELECT 1 FROM daily_source d2
        WHERE d2.day = daily_source.day AND d2.channel = daily_source.channel
          AND d2.source <> d2.channel))"""


def source_days(conn: sqlite3.Connection) -> list[dict]:
    """Every recorded day for every traffic source and ad placement."""
    return [
        {
            "day": r["day"], "channel": r["channel"], "source": r["source"],
            "sales": float(r["sales"] or 0),
            "impressions": float(r["impressions"] or 0),
            "clicks": float(r["clicks"] or 0),
            "orders": float(r["orders"] or 0),
            "ad_spend": float(r["ad_spend"] or 0),
            "is_ads": bool(r["is_ads"]),
        }
        for r in conn.execute(
            f"SELECT * FROM daily_source WHERE {_NOT_A_ROLLUP} ORDER BY day, channel, source"
        )
    ]


def product_periods(conn: sqlite3.Connection) -> list[dict]:
    """Each submitted statistics workbook, newest period first.

    Where two files cover the same period the newer analysis wins: re-exporting
    a window is how a corrected figure arrives, so the later reading is the one
    to keep rather than a second copy of the same days.
    """
    runs = conn.execute(
        """SELECT id, period_start, period_end, days, products, sales, paid_sales,
                  orders, visitors, clicks, cvr, aov, leak, analysed_at, source_name
           FROM product_runs
           WHERE period_start IS NOT NULL AND period_end IS NOT NULL
           ORDER BY period_start DESC, analysed_at DESC, id DESC"""
    ).fetchall()

    out, seen = [], set()
    for run in runs:
        key = (run["period_start"], run["period_end"])
        if key in seen:
            continue
        seen.add(key)
        rows = conn.execute(
            """SELECT item_id, name, quadrant, sales, paid_sales, impressions,
                      clicks, orders, ctr, cvr, leak
               FROM product_rows WHERE run_id = ?""", (run["id"],)
        ).fetchall()
        out.append({
            "id": f"p{run['id']}",
            "start": run["period_start"], "end": run["period_end"],
            "label": range_label(run["period_start"], run["period_end"]),
            "days": run["days"], "source": run["source_name"],
            "totals": {
                "products": run["products"], "sales": float(run["sales"] or 0),
                "paid_sales": float(run["paid_sales"] or 0),
                "orders": float(run["orders"] or 0),
                "visitors": float(run["visitors"] or 0),
                "clicks": float(run["clicks"] or 0),
                "cvr": float(run["cvr"] or 0), "aov": float(run["aov"] or 0),
                "leak": float(run["leak"] or 0),
            },
            "products": [
                {"id": r["item_id"], "name": r["name"], "quadrant": r["quadrant"],
                 "sales": float(r["sales"] or 0),
                 "paid_sales": float(r["paid_sales"] or 0),
                 "impressions": float(r["impressions"] or 0),
                 "clicks": float(r["clicks"] or 0),
                 "orders": float(r["orders"] or 0)}
                for r in rows
            ],
        })
    return out


def keyword_periods(conn: sqlite3.Connection) -> list[dict]:
    """Each submitted keyword export, newest period first.

    The keyword export carries no date column, so an export is the smallest
    slice there is: one file, one period, take it or leave it.
    """
    runs = conn.execute(
        """SELECT id, period_start, period_end, days, rows, keywords, queries,
                  impressions, clicks, conversions, spend, gmv, ctr, cvr, roas,
                  analysed_at, source_name, shop_name
           FROM runs
           WHERE period_start IS NOT NULL AND period_end IS NOT NULL
           ORDER BY period_start DESC, analysed_at DESC, id DESC"""
    ).fetchall()

    out, seen = [], set()
    for run in runs:
        key = (run["period_start"], run["period_end"])
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "id": f"k{run['id']}",
            "start": run["period_start"], "end": run["period_end"],
            "label": range_label(run["period_start"], run["period_end"]),
            "days": run["days"], "source": run["source_name"],
            "shop": run["shop_name"],
            "totals": {
                "rows": run["rows"], "keywords": run["keywords"],
                "queries": run["queries"],
                "impressions": float(run["impressions"] or 0),
                "clicks": float(run["clicks"] or 0),
                "conversions": float(run["conversions"] or 0),
                "spend": float(run["spend"] or 0), "gmv": float(run["gmv"] or 0),
            },
            "keywords": [
                {"keyword": r["keyword"], "theme": r["theme"],
                 "impressions": float(r["impressions"] or 0),
                 "clicks": float(r["clicks"] or 0),
                 "spend": float(r["spend"] or 0), "gmv": float(r["gmv"] or 0),
                 "conversions": float(r["conversions"] or 0)}
                for r in conn.execute(
                    """SELECT keyword, theme, impressions, clicks, spend, gmv, conversions
                       FROM run_keywords WHERE run_id = ?""", (run["id"],))
            ],
            "queries": [
                {"query": r["query"],
                 "impressions": float(r["impressions"] or 0),
                 "clicks": float(r["clicks"] or 0),
                 "spend": float(r["spend"] or 0), "gmv": float(r["gmv"] or 0),
                 "conversions": float(r["conversions"] or 0)}
                for r in conn.execute(
                    """SELECT query, impressions, clicks, spend, gmv, conversions
                       FROM run_queries WHERE run_id = ?""", (run["id"],))
            ],
        })
    return out


def overlapping(periods: list[dict]) -> bool:
    """True when any two of these periods share a day.

    Summing overlapping exports double-counts the days they share, which is
    the one way a "combine these" control can quietly produce a wrong number.
    """
    spans = sorted((p["start"], p["end"]) for p in periods)
    return any(spans[i][1] >= spans[i + 1][0] for i in range(len(spans) - 1))


def shop_ranges(conn: sqlite3.Connection, product_runs: list[dict] | None = None) -> dict:
    """Everything the shop report's period picker runs on.

    The daily tables and the product runs live in the same file but are reached
    through different connections, so the export list is passed in rather than
    queried here -- asking this connection for a table it may not carry is how
    a helper starts depending on who happened to call it.
    """
    days = shop_days(conn)
    if len(days) < 2:
        return {"available": False, "days": days, "sources": [],
                "periods": product_runs or []}
    return {
        "available": True,
        "days": days,
        "sources": source_days(conn),
        "periods": product_runs or [],
    }


def ads_ranges(conn: sqlite3.Connection) -> dict:
    """Everything the keyword report's period picker runs on."""
    exports = keyword_periods(conn)
    return {"available": len(exports) > 0, "periods": exports}
