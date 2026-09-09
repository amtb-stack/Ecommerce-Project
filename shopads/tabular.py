"""Read and profile any tabular file, whatever its shape.

This is the fallback when a file is not one of the Shopee reports the tool
knows by name. It has no idea what the columns mean, so it does not pretend
to: it reports what is measurably true about the data -- types, ranges,
missing values, duplicates, distributions -- and leaves interpretation to
the reader.
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .ingest import IngestError, file_digest

TABULAR_SUFFIXES = {".csv", ".tsv", ".txt", ".xlsx", ".xlsm", ".xltx", ".json"}
#: Files we can identify but genuinely cannot read as a table.
UNREADABLE = {
    ".pdf": "a PDF", ".doc": "a Word document", ".docx": "a Word document",
    ".ppt": "a slide deck", ".pptx": "a slide deck", ".png": "an image",
    ".jpg": "an image", ".jpeg": "an image", ".gif": "an image",
    ".zip": "an archive", ".mp4": "a video", ".webp": "an image",
}

_MAX_ROWS = 400_000
_CATEGORY_LIMIT = 40


@dataclass
class Sheet:
    """One table: a CSV, or one sheet of a workbook."""

    name: str
    frame: pd.DataFrame
    header_row: int = 0
    columns: list[dict] = field(default_factory=list)
    findings: list[dict] = field(default_factory=list)
    duplicates: int = 0
    memory: float = 0.0


@dataclass
class Dataset:
    source_path: Path
    file_hash: str
    kind: str
    sheets: list[Sheet] = field(default_factory=list)
    read_at: datetime = field(default_factory=datetime.now)

    @property
    def total_rows(self) -> int:
        return sum(len(s.frame) for s in self.sheets)


def looks_tabular(path: Path) -> bool:
    return path.suffix.lower() in TABULAR_SUFFIXES


def describe_unreadable(path: Path) -> str | None:
    """A plain description of a file we cannot turn into a table."""
    return UNREADABLE.get(path.suffix.lower())


def _sniff_delimiter(path: Path) -> str:
    try:
        with path.open("r", encoding="utf-8-sig", errors="replace") as handle:
            sample = handle.read(32 * 1024)
        return csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except (csv.Error, OSError):
        return "\t" if path.suffix.lower() == ".tsv" else ","


def _widest_row(path: Path, delimiter: str, encoding: str) -> int:
    """Largest number of fields on any line.

    Exports open with a one-cell title, and pandas would otherwise infer a
    single column from that first line and skip every real row as malformed.
    """
    widest = 0
    try:
        with path.open("r", encoding=encoding, errors="replace", newline="") as handle:
            for index, row in enumerate(csv.reader(handle, delimiter=delimiter)):
                widest = max(widest, len(row))
                if index > 5000:
                    break
    except OSError:
        return 0
    return widest


def _find_header(frame: pd.DataFrame) -> int:
    """Index of the most likely header row in a frame read without one.

    Exports often carry a title block above the real table, so the first row
    is frequently not the header. The best candidate is the earliest row that
    is fully populated, all text, and mostly unique.
    """
    width = len(frame.columns)
    # A header names most of the table's columns. Metadata lines above it
    # ("User Name, thebaker.os") fill only a couple of cells and must not win.
    needed = max(2, int(width * 0.6))
    best_partial = 0
    for index in range(min(len(frame), 30)):
        row = frame.iloc[index]
        values = [str(v).strip() for v in row if str(v).strip() and str(v).lower() != "nan"]
        if len(set(values)) < len(values):
            continue
        numeric = sum(1 for v in values if re.fullmatch(r"-?[\d,.]+%?", v))
        if numeric > len(values) * 0.3:
            continue
        if len(values) >= needed:
            return index
        if len(values) > best_partial:
            best_partial = len(values)
    return 0


def _promote_header(frame: pd.DataFrame, index: int) -> pd.DataFrame:
    header = [str(v).strip() for v in frame.iloc[index]]
    body = frame.iloc[index + 1:].reset_index(drop=True)
    seen: dict[str, int] = {}
    names = []
    for i, name in enumerate(header):
        name = name if name and name != "nan" else f"column {i + 1}"
        if name in seen:
            seen[name] += 1
            name = f"{name} ({seen[name]})"
        else:
            seen[name] = 0
        names.append(name)
    body.columns = names
    return body.dropna(axis=1, how="all").dropna(axis=0, how="all")


def _coerce(series: pd.Series) -> tuple[pd.Series, str]:
    """Return the series in its most useful type, and a label for that type."""
    text = series.astype(str).str.strip()
    non_empty = text[(text != "") & (text.str.lower() != "nan")]
    if non_empty.empty:
        return series, "empty"

    # Percentages and currency-formatted numbers are still numbers.
    cleaned = non_empty.str.replace(r"[,\s]", "", regex=True)
    pct = cleaned.str.endswith("%")
    stripped = cleaned.str.rstrip("%").str.replace(r"^[^\d\-.]+", "", regex=True)
    numeric = pd.to_numeric(stripped, errors="coerce")
    if numeric.notna().mean() >= 0.9:
        full = pd.to_numeric(
            text.str.replace(r"[,\s]", "", regex=True).str.rstrip("%")
                .str.replace(r"^[^\d\-.]+", "", regex=True),
            errors="coerce",
        )
        if pct.mean() >= 0.9:
            return full / 100.0, "percentage"
        return full, "number"

    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d", "%d %b %Y", "%b %d, %Y"):
        parsed = pd.to_datetime(non_empty, format=fmt, errors="coerce")
        if parsed.notna().mean() >= 0.9:
            return pd.to_datetime(text, format=fmt, errors="coerce"), "date"

    unique = non_empty.nunique()
    if unique <= max(_CATEGORY_LIMIT, len(non_empty) * 0.05) and unique < len(non_empty):
        return text.replace({"nan": None, "": None}), "category"
    return text.replace({"nan": None, "": None}), "text"


def _profile_column(name: str, raw: pd.Series) -> dict:
    values, kind = _coerce(raw)
    total = len(values)
    missing = int(values.isna().sum()) if kind != "text" else int(
        values.isna().sum() + (values == "").sum())
    present = values.dropna()
    profile: dict[str, Any] = {
        "name": name,
        "kind": kind,
        "total": total,
        "missing": missing,
        "missing_share": missing / total if total else 0.0,
        "unique": int(present.nunique()) if not present.empty else 0,
        "chart": None,
        "stats": {},
        "examples": [],
    }
    if present.empty:
        return profile

    if kind in {"number", "percentage"}:
        numbers = pd.to_numeric(present, errors="coerce").dropna()
        if numbers.empty:
            return profile
        profile["stats"] = {
            "min": float(numbers.min()), "max": float(numbers.max()),
            "mean": float(numbers.mean()), "median": float(numbers.median()),
            "sum": float(numbers.sum()), "zeros": int((numbers == 0).sum()),
            "negative": int((numbers < 0).sum()),
            "p90": float(numbers.quantile(0.9)),
        }
        spread = numbers.max() - numbers.min()
        if spread > 0:
            counts, edges = np.histogram(numbers, bins=min(24, max(6, int(len(numbers) ** 0.5))))
            profile["chart"] = {
                "type": "histogram",
                "bins": [{"from": float(edges[i]), "to": float(edges[i + 1]),
                          "count": int(counts[i])} for i in range(len(counts))],
            }
        else:
            profile["chart"] = {"type": "constant", "value": float(numbers.iloc[0])}

    elif kind == "date":
        stamps = pd.to_datetime(present, errors="coerce").dropna()
        if stamps.empty:
            return profile
        profile["stats"] = {
            "first": stamps.min().isoformat()[:10],
            "last": stamps.max().isoformat()[:10],
            "span_days": int((stamps.max() - stamps.min()).days),
        }
        per_day = stamps.dt.date.value_counts().sort_index()
        profile["chart"] = {
            "type": "timeline",
            "points": [{"label": str(d), "count": int(c)} for d, c in per_day.items()][:120],
        }

    else:
        counts = present.astype(str).value_counts()
        profile["stats"] = {
            "top": str(counts.index[0]),
            "top_count": int(counts.iloc[0]),
            "top_share": float(counts.iloc[0] / len(present)),
        }
        profile["examples"] = [str(v) for v in counts.index[:5]]
        profile["chart"] = {
            "type": "categories",
            "items": [{"label": str(label)[:60], "count": int(count)}
                      for label, count in counts.head(12).items()],
            "other": int(counts.iloc[12:].sum()) if len(counts) > 12 else 0,
        }
    return profile


def _sheet_findings(sheet: Sheet) -> list[dict]:
    frame, out = sheet.frame, []

    def add(level: str, title: str, detail: str) -> None:
        out.append({"level": level, "title": title, "detail": detail})

    if sheet.duplicates:
        add("warning", f"{sheet.duplicates:,} duplicate row(s)",
            f"{sheet.duplicates / len(frame):.1%} of rows are exact copies of another row. "
            "Totals built from this table will double-count them.")

    empty_cols = [c["name"] for c in sheet.columns if c["kind"] == "empty"]
    if empty_cols:
        add("info", f"{len(empty_cols)} empty column(s)",
            "No values at all in: " + ", ".join(f"“{c}”" for c in empty_cols[:6])
            + ("…" if len(empty_cols) > 6 else "") + ".")

    gappy = [c for c in sheet.columns if 0.2 <= c["missing_share"] < 1.0]
    if gappy:
        worst = max(gappy, key=lambda c: c["missing_share"])
        add("warning", f"{len(gappy)} column(s) have significant gaps",
            f"Worst is “{worst['name']}” at {worst['missing_share']:.0%} missing. Averages over "
            "a column like that describe only the rows that have a value.")

    # "Never changes" must mean present-and-identical, not present-in-a-few-rows.
    constant = [c for c in sheet.columns
                if c["unique"] == 1 and c["kind"] != "empty" and c["total"] > 1
                and c["missing_share"] < 0.05]
    if constant:
        add("info", f"{len(constant)} column(s) never change",
            "The same value in every row: " + ", ".join(f"“{c['name']}”" for c in constant[:6])
            + ("…" if len(constant) > 6 else "") + ". Useful as a label, not as a variable.")

    flags = [c for c in sheet.columns
             if c["unique"] == 1 and c["kind"] != "empty" and 0.05 <= c["missing_share"] < 1.0]
    if flags:
        add("info", f"{len(flags)} column(s) are a flag rather than a value",
            ", ".join(f"“{c['name']}” ({1 - c['missing_share']:.0%} filled)" for c in flags[:5])
            + ". One value where present and blank elsewhere, so the blank carries the meaning.")

    ids = [c for c in sheet.columns
           if c["kind"] in {"text", "category"} and c["total"] and c["unique"] == c["total"] - c["missing"]]
    if ids:
        add("info", f"{len(ids)} column(s) look like identifiers",
            "Every value different: " + ", ".join(f"“{c['name']}”" for c in ids[:4])
            + ". Likely an ID or a name rather than something to group by.")

    numeric = [c for c in sheet.columns if c["kind"] in {"number", "percentage"} and c["stats"]]
    skewed = [c for c in numeric
              if c["stats"]["median"] > 0 and c["stats"]["max"] > c["stats"]["median"] * 20]
    if skewed:
        worst = max(skewed, key=lambda c: c["stats"]["max"] / max(c["stats"]["median"], 1e-9))
        add("warning", f"{len(skewed)} column(s) are dominated by a few large values",
            f"In “{worst['name']}” the largest value is "
            f"{worst['stats']['max'] / max(worst['stats']['median'], 1e-9):,.0f}× the median. "
            "An average across it will describe almost none of the rows.")

    if not out:
        add("good", "Nothing structurally wrong",
            "No duplicate rows, no significant gaps, no constant or empty columns.")
    order = {"critical": 0, "warning": 1, "good": 2, "info": 3}
    return sorted(out, key=lambda f: order.get(f["level"], 9))


def _correlations(sheet: Sheet) -> list[dict]:
    """Strong pairwise relationships between numeric columns, if any."""
    names = [c["name"] for c in sheet.columns
             if c["kind"] in {"number", "percentage"} and c["unique"] > 2]
    if len(names) < 2:
        return []
    numeric = sheet.frame[names].apply(pd.to_numeric, errors="coerce")
    if len(numeric) > 20_000:
        numeric = numeric.sample(20_000, random_state=7)
    matrix = numeric.corr(numeric_only=True)
    pairs = []
    for i, a in enumerate(matrix.columns):
        for b in matrix.columns[i + 1:]:
            value = matrix.loc[a, b]
            if pd.notna(value) and abs(value) >= 0.5:
                pairs.append({"a": a, "b": b, "r": round(float(value), 3)})
    return sorted(pairs, key=lambda p: -abs(p["r"]))[:12]


def read_tabular(path: Path) -> Dataset:
    """Read `path` into one or more profiled tables."""
    path = Path(path)
    unreadable = describe_unreadable(path)
    if unreadable:
        raise IngestError(
            f"{path.name} is {unreadable}, which has no table in it to analyse. "
            "This tool reads spreadsheets and data files: .csv, .xlsx, .tsv, .json."
        )
    if not looks_tabular(path):
        raise IngestError(
            f"{path.name}: unsupported file type “{path.suffix or 'none'}”. "
            "Drop a .csv, .xlsx, .tsv or .json file instead."
        )

    suffix = path.suffix.lower()
    frames: list[tuple[str, pd.DataFrame]] = []

    if suffix == ".json":
        try:
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise IngestError(f"{path.name}: not valid JSON ({exc}).") from exc
        frames.append((path.stem, pd.json_normalize(payload)))
    elif suffix in {".xlsx", ".xlsm", ".xltx"}:
        try:
            book = pd.read_excel(path, sheet_name=None, header=None, nrows=_MAX_ROWS)
        except ImportError as exc:
            raise IngestError(
                f"{path.name} is an Excel file, but the component that reads Excel "
                "(openpyxl) is not installed. Run Setup.bat again."
            ) from exc
        except Exception as exc:
            raise IngestError(f"{path.name}: could not open as a workbook ({exc}).") from exc
        frames = [(name, frame) for name, frame in book.items() if not frame.empty]
    else:
        delimiter = _sniff_delimiter(path)
        last: Exception | None = None
        for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
            try:
                width = _widest_row(path, delimiter, encoding)
                frames = [(path.stem, pd.read_csv(
                    path, header=None, sep=delimiter, dtype=str, encoding=encoding,
                    keep_default_na=False, na_values=[""], nrows=_MAX_ROWS,
                    names=range(width) if width else None,
                    on_bad_lines="skip", engine="python"))]
                break
            except pd.errors.EmptyDataError as exc:
                raise IngestError(
                    f"{path.name} is empty — there are no rows in it to analyse."
                ) from exc
            except (UnicodeDecodeError, pd.errors.ParserError) as exc:
                last = exc
        if not frames:
            raise IngestError(f"{path.name}: could not read as a table ({last}).")

    dataset = Dataset(source_path=path, file_hash=file_digest(path),
                      kind=suffix.lstrip(".") or "file")
    for name, raw in frames:
        if raw.empty:
            continue
        header_row = 0 if suffix == ".json" else _find_header(raw)
        frame = raw if suffix == ".json" else _promote_header(raw, header_row)
        if frame.empty or not len(frame.columns):
            continue
        sheet = Sheet(name=str(name), frame=frame, header_row=header_row)
        sheet.duplicates = int(frame.duplicated().sum())
        sheet.memory = float(frame.memory_usage(deep=True).sum()) / 1024 / 1024
        sheet.columns = [_profile_column(str(c), frame[c]) for c in frame.columns]
        sheet.findings = _sheet_findings(sheet)
        dataset.sheets.append(sheet)

    if not dataset.sheets:
        raise IngestError(
            f"{path.name}: opened, but there is no table inside it — every sheet was empty."
        )
    return dataset


def correlations_for(sheet: Sheet) -> list[dict]:
    return _correlations(sheet)


def preview_rows(sheet: Sheet, limit: int = 200) -> list[dict]:
    """Rows for the on-screen table, as JSON-safe values."""
    head = sheet.frame.head(limit)
    out = []
    for _, row in head.iterrows():
        record = {}
        for column, value in row.items():
            if pd.isna(value):
                record[str(column)] = None
            elif isinstance(value, (np.integer, np.floating)):
                record[str(column)] = float(value)
            elif isinstance(value, (datetime, date, pd.Timestamp)):
                record[str(column)] = str(value)[:19]
            else:
                record[str(column)] = str(value)
        out.append(record)
    return out
