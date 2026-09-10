"""One export in, one report out -- the step both the CLI and watcher share."""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

from . import store
from .analyze import analyse
from .config import (
    ADS_REPORT, ARCHIVE_DIR, DB_PATH, FAILED_DIR, OTHER_DIR, REPORT_DIR,
    SHOP_REPORT, ensure_dirs, load_config,
)
from .ingest import IngestError, file_digest, read_export
from .product_report import write_product_report
from .products import analyse_products
from .report import write_report
from .shopstats import looks_like_shop_stats, read_shop_stats
from . import timeline
from .tabular import describe_unreadable, read_tabular
from .tabular_report import write_tabular_report

from .tabular import TABULAR_SUFFIXES, UNREADABLE

#: Files the watcher will pick up. The unreadable types are included on
#: purpose: a PDF dropped in the folder should be told why it cannot be
#: analysed, rather than sit there being silently ignored.
SUPPORTED_SUFFIXES = TABULAR_SUFFIXES | set(UNREADABLE)


@dataclass
class Outcome:
    path: Path
    status: str          # "ok" | "skipped" | "failed"
    message: str
    report: Path | None = None
    run_id: int | None = None


def process_file(path: Path, *, archive: bool = True, quiet: bool = False) -> Outcome:
    """Analyse one export. Never raises -- failures come back as an Outcome."""
    ensure_dirs()
    config = load_config()
    path = Path(path)
    moved = tidy_old_reports()
    if moved and not quiet:
        print(f"  note  moved {moved} dated report(s) from an earlier version into "
              f"{(REPORT_DIR / 'previous')}", flush=True)

    def say(message: str) -> None:
        if not quiet:
            print(message, flush=True)

    try:
        digest = file_digest(path)
        with store.connect(DB_PATH) as conn:
            seen = store.already_seen(conn, digest)
            if seen:
                message = (f"already analysed on {seen['analysed_at']} "
                           f"-> {seen['report_path'] or 'report missing'}")
                say(f"  skip  {path.name}: {message}")
                if archive:
                    _move(path, ARCHIVE_DIR)
                return Outcome(path, "skipped", message)

        unreadable = describe_unreadable(path)
        if unreadable:
            raise IngestError(
                f"{path.name} is {unreadable}, which has no table in it to analyse. "
                "Drop a spreadsheet or data file: .csv, .xlsx, .tsv or .json."
            )

        if looks_like_shop_stats(path):
            return _process_shop_stats(path, config, archive, say)

        try:
            export = read_export(path)
        except IngestError:
            # Not a Shopee report the tool knows. Rather than refuse, profile
            # whatever table is in there and produce a graphical report of it.
            return _process_tabular(path, config, archive, say)
        analysis = analyse(export, config)

        with store.connect(DB_PATH) as conn:
            run_id = store.save_run(conn, export, analysis)
            previous = store.previous_run(conn, export.shop_id, run_id)
            trend = store.compare(analysis.totals, previous)
            previous_label = None
            if previous is not None:
                previous_label = (previous["period_end"] or previous["analysed_at"] or "")[:10]
                previous_label = f"the {previous_label} export" if previous_label else None

            report = write_report(
                export, analysis, config, ADS_REPORT, trend, previous_label
            )
            store.set_report_path(conn, run_id, report)

        critical = sum(1 for f in analysis.findings if f["level"] == "critical")
        say(f"  ok    {path.name}")
        say(f"        {export.shop_name or 'unknown shop'} · {export.period_label} · "
            f"{analysis.totals['rows']:,} rows")
        say(f"        {len(analysis.findings)} findings ({critical} to fix now)"
            + (f" · {len(trend)} metrics trended" if trend else " · first run, no trend yet"))
        _say_report(say, report)
        _open_report(report, config, say)
        if archive:
            _move(path, ARCHIVE_DIR)
        return Outcome(path, "ok", "analysed", report, run_id)

    except IngestError as exc:
        say(f"  FAIL  {path.name}: {exc}")
        if archive:
            _move(path, FAILED_DIR)
        return Outcome(path, "failed", str(exc))
    except Exception as exc:  # noqa: BLE001 - a bad file must not kill the watcher
        say(f"  FAIL  {path.name}: unexpected {type(exc).__name__}: {exc}")
        if archive:
            _move(path, FAILED_DIR)
        return Outcome(path, "failed", f"{type(exc).__name__}: {exc}")


