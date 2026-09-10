"""Tests for ingest, analysis and storage.

The fixtures are hand-built so that every expected figure can be checked by
arithmetic rather than against a golden file.
"""

from __future__ import annotations

import csv
from pathlib import Path

import pytest

from shopads.analyze import analyse
from shopads.config import DEFAULT_CONFIG
from shopads.ingest import IngestError, read_export
from shopads.pipeline import pending_files
from shopads import store
from shopads import glossary
from shopads.report import VIEWS as _VIEWS


def report_views():
    return _VIEWS
from shopads.report import render, _payload

HEADER = [
    "Sequence", "Keywords", "Match Type", "Search Query", "SOV", "Impression",
    "Clicks", "CTR", "Conversions", "Direct Conversions", "Items Sold", "GMV",
    "Direct GMV", "Expense", "ROAS", "ACOS", "Product Impressions",
    "Product Clicks", "Product CTR",
]

# keyword, query, sov, impr, clicks, ctr, conv, dconv, items, gmv, dgmv, spend, roas, acos, pimp, pclk, pctr
ROWS = [
    ["1", "oven", "Broad Match", "steam oven", "1.00%", "1000", "40", "4.00%", "1", "1", "1",
     "500.00", "500.00", "10.00", "50.00", "2.00%", "2000", "10", "0.50%"],
    ["2", "oven", "Broad Match", "mesin tebu", "0.50%", "500", "10", "2.00%", "0", "0", "0",
     "0.00", "0.00", "5.00", "0.00", "0.00%", "800", "0", "0.00%"],
    ["3", "mixer", "Broad Match", "the baker mixer", "2.00%", "200", "20", "10.00%", "1", "1", "1",
     "1500.00", "1500.00", "5.00", "300.00", "0.33%", "400", "5", "1.25%"],
    ["4", "mixer", "Broad Match", "waffle maker", "0.10%", "300", "0", "0.00%", "0", "0", "0",
     "0.00", "0.00", "0.00", "0.00", "0.00%", "300", "0", "0.00%"],
]


def _write_export(path: Path, period="01/06/2026 - 01/09/2026", rows=None) -> Path:
    body = [
        ["Shop+ Ads Report - Shopee Malaysia"],
        ["User Name", "testshop"],
        ["Shop Name", "Test Kitchen Store"],
        ["Shop ID", "123456"],
        ["Bidding Method:", "Manual Bidding"],
        ["Ad", "Shop Ad 01-06-2026"],
        ["Date Period", period],
        [],
        HEADER,
        *(rows if rows is not None else ROWS),
    ]
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        csv.writer(handle).writerows(body)
    return path


@pytest.fixture
def export_file(tmp_path: Path) -> Path:
    return _write_export(tmp_path / "export.csv")


@pytest.fixture
def config() -> dict:
    return DEFAULT_CONFIG


# ---------------------------------------------------------------- ingest ---

def test_reads_preamble_and_period(export_file):
    export = read_export(export_file)
    assert export.shop_name == "Test Kitchen Store"
    assert export.shop_id == "123456"
    assert export.bidding_method == "Manual Bidding"
    assert export.period_start.isoformat() == "2026-06-01"
    assert export.period_end.isoformat() == "2026-09-01"
    assert export.days == 93  # inclusive


def test_finds_header_regardless_of_preamble_length(tmp_path):
    path = tmp_path / "shifted.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        for i in range(17):
            writer.writerow([f"junk line {i}"])
        writer.writerow(HEADER)
        writer.writerows(ROWS)
    assert len(read_export(path).frame) == len(ROWS)


def test_percentages_become_fractions(export_file):
    frame = read_export(export_file).frame
    assert frame.loc[0, "ctr"] == pytest.approx(0.04)
    assert frame.loc[0, "sov"] == pytest.approx(0.01)


