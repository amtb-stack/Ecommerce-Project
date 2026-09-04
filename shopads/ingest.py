"""Read a Shopee ads export into a normalised DataFrame.

Shopee exports carry several metadata lines above the real header, and the
header itself drifts between report types, so the header row is located by
content rather than by a fixed offset.
"""

from __future__ import annotations

import csv
import hashlib
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import pandas as pd

from .config import (
    COLUMN_ALIASES,
    NUMERIC_COLUMNS,
    PERCENT_COLUMNS,
    REQUIRED_COLUMNS,
)

#: Header row must contain these (normalised) labels to be recognised.
_HEADER_MARKERS = {"keywords", "keyword"}
_HEADER_SUPPORT = {"impression", "impressions", "clicks", "expense", "cost"}

_DATE_PERIOD_RE = re.compile(
    r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*(?:-|–|to)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})"
)


class IngestError(Exception):
    """Raised when a file cannot be read as a Shopee ads export."""


@dataclass
class Export:
    """A normalised export plus everything we learned from its preamble."""

    frame: pd.DataFrame
    source_path: Path
    file_hash: str
    shop_name: str | None = None
    shop_id: str | None = None
    user_name: str | None = None
    ad_name: str | None = None
    bidding_method: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    metadata: dict = field(default_factory=dict)

    @property
    def days(self) -> int:
        """Length of the reporting period, inclusive. Falls back to 1."""
        if self.period_start and self.period_end:
            return max((self.period_end - self.period_start).days + 1, 1)
        return 1

    @property
    def period_label(self) -> str:
        if self.period_start and self.period_end:
            return f"{self.period_start:%d %b %Y} – {self.period_end:%d %b %Y}"
        return "period not stated"


def file_digest(path: Path) -> str:
    """SHA-256 of the file contents, used to skip re-processing."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _normalise(label: object) -> str:
    return re.sub(r"\s+", " ", str(label)).strip().lower()


def _looks_like_header(cells: list[object]) -> bool:
    labels = {_normalise(c) for c in cells if str(c).strip()}
    return bool(labels & _HEADER_MARKERS) and bool(labels & _HEADER_SUPPORT)


def _read_raw_rows(path: Path, limit: int = 60) -> list[list[str]]:
    """First `limit` rows as text, for header detection and preamble parsing."""
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xlsm", ".xltx"}:
        frame = pd.read_excel(path, header=None, nrows=limit, dtype=str)
        return frame.fillna("").astype(str).values.tolist()

    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            with path.open("r", encoding=encoding, newline="") as handle:
                sample = handle.read(64 * 1024)
                handle.seek(0)
                try:
                    dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
                except csv.Error:
                    dialect = csv.excel
                reader = csv.reader(handle, dialect)
                return [row for _, row in zip(range(limit), reader)]
        except UnicodeDecodeError:
            continue
    raise IngestError(f"Could not decode {path.name} as text in any known encoding.")


def _parse_preamble(rows: list[list[str]], header_index: int) -> dict:
    """Pull shop name, id, period and similar from the lines above the header."""
    found: dict = {}
    keys = {
        "shop name": "shop_name",
        "shop id": "shop_id",
        "user name": "user_name",
        "ad": "ad_name",
        "bidding method": "bidding_method",
        "report creation time": "created_at",
    }
    for row in rows[:header_index]:
        if not row:
            continue
        label = _normalise(row[0]).rstrip(":")
        value = next((str(c).strip() for c in row[1:] if str(c).strip()), "")
        if label in keys and value:
            found[keys[label]] = value
        joined = " ".join(str(c) for c in row)
        match = _DATE_PERIOD_RE.search(joined)
        if match and "period_start" not in found:
            start, end = (_parse_date(match.group(1)), _parse_date(match.group(2)))
            if start and end:
                found["period_start"], found["period_end"] = start, end
    return found


def _parse_date(text: str) -> date | None:
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _to_number(series: pd.Series) -> pd.Series:
    """Strip currency symbols, thousands separators and stray spaces."""
    cleaned = (
        series.astype(str)
        .str.replace(r"[^\d.\-eE]", "", regex=True)
        .replace({"": None, "-": None, ".": None})
    )
    return pd.to_numeric(cleaned, errors="coerce")


def _to_fraction(series: pd.Series) -> pd.Series:
    """`'3.80%'` -> `0.038`. Values already fractional are left alone."""
    text = series.astype(str).str.strip()
    has_sign = text.str.contains("%", regex=False)
    numeric = pd.to_numeric(
        text.str.replace("%", "", regex=False).str.replace(",", "", regex=False),
        errors="coerce",
    )
    return numeric.where(~has_sign, numeric / 100.0)


def read_export(path: Path) -> Export:
    """Read `path` into an :class:`Export`, or raise :class:`IngestError`."""
    path = Path(path)
    if not path.exists():
        raise IngestError(f"{path} does not exist.")

    raw = _read_raw_rows(path)
    header_index = next(
        (i for i, row in enumerate(raw) if _looks_like_header(row)), None
    )
    if header_index is None:
        raise IngestError(
            f"{path.name}: no header row found. Expected a row containing "
            "'Keywords' alongside 'Impression'/'Clicks'. Is this a Shop Ads "
            "keyword export?"
        )

    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xlsm", ".xltx"}:
        frame = pd.read_excel(path, header=header_index)
    else:
        frame = None
        for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
            try:
                frame = pd.read_csv(
                    path, skiprows=header_index, encoding=encoding,
                    dtype=str, keep_default_na=False, na_values=[""],
                )
                break
            except UnicodeDecodeError:
                continue
        if frame is None:
            raise IngestError(f"Could not decode {path.name}.")

    frame = frame.rename(columns=lambda c: COLUMN_ALIASES.get(_normalise(c), _normalise(c)))
    frame = frame.loc[:, ~frame.columns.duplicated()]

    missing = [c for c in REQUIRED_COLUMNS if c not in frame.columns]
    if missing:
        raise IngestError(
            f"{path.name}: missing required column(s): {', '.join(missing)}. "
            f"Found: {', '.join(sorted(frame.columns))}"
        )

    for column in NUMERIC_COLUMNS:
        if column in frame.columns:
            frame[column] = _to_number(frame[column]).fillna(0.0)
    for column in PERCENT_COLUMNS:
        if column in frame.columns:
            frame[column] = _to_fraction(frame[column]).fillna(0.0)
    for column in ("keyword", "search_query", "match_type"):
        if column in frame.columns:
            frame[column] = frame[column].astype(str).str.strip()

    # Drop trailing total/blank rows: a real row always names a search query.
    frame = frame[frame["search_query"].notna() & (frame["search_query"] != "")]
    frame = frame[~frame["search_query"].str.lower().isin({"total", "grand total", "nan"})]
    frame = frame.reset_index(drop=True)

    if frame.empty:
        raise IngestError(f"{path.name}: header found but no data rows below it.")

    meta = _parse_preamble(raw, header_index)
    return Export(
        frame=frame,
        source_path=path,
        file_hash=file_digest(path),
        shop_name=meta.get("shop_name"),
        shop_id=meta.get("shop_id"),
        user_name=meta.get("user_name"),
        ad_name=meta.get("ad_name"),
        bidding_method=meta.get("bidding_method"),
        period_start=meta.get("period_start"),
        period_end=meta.get("period_end"),
        metadata=meta,
    )
