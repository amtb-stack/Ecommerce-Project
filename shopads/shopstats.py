"""Reader for the Shopee shop-statistics workbook.

The workbook holds twelve sheets: four report families each repeated for the
three order states (placed, confirmed, paid). Every sheet is a stack of
blocks -- a one-cell label naming a traffic source, its own header row, then
its rows -- so parsing is block-aware rather than a single read_excel.

Combining them is the point. One product's row in isolation cannot show how
much of what was ordered was actually paid for, nor which channel produced
it; joining the states and sources onto one product row shows both.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

try:  # openpyxl is optional elsewhere in the package, required here
    import warnings

    with warnings.catch_warnings():
        # Shopee's workbooks carry no default style, which openpyxl warns about
        # on every single load. It is harmless and alarming, so it is silenced
        # here rather than printed at someone who did nothing wrong.
        warnings.simplefilter("ignore")
        import openpyxl
except ImportError:  # pragma: no cover - surfaced as a clear IngestError
    openpyxl = None

from .ingest import IngestError, file_digest

#: order state -> the sheet-name prefix Shopee uses for it
STATES = ("placed", "confirmed", "paid")
STATE_LABEL = {"placed": "Placed", "confirmed": "Confirmed", "paid": "Paid"}

_SHEET_HINTS = {
    "overview": ("placed order", "confirmed order", "paid order"),
    "traffic": ("traffic sources",),
    "source": ("source contribution",),
    "product": ("product contribution",),
}

_DATE_RANGE = re.compile(r"(\d{2}-\d{2}-\d{4})\s*-\s*(\d{2}-\d{2}-\d{4})")

#: Every channel block names its impression column differently, and the Shopee
#: Ads block has a different schema again -- no clicks, but ad spend and ROAS.
_VIEW_COLUMNS = (
    "Product Impressions", "Ads Impression", "Content Views", "Live Views", "Video Views",
)
_UNIQUE_VIEW_COLUMNS = (
    "Unique Product Impressions", "Content Viewers", "Live Viewers", "Video Viewers",
)


def _first(row: dict, names: tuple[str, ...]) -> tuple[float, bool]:
    """Value of the first column present, and whether any was present at all."""
    for name in names:
        if name in row:
            return _num(row[name]), True
    return 0.0, False


def _num(value: object) -> float:
    """Shopee writes numbers as display strings: '1,234.50', '4.52%', ''."""
    if value is None or value == "":
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).replace(",", "").replace("%", "").strip()
    if not text or text == "-":
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def _pct(value: object) -> float:
    """A percentage cell as a fraction. '4.52%' -> 0.0452."""
    return _num(value) / 100.0 if isinstance(value, str) and "%" in value else _num(value)


def _text(value: object) -> str:
    return "" if value is None else str(value).strip()


#: Shopee truncates long tab names ("Product Contribution (place..."), so the
#: full state word is often absent. Match on the shortest safe stem instead.
_STATE_STEMS = (("confi", "confirmed"), ("place", "placed"), ("paid", "paid"))


def _state_of(sheet_name: str) -> str | None:
    lowered = sheet_name.lower()
    for stem, state in _STATE_STEMS:
        if stem in lowered:
            return state
    return None


def _family_of(sheet_name: str) -> str | None:
    lowered = sheet_name.lower()
    for family, hints in _SHEET_HINTS.items():
        if any(lowered.startswith(h) for h in hints):
            return family
    return None


def _iter_blocks(rows: list[list[Any]], header_key: str) -> Iterable[tuple[str, list[dict]]]:
    """Yield (block label, rows) for each labelled block in a sheet.

    A block opens with a row holding a single filled cell, then a header row
    whose first cell is `header_key`, then data until the next label.
    """
    label: str | None = None
    header: list[str] | None = None
    bucket: list[dict] = []
    for raw in rows:
        cells = [_text(c) for c in raw]
        filled = [c for c in cells if c]
        if not filled:
            continue
        if len(filled) == 1:
            if label and bucket:
                yield label, bucket
            label, header, bucket = filled[0], None, []
            continue
        if cells[0] == header_key:
            header = cells
            continue
        if label and header and cells[0]:
            bucket.append(dict(zip(header, cells)))
    if label and bucket:
        yield label, bucket


@dataclass
class ShopStats:
    """One workbook, parsed and combined."""

    source_path: Path
    file_hash: str
    shop: str
    period_start: date | None
    period_end: date | None
    totals: dict[str, dict] = field(default_factory=dict)      # state -> shop totals
    daily: list[dict] = field(default_factory=list)            # one row per day
    channels: list[dict] = field(default_factory=list)         # traffic source totals
    subchannels: list[dict] = field(default_factory=list)      # named sources within a channel
    products: list[dict] = field(default_factory=list)         # the combined product table
    sheets: list[str] = field(default_factory=list)

    @property
    def days(self) -> int:
        if self.period_start and self.period_end:
            return max((self.period_end - self.period_start).days + 1, 1)
        return max(len(self.daily), 1)

    @property
    def period_label(self) -> str:
        if self.period_start and self.period_end:
            return f"{self.period_start:%d %b %Y} – {self.period_end:%d %b %Y}"
        return "period not stated"


def looks_like_shop_stats(path: Path) -> bool:
    """True when the workbook carries the shop-statistics sheet families.

    Raises rather than returning False when the file is a workbook we simply
    cannot open: answering "not a shop-stats file" there would send it down
    the keyword-export path and surface a raw ImportError from pandas.
    """
    if path.suffix.lower() not in {".xlsx", ".xlsm"}:
        return False
    if openpyxl is None:
        raise IngestError(
            f"{path.name} is an Excel file, but the component that reads Excel "
            "(openpyxl) is not installed, so it cannot be opened. Run Setup.bat "
            "again to install it — or, if that keeps failing, export this report "
            "from Shopee as CSV instead."
        )
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            book = openpyxl.load_workbook(path, read_only=True, data_only=True)
            try:
                names = [n.lower() for n in book.sheetnames]
            finally:
                book.close()
    except Exception:
        return False
    return any(n.startswith("product contribution") for n in names)


def read_shop_stats(path: Path) -> ShopStats:
    path = Path(path)
    if openpyxl is None:
        raise IngestError(
            "Reading .xlsx needs the openpyxl component. Run Setup.bat again, "
            "or export this report as CSV instead."
        )
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            book = openpyxl.load_workbook(path, read_only=True, data_only=True)
            sheets = {name: list(book[name].iter_rows(values_only=True))
                      for name in book.sheetnames}
            book.close()
    except Exception as exc:
        raise IngestError(f"{path.name}: could not open as a workbook ({exc}).") from exc

    stats = ShopStats(
        source_path=path, file_hash=file_digest(path), shop="",
        period_start=None, period_end=None, sheets=list(sheets),
    )

    stats.shop = _shop_from_filename(path)
    _read_overview(sheets, stats)
    _read_channels(sheets, stats)
    stats.products = _read_products(sheets)

    if not stats.products and not stats.totals:
        raise IngestError(
            f"{path.name}: this workbook has no shop-statistics sheets. Expected tabs "
            "named like 'Product Contribution (placed order)'."
        )
    return stats


def _shop_from_filename(path: Path) -> str:
    """Shopee names these files '<username>.shopeeshopstats.<dates>.xlsx'.

    The workbook itself carries no shop name, so the filename is the only
    place it appears.
    """
    stem = path.stem
    for marker in (".shopeeshopstats", ".shopstats", "shopeeshopstats"):
        if marker in stem:
            stem = stem.split(marker)[0]
            break
    stem = re.sub(r"^[0-9a-f]{6,}[-_]", "", stem).strip("._- ")
    if not stem:
        return "Your shop"
    words = re.split(r"[._\-\s]+", stem)
    return " ".join(w.capitalize() if w.islower() else w for w in words if w) or "Your shop"


def _read_overview(sheets: dict[str, list], stats: ShopStats) -> None:
    """Shop totals per order state, plus the daily series from 'Placed Order'."""
    for name, rows in sheets.items():
        if _family_of(name) != "overview":
            continue
        state = _state_of(name)
        if not state or len(rows) < 2:
            continue
        header = [_text(c) for c in rows[0]]
        summary = dict(zip(header, [_text(c) for c in rows[1]]))

        match = _DATE_RANGE.search(_text(rows[1][0]))
        if match and stats.period_start is None:
            stats.period_start = _parse_day(match.group(1))
            stats.period_end = _parse_day(match.group(2))

        stats.totals[state] = {
            "sales": _num(summary.get("Sales (MYR)")),
            "sales_after_rebate": _num(summary.get("Sales (Shopee Rebate applied)")),
            "orders": _num(summary.get("Orders")),
            "sales_per_order": _num(summary.get("Sales per Order")),
            "clicks": _num(summary.get("Product Clicks")),
            "visitors": _num(summary.get("Visitors")),
            "cvr": _pct(summary.get("Order Conversion Rate")),
            "cancelled_orders": _num(summary.get("Cancelled Orders")),
            "cancelled_sales": _num(summary.get("Cancelled Sales")),
            "refunded_orders": _num(summary.get("Returned/Refunded Orders")),
            "refunded_sales": _num(summary.get("Returned/Refunded Sales")),
            "buyers": _num(summary.get("# of buyers")),
            "new_buyers": _num(summary.get("# of new buyers")),
            "existing_buyers": _num(summary.get("# of existing buyers")),
            "potential_buyers": _num(summary.get("# of potential buyers")),
            "repeat_rate": _pct(summary.get("Repeat Purchase Rate")),
        }

        if state == "placed":
            day_header = None
            for raw in rows[2:]:
                cells = [_text(c) for c in raw]
                if cells and cells[0] == "Date":
                    day_header = cells
                    continue
                if not day_header or not cells or not cells[0]:
                    continue
                row = dict(zip(day_header, cells))
                day = _parse_day(row["Date"])
                if not day:
                    continue
                stats.daily.append({
                    "date": day.isoformat(),
                    "label": _day_label(day),
                    "sales": _num(row.get("Sales (MYR)")),
                    "orders": _num(row.get("Orders")),
                    "visitors": _num(row.get("Visitors")),
                    "clicks": _num(row.get("Product Clicks")),
                    "cvr": _pct(row.get("Order Conversion Rate")),
                    "new_buyers": _num(row.get("# of new buyers")),
                    "cancelled": _num(row.get("Cancelled Orders")),
                })
    stats.daily.sort(key=lambda d: d["date"])


def _day_label(day: date) -> str:
    """A short "1 Sep" label.

    Built by hand rather than with strftime("%-d %b"): the dash modifier that
    strips the leading zero is a glibc extension, and Windows raises
    ValueError: Invalid format string on it.
    """
    return f"{day.day} {day.strftime('%b')}"


def _parse_day(text: str) -> date | None:
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(text.strip(), fmt).date()
        except (ValueError, AttributeError):
            continue
    return None


def _read_channels(sheets: dict[str, list], stats: ShopStats) -> None:
    """Traffic-source totals, and the named sources sitting under each one."""
    totals: dict[str, dict] = {}
    subs: list[dict] = []
    for name, rows in sheets.items():
        if _family_of(name) != "traffic":
            continue
        state = _state_of(name)
        if not state:
            continue
        for label, block in _iter_blocks(rows, "Traffic Source"):
            for row in block:
                views, has_views = _first(row, _VIEW_COLUMNS)
                has_clicks = "Product Clicks" in row
                metrics = {
                    "sales": _num(row.get("Sales (MYR)")),
                    "impressions": views,
                    "has_impressions": has_views,
                    "impression_label": next(
                        (n for n in _VIEW_COLUMNS if n in row), "Impressions"),
                    "clicks": _num(row.get("Product Clicks")),
                    "has_clicks": has_clicks,
                    "orders": _num(row.get("Orders")),
                    "units": _num(row.get("Units")),
                    "buyers": _num(row.get("Buyers")),
                    "ctr": _pct(row.get("CTR")) if has_clicks else 0.0,
                    "cvr": _pct(row.get("Order Conversion Rate") or row.get("Conversion")),
                    "share": _pct(row.get("Sales Ratio")),
                    "ad_spend": _num(row.get("Ads Expense")),
                    "ad_roas": _num(row.get("Ads ROAS")),
                    "is_ads": "Ads Expense" in row,
                }
                if row.get("Traffic Source") == label:
                    entry = totals.setdefault(label, {"channel": label})
                    entry[state] = metrics
                    entry.setdefault("_named", set()).add(state)
                elif state == "placed":
                    subs.append({"channel": label, "source": row.get("Traffic Source", ""),
                                 **metrics})
                if row.get("Traffic Source") != label:
                    rolled = totals.setdefault(label, {"channel": label}) \
                                   .setdefault("_rolled", {}) \
                                   .setdefault(state, _blank_channel(metrics))
                    for key, value in metrics.items():
                        if isinstance(value, bool):
                            rolled[key] = bool(rolled[key]) or value
                        elif isinstance(value, (int, float)):
                            rolled[key] += value
                        elif value:
                            rolled[key] = value
    # Some blocks (Shopee Ads) never carry a row named after the block itself,
    # so their total has to come from summing the placements inside them.
    for entry in totals.values():
        rolled = entry.pop("_rolled", {})
        named = entry.pop("_named", set())
        for state, metrics in rolled.items():
            if state not in named:
                for key in ("ctr", "cvr"):
                    metrics[key] = 0.0
                metrics["ctr"] = (metrics["clicks"] / metrics["impressions"]
                                  if metrics.get("impressions") else 0.0)
                entry[state] = metrics

    stats.channels = sorted(
        totals.values(), key=lambda c: -(c.get("placed", {}).get("sales", 0.0))
    )
    stats.subchannels = sorted(subs, key=lambda s: -s["sales"])


def _read_products(sheets: dict[str, list]) -> list[dict]:
    """The combined product table: every state and every channel on one row."""
    products: dict[str, dict] = {}
    for name, rows in sheets.items():
        if _family_of(name) != "product":
            continue
        state = _state_of(name)
        if not state:
            continue
        for channel, block in _iter_blocks(rows, "Item ID"):
            for row in block:
                item_id = row.get("Item ID", "").strip()
                if not item_id:
                    continue
                product = products.setdefault(item_id, {
                    "id": item_id,
                    "name": row.get("Product", "").strip(),
                    "status": row.get("Current Item Status", "").strip(),
                    "channels": {},
                    **{s: _blank_metrics() for s in STATES},
                })
                metrics = {
                    "sales": _num(row.get("Sales (MYR)")),
                    "impressions": _num(row.get("Product Impressions")),
                    "clicks": _num(row.get("Product Clicks")),
                    "orders": _num(row.get("Orders")),
                    "units": _num(row.get("Units")),
                    "buyers": _num(row.get("Buyers")),
                    "unique_impressions": _num(row.get("Unique Product Impressions")),
                    "unique_clicks": _num(row.get("Unique Product Clicks")),
                }
                for key, value in metrics.items():
                    product[state][key] += value
                if state == "placed":
                    channel_row = product["channels"].setdefault(channel, _blank_metrics())
                    for key, value in metrics.items():
                        channel_row[key] += value

    return sorted(products.values(), key=lambda p: -p["placed"]["sales"])


def _blank_channel(template: dict) -> dict:
    """A zeroed copy of a metrics dict, keeping its non-numeric fields."""
    out: dict[str, Any] = {}
    for key, value in template.items():
        out[key] = 0.0 if isinstance(value, (int, float)) and not isinstance(value, bool) \
            else (False if isinstance(value, bool) else value)
    return out


def _blank_metrics() -> dict[str, float]:
    return {k: 0.0 for k in (
        "sales", "impressions", "clicks", "orders", "units", "buyers",
        "unique_impressions", "unique_clicks",
    )}