def test_currency_and_thousands_are_stripped(tmp_path):
    rows = [r[:] for r in ROWS]
    rows[0][11] = "RM 1,234.50"   # GMV
    rows[0][13] = "RM 10.00"      # Expense
    frame = read_export(_write_export(tmp_path / "money.csv", rows=rows)).frame
    assert frame.loc[0, "gmv"] == pytest.approx(1234.50)
    assert frame.loc[0, "expense"] == pytest.approx(10.0)


def test_total_rows_are_dropped(tmp_path):
    rows = [*ROWS, ["", "", "", "Total", "", "2000", "70", "", "2", "2", "2",
                    "2000.00", "2000.00", "20.00", "", "", "", "", ""]]
    assert len(read_export(_write_export(tmp_path / "total.csv", rows=rows)).frame) == len(ROWS)


def test_missing_header_names_both_report_types(tmp_path):
    """The error has to tell a non-technical reader what to do next."""
    path = tmp_path / "wrong.csv"
    path.write_text("a,b,c\n1,2,3\n", encoding="utf-8")
    with pytest.raises(IngestError) as caught:
        read_export(path)
    message = str(caught.value)
    assert "KEYWORD export" in message
    assert "STATISTICS workbook" in message
    assert "out of date" in message


def test_missing_required_column_names_it(tmp_path):
    header = [h for h in HEADER if h != "Expense"]
    path = tmp_path / "nocost.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerow([c for i, c in enumerate(ROWS[0]) if HEADER[i] != "Expense"])
    with pytest.raises(IngestError, match="expense"):
        read_export(path)


# -------------------------------------------------------------- analysis ---

def test_totals_are_summed_not_averaged(export_file, config):
    totals = analyse(read_export(export_file), config).totals
    assert totals["spend"] == pytest.approx(20.0)
    assert totals["gmv"] == pytest.approx(2000.0)
    assert totals["clicks"] == 70
    assert totals["impressions"] == 2000
    # 70/2000, not the mean of the four row-level CTRs (4%, 2%, 10%, 0%)
    assert totals["ctr"] == pytest.approx(0.035)
    assert totals["roas"] == pytest.approx(100.0)
    assert totals["cpc"] == pytest.approx(20.0 / 70)


def test_product_ctr_uses_product_columns(export_file, config):
    totals = analyse(read_export(export_file), config).totals
    assert totals["product_impressions"] == 3500
    assert totals["product_clicks"] == 15
    assert totals["product_ctr"] == pytest.approx(15 / 3500)


def test_sov_is_impression_weighted(export_file, config):
    totals = analyse(read_export(export_file), config).totals
    expected = (0.01 * 1000 + 0.005 * 500 + 0.02 * 200 + 0.001 * 300) / 2000
    assert totals["sov"] == pytest.approx(expected)


def test_zero_conversion_spend_is_isolated(export_file, config):
    totals = analyse(read_export(export_file), config).totals
    assert totals["zero_conversion_spend"] == pytest.approx(5.0)
    assert totals["zero_conversion_share"] == pytest.approx(0.25)


def test_on_theme_spend_detects_drift(export_file, config):
    keywords = {k["keyword"]: k for k in analyse(read_export(export_file), config).keywords}
    # "oven" spent 10.00 on an oven query and 5.00 on a sugarcane query.
    assert keywords["oven"]["on_theme_spend"] == pytest.approx(10 / 15)
    # "mixer" spent 5.00 on a mixer query and nothing on the waffle query.
    assert keywords["mixer"]["on_theme_spend"] == pytest.approx(1.0)


def test_segments_are_mutually_exclusive(export_file, config):
    analysis = analyse(read_export(export_file), config)
    assert sum(s["spend"] for s in analysis.segments) == pytest.approx(analysis.totals["spend"])
    branded = next(s for s in analysis.segments if s["segment"] == "Branded")
    assert branded["conversions"] == 1  # only "the baker mixer"


def test_off_catalogue_queries_become_negatives(export_file, config):
    negatives = {n["query"] for n in analyse(read_export(export_file), config).negatives}
    assert "mesin tebu" in negatives
    assert "steam oven" not in negatives  # converted, and on-catalogue


