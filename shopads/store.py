"""Local SQLite history.

A single export is a snapshot. Storing every run is what turns the tool into
a tracker: metrics can then be compared against the previous run for the same
shop, which is the trend a one-off export can never show.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Iterator

from .analyze import Analysis
from .ingest import Export

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    file_hash          TEXT NOT NULL UNIQUE,
    source_name        TEXT NOT NULL,
    analysed_at        TEXT NOT NULL,
    shop_name          TEXT,
    shop_id            TEXT,
    ad_name            TEXT,
    bidding_method     TEXT,
    period_start       TEXT,
    period_end         TEXT,
    days               INTEGER,
    rows               INTEGER,
    keywords           INTEGER,
    queries            INTEGER,
    impressions        REAL,
    clicks             REAL,
    conversions        REAL,
    spend              REAL,
    gmv                REAL,
    ctr                REAL,
    cvr                REAL,
    roas               REAL,
    acos               REAL,
    cpc                REAL,
    aov                REAL,
    sov                REAL,
    product_ctr        REAL,
    spend_per_day      REAL,
    zero_conv_share    REAL,
    report_path        TEXT
);

CREATE TABLE IF NOT EXISTS run_keywords (
    run_id      INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    keyword     TEXT NOT NULL,
    theme       TEXT,
    impressions REAL, clicks REAL, spend REAL, gmv REAL, conversions REAL,
    ctr REAL, cpc REAL, roas REAL, on_theme_spend REAL
);

CREATE TABLE IF NOT EXISTS run_queries (
    run_id      INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    query       TEXT NOT NULL,
    impressions REAL, clicks REAL, spend REAL, gmv REAL, conversions REAL,
    ctr REAL, cpc REAL
);

CREATE TABLE IF NOT EXISTS run_segments (
    run_id  INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    segment TEXT NOT NULL,
    impressions REAL, clicks REAL, spend REAL, gmv REAL, conversions REAL,
    ctr REAL, roas REAL, spend_share REAL
);

CREATE TABLE IF NOT EXISTS run_payloads (
    run_id  INTEGER PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
    payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_shop    ON runs(shop_id, period_start);
CREATE INDEX IF NOT EXISTS idx_kw_run       ON run_keywords(run_id);
CREATE INDEX IF NOT EXISTS idx_q_run        ON run_queries(run_id);
"""

#: Metrics trended between runs, with the direction that counts as improvement.
TRENDED = {
    "spend": None, "gmv": "up", "impressions": "up", "clicks": "up", "conversions": "up",
    "ctr": "up", "cvr": "up", "roas": "up", "acos": "down", "cpc": "down",
    "sov": "up", "product_ctr": "up", "zero_conv_share": "down",
    "spend_per_day": None,
}


@contextmanager
def connect(db_path: Path) -> Iterator[sqlite3.Connection]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(SCHEMA)
        yield conn
        conn.commit()
    finally:
        conn.close()


def _iso(value: date | None) -> str | None:
    return value.isoformat() if value else None


def already_seen(conn: sqlite3.Connection, file_hash: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT id, source_name, analysed_at, report_path FROM runs WHERE file_hash = ?",
        (file_hash,),
    ).fetchone()


