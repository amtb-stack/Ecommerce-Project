#!/usr/bin/env bash
# macOS / Linux equivalent of the .bat launchers.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    .venv/bin/python -m pip install --upgrade pip --quiet
    .venv/bin/python -m pip install -r requirements.txt --quiet
fi

exec .venv/bin/python -m shopads "${@:-watch}"
