"""Command line entry point: ``python -m shopads <command>``."""

from __future__ import annotations

import argparse
import sys
import webbrowser
from pathlib import Path

from . import __version__, store
from .doctor import run as run_doctor
from .config import DB_PATH, DROP_DIR, REPORT_DIR, CONFIG_PATH, ensure_dirs
from .pipeline import process_file
from .watch import run_once, watch


def _cmd_watch(args: argparse.Namespace) -> int:
    watch(Path(args.folder) if args.folder else None, interval=args.interval)
    return 0


def _cmd_once(args: argparse.Namespace) -> int:
    count = run_once(Path(args.folder) if args.folder else None)
    return 0 if count or not args.strict else 1


def _cmd_analyze(args: argparse.Namespace) -> int:
    failures = 0
    for name in args.files:
        outcome = process_file(Path(name), archive=False)
        failures += outcome.status == "failed"
        if outcome.status == "ok" and args.open and outcome.report:
            webbrowser.open(outcome.report.resolve().as_uri())
    return 1 if failures else 0


def _cmd_history(args: argparse.Namespace) -> int:
    ensure_dirs()
    with store.connect(DB_PATH) as conn:
        rows = store.history(conn, args.limit)
    if not rows:
        print("No runs stored yet. Drop an export into the drop/ folder first.")
        return 0
    header = f"{'#':>3}  {'period':<25} {'spend':>10} {'GMV':>11} {'ROAS':>7} {'CTR':>7} {'SOV':>7}  shop"
    print(header)
    print("-" * len(header))
    for row in rows:
        period = (f"{row['period_start'] or '?'} .. {row['period_end'] or '?'}")
        print(
            f"{row['id']:>3}  {period:<25} {row['spend'] or 0:>10,.2f} "
            f"{row['gmv'] or 0:>11,.2f} {row['roas'] or 0:>6.1f}x "
            f"{(row['ctr'] or 0) * 100:>6.2f}% {(row['sov'] or 0) * 100:>6.2f}%  "
            f"{row['shop_name'] or '—'}"
        )
    return 0


def _cmd_doctor(_: argparse.Namespace) -> int:
    return run_doctor()


def _cmd_where(_: argparse.Namespace) -> int:
    ensure_dirs()
    print(f"drop folder : {DROP_DIR}")
    print(f"reports     : {REPORT_DIR}")
    print(f"database    : {DB_PATH}")
    print(f"config      : {CONFIG_PATH}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="shopads",
        description="Offline analyser for Shopee Shop+ Ads keyword exports.",
    )
    parser.add_argument("--version", action="version", version=f"shopads {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    p_watch = sub.add_parser("watch", help="watch the drop folder until stopped")
    p_watch.add_argument("--folder", help="folder to watch (default: drop/)")
    p_watch.add_argument("--interval", type=float, default=3.0, help="poll seconds")
    p_watch.set_defaults(func=_cmd_watch)

    p_once = sub.add_parser("once", help="process whatever is waiting, then exit")
    p_once.add_argument("--folder", help="folder to scan (default: drop/)")
    p_once.add_argument("--strict", action="store_true",
                        help="exit non-zero if nothing was analysed")
    p_once.set_defaults(func=_cmd_once)

    p_analyze = sub.add_parser("analyze", help="analyse specific files in place")
    p_analyze.add_argument("files", nargs="+")
    p_analyze.add_argument("--open", action="store_true", help="open the report when done")
    p_analyze.set_defaults(func=_cmd_analyze)

    p_history = sub.add_parser("history", help="list stored runs")
    p_history.add_argument("--limit", type=int, default=25)
    p_history.set_defaults(func=_cmd_history)

    sub.add_parser(
        "doctor", help="check the setup and explain anything that is wrong"
    ).set_defaults(func=_cmd_doctor)
    sub.add_parser("where", help="print the folders this tool uses").set_defaults(func=_cmd_where)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
