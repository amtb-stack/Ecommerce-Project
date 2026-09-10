"""A running daily record, and the day-over-day tracker built on it.

Each export carries a date series rather than a single snapshot, and
consecutive exports overlap. Facts are therefore keyed by day and upserted:
re-dropping an overlapping export corrects the days it covers instead of
duplicating them, so dropping a file every morning builds one continuous
history without any manual bookkeeping.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from statistics import median
from typing import Any, Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS daily_shop (
    day          TEXT PRIMARY KEY,
    sales        REAL, orders REAL, visitors REAL, clicks REAL, cvr REAL,
    new_buyers   REAL, cancelled REAL,
    source_file  TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS daily_source (
    day        TEXT NOT NULL,
    channel    TEXT NOT NULL,
    source     TEXT NOT NULL,
    sales      REAL, impressions REAL, clicks REAL, orders REAL,
    ad_spend   REAL, ad_roas REAL, is_ads INTEGER,
    updated_at TEXT,
    PRIMARY KEY (day, channel, source)
);
CREATE INDEX IF NOT EXISTS idx_ds_day ON daily_source(day);
"""

#: metric -> (label, direction that is an improvement, kind, materiality weight)
TRACKED = {
    "sales": ("Sales", "up", "money", 1.0),
    "orders": ("Orders", "up", "int", 0.9),
    "visitors": ("Visitors", "up", "int", 0.5),
    "clicks": ("Product clicks", "up", "int", 0.5),
    "cvr": ("Conversion rate", "up", "pct", 0.95),
    "ad_spend": ("Ad spend", None, "money", 0.8),
    "ad_roas": ("Ad ROAS", "up", "x", 0.9),
    "cancelled": ("Cancelled orders", "down", "int", 0.4),
}


@contextmanager
def connect(db_path: Path) -> Iterator[sqlite3.Connection]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(SCHEMA)
        yield conn
        conn.commit()
    finally:
        conn.close()


def record(conn: sqlite3.Connection, stats, source_name: str) -> int:
    """Upsert every day the export covers. Returns days written."""
    now = datetime.now().isoformat(timespec="seconds")
    for row in stats.daily:
        conn.execute(
            """INSERT INTO daily_shop (day, sales, orders, visitors, clicks, cvr,
                   new_buyers, cancelled, source_file, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(day) DO UPDATE SET
                   sales=excluded.sales, orders=excluded.orders,
                   visitors=excluded.visitors, clicks=excluded.clicks,
                   cvr=excluded.cvr, new_buyers=excluded.new_buyers,
                   cancelled=excluded.cancelled, source_file=excluded.source_file,
                   updated_at=excluded.updated_at""",
            (row["date"], row["sales"], row["orders"], row["visitors"], row["clicks"],
             row["cvr"], row["new_buyers"], row["cancelled"], source_name, now),
        )
    for row in getattr(stats, "daily_sources", []):
        conn.execute(
            """INSERT INTO daily_source (day, channel, source, sales, impressions,
                   clicks, orders, ad_spend, ad_roas, is_ads, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(day, channel, source) DO UPDATE SET
                   sales=excluded.sales, impressions=excluded.impressions,
                   clicks=excluded.clicks, orders=excluded.orders,
                   ad_spend=excluded.ad_spend, ad_roas=excluded.ad_roas,
                   is_ads=excluded.is_ads, updated_at=excluded.updated_at""",
            (row["day"], row["channel"], row["source"], row["sales"], row["impressions"],
             row["clicks"], row["orders"], row["ad_spend"], row["ad_roas"],
             1 if row["is_ads"] else 0, now),
        )
    return len(stats.daily)


#: A Shopee source block lists the channel's own total as a row named after the
#: channel, alongside the breakdown rows beneath it. Counting both doubles the
#: channel: Product Card's own row equals Recommendation + Shop + Others + Cart.
#: This drops the roll-up, but only where a breakdown actually exists -- some
#: blocks (Shopee Ads among them) carry no self-named row at all, and there the
#: named rows are the only figures there are.
NOT_A_ROLLUP = """NOT (source = channel AND EXISTS (
        SELECT 1 FROM daily_source d2
        WHERE d2.day = daily_source.day AND d2.channel = daily_source.channel
          AND d2.source <> d2.channel))"""

