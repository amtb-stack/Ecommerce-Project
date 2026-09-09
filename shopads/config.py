"""Paths, tunables and the user-editable classification rules.

The JSON config is written on first run and is meant to be edited by hand:
brand tokens, competitor names and product themes are shop-specific, and
getting them right is what makes the segment analysis trustworthy.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DROP_DIR = ROOT / "drop"
REPORT_DIR = ROOT / "reports"
DATA_DIR = ROOT / "data"
ARCHIVE_DIR = DROP_DIR / "processed"
FAILED_DIR = DROP_DIR / "failed"
DB_PATH = DATA_DIR / "shopads.db"
CONFIG_PATH = ROOT / "shopads.config.json"

#: Columns an export must provide before we will analyse it.
REQUIRED_COLUMNS = ["keyword", "search_query", "impression", "clicks", "expense"]

#: Source header -> internal name. Matching is case- and space-insensitive.
COLUMN_ALIASES = {
    "keywords": "keyword",
    "keyword": "keyword",
    "match type": "match_type",
    "search query": "search_query",
    "search term": "search_query",
    "sov": "sov",
    "impression": "impression",
    "impressions": "impression",
    "clicks": "clicks",
    "ctr": "ctr",
    "conversions": "conversions",
    "direct conversions": "direct_conversions",
    "conversion rate": "conversion_rate",
    "direct conversion rate": "direct_conversion_rate",
    "cost per conversion": "cost_per_conversion",
    "cost per direct conversion": "cost_per_direct_conversion",
    "items sold": "items_sold",
    "direct items sold": "direct_items_sold",
    "gmv": "gmv",
    "direct gmv": "direct_gmv",
    "expense": "expense",
    "cost": "expense",
    "roas": "roas",
    "direct roas": "direct_roas",
    "acos": "acos",
    "direct acos": "direct_acos",
    "product impressions": "product_impressions",
    "product clicks": "product_clicks",
    "product ctr": "product_ctr",
}

PERCENT_COLUMNS = [
    "sov", "ctr", "conversion_rate", "direct_conversion_rate",
    "acos", "direct_acos", "product_ctr",
]

NUMERIC_COLUMNS = [
    "impression", "clicks", "conversions", "direct_conversions",
    "items_sold", "direct_items_sold", "gmv", "direct_gmv", "expense",
    "roas", "direct_roas", "product_impressions", "product_clicks",
    "cost_per_conversion", "cost_per_direct_conversion",
]

DEFAULT_CONFIG = {
    "currency": "RM",
    # Shown as the report title. Left blank, the tool uses the name from an
    # ads export if it has seen one, and otherwise reads it off the filename.
    "shop_name": "",
    "brand_patterns": [r"\bthe ?bakers?\b", r"\bthebaker\b"],
    "competitor_names": [
        "innofood", "ssodd", "tjean", "dessini", "eagle", "verly", "berjaya",
        "golden bull", "khind", "butterfly", "hommy", "sokany", "philips",
        "panasonic", "cornell", "midea", "faber", "elba", "pensonic", "milux",
        "robam", "sharp", "bravado", "fresco", "hauswirt", "blendtec", "homelux",
    ],
    "malay_patterns": [
        r"\bmesin\b", r"\bmurah\b", r"\bharga\b", r"\bkecil\b", r"\bbesar\b",
        r"\broti\b", r"\bkuih\b", r"\bayam\b", r"\bdaging\b", r"\bdapur\b",
        r"\bperiuk\b", r"\bketuhar\b", r"\bpengadun\b", r"\bmeja\b",
        r"\belektrik\b", r"\btepung\b", r"\bpotong\b", r"\buli\b",
    ],
    "themes": {
        "Oven": r"\boven|ketuhar|deck|烤箱|烤爐",
        "Mixer": r"mixer|mixor|攪拌|adun|pengadun",
        "Waffle": r"waffle|wafel|wafer|kapit",
        "Deep fryer": r"fryer|penggoreng|goreng|炸",
        "Dough / bakery prep": r"dough|sheeter|proof|prover|fermenting|uli|tepung|roller|divider|moulder",
        "Meat / veg processing": r"grinder|slicer|mincer|cutter|dadu|kisar|potong|daging|vegetable|bone saw",
        "Blender": r"blender|juicer|jus",
        "Display / warmer / chiller": r"warmer|chiller|freezer|showcase|display|peti|sejuk",
        "Steam / rice / cooker": r"steam|kukus|cooker|periuk|rice",
    },
    "off_catalogue_patterns": [
        "tebu", "meja lipat", "santan", "kelapa", "air fryer", "noxxa", "amway",
        "fashion", "mesin jahit", "basikal", "aircond", "mesin rumput",
        "mesin cuci", "baju", "kasut",
    ],
    "business": {
        # Fill these in to unlock profit and TACOS analysis. Neither figure
        # exists in a Shopee ads export, so they have to come from you.
        # total_shop_revenue: ALL revenue for the same period, ads or not.
        # contribution_margin: what is left of a sale after product cost,
        #   shipping, payment fees and returns. 0.35 means 35%.
        "total_shop_revenue": None,
        "contribution_margin": None,
    },
    "thresholds": {
        "min_clicks_for_keyword_candidate": 2,
        "block_after_impressions": 1000,
        "ngram_min_spend": 3.0,
        "high_intent_ctr": 0.08,
        "cheap_cpc_ceiling": 0.15,
        "premium_cpc_floor": 0.45,
        "target_product_ctr": 0.004,
        "bootstrap_samples": 3000,
    },
}


def load_config() -> dict:
    """Return the config, creating it with defaults on first run.

    Unknown keys in the file are preserved; missing top-level keys are
    filled from the defaults so an old config keeps working after upgrades.
    """
    if not CONFIG_PATH.exists():
        CONFIG_PATH.write_text(json.dumps(DEFAULT_CONFIG, indent=2), encoding="utf-8")
        return json.loads(json.dumps(DEFAULT_CONFIG))

    user = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    merged = json.loads(json.dumps(DEFAULT_CONFIG))
    merged.update(user)
    # thresholds is the one nested dict worth merging key-by-key, so that
    # adding a new threshold in a later version does not break older configs.
    thresholds = dict(DEFAULT_CONFIG["thresholds"])
    thresholds.update(user.get("thresholds", {}))
    merged["thresholds"] = thresholds
    business = dict(DEFAULT_CONFIG["business"])
    business.update(user.get("business", {}))
    merged["business"] = business
    return merged


def ensure_dirs() -> None:
    for path in (DROP_DIR, REPORT_DIR, DATA_DIR, ARCHIVE_DIR, FAILED_DIR):
        path.mkdir(parents=True, exist_ok=True)
