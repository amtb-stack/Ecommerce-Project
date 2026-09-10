"""Writing a report over the copy someone may have open in a browser."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path


def write_atomic(destination: Path, content: str) -> Path:
    """Replace `destination` in one step.

    The reports keep fixed names and are meant to be reloaded in a tab that
    stays open, so a run can land while the browser is reading the file.
    Writing to a temporary file in the same folder and renaming it over the
    old one means a reload sees either the previous report or the new one,
    never half of each.

    Falls back to a plain write where the rename is refused -- some synced and
    antivirus-watched folders on Windows do -- because a report that is written
    is worth more than one that is not.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(
        dir=destination.parent, prefix=".~", suffix=".html"
    )
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as out:
            out.write(content)
        os.replace(temporary, destination)
    except OSError:
        Path(temporary).unlink(missing_ok=True)
        destination.write_text(content, encoding="utf-8")
    return destination
