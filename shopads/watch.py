"""Drop-folder watcher.

Polling rather than filesystem events: it needs no third-party package, and
polling plus a stable-size check is more reliable on Windows, where a file
appears in the folder before the copy into it has finished.
"""

from __future__ import annotations

import time
from pathlib import Path

from .config import DROP_DIR, REPORT_DIR, ensure_dirs
from .pipeline import pending_files, process_file


def _is_stable(path: Path, settle_seconds: float = 1.0) -> bool:
    """True once the file stops growing -- i.e. the copy into `drop/` finished."""
    try:
        first = path.stat().st_size
        time.sleep(settle_seconds)
        return path.exists() and path.stat().st_size == first
    except OSError:
        return False


def run_once(folder: Path | None = None, *, quiet: bool = False) -> int:
    """Process everything currently waiting. Returns the count analysed."""
    ensure_dirs()
    folder = folder or DROP_DIR
    files = pending_files(folder)
    if not files:
        if not quiet:
            print(f"Nothing waiting in {folder}")
        return 0
    if not quiet:
        print(f"Found {len(files)} file(s) in {folder}")
    analysed = 0
    for path in files:
        outcome = process_file(path, quiet=quiet)
        analysed += outcome.status == "ok"
    return analysed


def watch(folder: Path | None = None, interval: float = 3.0) -> None:
    """Poll `folder` until interrupted."""
    ensure_dirs()
    folder = folder or DROP_DIR
    from . import __version__
    print(f"Shop Ads watcher running (version {__version__}).")
    print(f"  drop exports here : {folder}")
    print(f"  reports refresh in: {REPORT_DIR}")
    print("                      Shop Performance Report.html")
    print("                      Keywords Ads Report.html")
    print("  press Ctrl+C to stop\n")

    run_once(folder)
    seen_unstable: set[Path] = set()
    try:
        while True:
            time.sleep(interval)
            for path in pending_files(folder):
                if not _is_stable(path):
                    if path not in seen_unstable:
                        print(f"  wait  {path.name} (still copying)")
                        seen_unstable.add(path)
                    continue
                seen_unstable.discard(path)
                print(f"\nNew file: {path.name}")
                process_file(path)
                print()
    except KeyboardInterrupt:
        print("\nWatcher stopped.")
