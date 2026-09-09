"""Tests for the shop-statistics workbook reader and product analysis.

The fixture workbook mirrors the real export's awkward shape: blocks with a
one-cell label, a different column schema per channel, and Shopee's truncated
sheet names.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

openpyxl = pytest.importorskip("openpyxl")

from shopads.config import DEFAULT_CONFIG
from shopads.ingest import IngestError
from shopads.product_report import _payload, render
from shopads.products import analyse_products
from shopads.shopstats import looks_like_shop_stats, read_shop_stats

OVERVIEW = ["Date", "Sales (MYR)", "Orders", "Sales per Order", "Product Clicks", "Visitors",
            "Order Conversion Rate", "Cancelled Orders", "Cancelled Sales",
            "# of buyers", "# of new buyers", "# of existing buyers",
            "# of potential buyers", "Repeat Purchase Rate"]
PRODUCT_COLS = ["Item ID", "Product", "Current Item Status", "Sales Ratio", "Sales (MYR)",
                "Product Impressions", "Product Clicks", "Orders", "Units", "CTR",
                "Order Conversion Rate", "Sales per Order", "Buyers",
                "Unique Product Impressions", "Unique Product Clicks"]


def _product_row(item, name, sales, impr, clicks, orders):
    return [item, name, "Normal", "50.00%", f"{sales:,.2f}", str(impr), str(clicks),
            f"{orders:.2f}", f"{orders:.0f}", "4.00%", "1.00%", "100.00", f"{orders:.0f}",
            str(impr), str(clicks)]


def _write_workbook(path: Path, paid_scale: float = 1.0) -> Path:
    book = openpyxl.Workbook()
    book.remove(book.active)

    for state in ("Placed", "Confirmed", "Paid"):
        ws = book.create_sheet(f"{state} Order")
        ws.append(OVERVIEW)
        scale = paid_scale if state == "Paid" else 1.0
        ws.append(["01-09-2026-08-09-2026", f"{10000 * scale:,.2f}", "20", "500.00",
                   "1000", "5000", "0.40%", "1", "500.00", "19", "18", "1", "300", "5.26%"])
        ws.append([])
        ws.append(OVERVIEW)
        for day in range(1, 5):
            ws.append([f"0{day}-09-2026", f"{2500 * scale:,.2f}", "5", "500.00", "250",
                       "1250", "0.40%", "0", "0.00", "5", "5", "0", "75", "0.00%"])

    # Shopee truncates long tab names; the reader must cope with the stems.
    for state, suffix in (("Placed", "place..."), ("Confirmed", "confi..."), ("Paid", "paid ...")):
        scale = paid_scale if state == "Paid" else 1.0
        ws = book.create_sheet(f"Product Contribution ({suffix}")
        ws.append(["Date", "Order Type", "Sales (MYR)"])
        ws.append(["01-09-2026-08-09-2026", f"{state} Order", "10,000.00"])
        ws.append([])
        ws.append(["Product Card"])
        ws.append(PRODUCT_COLS)
        ws.append(_product_row("111", "Busy but ignored", 1000 * scale, 50000, 900, 2))
        ws.append(_product_row("222", "Converts, unseen", 4000 * scale, 300, 40, 8))
        ws.append(_product_row("444", "Busy and selling", 3000 * scale, 40000, 800, 40))
        ws.append(_product_row("555", "Middling one", 800 * scale, 9000, 120, 1))
        ws.append(_product_row("666", "Middling two", 700 * scale, 8000, 110, 1))
        ws.append(_product_row("777", "Quiet corner", 100 * scale, 200, 12, 0))
        ws.append([])
        ws.append(["Shopee Affiliate"])
        ws.append(PRODUCT_COLS)
        ws.append(_product_row("333", "Never seen", 0, 5, 0, 0))

        traffic = book.create_sheet(f"Traffic Sources ({suffix}")
        traffic.append(["Date", "Order Type", "Sales (MYR)"])
        traffic.append(["01-09-2026-08-09-2026", f"{state} Order", "10,000.00"])
        traffic.append([])
        traffic.append(["Product Card"])
        traffic.append(["Traffic Source", "Sales Ratio", "Sales (MYR)", "Product Impressions",
                        "Product Clicks", "Orders", "Units", "CTR", "Order Conversion Rate"])
        traffic.append(["Product Card", "100.00%", "8,000.00", "50300", "940", "10.00",
                        "10.00", "1.87%", "1.06%"])
        traffic.append([])
        traffic.append(["Shopee Ads"])
        # A different schema entirely: no clicks, but spend and ROAS.
        traffic.append(["Traffic Source", "Sales Ratio", "Sales (MYR)", "Ads Impression",
                        "Orders", "Conversion", "Ads Expense", "Ads ROAS"])
        traffic.append(["Product Ads", "80.00%", "2,000.00", "9000", "4.00", "0.04%",
                        "200.00", "10.00"])
        traffic.append(["Dud Ads", "0.00%", "0.00", "500", "0.00", "0.00%", "50.00", "0.00"])

    book.save(path)
    return path


@pytest.fixture
def workbook(tmp_path):
    return _write_workbook(tmp_path / "shop.shopeeshopstats.2026.xlsx")


@pytest.fixture
def config():
    return DEFAULT_CONFIG


# ----------------------------------------------------------------- reading ---

def test_detects_a_shop_stats_workbook(workbook, tmp_path):
    assert looks_like_shop_stats(workbook)
    other = tmp_path / "notes.csv"
    other.write_text("a,b\n1,2\n", encoding="utf-8")
    assert not looks_like_shop_stats(other)


def test_truncated_sheet_names_still_resolve_their_state(workbook):
    stats = read_shop_stats(workbook)
    # "(place..." and "(confi..." never contain the full word.
    assert set(stats.totals) == {"placed", "confirmed", "paid"}


def test_products_combine_across_states_and_channels(workbook):
    stats = read_shop_stats(workbook)
    by_id = {p["id"]: p for p in stats.products}
    assert set(by_id) == {"111", "222", "333", "444", "555", "666", "777"}
    assert by_id["222"]["placed"]["sales"] == pytest.approx(4000.0)
    assert by_id["222"]["paid"]["sales"] == pytest.approx(4000.0)
    assert by_id["333"]["channels"] == {"Shopee Affiliate": pytest.approx(
        by_id["333"]["channels"]["Shopee Affiliate"])}


def test_daily_series_is_read_and_sorted(workbook):
    stats = read_shop_stats(workbook)
    assert len(stats.daily) == 4
    assert [d["date"] for d in stats.daily] == sorted(d["date"] for d in stats.daily)


def test_channel_schemas_differ_and_are_not_faked(workbook):
    stats = read_shop_stats(workbook)
    ads = next(c for c in stats.channels if c["channel"] == "Shopee Ads")
    card = next(c for c in stats.channels if c["channel"] == "Product Card")
    # The ads block has no click column at all, so CTR must not be invented.
    assert ads["placed"]["has_clicks"] is False
    assert card["placed"]["has_clicks"] is True
    assert card["placed"]["impression_label"] == "Product Impressions"


def test_a_workbook_without_the_sheets_is_rejected(tmp_path):
    book = openpyxl.Workbook()
    book.active.append(["hello", "world"])
    path = tmp_path / "empty.xlsx"
    book.save(path)
    with pytest.raises(IngestError):
        read_shop_stats(path)


# ---------------------------------------------------------------- analysis ---

def test_quadrants_separate_traffic_from_conversion(workbook, config):
    analysis = analyse_products(read_shop_stats(workbook), config)
    by_id = {p["id"]: p for p in analysis.products}
    # 50,000 impressions and 0.22% conversion: seen a lot, rejected.
    assert by_id["111"]["quadrant"] == "fix"
    # 300 impressions and 20% conversion: works, but starved.
    assert by_id["222"]["quadrant"] == "feed"
    # No traffic at all.
    assert by_id["333"]["quadrant"] == "review"


def test_paid_gap_is_measured_per_product(tmp_path, config):
    path = _write_workbook(tmp_path / "leak.shopeeshopstats.xlsx", paid_scale=0.5)
    analysis = analyse_products(read_shop_stats(path), config)
    assert analysis.totals["leak"] == pytest.approx(0.5, abs=0.01)
    assert all(p["leak"] == pytest.approx(0.5, abs=0.01)
               for p in analysis.products if p["sales"])


def test_ad_spend_and_roas_are_captured(workbook, config):
    analysis = analyse_products(read_shop_stats(workbook), config)
    ads = {c["channel"]: c for c in analysis.subchannels if c["is_ads"]}
    assert ads["Product Ads"]["ad_spend"] == pytest.approx(200.0)
    assert ads["Product Ads"]["ad_roas"] == pytest.approx(10.0)
    assert analysis.totals["ad_spend"] == pytest.approx(250.0)
    titles = " ".join(f["title"] for f in analysis.findings)
    assert "returned nothing" in titles      # the RM50 dud placement


def test_findings_flag_concentration_and_starved_products(workbook, config):
    analysis = analyse_products(read_shop_stats(workbook), config)
    titles = " ".join(f["title"] for f in analysis.findings)
    assert "carries the shop" in titles
    assert "starved" in titles


def test_small_catalogues_are_flagged_as_unreliable(tmp_path, config):
    """A median split over a handful of products is arbitrary and says so."""
    book = openpyxl.Workbook()
    book.remove(book.active)
    for state, suffix in (("Placed", "place..."), ("Confirmed", "confi..."), ("Paid", "paid ...")):
        ws = book.create_sheet(f"Product Contribution ({suffix}")
        ws.append(["Date", "Order Type", "Sales (MYR)"])
        ws.append(["01-09-2026-08-09-2026", f"{state} Order", "100.00"])
        ws.append([])
        ws.append(["Product Card"])
        ws.append(PRODUCT_COLS)
        ws.append(_product_row("1", "Only one", 100, 500, 10, 1))
    path = tmp_path / "tiny.shopeeshopstats.xlsx"
    book.save(path)
    analysis = analyse_products(read_shop_stats(path), config)
    assert analysis.totals["quadrant_reliable"] is False
    assert "Too few products" in " ".join(f["title"] for f in analysis.findings)


# ------------------------------------------------------------- portability ---

def test_day_labels_avoid_platform_specific_formats():
    """Windows rejects strftime's "%-d", so the label is built by hand."""
    from datetime import date
    from shopads.shopstats import _day_label
    assert _day_label(date(2026, 9, 1)) == "1 Sep"      # no leading zero
    assert _day_label(date(2026, 12, 25)) == "25 Dec"