def test_candidates_prefer_engagement(export_file, config):
    candidates = analyse(read_export(export_file), config).candidates
    queries = [c["query"] for c in candidates]
    assert "the baker mixer" in queries          # 10% CTR and converted
    assert "waffle maker" not in queries         # zero clicks
    top = candidates[0]
    assert top["match"] == "Exact"


def test_confidence_flags_small_samples(export_file, config):
    confidence = analyse(read_export(export_file), config).confidence
    assert confidence["reliable"] is False
    assert confidence["roas_low"] <= confidence["roas"] <= confidence["roas_high"]
    assert confidence["top_order_share"] == pytest.approx(0.75)  # the 1500 of 2000


def test_findings_flag_broad_match_and_small_n(export_file, config):
    findings = analyse(read_export(export_file), config).findings
    titles = " ".join(f["title"] for f in findings)
    assert "broad match" in titles
    assert "ROAS" in titles
    assert findings[0]["level"] == "critical"  # sorted most severe first


def test_analysis_survives_an_export_with_no_conversions(tmp_path, config):
    rows = [r[:] for r in ROWS]
    for row in rows:
        row[8] = row[9] = row[10] = "0"
        row[11] = row[12] = "0.00"
    analysis = analyse(read_export(_write_export(tmp_path / "flat.csv", rows=rows)), config)
    assert analysis.totals["roas"] == 0
    assert analysis.totals["cvr"] == 0
    assert analysis.winners == []


# ------------------------------------------------- phrases and economics ---

def test_ngrams_roll_spend_up_to_phrases(export_file, config):
    config = {**config, "thresholds": {**config["thresholds"], "ngram_min_spend": 0.0}}
    ngrams = analyse(read_export(export_file), config).ngrams
    by_phrase = {(n["size"], n["phrase"]): n for n in ngrams}

    # "oven" appears in "steam oven" (10.00). "mesin tebu" carries no oven word.
    assert by_phrase[(1, "oven")]["spend"] == pytest.approx(10.0)
    # "mixer" appears in "the baker mixer" only, at 5.00.
    assert by_phrase[(1, "mixer")]["spend"] == pytest.approx(5.0)
    # Two- and three-word phrases are built as well.
    assert (2, "baker mixer") in by_phrase
    assert (3, "the baker mixer") in by_phrase
    # Words of three letters and up are kept, deliberately: no stopword list.
    # "the" is retained because for this shop it is half the brand name, and a
    # stopword filter would erase the strongest brand signal in the data.
    assert (1, "the") in by_phrase
    assert (2, "the baker") in by_phrase
    # One- and two-letter noise is dropped.
    assert not any(len(n["phrase"]) <= 2 for n in ngrams if n["size"] == 1)


def test_ngram_counts_each_query_once_per_phrase(tmp_path, config):
    rows = [["1", "kw", "Broad Match", "oven oven oven", "1.00%", "100", "10", "10.00%",
             "0", "0", "0", "0.00", "0.00", "4.00", "0.00", "0.00%", "100", "0", "0.00%"]]
    config = {**config, "thresholds": {**config["thresholds"], "ngram_min_spend": 0.0}}
    ngrams = analyse(read_export(_write_export(tmp_path / "rep.csv", rows=rows)), config).ngrams
    oven = next(n for n in ngrams if n["size"] == 1 and n["phrase"] == "oven")
    assert oven["spend"] == pytest.approx(4.0)   # not 12.0
    assert oven["queries"] == 1


def test_blocklist_needs_impressions_not_just_spend(export_file, config):
    config = {**config, "thresholds": {**config["thresholds"], "block_after_impressions": 400}}
    blocked = {b["query"] for b in analyse(read_export(export_file), config).blocklist}
    assert "mesin tebu" in blocked          # 500 impressions, no conversion
    assert "steam oven" not in blocked      # 1000 impressions but it converted
    assert "the baker mixer" not in blocked  # only 200 impressions


def test_economics_absent_without_shop_figures(export_file, config):
    economics = analyse(read_export(export_file), config).economics
    assert economics["has_margin"] is False
    assert economics["has_revenue"] is False
    assert "poas" not in economics


