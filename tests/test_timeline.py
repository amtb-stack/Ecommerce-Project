"""Tests for the running daily record and the day-over-day tracker.

The behaviour that matters most is that overlapping exports merge rather than
accumulate, and that a day nobody measured is never reported as a zero.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shopads import timeline
from shopads.config import DEFAULT_CONFIG


@dataclass
class FakeStats:
    daily: list = field(default_factory=list)
    daily_sources: list = field(default_factory=list)


def day(date: str, sales: float, orders: float, clicks: float = 100.0,
        visitors: float = 500.0, cvr: float = 0.02, cancelled: float = 0.0) -> dict:
    return {"date": date, "sales": sales, "orders": orders, "visitors": visitors,
            "clicks": clicks, "cvr": cvr, "new_buyers": orders, "cancelled": cancelled}


def source(date: str, name: str, sales: float, spend: float = 0.0,
           channel: str = "Shopee Ads") -> dict:
    return {"day": date, "channel": channel, "source": name, "sales": sales,
            "impressions": 1000.0, "has_impressions": True, "clicks": 0.0,
            "has_clicks": False, "orders": 1.0, "ad_spend": spend,
            "ad_roas": (sales / spend) if spend else 0.0,
            "is_ads": channel == "Shopee Ads"}


@pytest.fixture
def db(tmp_path):
    return tmp_path / "t.db"


@pytest.fixture
def config():
    return DEFAULT_CONFIG


def _week(start: int = 1, sales: float = 1000.0) -> FakeStats:
    days, sources = [], []
    for i in range(start, start + 7):
        date = f"2026-09-{i:02d}"
        days.append(day(date, sales, 4))
        sources.append(source(date, "Product Ads", sales * 0.4, 50.0))
    return FakeStats(days, sources)


# ------------------------------------------------------------ the record ---

def test_overlapping_exports_merge_instead_of_accumulating(db):
    with timeline.connect(db) as conn:
        timeline.record(conn, _week(), "monday.xlsx")
        timeline.record(conn, _week(), "tuesday.xlsx")     # same seven days again
        rows = timeline.history(conn)
    assert len(rows) == 7, "re-dropping an overlapping export must not duplicate days"


def test_a_later_export_corrects_an_earlier_day(db):
    with timeline.connect(db) as conn:
        timeline.record(conn, FakeStats([day("2026-09-01", 100.0, 1)]), "first.xlsx")
        timeline.record(conn, FakeStats([day("2026-09-01", 250.0, 3)]), "second.xlsx")
        rows = timeline.history(conn)
    assert len(rows) == 1
    assert rows[0]["sales"] == pytest.approx(250.0)
    assert rows[0]["source_file"] == "second.xlsx"


def test_new_days_extend_the_history(db):
    with timeline.connect(db) as conn:
        timeline.record(conn, _week(start=1), "a.xlsx")
        timeline.record(conn, _week(start=5), "b.xlsx")     # overlaps by three days
        rows = timeline.history(conn)
    assert [r["day"] for r in rows] == [f"2026-09-{i:02d}" for i in range(1, 12)]


# ----------------------------------------------------------- the tracker ---

def test_no_history_is_reported_honestly(db, config):
    with timeline.connect(db) as conn:
        assert timeline.track(conn, config)["available"] is False


def test_direction_is_judged_per_metric(db, config):
    with timeline.connect(db) as conn:
        timeline.record(conn, _week(), "a.xlsx")
        timeline.record(conn, FakeStats(
            [day("2026-09-08", 400.0, 1)],                  # sales down, orders down
            [source("2026-09-08", "Product Ads", 160.0, 50.0)]), "b.xlsx")
        result = timeline.track(conn, config)
    by = {m["metric"]: m for m in result["metrics"]}
    assert by["sales"]["verdict"] == "worse"
    assert by["orders"]["verdict"] == "worse"
    assert result["day"] == "2026-09-08"
    assert result["previous_day"] == "2026-09-07"


def test_spend_alone_is_never_called_better_or_worse(db, config):
    """Spending less is not an achievement; it depends what it bought."""
    with timeline.connect(db) as conn:
        timeline.record(conn, _week(), "a.xlsx")
        timeline.record(conn, FakeStats(
            [day("2026-09-08", 1000.0, 4)],
            [source("2026-09-08", "Product Ads", 400.0, 10.0)]), "b.xlsx")
        result = timeline.track(conn, config)
    spend = next(m for m in result["metrics"] if m["metric"] == "ad_spend")
    assert spend["verdict"] in {"neutral", "flat"}


def test_a_day_without_source_rows_reports_no_ad_figures(db, config):
    """Missing data must not read as a collapse to zero."""
    with timeline.connect(db) as conn:
        timeline.record(conn, _week(), "a.xlsx")
        timeline.record(conn, FakeStats([day("2026-09-08", 900.0, 3)]), "b.xlsx")
        result = timeline.track(conn, config)
    reported = {m["metric"] for m in result["metrics"]}
    assert "ad_spend" not in reported
    assert "ad_roas" not in reported
    assert "sales" in reported


def test_an_outlier_is_marked_unusual(db, config):
    with timeline.connect(db) as conn:
        timeline.record(conn, _week(), "a.xlsx")
        timeline.record(conn, FakeStats(
            [day("2026-09-08", 25_000.0, 60)],
            [source("2026-09-08", "Product Ads", 10_000.0, 50.0)]), "b.xlsx")
        result = timeline.track(conn, config)
    sales = next(m for m in result["metrics"] if m["metric"] == "sales")
    assert sales["unusual"] is True


def test_a_short_history_is_flagged_as_unreliable(db, config):
    with timeline.connect(db) as conn:
        timeline.record(conn, FakeStats([day("2026-09-01", 100.0, 1),
                                         day("2026-09-02", 120.0, 2)]), "a.xlsx")
        result = timeline.track(conn, config)
    assert result["reliable"] is False
    assert result["days_recorded"] == 2


def test_focus_puts_the_worse_movement_first(db, config):
    with timeline.connect(db) as conn:
        timeline.record(conn, _week(), "a.xlsx")
        timeline.record(conn, FakeStats(
            [day("2026-09-08", 200.0, 1, clicks=101.0)],
            [source("2026-09-08", "Product Ads", 80.0, 50.0)]), "b.xlsx")
        result = timeline.track(conn, config)
    assert result["focus"], "a large drop must produce something to look at"
    assert result["focus"][0]["verdict"] == "worse"
    assert result["focus"][0]["action"]


def test_movers_name_the_source_that_changed(db, config):
    with timeline.connect(db) as conn:
        timeline.record(conn, FakeStats(
            [day("2026-09-01", 1000.0, 4)],
            [source("2026-09-01", "Search", 900.0, 10.0)]), "a.xlsx")
        timeline.record(conn, FakeStats(
            [day("2026-09-02", 300.0, 1)],
            [source("2026-09-02", "Search", 200.0, 10.0)]), "b.xlsx")
        result = timeline.track(conn, config)
    movers = {m["source"]: m for m in result["movers"]["rows"]}
    assert "Search" in movers
    assert movers["Search"]["delta"] == pytest.approx(-700.0)
    assert result["movers"]["lagging"] is False


def test_movers_fall_back_to_the_newest_day_the_sources_cover(db, config):
    """The shop sheet can run a day ahead of the per-source ones.

    Summing the uncovered day would report every source as having dropped to
    zero, which describes the missing rows rather than the shop.
    """
    with timeline.connect(db) as conn:
        timeline.record(conn, FakeStats(
            [day("2026-09-01", 1000.0, 4)],
            [source("2026-09-01", "Search", 900.0, 10.0)]), "a.xlsx")
        timeline.record(conn, FakeStats(
            [day("2026-09-02", 300.0, 1)],
            [source("2026-09-02", "Search", 200.0, 10.0)]), "b.xlsx")
        # A third day at shop level only -- no source rows for it at all.
        timeline.record(conn, FakeStats([day("2026-09-03", 500.0, 2)], []), "c.xlsx")
        result = timeline.track(conn, config)

    assert result["day"] == "2026-09-03"
    movers = result["movers"]
    assert movers["lagging"] is True
    assert movers["day"] == "2026-09-02" and movers["previous"] == "2026-09-01"
    rows = {m["source"]: m for m in movers["rows"]}
    assert rows["Search"]["sales"] == pytest.approx(200.0)  # not 0


def test_channel_rollup_rows_are_not_counted_twice(db, config):
    """A block lists the channel total and its breakdown side by side.

    Counting both makes the channel appear twice in the movers list, once as
    itself and once as the sum of its own parts.
    """
    with timeline.connect(db) as conn:
        for d, mult in (("2026-09-01", 1.0), ("2026-09-02", 0.5)):
            timeline.record(conn, FakeStats([day(d, 300.0 * mult, 2)], [
                source(d, "Product Card", 300.0 * mult, 0.0, channel="Product Card"),
                source(d, "Search", 200.0 * mult, 0.0, channel="Product Card"),
                source(d, "Shop", 100.0 * mult, 0.0, channel="Product Card"),
            ]), f"{d}.xlsx")
        result = timeline.track(conn, config)

    names = [m["source"] for m in result["movers"]["rows"]]
    assert "Search" in names and "Shop" in names
    assert "Product Card" not in names          # the roll-up, already in its parts


def test_a_rise_off_a_bad_day_is_not_sold_as_good(db, config):
    """Up on yesterday, still a third of normal, is not a win.

    Ranking on day-over-day change alone would headline that as good news,
    which is exactly the reading that gets a bad week mistaken for a recovery.
    """
    with timeline.connect(db) as conn:
        for d in range(1, 8):                       # a week at RM3,000
            timeline.record(conn, FakeStats(
                [day(f"2026-09-{d:02d}", 3000.0, 10)],
                [source(f"2026-09-{d:02d}", "Search", 3000.0, 100.0)]), "h.xlsx")
        timeline.record(conn, FakeStats(            # collapse
            [day("2026-09-08", 300.0, 1)],
            [source("2026-09-08", "Search", 300.0, 100.0)]), "a.xlsx")
        timeline.record(conn, FakeStats(            # doubles, still far below usual
            [day("2026-09-09", 600.0, 2)],
            [source("2026-09-09", "Search", 600.0, 100.0)]), "b.xlsx")
        result = timeline.track(conn, config)

    sales = next(m for m in result["metrics"] if m["metric"] == "sales")
    assert sales["verdict"] == "better"             # it did rise on yesterday
    detail = timeline._metric_detail(sales, "RM")
    assert "Still short of its usual level" in detail
    assert "off a low base" in timeline._metric_action(sales, "RM")