def _shop_series(conn: sqlite3.Connection) -> list[dict]:
    """Every recorded day, with ad spend and ROAS folded in from the sources."""
    ads = {
        r["day"]: r for r in conn.execute(
            f"""SELECT day, SUM(ad_spend) AS ad_spend, SUM(sales) AS ad_sales
                FROM daily_source WHERE is_ads = 1 AND {NOT_A_ROLLUP} GROUP BY day"""
        ).fetchall()
    }
    # Which days have any source rows at all. A day recorded from a shop-level
    # sheet alone has unknown ad figures, not zero ones, and treating the gap
    # as a real drop to zero invents a dramatic change that did not happen.
    covered = {r["day"] for r in conn.execute(
        "SELECT DISTINCT day FROM daily_source").fetchall()}

    out = []
    for row in conn.execute("SELECT * FROM daily_shop ORDER BY day").fetchall():
        entry = dict(row)
        entry["day_label"] = _day_label(row["day"])
        ad = ads.get(row["day"])
        if row["day"] in covered:
            entry["ad_spend"] = float(ad["ad_spend"]) if ad else 0.0
            entry["ad_sales"] = float(ad["ad_sales"]) if ad else 0.0
            entry["ad_roas"] = (entry["ad_sales"] / entry["ad_spend"]
                                if entry["ad_spend"] else 0.0)
        else:
            entry["ad_spend"] = entry["ad_sales"] = entry["ad_roas"] = None
        out.append(entry)
    return out


def _mad(values: list[float]) -> float:
    """Median absolute deviation — a spread measure a single spike cannot inflate."""
    if not values:
        return 0.0
    mid = median(values)
    return median([abs(v - mid) for v in values])


def _pct_change(now: float, before: float) -> float | None:
    if before == 0:
        return None
    return (now - before) / abs(before)


def track(conn: sqlite3.Connection, config: dict) -> dict:
    """Compare the newest recorded day against yesterday and against normal."""
    series = _shop_series(conn)
    if not series:
        return {"available": False, "reason": "No daily data recorded yet."}

    today = series[-1]
    yesterday = series[-2] if len(series) > 1 else None
    history = series[:-1]

    # A same-weekday comparison needs the same weekday to have happened before.
    weekday = date.fromisoformat(today["day"]).weekday()
    same_weekday = [d for d in history
                    if date.fromisoformat(d["day"]).weekday() == weekday]

    metrics = []
    for key, (label, better, kind, weight) in TRACKED.items():
        raw = today.get(key)
        if raw is None:
            continue          # not measured for this day; say nothing about it
        value = float(raw)
        prior = [float(d[key]) for d in history[-14:] if d.get(key) is not None]
        typical = median(prior) if prior else None
        spread = _mad(prior) if len(prior) >= 4 else 0.0

        entry: dict[str, Any] = {
            "metric": key, "label": label, "kind": kind, "better": better,
            "value": value,
            "yesterday": (float(yesterday[key])
                          if yesterday and yesterday.get(key) is not None else None),
            "typical": typical,
            "same_weekday": median([float(d[key]) for d in same_weekday
                                    if d.get(key) is not None])
                            if any(d.get(key) is not None for d in same_weekday) else None,
        }
        entry["vs_yesterday"] = (_pct_change(value, entry["yesterday"])
                                 if entry["yesterday"] is not None else None)
        entry["vs_typical"] = (_pct_change(value, typical)
                               if typical is not None else None)
        # Robust z: how many typical deviations from the usual level. When the
        # history is perfectly flat the deviation is zero and no z exists, so
        # fall back to relative distance -- otherwise a run of identical days
        # makes every later jump look normal, which is backwards.
        if spread > 0:
            entry["z"] = (value - typical) / spread
            entry["unusual"] = abs(entry["z"]) >= 2.0 and len(prior) >= 5
        elif typical:
            entry["z"] = 0.0
            entry["unusual"] = abs(value - typical) / abs(typical) >= 0.5 and len(prior) >= 5
        else:
            entry["z"] = 0.0
            entry["unusual"] = False

        change = entry["vs_yesterday"]
        if change is None or abs(change) < 0.02:
            entry["verdict"] = "flat"
        elif better is None:
            # Movement worth reporting, but not good or bad by itself.
            entry["verdict"] = "neutral"
        elif better == "up":
            entry["verdict"] = "better" if change > 0 else "worse"
        else:
            entry["verdict"] = "better" if change < 0 else "worse"
        entry["weight"] = weight
        metrics.append(entry)

    return {
        "available": True,
        "day": today["day"],
        "day_label": _day_label(today["day"]),
        "previous_day": yesterday["day"] if yesterday else None,
        "previous_day_label": _day_label(yesterday["day"]) if yesterday else None,
        "days_recorded": len(series),
        "history_days": len(history),
        "reliable": len(series) >= 7,
        "metrics": metrics,
        "series": series,
        "focus": _focus(conn, metrics, today, yesterday, config),
        "movers": _movers(conn, today["day"], config),
    }