def save_run(
    conn: sqlite3.Connection,
    export: Export,
    analysis: Analysis,
    report_path: Path | None = None,
) -> int:
    totals = analysis.totals
    cursor = conn.execute(
        """INSERT INTO runs (
            file_hash, source_name, analysed_at, shop_name, shop_id, ad_name,
            bidding_method, period_start, period_end, days, rows, keywords,
            queries, impressions, clicks, conversions, spend, gmv, ctr, cvr,
            roas, acos, cpc, aov, sov, product_ctr, spend_per_day,
            zero_conv_share, report_path
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            export.file_hash, export.source_path.name, datetime.now().isoformat(timespec="seconds"),
            export.shop_name, export.shop_id, export.ad_name, export.bidding_method,
            _iso(export.period_start), _iso(export.period_end), totals["days"],
            totals["rows"], totals["keywords"], totals["queries"], totals["impressions"],
            totals["clicks"], totals["conversions"], totals["spend"], totals["gmv"],
            totals["ctr"], totals["cvr"], totals["roas"], totals["acos"], totals["cpc"],
            totals["aov"], totals["sov"], totals["product_ctr"], totals["spend_per_day"],
            totals["zero_conversion_share"], str(report_path) if report_path else None,
        ),
    )
    run_id = int(cursor.lastrowid)

    conn.executemany(
        """INSERT INTO run_keywords (run_id, keyword, theme, impressions, clicks,
           spend, gmv, conversions, ctr, cpc, roas, on_theme_spend)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        [(run_id, k["keyword"], k["theme"], k["impressions"], k["clicks"], k["spend"],
          k["gmv"], k["conversions"], k["ctr"], k["cpc"], k["roas"], k["on_theme_spend"])
         for k in analysis.keywords],
    )
    conn.executemany(
        """INSERT INTO run_queries (run_id, query, impressions, clicks, spend, gmv,
           conversions, ctr, cpc) VALUES (?,?,?,?,?,?,?,?,?)""",
        [(run_id, q["query"], q["impressions"], q["clicks"], q["spend"], q["gmv"],
          q["conversions"], q["ctr"], q["cpc"]) for q in analysis.queries],
    )
    conn.executemany(
        """INSERT INTO run_segments (run_id, segment, impressions, clicks, spend, gmv,
           conversions, ctr, roas, spend_share) VALUES (?,?,?,?,?,?,?,?,?,?)""",
        [(run_id, s["segment"], s["impressions"], s["clicks"], s["spend"], s["gmv"],
          s["conversions"], s["ctr"], s["roas"], s["spend_share"]) for s in analysis.segments],
    )
    conn.execute(
        "INSERT INTO run_payloads (run_id, payload) VALUES (?, ?)",
        (run_id, json.dumps({
            "totals": analysis.totals, "confidence": analysis.confidence,
            "pareto": analysis.pareto, "segments": analysis.segments,
            "themes": analysis.themes, "cpc_bands": analysis.cpc_bands,
            "tail_bands": analysis.tail_bands, "findings": analysis.findings,
        }, default=str)),
    )
    return run_id


def set_report_path(conn: sqlite3.Connection, run_id: int, report_path: Path) -> None:
    conn.execute("UPDATE runs SET report_path = ? WHERE id = ?", (str(report_path), run_id))


def previous_run(
    conn: sqlite3.Connection, shop_id: str | None, before_run_id: int
) -> sqlite3.Row | None:
    """Most recent earlier run for the same shop, for trend comparison."""
    if shop_id:
        row = conn.execute(
            "SELECT * FROM runs WHERE shop_id = ? AND id < ? ORDER BY id DESC LIMIT 1",
            (shop_id, before_run_id),
        ).fetchone()
        if row:
            return row
    return conn.execute(
        "SELECT * FROM runs WHERE id < ? ORDER BY id DESC LIMIT 1", (before_run_id,)
    ).fetchone()


def compare(current: dict, previous: sqlite3.Row | None) -> list[dict]:
    """Per-metric deltas against the previous run.

    Rates are reported as a percentage-point change; absolute counts as a
    percentage change. Returns an empty list when there is no history yet.
    """
    if previous is None:
        return []

    source = {
        "spend": current["spend"], "gmv": current["gmv"],
        "impressions": current["impressions"], "clicks": current["clicks"],
        "conversions": current["conversions"], "ctr": current["ctr"], "cvr": current["cvr"],
        "roas": current["roas"], "acos": current["acos"], "cpc": current["cpc"],
        "sov": current["sov"], "product_ctr": current["product_ctr"],
        "zero_conv_share": current["zero_conversion_share"],
        "spend_per_day": current["spend_per_day"],
    }
    rate_metrics = {"ctr", "cvr", "acos", "sov", "product_ctr", "zero_conv_share"}

    rows = []
    for metric, better in TRENDED.items():
        now = float(source.get(metric) or 0.0)
        then = float(previous[metric] or 0.0) if metric in previous.keys() else 0.0
        if then == 0 and now == 0:
            continue
        if metric in rate_metrics:
            delta, unit = (now - then) * 100, "pp"
        else:
            delta = ((now - then) / then * 100) if then else float("inf")
            unit = "%"
        verdict = "flat"
        if better and abs(delta) > 0.5:
            improved = delta > 0 if better == "up" else delta < 0
            verdict = "better" if improved else "worse"
        rows.append({
            "metric": metric, "current": now, "previous": then,
            "delta": delta, "unit": unit, "verdict": verdict,
        })
    return rows


def history(conn: sqlite3.Connection, limit: int = 50) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM runs ORDER BY COALESCE(period_end, analysed_at) DESC, id DESC LIMIT ?",
        (limit,),
    ).fetchall()