def test_no_source_file_uses_a_glibc_only_format_string():
    """A guard, because this class of bug only shows up on the user's machine.

    "%-d" and "%-m" strip the leading zero on Linux and macOS and raise
    ValueError: Invalid format string on Windows.
    """
    import ast
    import re

    package = Path(__file__).resolve().parent.parent / "shopads"
    pattern = re.compile(r"%-[dmHIMSjyY]")
    offenders = []
    for source in package.glob("*.py"):
        tree = ast.parse(source.read_text(encoding="utf-8"))
        # Docstrings legitimately mention the bad format while explaining it,
        # so collect them and exclude them by identity rather than by text.
        docstrings = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.Module, ast.ClassDef,
                                 ast.FunctionDef, ast.AsyncFunctionDef)):
                body = getattr(node, "body", [])
                if body and isinstance(body[0], ast.Expr) and isinstance(
                        body[0].value, ast.Constant) and isinstance(body[0].value.value, str):
                    docstrings.add(id(body[0].value))
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str) \
                    and id(node) not in docstrings and pattern.search(node.value):
                offenders.append(f"{source.name}:{node.lineno}")
    assert not offenders, f"glibc-only strftime formats found at {offenders}"


def test_workbook_reading_emits_no_warnings(workbook, config):
    """Shopee workbooks trip an openpyxl style warning that alarms users."""
    import warnings
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        analyse_products(read_shop_stats(workbook), config)
    assert not [w for w in caught if "default style" in str(w.message)]


# ------------------------------------------------------------------ report ---

def test_payload_serialises_and_carries_the_glossary(workbook, config):
    import json
    from shopads import glossary
    stats = read_shop_stats(workbook)
    payload = _payload(stats, analyse_products(stats, config), config)
    json.dumps(payload)
    assert set(payload["glossary"]) == set(glossary.ALL)
    assert len(payload["quadrants"]) == 4


def test_report_renders_the_page(workbook, config):
    stats = read_shop_stats(workbook)
    html = render(stats, analyse_products(stats, config), config)
    assert "window.__PRODUCTS__" in html
    assert 'id="tip"' in html
    assert "Every product, every number, one row each" in html
    # all twelve source tabs are named on the page
    for name in stats.sheets:
        assert name in html