def _day_label(day: str) -> str:
    """An ISO day as a short "9 Sep" label.

    Built by hand rather than with strftime("%-d %b"): the dash modifier that
    strips the leading zero is a glibc extension, and Windows raises
    ValueError: Invalid format string on it.
    """
    try:
        d = date.fromisoformat(day)
    except ValueError:
        return day
    return f"{d.day} {d.strftime('%b')}"

def _movers(conn: sqlite3.Connection, day: str, config: dict) -> dict:
    """Traffic sources that changed most in money, on the newest day they cover.

    The workbook's source sheets often stop a day earlier than the shop-level
    one, so the tracker's own day can have no source rows at all. Summing that
    gap would report every source as having collapsed to zero, which is a
    dramatic story about missing data rather than about the shop. The panel
    therefore falls back to the newest pair of days the sources actually cover
    and says so when that is behind the headline day.
    """
    covered = [r["day"] for r in conn.execute(
        "SELECT DISTINCT day FROM daily_source WHERE day <= ? ORDER BY day", (day,)
    ).fetchall()]
    if len(covered) < 2:
        return {"rows": [], "day": None, "previous": None, "lagging": False}
    now, before = covered[-1], covered[-2]

    rows = conn.execute(
        """SELECT source, channel,
                  SUM(CASE WHEN day = ? THEN sales ELSE 0 END)    AS now_sales,
                  SUM(CASE WHEN day = ? THEN sales ELSE 0 END)    AS was_sales,
                  SUM(CASE WHEN day = ? THEN ad_spend ELSE 0 END) AS now_spend,
                  SUM(CASE WHEN day = ? THEN ad_spend ELSE 0 END) AS was_spend,
                  MAX(is_ads) AS is_ads
           FROM daily_source WHERE day IN (?, ?) AND {rollup}
           GROUP BY source, channel""".format(rollup=NOT_A_ROLLUP),
        (now, before, now, before, now, before),
    ).fetchall()
    out = []
    for row in rows:
        delta = float(row["now_sales"]) - float(row["was_sales"])
        spend_delta = float(row["now_spend"]) - float(row["was_spend"])
        if abs(delta) < 1 and abs(spend_delta) < 1:
            continue
        out.append({
            "source": row["source"], "channel": row["channel"],
            "sales": float(row["now_sales"]), "was": float(row["was_sales"]),
            "delta": delta,
            "ad_spend": float(row["now_spend"]), "spend_delta": spend_delta,
            "is_ads": bool(row["is_ads"]),
        })
    return {
        "rows": sorted(out, key=lambda r: -abs(r["delta"]))[:10],
        "day": now, "day_label": _day_label(now),
        "previous": before, "previous_label": _day_label(before),
        "lagging": now != day,
    }



