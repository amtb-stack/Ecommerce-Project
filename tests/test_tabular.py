"""Tests for the generic profiler — the fallback for files we do not know.

Its whole job is to never refuse a readable table, and never claim more than
the data supports.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shopads.ingest import IngestError
from shopads.tabular import (
    describe_unreadable, looks_tabular, read_tabular, correlations_for, preview_rows,
)
from shopads.tabular_report import render


def _csv(path: Path, rows: list[list], preamble: list[list] | None = None) -> Path:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        for line in (preamble or []):
            writer.writerow(line)
        writer.writerows(rows)
    return path


@pytest.fixture
def ledger(tmp_path):
    rows = [["Date", "Region", "Units", "Revenue", "Rate", "Note"]]
    for i in range(60):
        rows.append([f"{(i % 28) + 1:02d}-03-2026", ["North", "South"][i % 2],
                     i % 12, f"{100 + i * 7:,.2f}", f"{(i % 40) + 5}.0%",
                     "" if i % 3 else "check"])
    rows.append(rows[1])          # one exact duplicate
    return _csv(tmp_path / "ledger.csv", rows,
                preamble=[["Quarterly ledger"], []])


# ------------------------------------------------------------- detection ---

def test_knows_what_it_cannot_read(tmp_path):
    assert describe_unreadable(Path("a.pdf")) == "a PDF"
    assert describe_unreadable(Path("a.docx")) == "a Word document"
    assert describe_unreadable(Path("a.csv")) is None
    assert looks_tabular(Path("a.xlsx")) and not looks_tabular(Path("a.pdf"))


def test_unreadable_files_explain_themselves(tmp_path):
    path = tmp_path / "brochure.pdf"
    path.write_bytes(b"%PDF-1.4")
    with pytest.raises(IngestError) as caught:
        read_tabular(path)
    assert "a PDF" in str(caught.value)
    assert ".csv" in str(caught.value)


# --------------------------------------------------------------- reading ---

def test_header_is_found_below_a_title_block(ledger):
    sheet = read_tabular(ledger).sheets[0]
    # The title line is skipped; blank lines are dropped by the parser, so the
    # index is relative to the parsed frame rather than the raw file.
    assert sheet.header_row > 0
    assert [c["name"] for c in sheet.columns][:3] == ["Date", "Region", "Units"]
    assert len(sheet.frame) == 61       # 60 rows plus the duplicate


def test_a_narrow_metadata_line_is_not_mistaken_for_the_header(tmp_path):
    """A two-cell "User Name, x" line must lose to the real 6-column header."""
    path = _csv(tmp_path / "meta.csv",
                [["Alpha", "Beta", "Gamma", "Delta", "Eps", "Zeta"],
                 ["1", "2", "3", "4", "5", "6"]],
                preamble=[["Report"], ["User Name", "someone"], []])
    sheet = read_tabular(path).sheets[0]
    assert [c["name"] for c in sheet.columns] == ["Alpha", "Beta", "Gamma", "Delta", "Eps", "Zeta"]


def test_types_are_inferred_including_currency_and_percent(ledger):
    kinds = {c["name"]: c["kind"] for c in read_tabular(ledger).sheets[0].columns}
    assert kinds["Date"] == "date"
    assert kinds["Region"] == "category"
    assert kinds["Units"] == "number"
    assert kinds["Revenue"] == "number"        # "1,234.00" is still a number
    assert kinds["Rate"] == "percentage"


def test_percentages_are_stored_as_fractions(ledger):
    rate = next(c for c in read_tabular(ledger).sheets[0].columns if c["name"] == "Rate")
    assert rate["stats"]["max"] <= 1.0


def test_json_is_read_as_a_table(tmp_path):
    path = tmp_path / "items.json"
    path.write_text(json.dumps(
        [{"sku": f"S{i}", "qty": i, "group": "A" if i % 2 else "B"} for i in range(30)]),
        encoding="utf-8")
    sheet = read_tabular(path).sheets[0]
    assert {c["name"] for c in sheet.columns} == {"sku", "qty", "group"}
    assert len(sheet.frame) == 30


def test_every_sheet_of_a_workbook_is_profiled(tmp_path):
    openpyxl = pytest.importorskip("openpyxl")
    book = openpyxl.Workbook()
    first = book.active
    first.title = "One"
    first.append(["a", "b"])
    first.append([1, 2])
    second = book.create_sheet("Two")
    second.append(["x", "y", "z"])
    second.append([1, 2, 3])
    path = tmp_path / "book.xlsx"
    book.save(path)
    dataset = read_tabular(path)
    assert [s.name for s in dataset.sheets] == ["One", "Two"]


def test_an_empty_file_is_rejected_clearly(tmp_path):
    path = tmp_path / "blank.csv"
    path.write_text("", encoding="utf-8")
    with pytest.raises(IngestError):
        read_tabular(path)


# -------------------------------------------------------------- findings ---

def test_duplicates_and_gaps_are_reported(ledger):
    sheet = read_tabular(ledger).sheets[0]
    titles = " ".join(f["title"] for f in sheet.findings)
    assert "duplicate" in titles
    assert "gaps" in titles


def test_a_mostly_empty_column_is_not_called_constant(ledger):
    """A column that is 67% blank is a flag, not a column that never changes."""
    sheet = read_tabular(ledger).sheets[0]
    titles = {f["title"] for f in sheet.findings}
    assert not any("never change" in t for t in titles)
    assert any("flag rather than a value" in t for t in titles)


def test_a_clean_table_says_so(tmp_path):
    path = _csv(tmp_path / "clean.csv",
                [["id", "score"]] + [[i, i * 2] for i in range(40)])
    findings = read_tabular(path).sheets[0].findings
    assert findings[0]["level"] == "good"


def test_correlations_are_only_reported_when_strong(tmp_path):
    path = _csv(tmp_path / "corr.csv",
                [["a", "b", "c"]] + [[i, i * 3, (i * 7919) % 101] for i in range(200)])
    pairs = correlations_for(read_tabular(path).sheets[0])
    assert any(p["a"] == "a" and p["b"] == "b" and p["r"] > 0.99 for p in pairs)
    assert all(abs(p["r"]) >= 0.5 for p in pairs)


# ---------------------------------------------------------------- report ---

def test_preview_rows_are_json_safe(ledger):
    sheet = read_tabular(ledger).sheets[0]
    json.dumps(preview_rows(sheet, 10))


def test_report_renders_and_escapes_hostile_content(tmp_path):
    path = _csv(tmp_path / "x.csv",
                [["name", "n"], ["</script><script>alert(1)</script>", "1"]])
    html = render(read_tabular(path))
    assert "window.__PROFILE__" in html
    assert "</script><script>alert(1)" not in html
    assert "Each field, charted" in html
