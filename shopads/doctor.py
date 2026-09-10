"""Self-check, written for someone who does not read code.

Every problem it reports comes with the exact thing to do next, because the
person running this is usually stuck and does not want to debug Python.
"""

from __future__ import annotations

import platform
import sqlite3
import sys
from pathlib import Path

from . import __version__
from .config import (
    ADS_REPORT, CONFIG_PATH, DATA_DIR, DB_PATH, DROP_DIR, OTHER_DIR, REPORT_DIR,
    SHOP_REPORT, ensure_dirs,
)

MIN_PYTHON = (3, 10)
TICK, CROSS, WARN = "[ OK ]", "[FAIL]", "[WARN]"


def _line(status: str, label: str, detail: str = "") -> None:
    print(f"  {status}  {label}" + (f" — {detail}" if detail else ""))


def run() -> int:
    """Print a health report. Returns 0 if everything needed is present."""
    print(f"\nShop Ads Analyser {__version__} — setup check")
    print("=" * 62)
    problems: list[str] = []

    try:
        from .shopstats import read_shop_stats  # noqa: F401
        _line(TICK, "Reads keyword exports", "Shop+ Ads keyword report")
        _line(TICK, "Reads statistics workbooks", "product performance report")
    except ImportError:
        _line(CROSS, "Report types", "this copy only reads keyword exports")
        problems.append(
            "Your copy of the tool is out of date and cannot read shop-statistics "
            "workbooks. Replace the ShopAds folder with the latest download."
        )

    # -- Python ---------------------------------------------------------
    version = sys.version_info
    label = f"Python {version.major}.{version.minor}.{version.micro}"
    if version[:2] >= MIN_PYTHON:
        _line(TICK, label, f"on {platform.system()} {platform.machine()}")
    else:
        _line(CROSS, label, f"too old — this tool needs {MIN_PYTHON[0]}.{MIN_PYTHON[1]} or newer")
        problems.append(
            "Install a newer Python from https://www.python.org/downloads/ "
            "and tick 'Add Python to PATH' during setup."
        )

    in_venv = sys.prefix != sys.base_prefix
    if in_venv:
        _line(TICK, "Virtual environment", "active (this is what Setup.bat creates)")
    else:
        _line(WARN, "Virtual environment", "not active — using system Python")

    # -- Dependencies ---------------------------------------------------
    for name, why in (
        ("pandas", "reads and aggregates the export"),
        ("numpy", "the maths behind the confidence interval"),
        ("openpyxl", "opens .xlsx files — CSV works without it"),
    ):
        try:
            module = __import__(name)
            _line(TICK, f"{name} {getattr(module, '__version__', '?')}", why)
        except ImportError:
            optional = name == "openpyxl"
            _line(WARN if optional else CROSS, f"{name} missing", why)
            if not optional:
                problems.append(
                    "Dependencies are not installed. Run Setup.bat (Windows) or "
                    "./run.sh (Mac/Linux) — it installs them for you."
                )
            else:
                problems.append(
                    "Excel (.xlsx) files will not open until openpyxl is installed. "
                    "Re-run Setup.bat, or save your export as .csv instead."
                )

    # -- Folders --------------------------------------------------------
    try:
        ensure_dirs()
    except OSError as exc:
        _line(CROSS, "Folders", f"cannot create them: {exc}")
        problems.append(
            "The tool cannot create its folders. Move the whole project out of "
            "a synced or protected location (OneDrive, Program Files) and retry."
        )
        return _finish(problems)

    for label, path in (
        ("Drop folder", DROP_DIR), ("Reports folder", REPORT_DIR), ("Data folder", DATA_DIR),
    ):
        _line(TICK, label, str(path))

    probe = DROP_DIR / ".write-test"
    try:
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        _line(TICK, "Write permission", "the tool can save files here")
    except OSError as exc:
        _line(CROSS, "Write permission", str(exc))
        problems.append(
            "Windows is blocking writes to this folder. Move the project to a "
            "plain folder such as C:\\ShopAds and try again."
        )

    # -- Database -------------------------------------------------------
    try:
        with sqlite3.connect(DB_PATH) as conn:
            def count(table: str) -> int:
                if not conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table,),
                ).fetchone():
                    return 0
                return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

            runs, products, days = count("runs"), count("product_runs"), count("daily_shop")
        parts = []
        if runs:
            parts.append(f"{runs} keyword export(s)")
        if products:
            parts.append(f"{products} statistics workbook(s)")
        _line(TICK, "History database",
              " · ".join(parts) if parts else "empty — nothing analysed yet")
        # The tracker only becomes trustworthy with a couple of weeks behind it,
        # so say where it stands rather than only that it exists.
        if days:
            _line(TICK if days >= 7 else WARN, "Daily tracker",
                  f"{days} day(s) recorded" + ("" if days >= 7 else
                                               " — comparisons firm up at about 14"))
    except sqlite3.Error as exc:
        _line(CROSS, "History database", str(exc))
        problems.append(
            f"The history database looks damaged. Delete {DB_PATH} and it will be "
            "rebuilt — you only lose the trend comparison, not your reports."
        )

    # -- Config and waiting files ---------------------------------------
    _line(TICK if CONFIG_PATH.exists() else WARN, "Settings file",
          str(CONFIG_PATH) if CONFIG_PATH.exists() else "not created yet — appears on first run")

    waiting = [
        p for p in DROP_DIR.iterdir()
        if p.is_file() and not p.name.startswith((".", "~$"))
    ] if DROP_DIR.exists() else []
    _line(TICK, "Files waiting", f"{len(waiting)} in the drop folder")

    # There are exactly two reports and they keep their names, so what matters
    # is whether each has anything in it yet -- not how many files are there.
    for label, path in (("Shop Performance Report", SHOP_REPORT),
                        ("Keywords Ads Report", ADS_REPORT)):
        if not path.exists():
            _line(WARN, label, "missing — it will be recreated on the next run")
        elif _is_waiting(path):
            _line(TICK, label, "waiting for its first export")
        else:
            _line(TICK, label, f"filled in — {path}")

    profiles = list(OTHER_DIR.glob("*.html")) if OTHER_DIR.exists() else []
    if profiles:
        _line(TICK, "Other data profiles", f"{len(profiles)} in {OTHER_DIR}")

    return _finish(problems)


def _is_waiting(path: Path) -> bool:
    """True while a report is still the page that says what to drop."""
    try:
        return "shopads-waiting" in path.read_text(encoding="utf-8")[:2000]
    except OSError:
        return False


def _finish(problems: list[str]) -> int:
    print("=" * 62)
    if not problems:
        print("\nEverything checks out. Drop a Shopee export into the drop folder.\n")
        return 0
    print(f"\n{len(problems)} thing(s) need attention:\n")
    for i, problem in enumerate(problems, 1):
        print(f"  {i}. {problem}\n")
    return 1
