"""One export in, one report out -- the step both the CLI and watcher share."""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

from . import store
from .analyze import analyse
from .config import (
    ARCHIVE_DIR, DB_PATH, FAILED_DIR, REPORT_DIR, ensure_dirs, load_config,
)
from .ingest import IngestError, file_digest, read_export
from .report import write_report

SUPPORTED_SUFFIXES = {".csv", ".xlsx", ".xlsm", ".xltx", ".tsv", ".txt"}


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

        export = read_export(path)
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
                export, analysis, config, REPORT_DIR, trend, previous_label
            )
            store.set_report_path(conn, run_id, report)

        critical = sum(1 for f in analysis.findings if f["level"] == "critical")
        say(f"  ok    {path.name}")
        say(f"        {export.shop_name or 'unknown shop'} · {export.period_label} · "
            f"{analysis.totals['rows']:,} rows")
        say(f"        {len(analysis.findings)} findings ({critical} to fix now)"
            + (f" · {len(trend)} metrics trended" if trend else " · first run, no trend yet"))
        say(f"        report: {report}")
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