def test_economics_computes_profit_and_tacos(export_file, config):
    config = {**config, "business": {"total_shop_revenue": 8000.0, "contribution_margin": 0.25}}
    economics = analyse(read_export(export_file), config).economics
    # Ad GMV 2000 x 25% margin = 500 contribution, on 20 of spend.
    assert economics["contribution"] == pytest.approx(500.0)
    assert economics["poas"] == pytest.approx(25.0)
    assert economics["profit_after_ads"] == pytest.approx(480.0)
    assert economics["breakeven_roas"] == pytest.approx(4.0)
    assert economics["tacos"] == pytest.approx(20.0 / 8000.0)
    assert economics["organic_revenue"] == pytest.approx(6000.0)


def test_incrementality_finding_fires_on_branded_spend(export_file, config):
    titles = " ".join(f["title"] for f in analyse(read_export(export_file), config).findings)
    assert "incremental" in titles


def test_retail_readiness_finding_tracks_product_ctr(tmp_path, config):
    # The shared fixture converts tiles at 15/3500 = 0.43%, above the 0.40%
    # gate, so the finding correctly stays silent there.
    baseline = " ".join(f["title"] for f in analyse(read_export(_write_export(
        tmp_path / "ok.csv")), config).findings)
    assert "retail-ready" not in baseline

    # Drop the tile clicks and it must fire.
    rows = [r[:] for r in ROWS]
    for row in rows:
        row[17] = "0"     # Product Clicks
    poor = " ".join(f["title"] for f in analyse(read_export(_write_export(
        tmp_path / "poor.csv", rows=rows)), config).findings)
    assert "retail-ready" in poor


# ----------------------------------------------------------------- store ---

def test_run_is_stored_and_deduplicated(tmp_path, export_file, config):
    export = read_export(export_file)
    analysis = analyse(export, config)
    db = tmp_path / "test.db"
    with store.connect(db) as conn:
        assert store.already_seen(conn, export.file_hash) is None
        run_id = store.save_run(conn, export, analysis)
        assert store.already_seen(conn, export.file_hash)["id"] == run_id
        assert len(store.history(conn)) == 1


def test_compare_reports_direction_correctly(tmp_path, export_file, config):
    export = read_export(export_file)
    analysis = analyse(export, config)
    db = tmp_path / "trend.db"
    with store.connect(db) as conn:
        first = store.save_run(conn, export, analysis)

        worse = analyse(export, config)
        worse.totals["ctr"] = analysis.totals["ctr"] * 0.5   # halved -> worse
        worse.totals["cpc"] = analysis.totals["cpc"] * 2.0   # doubled -> worse
        worse.totals["roas"] = analysis.totals["roas"] * 2.0  # doubled -> better
        export.file_hash = "second-run-hash"
        second = store.save_run(conn, export, worse)

        deltas = {d["metric"]: d for d in
                  store.compare(worse.totals, store.previous_run(conn, export.shop_id, second))}

    assert deltas["ctr"]["verdict"] == "worse"
    assert deltas["cpc"]["verdict"] == "worse"
    assert deltas["roas"]["verdict"] == "better"
    assert deltas["ctr"]["unit"] == "pp"    # rates in percentage points
    assert deltas["roas"]["unit"] == "%"    # totals in percent
    assert first != second


def test_compare_with_no_history_is_empty(export_file, config):
    analysis = analyse(read_export(export_file), config)
    assert store.compare(analysis.totals, None) == []


# ---------------------------------------------------- glossary and report ---

def test_every_glossary_entry_is_complete():
    for key, entry in glossary.ALL.items():
        for field_name in ("title", "what", "how", "why", "good"):
            assert entry.get(field_name), f"{key} is missing {field_name}"
        # These are read by a beginner, so no jargon-only definitions.
        assert len(entry["what"]) > 20, f"{key} 'what' is too terse to help"


