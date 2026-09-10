"""The reports folder holds exactly two files, and they keep their names.

Earlier versions wrote a dated report per export, so the folder grew a file
every morning. These tests pin the behaviour that replaced it: two reports at
fixed names, present before anything is analysed, refreshed in place after.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shopads import config as cfg
from shopads.placeholder import waiting_page
from shopads.writer import write_atomic


@pytest.fixture
def reports(tmp_path, monkeypatch):
    """Point every path in the config at a throwaway folder."""
    root = tmp_path / "ShopAds"
    report_dir = root / "reports"
    monkeypatch.setattr(cfg, "ROOT", root)
    monkeypatch.setattr(cfg, "DROP_DIR", root / "drop")
    monkeypatch.setattr(cfg, "REPORT_DIR", report_dir)
    monkeypatch.setattr(cfg, "DATA_DIR", root / "data")
    monkeypatch.setattr(cfg, "ARCHIVE_DIR", root / "drop" / "processed")
    monkeypatch.setattr(cfg, "FAILED_DIR", root / "drop" / "failed")
    monkeypatch.setattr(cfg, "SHOP_REPORT", report_dir / "Shop Performance Report.html")
    monkeypatch.setattr(cfg, "ADS_REPORT", report_dir / "Keywords Ads Report.html")
    monkeypatch.setattr(cfg, "OTHER_DIR", report_dir / "other")
    return report_dir


def test_both_reports_exist_before_anything_is_dropped(reports):
    cfg.ensure_dirs()
    names = sorted(p.name for p in reports.iterdir() if p.is_file())
    assert names == ["Keywords Ads Report.html", "Shop Performance Report.html"]


def test_a_waiting_report_says_what_to_drop(reports):
    cfg.ensure_dirs()
    page = cfg.SHOP_REPORT.read_text(encoding="utf-8")
    assert "<title>Shop Performance Report</title>" in page
    assert "drop" in page


def test_placeholders_are_not_written_over_a_real_report(reports):
    cfg.ensure_dirs()
    cfg.SHOP_REPORT.write_text("<html>the real thing</html>", encoding="utf-8")
    cfg.ensure_dirs()                       # a later run must not clobber it
    assert cfg.SHOP_REPORT.read_text(encoding="utf-8") == "<html>the real thing</html>"


def test_a_refresh_replaces_the_report_rather_than_adding_one(reports):
    cfg.ensure_dirs()
    write_atomic(cfg.SHOP_REPORT, "<html>first</html>")
    write_atomic(cfg.SHOP_REPORT, "<html>second</html>")
    files = sorted(p.name for p in reports.iterdir() if p.is_file())
    assert files == ["Keywords Ads Report.html", "Shop Performance Report.html"]
    assert cfg.SHOP_REPORT.read_text(encoding="utf-8") == "<html>second</html>"


def test_the_atomic_write_leaves_no_temporary_files_behind(reports):
    cfg.ensure_dirs()
    write_atomic(cfg.SHOP_REPORT, "<html>x</html>")
    leftovers = [p.name for p in reports.iterdir() if p.name.startswith(".~")]
    assert leftovers == []


def test_dated_reports_from_an_earlier_version_are_moved_not_deleted(reports, monkeypatch):
    from shopads import pipeline

    monkeypatch.setattr(pipeline, "REPORT_DIR", reports)
    monkeypatch.setattr(pipeline, "SHOP_REPORT", cfg.SHOP_REPORT)
    monkeypatch.setattr(pipeline, "ADS_REPORT", cfg.ADS_REPORT)
    cfg.ensure_dirs()
    (reports / "2026-09-08_products_thebaker.html").write_text("old", encoding="utf-8")
    (reports / "2026-09-10_products_thebaker.html").write_text("older", encoding="utf-8")

    assert pipeline.tidy_old_reports() == 2
    assert sorted(p.name for p in reports.iterdir() if p.is_file()) == [
        "Keywords Ads Report.html", "Shop Performance Report.html"]
    kept = sorted(p.name for p in (reports / "previous").iterdir())
    assert kept == ["2026-09-08_products_thebaker.html",
                    "2026-09-10_products_thebaker.html"]
    assert pipeline.tidy_old_reports() == 0        # nothing left to move


def test_the_waiting_pages_name_both_reports():
    assert "Shop Performance Report" in waiting_page("shop")
    assert "Keywords Ads Report" in waiting_page("ads")
