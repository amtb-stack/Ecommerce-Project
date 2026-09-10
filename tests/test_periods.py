"""What the period pickers are allowed to offer, and what they must refuse.

The arithmetic that combines periods runs in the browser, but the rules about
which periods may be combined at all live here, and those are the ones that
can produce a wrong number rather than an ugly one.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shopads import periods, store, timeline


@pytest.fixture
def db(tmp_path):
    return tmp_path / "t.db"


def test_range_label_collapses_what_the_ends_share():
    assert periods.range_label("2026-08-01", "2026-08-31") == "1 – 31 Aug 2026"
    assert periods.range_label("2026-08-01", "2026-09-08") == "1 Aug – 8 Sep 2026"
    assert periods.range_label("2025-12-30", "2026-01-02") == "30 Dec 2025 – 2 Jan 2026"
    assert periods.range_label("2026-08-04", "2026-08-04") == "4 Aug 2026"


def test_range_label_survives_a_missing_or_broken_date():
    assert periods.range_label("", "") == ""
    assert periods.range_label("not-a-date", "2026-08-31") == "not-a-date – 2026-08-31"


def test_touching_periods_count_as_overlapping():
    """Shopee's periods include both end dates.

    A file ending 1 June and one starting 1 June share that day, so adding them
    together double-counts it. The check has to treat touching as overlapping.
    """
    assert periods.overlapping([
        {"start": "2026-03-01", "end": "2026-06-01"},
        {"start": "2026-06-01", "end": "2026-09-01"},
    ]) is True
    assert periods.overlapping([
        {"start": "2026-03-01", "end": "2026-05-31"},
        {"start": "2026-06-01", "end": "2026-09-01"},
    ]) is False
    assert periods.overlapping([{"start": "2026-03-01", "end": "2026-06-01"}]) is False
    assert periods.overlapping([]) is False


def _day(date, sales=100.0, orders=1.0, visitors=50.0, clicks=20.0):
    return {"date": date, "sales": sales, "orders": orders, "visitors": visitors,
            "clicks": clicks, "cvr": 0.02, "new_buyers": 1.0, "cancelled": 0.0}


def _source(date, name, channel, sales, spend=0.0):
    return {"day": date, "channel": channel, "source": name, "sales": sales,
            "impressions": 500.0, "has_impressions": True, "clicks": 5.0,
            "has_clicks": True, "orders": 1.0, "ad_spend": spend,
            "ad_roas": 0.0, "is_ads": channel == "Shopee Ads"}


class FakeStats:
    def __init__(self, days, sources):
        self.daily, self.daily_sources = days, sources


def test_source_days_drop_the_channel_rollup_row(db):
    """A block lists the channel's own total beside its breakdown.

    Handing both to the picker would make every range double the channel.
    """
    with timeline.connect(db) as conn:
        timeline.record(conn, FakeStats([_day("2026-08-01")], [
            _source("2026-08-01", "Product Card", "Product Card", 300.0),
            _source("2026-08-01", "Search", "Product Card", 200.0),
            _source("2026-08-01", "Shop", "Product Card", 100.0),
        ]), "a.xlsx")
        rows = periods.source_days(conn)

    names = sorted(r["source"] for r in rows)
    assert names == ["Search", "Shop"]
    assert sum(r["sales"] for r in rows) == pytest.approx(300.0)


def test_a_channel_with_no_breakdown_keeps_its_own_row(db):
    """Shopee Ads carries no self-named total, only its placements.

    Dropping every row whose name matches its channel would be right for
    Product Card and would delete a channel that has nothing else.
    """
    with timeline.connect(db) as conn:
        timeline.record(conn, FakeStats([_day("2026-08-01")], [
            _source("2026-08-01", "Shopee Affiliate", "Shopee Affiliate", 90.0),
        ]), "a.xlsx")
        rows = periods.source_days(conn)

    assert [r["source"] for r in rows] == ["Shopee Affiliate"]


def test_shop_days_come_back_oldest_first(db):
    with timeline.connect(db) as conn:
        for d in ("2026-08-03", "2026-08-01", "2026-08-02"):
            timeline.record(conn, FakeStats([_day(d)], []), "a.xlsx")
        days = periods.shop_days(conn)
    assert [d["day"] for d in days] == ["2026-08-01", "2026-08-02", "2026-08-03"]


def test_ranges_need_two_days_before_a_picker_is_worth_showing(db):
    with timeline.connect(db) as conn:
        timeline.record(conn, FakeStats([_day("2026-08-01")], []), "a.xlsx")
        assert periods.shop_ranges(conn)["available"] is False
        timeline.record(conn, FakeStats([_day("2026-08-02")], []), "a.xlsx")
        assert periods.shop_ranges(conn)["available"] is True


def test_re_exporting_a_period_replaces_it_rather_than_listing_it_twice(db):
    """Re-exporting a window is how a corrected figure arrives.

    Offering both readings in the picker would let someone add a period to
    itself, which is the one selection that cannot be right.
    """
    class Stats:
        def __init__(self, sales):
            from datetime import date
            self.file_hash = f"h{sales}"
            self.source_path = Path(f"{sales}.xlsx")
            self.period_start, self.period_end = date(2026, 8, 1), date(2026, 8, 31)

    class Analysis:
        def __init__(self, sales):
            self.totals = {"days": 31, "products": 2, "sales": sales, "paid_sales": sales,
                           "orders": 4, "visitors": 90, "clicks": 30, "cvr": 0.04,
                           "aov": sales / 4, "leak": 0.0}
            self.products = [{"id": "1", "name": "Oven", "quadrant": "scale",
                              "sales": sales, "paid_sales": sales, "impressions": 10,
                              "clicks": 3, "orders": 1, "ctr": 0.3, "cvr": 0.3,
                              "leak": 0.0}]

    with store.connect(db) as conn:
        store.save_product_run(conn, Stats(100.0), Analysis(100.0), Path("r.html"))
        store.save_product_run(conn, Stats(250.0), Analysis(250.0), Path("r.html"))
        found = periods.product_periods(conn)

    assert len(found) == 1
    assert found[0]["totals"]["sales"] == pytest.approx(250.0)   # the later reading
    assert found[0]["label"] == "1 – 31 Aug 2026"