def _focus(conn, metrics: list[dict], today: dict, yesterday: dict | None,
           config: dict) -> list[dict]:
    """What to look at first, ranked by how much it moved and how much it matters.

    Ranking on percentage change alone puts a swing in a tiny number above a
    real move in revenue, so the score multiplies the change by the metric's
    weight and damps anything with a small base.
    """
    cur = config.get("currency", "RM")
    items: list[dict] = []

    for m in metrics:
        change = m["vs_yesterday"]
        if change is None or m["verdict"] == "flat":
            continue
        if m["verdict"] == "neutral" and abs(change) < 0.25:
            continue          # only surface a neutral metric on a big move
        score = abs(change) * m["weight"] * (1.6 if m["verdict"] == "worse" else 1.0)
        if m["unusual"]:
            score *= 1.5
        direction = "up" if change > 0 else "down"
        items.append({
            "kind": "metric",
            "title": f"{m['label']} {direction} {abs(change):.0%}",
            "verdict": m["verdict"],
            "score": score,
            "detail": _metric_detail(m, cur),
            "action": _metric_action(m, cur),
        })

    # Ad spend rising while sales fall is the pattern most worth catching.
    spend = next((m for m in metrics if m["metric"] == "ad_spend"), None)
    sales = next((m for m in metrics if m["metric"] == "sales"), None)
    if spend and sales and spend["vs_yesterday"] and sales["vs_yesterday"]:
        if spend["vs_yesterday"] > 0.1 and sales["vs_yesterday"] < -0.1:
            items.append({
                "kind": "pattern",
                "title": "Spending more and selling less",
                "verdict": "worse",
                "score": 3.0,
                "detail": (f"Ad spend rose {spend['vs_yesterday']:.0%} to "
                           f"{cur}{spend['value']:,.2f} while sales fell "
                           f"{abs(sales['vs_yesterday']):.0%} to {cur}{sales['value']:,.2f}. "
                           "One day is noise, but if it holds for three the extra budget is "
                           "not buying anything."),
                "action": "Check the ad placements below: which one took the extra spend, "
                          "and did its orders move at all.",
            })

    return sorted(items, key=lambda i: -i["score"])[:5]


def _fmt(value: float, kind: str, cur: str) -> str:
    if kind == "money":
        return f"{cur}{value:,.2f}"
    if kind == "pct":
        return f"{value * 100:.2f}%"
    if kind == "x":
        return f"{value:,.1f}×"
    return f"{value:,.0f}"


def _metric_detail(m: dict, cur: str) -> str:
    parts = [f"{_fmt(m['value'], m['kind'], cur)} today"]
    if m["yesterday"] is not None:
        parts.append(f"against {_fmt(m['yesterday'], m['kind'], cur)} yesterday")
    if m["typical"] is not None:
        parts.append(f"and a usual {_fmt(m['typical'], m['kind'], cur)}")
    text = ", ".join(parts) + "."
    if m["unusual"]:
        text += " That is well outside its normal range rather than ordinary movement."
    # Beating a bad yesterday is not the same as doing well. Without this, a
    # day at a third of its usual sales reads as good news because the day
    # before it was worse still.
    gap = _gap_to_typical(m)
    if gap:
        text += f" {gap}"
    return text


def _gap_to_typical(m: dict) -> str:
    """Say so when the day-over-day verdict points away from the usual level."""
    typical, value, better = m["typical"], m["value"], m["better"]
    if typical is None or not typical or better is None or m["verdict"] == "flat":
        return ""
    off = (value - typical) / abs(typical)
    if m["verdict"] == "better" and (off < -0.2 if better == "up" else off > 0.2):
        return "Still short of its usual level, though."
    if m["verdict"] == "worse" and (off > 0.2 if better == "up" else off < -0.2):
        return "Still ahead of its usual level, though."
    return ""


def _metric_action(m: dict, cur: str) -> str:
    key, worse = m["metric"], m["verdict"] == "worse"
    if key == "cvr" and worse:
        return ("Traffic arrived and did not buy. Check whether a listing changed, went out "
                "of stock, or lost its rating.")
    if key == "sales" and worse:
        return "Look at which traffic source lost the money, below."
    if key == "ad_spend":
        return ("Spend moving is neither good nor bad on its own — read it against orders "
                "and ROAS on the same day before deciding.")
    if key == "visitors" and worse:
        return "Fewer people arrived. Usually a ranking or ad-delivery change, not the listing."
    if key == "cancelled" and worse:
        return "Check stock and delivery estimates on whatever was ordered."
    if not worse:
        # A rise that has not got back to normal is a rebound, not a recovery,
        # and telling someone to repeat it invites a change on one day of noise.
        if _gap_to_typical(m):
            return ("One better day off a low base. Wait for it to reach its usual "
                    "level before treating anything as fixed.")
        return "Worth knowing what caused it, so you can repeat it."
    return "Compare against the same weekday before treating it as a real change."


def history(conn: sqlite3.Connection, limit: int = 60) -> list[dict]:
    return _shop_series(conn)[-limit:]
