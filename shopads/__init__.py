"""Offline analyser for Shopee Shop+ Ads keyword exports.

Drop an export into ``drop/`` and a dated HTML report lands in ``reports/``.
Every run is stored in a local SQLite database so that metrics can be
trended across exports -- the one thing a single export cannot show.
"""

__version__ = "1.0.0"