def test_payload_carries_every_glossary_entry(export_file, config):
    export = read_export(export_file)
    payload = _payload(export, analyse(export, config), config, None, None)
    # The client builds tooltips from this, so a missing key means a silent
    # "i" button that explains nothing.
    assert set(payload["glossary"]) == set(glossary.ALL)
    assert all(payload["glossary"].values())


def test_payload_is_json_serialisable(export_file, config):
    import json
    export = read_export(export_file)
    payload = _payload(export, analyse(export, config), config, None, None)
    # default=str would paper over a bad type, so serialise strictly here.
    json.dumps(payload)


def test_report_ships_the_app_shell(export_file, config):
    export = read_export(export_file)
    html = render(export, analyse(export, config), config)

    assert "window.__REPORT__" in html          # data island
    assert 'id="tip"' in html                   # tooltip element
    assert 'role="tooltip"' in html
    assert '"Escape"' in html                   # dismissable
    assert 'id="q"' in html                     # search box
    # every sidebar view has a matching section
    for view_id, _, _, _, _ in report_views():
        assert f'data-view="{view_id}"' in html
        assert f'id="view-{view_id}"' in html
    for label in ("Fix now", "Watch", "Strength", "Note"):
        assert label in html


def test_closing_script_tags_cannot_break_out_of_the_data_island(tmp_path, config):
    rows = [r[:] for r in ROWS]
    rows[0][3] = "</script><script>alert(1)</script>"     # hostile search term
    export = read_export(_write_export(tmp_path / "xss.csv", rows=rows))
    html = render(export, analyse(export, config), config)
    assert "</script><script>alert(1)" not in html
    assert "<\\/script>" in html or "<\\/" in html


def test_report_survives_missing_optional_columns(tmp_path, config):
    """A leaner export must still render rather than raise."""
    keep = [h for h in HEADER if h not in {"Product Impressions", "Product Clicks", "Product CTR"}]
    drop_at = [HEADER.index(h) for h in ("Product Impressions", "Product Clicks", "Product CTR")]
    rows = [[c for i, c in enumerate(r) if i not in drop_at] for r in ROWS]
    path = tmp_path / "lean.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(keep)
        writer.writerows(rows)
    export = read_export(path)
    html = render(export, analyse(export, config), config)
    assert "<h1>" in html


# -------------------------------------------------------------- pipeline ---

def test_pending_files_ignores_noise(tmp_path):
    (tmp_path / "good.csv").write_text("x", encoding="utf-8")
    (tmp_path / "sheet.xlsx").write_text("x", encoding="utf-8")
    (tmp_path / "~$sheet.xlsx").write_text("x", encoding="utf-8")  # Excel lock file
    (tmp_path / ".hidden.csv").write_text("x", encoding="utf-8")
    (tmp_path / "notes.exe").write_text("x", encoding="utf-8")
    (tmp_path / "sub").mkdir()
    names = {p.name for p in pending_files(tmp_path)}
    # A PDF is picked up on purpose, so the user is told why it cannot be
    # analysed rather than left wondering. Lock files and hidden files are not.
    assert names == {"good.csv", "sheet.xlsx"}
    (tmp_path / "brochure.pdf").write_text("x", encoding="utf-8")
    assert "brochure.pdf" in {p.name for p in pending_files(tmp_path)}


def test_config_round_trips(tmp_path, monkeypatch):
    import shopads.config as cfg
    path = tmp_path / "shopads.config.json"
    monkeypatch.setattr(cfg, "CONFIG_PATH", path)
    created = cfg.load_config()
    assert path.exists()
    assert created["thresholds"]["high_intent_ctr"] == DEFAULT_CONFIG["thresholds"]["high_intent_ctr"]

    path.write_text('{"currency": "SGD", "thresholds": {"high_intent_ctr": 0.2}}', encoding="utf-8")
    merged = cfg.load_config()
    assert merged["currency"] == "SGD"
    assert merged["thresholds"]["high_intent_ctr"] == 0.2
    # untouched threshold still filled from defaults
    assert "bootstrap_samples" in merged["thresholds"]