def _process_shop_stats(path, config, archive, say) -> Outcome:
    """The shop-statistics workbook: product performance rather than keywords.

    Deliberately not skipped on a repeat digest the way keyword exports are.
    Re-exporting the same window is how a corrected figure reaches the tool,
    and the daily record is keyed by day and upserted, so a repeat overwrites
    those days rather than counting them twice.
    """
    stats = read_shop_stats(path)
    analysis = analyse_products(stats, config)

    with timeline.connect(DB_PATH) as conn:
        days = timeline.record(conn, stats, path.name)
        tracker = timeline.track(conn, config)

    with store.connect(DB_PATH) as conn:
        stats.shop = (config.get("shop_name") or store.known_shop_name(conn)
                      or stats.shop or "Your shop")
        report = write_product_report(stats, analysis, config, SHOP_REPORT, tracker)
        store.save_product_run(conn, stats, analysis, report)

    critical = sum(1 for f in analysis.findings if f["level"] == "critical")
    say(f"  ok    {path.name}  (product performance)")
    say(f"        {stats.period_label} · {analysis.totals['products']} products · "
        f"{len(stats.sheets)} tabs combined")
    say(f"        {len(analysis.findings)} findings ({critical} to fix now)")
    if tracker.get("available"):
        say(f"        tracker: {days} day(s) recorded, {tracker['days_recorded']} in history")
        for item in tracker["focus"][:2]:
            say(f"          → {item['title']}")
    _say_report(say, report)
    _open_report(report, config, say)
    if archive:
        _move(path, ARCHIVE_DIR)
    return Outcome(path, "ok", "analysed", report)


def _process_tabular(path, config, archive, say) -> Outcome:
    """Anything tabular the tool does not recognise: profile it instead."""
    dataset = read_tabular(path)
    report = write_tabular_report(dataset, OTHER_DIR)
    sheets = len(dataset.sheets)
    columns = sum(len(s.columns) for s in dataset.sheets)
    flagged = sum(1 for s in dataset.sheets for f in s.findings
                  if f["level"] in {"critical", "warning"})
    say(f"  ok    {path.name}  (data profile)")
    say(f"        not a Shopee report — profiled instead: {sheets} sheet(s), "
        f"{dataset.total_rows:,} rows, {columns} columns")
    say(f"        {flagged} thing(s) worth checking")
    _say_report(say, report)
    _open_report(report, config, say)
    if archive:
        _move(path, ARCHIVE_DIR)
    return Outcome(path, "ok", "profiled", report)


def _open_report(report: Path, config: dict, say) -> None:
    """Show the finished report without being asked.

    Failing to open a browser must never fail the run -- on a server or a
    locked-down desktop there may be none, and the report is already written.
    """
    if not config.get("auto_open_report", True):
        return
    try:
        import webbrowser

        webbrowser.open(report.resolve().as_uri())
    except Exception:
        say("        (could not open a browser — open the file above yourself)")


def _say_report(say, report: Path) -> None:
    """Name the file and its folder separately.

    A single long path is easy to skim past; people then look for the report
    in whatever folder they last used and conclude it was never written.
    """
    fixed = report in (SHOP_REPORT, ADS_REPORT)
    say(f"        report {'refreshed' if fixed else 'saved'}: {report.name}")
    say(f"        in folder:    {report.parent}")


def tidy_old_reports() -> int:
    """Move dated reports from before the two-report layout out of the way.

    Earlier versions wrote a new dated file per export, so upgrading leaves a
    folder that still looks like the thing it was meant to stop being. They are
    moved rather than deleted -- they are someone's history, and deleting a
    person's files to tidy up is not the tool's call to make.
    """
    if not REPORT_DIR.exists():
        return 0
    stale = [
        p for p in REPORT_DIR.iterdir()
        if p.is_file() and p.suffix.lower() == ".html"
        and p not in (SHOP_REPORT, ADS_REPORT)
    ]
    if not stale:
        return 0
    previous = REPORT_DIR / "previous"
    for path in stale:
        _move(path, previous)
    return len(stale)


def _move(path: Path, target_dir: Path) -> Path:
    """Move a processed file aside, never overwriting an existing name."""
    target_dir.mkdir(parents=True, exist_ok=True)
    destination = target_dir / path.name
    counter = 2
    while destination.exists():
        destination = target_dir / f"{path.stem}_{counter}{path.suffix}"
        counter += 1
    try:
        shutil.move(str(path), str(destination))
    except OSError:
        return path
    return destination


def pending_files(folder: Path) -> list[Path]:
    """Analysable files sitting directly in `folder`, oldest first."""
    if not folder.exists():
        return []
    files = [
        p for p in folder.iterdir()
        if p.is_file()
        and p.suffix.lower() in SUPPORTED_SUFFIXES
        and not p.name.startswith((".", "~$"))
    ]
    return sorted(files, key=lambda p: p.stat().st_mtime)
