"""The diagnostic engine.

Every rate is recomputed from summed numerators and denominators rather than
averaged across rows -- averaging 20,000 row-level percentages of wildly
unequal volume is the classic way to get a wrong CTR.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from .ingest import Export

CJK_RE = re.compile(r"[一-鿿぀-ヿ]")


def _safe_div(numerator: float, denominator: float) -> float:
    return float(numerator) / float(denominator) if denominator else 0.0


def _any_pattern(series: pd.Series, patterns: list[str]) -> pd.Series:
    """True where the text matches any pattern. Empty list -> all False."""
    if not patterns:
        return pd.Series(False, index=series.index)
    joined = "|".join(f"(?:{p})" for p in patterns)
    return series.str.contains(joined, regex=True, na=False)


@dataclass
class Analysis:
    """Everything the report and the database need from one export."""

    totals: dict[str, Any] = field(default_factory=dict)
    keywords: list[dict] = field(default_factory=list)
    queries: list[dict] = field(default_factory=list)
    segments: list[dict] = field(default_factory=list)
    themes: list[dict] = field(default_factory=list)
    cpc_bands: list[dict] = field(default_factory=list)
    tail_bands: list[dict] = field(default_factory=list)
    waste: list[dict] = field(default_factory=list)
    winners: list[dict] = field(default_factory=list)
    negatives: list[dict] = field(default_factory=list)
    candidates: list[dict] = field(default_factory=list)
    findings: list[dict] = field(default_factory=list)
    pareto: dict[str, Any] = field(default_factory=dict)
    confidence: dict[str, Any] = field(default_factory=dict)


def analyse(export: Export, config: dict) -> Analysis:
    frame = export.frame.copy()
    thresholds = config["thresholds"]
    query = frame["search_query"].astype(str).str.lower()
    frame["_q"] = query

    frame["_brand"] = _any_pattern(query, config["brand_patterns"])
    frame["_competitor"] = _any_pattern(
        query, [rf"\b{re.escape(name)}" for name in config["competitor_names"]]
    )
    frame["_malay"] = _any_pattern(query, config["malay_patterns"])
    frame["_cjk"] = query.str.contains(CJK_RE, regex=True, na=False)

    result = Analysis()
    result.totals = _totals(frame, export)
    result.keywords = _keywords(frame, config)
    query_table = _query_table(frame)
    result.queries = query_table.head(300).to_dict("records")
    result.segments = _segments(frame)
    result.themes = _themes(frame, config)
    result.cpc_bands = _cpc_bands(frame)
    result.tail_bands, result.pareto = _tail_and_pareto(query_table)
    result.waste = _waste(query_table)
    result.winners = _winners(frame)
    result.negatives = _negatives(query_table, config)
    result.candidates = _candidates(query_table, thresholds)
    result.confidence = _confidence(frame, thresholds)
    result.findings = _findings(result, config)
    return result


def _totals(frame: pd.DataFrame, export: Export) -> dict:
    get = lambda c: float(frame[c].sum()) if c in frame.columns else 0.0
    impressions, clicks = get("impression"), get("clicks")
    spend, gmv = get("expense"), get("gmv")
    conversions = get("conversions")
    product_impressions, product_clicks = get("product_impressions"), get("product_clicks")

    weights = frame["impression"].clip(lower=1)
    sov = (
        float(np.average(frame["sov"], weights=weights))
        if "sov" in frame.columns and weights.sum()
        else 0.0
    )
    zero_conv = frame[frame["conversions"] <= 0]

    return {
        "rows": int(len(frame)),
        "keywords": int(frame["keyword"].nunique()),
        "queries": int(frame["_q"].nunique()),
        "days": export.days,
        "impressions": impressions,
        "clicks": clicks,
        "conversions": conversions,
        "items_sold": get("items_sold"),
        "spend": spend,
        "gmv": gmv,
        "direct_gmv": get("direct_gmv"),
        "product_impressions": product_impressions,
        "product_clicks": product_clicks,
        "ctr": _safe_div(clicks, impressions),
        "cvr": _safe_div(conversions, clicks),
        "roas": _safe_div(gmv, spend),
        "acos": _safe_div(spend, gmv),
        "cpc": _safe_div(spend, clicks),
        "cpa": _safe_div(spend, conversions),
        "aov": _safe_div(gmv, conversions),
        "product_ctr": _safe_div(product_clicks, product_impressions),
        "sov": sov,
        "spend_per_day": _safe_div(spend, export.days),
        "zero_conversion_spend": float(zero_conv["expense"].sum()),
        "zero_conversion_share": _safe_div(float(zero_conv["expense"].sum()), spend),
        "unclicked_impressions": float(frame.loc[frame["clicks"] <= 0, "impression"].sum()),
        "unclicked_share": _safe_div(
            float(frame.loc[frame["clicks"] <= 0, "impression"].sum()), impressions
        ),
        "match_types": sorted(frame["match_type"].dropna().unique().tolist())
        if "match_type" in frame.columns
        else [],
    }


def _theme_of(text: str, themes: dict[str, str]) -> str:
    for name, pattern in themes.items():
        if re.search(pattern, text, flags=re.IGNORECASE):
            return name
    return "Other"


def _keywords(frame: pd.DataFrame, config: dict) -> list[dict]:
    """Per-keyword performance plus on-theme spend share.

    On-theme share is the share of a keyword's budget that reached queries in
    the keyword's own product category. A low value means the keyword is not
    targeting its subject -- it is a broad-match funnel wearing a product name.
    """
    themes = config["themes"]
    frame = frame.assign(_qtheme=frame["_q"].map(lambda q: _theme_of(q, themes)))

    rows = []
    total_spend = float(frame["expense"].sum())
    total_gmv = float(frame["gmv"].sum())
    for keyword, group in frame.groupby("keyword"):
        spend = float(group["expense"].sum())
        gmv = float(group["gmv"].sum())
        own_theme = _theme_of(str(keyword), themes)
        on_theme = (
            _safe_div(float(group.loc[group["_qtheme"] == own_theme, "expense"].sum()), spend)
            if own_theme != "Other"
            else None
        )
        rows.append({
            "keyword": str(keyword),
            "theme": own_theme,
            "queries": int(group["_q"].nunique()),
            "impressions": float(group["impression"].sum()),
            "clicks": float(group["clicks"].sum()),
            "spend": spend,
            "gmv": gmv,
            "conversions": float(group["conversions"].sum()),
            "ctr": _safe_div(float(group["clicks"].sum()), float(group["impression"].sum())),
            "cpc": _safe_div(spend, float(group["clicks"].sum())),
            "roas": _safe_div(gmv, spend),
            "spend_share": _safe_div(spend, total_spend),
            "gmv_share": _safe_div(gmv, total_gmv),
            "efficiency": _safe_div(_safe_div(gmv, total_gmv), _safe_div(spend, total_spend)),
            "on_theme_spend": on_theme,
        })
    return sorted(rows, key=lambda r: r["spend"], reverse=True)


def _query_table(frame: pd.DataFrame) -> pd.DataFrame:
    agg = frame.groupby("_q").agg(
        impressions=("impression", "sum"),
        clicks=("clicks", "sum"),
        spend=("expense", "sum"),
        gmv=("gmv", "sum"),
        conversions=("conversions", "sum"),
        product_impressions=("product_impressions", "sum")
        if "product_impressions" in frame.columns else ("impression", "size"),
        product_clicks=("product_clicks", "sum")
        if "product_clicks" in frame.columns else ("impression", "size"),
        keywords_matched=("keyword", "nunique"),
    )
    agg["ctr"] = agg.clicks / agg.impressions.replace(0, np.nan)
    agg["cpc"] = agg.spend / agg.clicks.replace(0, np.nan)
    agg["roas"] = agg.gmv / agg.spend.replace(0, np.nan)
    agg = agg.fillna(0.0).reset_index().rename(columns={"_q": "query"})
    return agg.sort_values("spend", ascending=False).reset_index(drop=True)


def _segments(frame: pd.DataFrame) -> list[dict]:
    """Mutually exclusive intent segments, brand first."""
    brand = frame["_brand"]
    competitor = frame["_competitor"] & ~brand
    malay = frame["_malay"] & ~brand & ~competitor
    cjk = frame["_cjk"] & ~brand & ~competitor & ~malay
    generic = ~(brand | competitor | malay | cjk)

    total_spend = float(frame["expense"].sum())
    rows = []
    for name, mask in [
        ("Branded", brand), ("Competitor brand", competitor),
        ("Malay-language", malay), ("Chinese-language", cjk),
        ("Generic", generic),
    ]:
        part = frame[mask]
        spend, gmv = float(part["expense"].sum()), float(part["gmv"].sum())
        impressions, clicks = float(part["impression"].sum()), float(part["clicks"].sum())
        rows.append({
            "segment": name,
            "queries": int(part["_q"].nunique()),
            "impressions": impressions,
            "clicks": clicks,
            "spend": spend,
            "gmv": gmv,
            "conversions": float(part["conversions"].sum()),
            "ctr": _safe_div(clicks, impressions),
            "cpc": _safe_div(spend, clicks),
            "roas": _safe_div(gmv, spend),
            "spend_share": _safe_div(spend, total_spend),
        })
    return rows


def _themes(frame: pd.DataFrame, config: dict) -> list[dict]:
    themes = config["themes"]
    frame = frame.assign(_qtheme=frame["_q"].map(lambda q: _theme_of(q, themes)))
    rows = []
    for name, group in frame.groupby("_qtheme"):
        impressions, clicks = float(group["impression"].sum()), float(group["clicks"].sum())
        spend, gmv = float(group["expense"].sum()), float(group["gmv"].sum())
        rows.append({
            "theme": name,
            "queries": int(group["_q"].nunique()),
            "impressions": impressions,
            "clicks": clicks,
            "spend": spend,
            "gmv": gmv,
            "conversions": float(group["conversions"].sum()),
            "product_clicks": float(group["product_clicks"].sum())
            if "product_clicks" in group.columns else 0.0,
            "ctr": _safe_div(clicks, impressions),
            "roas": _safe_div(gmv, spend),
        })
    return sorted(rows, key=lambda r: r["impressions"], reverse=True)


def _cpc_bands(frame: pd.DataFrame) -> list[dict]:
    """Does paying more buy better traffic? Bucket rows by realised CPC."""
    paying = frame[(frame["expense"] > 0) & (frame["clicks"] > 0)].copy()
    if paying.empty:
        return []
    paying["_cpc"] = paying["expense"] / paying["clicks"]
    edges = [0, 0.15, 0.25, 0.35, 0.45, float("inf")]
    labels = ["< 0.15", "0.15–0.25", "0.25–0.35", "0.35–0.45", "> 0.45"]
    paying["_band"] = pd.cut(paying["_cpc"], edges, labels=labels)
    total = float(paying["expense"].sum())
    rows = []
    for label, group in paying.groupby("_band", observed=True):
        spend, gmv = float(group["expense"].sum()), float(group["gmv"].sum())
        rows.append({
            "band": str(label),
            "spend": spend,
            "spend_share": _safe_div(spend, total),
            "ctr": _safe_div(float(group["clicks"].sum()), float(group["impression"].sum())),
            "conversions": float(group["conversions"].sum()),
            "gmv": gmv,
            "roas": _safe_div(gmv, spend),
        })
    return rows


def _tail_and_pareto(queries: pd.DataFrame) -> tuple[list[dict], dict]:
    paying = queries[queries["spend"] > 0].reset_index(drop=True)
    if paying.empty:
        return [], {"paying_queries": 0, "points": []}

    total = float(paying["spend"].sum())
    cumulative = (paying["spend"].cumsum() / total).to_numpy()

    milestones = {}
    for target in (0.25, 0.5, 0.8, 0.9):
        milestones[f"queries_for_{int(target * 100)}pct"] = int(
            np.searchsorted(cumulative, target) + 1
        )

    step = max(len(paying) // 90, 1)
    points = [
        {"x": round((i + 1) / len(paying), 4), "y": round(float(cumulative[i]), 4)}
        for i in range(0, len(paying), step)
    ]
    if points and points[-1]["x"] < 1.0:
        points.append({"x": 1.0, "y": 1.0})

    bands, start = [], 0
    for label, size in [("Top 50", 50), ("51–200", 150), ("201–600", 400), ("601+", None)]:
        part = paying.iloc[start:] if size is None else paying.iloc[start : start + size]
        if part.empty:
            continue
        bands.append({
            "band": label,
            "queries": int(len(part)),
            "spend": float(part["spend"].sum()),
            "spend_share": _safe_div(float(part["spend"].sum()), total),
            "clicks": float(part["clicks"].sum()),
            "ctr": _safe_div(float(part["clicks"].sum()), float(part["impressions"].sum())),
            "gmv": float(part["gmv"].sum()),
            "conversions": float(part["conversions"].sum()),
        })
        start += size or 0

    pareto = {
        "paying_queries": int(len(paying)),
        "converting_queries": int((paying["conversions"] > 0).sum()),
        "points": points,
        **milestones,
    }
    return bands, pareto


def _waste(queries: pd.DataFrame, limit: int = 25) -> list[dict]:
    zero = queries[(queries["conversions"] <= 0) & (queries["spend"] > 0)]
    return zero.head(limit).to_dict("records")


def _winners(frame: pd.DataFrame) -> list[dict]:
    won = frame[frame["conversions"] > 0].sort_values("gmv", ascending=False)
    return [
        {
            "keyword": str(row["keyword"]),
            "query": str(row["search_query"]),
            "impressions": float(row["impression"]),
            "clicks": float(row["clicks"]),
            "spend": float(row["expense"]),
            "gmv": float(row["gmv"]),
            "conversions": float(row["conversions"]),
        }
        for _, row in won.iterrows()
    ]


def _negatives(queries: pd.DataFrame, config: dict) -> list[dict]:
    patterns = config.get("off_catalogue_patterns", [])
    if not patterns:
        return []
    joined = "|".join(re.escape(p) for p in patterns)
    hits = queries[
        queries["query"].str.contains(joined, regex=True, na=False)
        & (queries["spend"] > 0)
        & (queries["conversions"] <= 0)
    ]
    return hits.sort_values("spend", ascending=False).head(40).to_dict("records")


def _candidates(queries: pd.DataFrame, thresholds: dict) -> list[dict]:
    """Queries worth promoting to their own exact-match keyword."""
    min_clicks = thresholds["min_clicks_for_keyword_candidate"]
    high_ctr = thresholds["high_intent_ctr"]
    spec = re.compile(r"\d+\s*(?:l\b|liter|litre|kg|deck|tray|inch)", re.IGNORECASE)

    pool = queries[queries["clicks"] >= min_clicks].copy()
    if pool.empty:
        return []
    pool["_spec"] = pool["query"].str.contains(spec, regex=True, na=False)
    pool["_score"] = (
        pool["clicks"]
        * (1 + pool["ctr"].clip(0, 1) * 4)
        * np.where(pool["conversions"] > 0, 1.6, 1.0)
        * np.where(pool["_spec"], 1.25, 1.0)
    )
    pool = pool.sort_values("_score", ascending=False).head(120)
    return [
        {
            "query": row["query"],
            "impressions": float(row["impressions"]),
            "clicks": float(row["clicks"]),
            "ctr": float(row["ctr"]),
            "spend": float(row["spend"]),
            "conversions": float(row["conversions"]),
            "product_clicks": float(row["product_clicks"]),
            # A query that already produced an order earns maximum control,
            # whatever its click-through rate.
            "match": "Exact" if (
                row["conversions"] > 0 or row["ctr"] >= high_ctr or row["_spec"]
            ) else "Phrase",
            "reason": (
                "Converted" if row["conversions"] > 0
                else "Specification intent" if row["_spec"]
                else "High engagement" if row["ctr"] >= high_ctr
                else "Steady demand"
            ),
        }
        for _, row in pool.iterrows()
    ]


def _confidence(frame: pd.DataFrame, thresholds: dict) -> dict:
    """How much of the headline can actually be trusted at this sample size."""
    clicks = float(frame["clicks"].sum())
    conversions = float(frame["conversions"].sum())
    spend = float(frame["expense"].sum())
    gmv_rows = frame["gmv"].to_numpy(dtype=float)
    gmv = float(gmv_rows.sum())

    cvr = _safe_div(conversions, clicks)
    half_width = 1.96 * np.sqrt(cvr * (1 - cvr) / clicks) if clicks else 0.0

    roas_low = roas_high = _safe_div(gmv, spend)
    if spend > 0 and len(gmv_rows):
        rng = np.random.default_rng(7)
        samples = int(thresholds.get("bootstrap_samples", 3000))
        draws = rng.integers(0, len(gmv_rows), size=(samples, len(gmv_rows)))
        totals = gmv_rows[draws].sum(axis=1) / spend
        roas_low, roas_high = (float(np.percentile(totals, 2.5)),
                               float(np.percentile(totals, 97.5)))

    top_gmv = float(gmv_rows.max()) if len(gmv_rows) else 0.0
    top3 = float(np.sort(gmv_rows)[-3:].sum()) if len(gmv_rows) >= 3 else gmv

    return {
        "clicks": clicks,
        "conversions": conversions,
        "cvr": cvr,
        "cvr_low": max(cvr - half_width, 0.0),
        "cvr_high": cvr + half_width,
        "roas": _safe_div(gmv, spend),
        "roas_low": roas_low,
        "roas_high": roas_high,
        "top_order_share": _safe_div(top_gmv, gmv),
        "top3_order_share": _safe_div(top3, gmv),
        "roas_excluding_top": _safe_div(gmv - top_gmv, spend),
        "reliable": conversions >= 30,
    }


def _findings(result: Analysis, config: dict) -> list[dict]:
    """Plain-language findings, each carrying the number that triggered it."""
    totals, confidence = result.totals, result.confidence
    thresholds = config["thresholds"]
    currency = config.get("currency", "RM")
    findings: list[dict] = []

    def add(level, title, detail):
        findings.append({"level": level, "title": title, "detail": detail})

    if not confidence["reliable"]:
        add("critical", "Too few orders to optimise on ROAS",
            f"{confidence['conversions']:.0f} conversions from {confidence['clicks']:,.0f} "
            f"clicks. Reported ROAS {confidence['roas']:.1f}x sits in a 95% interval of "
            f"{confidence['roas_low']:.1f}x–{confidence['roas_high']:.1f}x. Steer on CTR, "
            "share of voice and waste until at least 30 orders accumulate.")

    if confidence["top_order_share"] >= 0.25:
        add("critical", "Revenue is concentrated in one order",
            f"The largest single order is {confidence['top_order_share']:.1%} of all GMV; "
            f"the top three are {confidence['top3_order_share']:.1%}. Excluding it, ROAS is "
            f"{confidence['roas_excluding_top']:.1f}x rather than {confidence['roas']:.1f}x.")

    if totals["product_impressions"] and totals["product_ctr"] < thresholds["target_product_ctr"]:
        add("critical", "Product tiles inside the ad are not being clicked",
            f"{totals['product_impressions']:,.0f} tile impressions produced "
            f"{totals['product_clicks']:,.0f} clicks ({totals['product_ctr']:.3%}). The ad wins "
            "attention and the shopfront loses it -- a merchandising fix, not a bidding one.")

    if totals["sov"] and totals["sov"] < 0.10:
        add("warning", "Share of voice is very low",
            f"Impression-weighted SOV is {totals['sov']:.2%} at "
            f"{currency}{totals['spend_per_day']:.2f}/day. You are absent from most eligible "
            "auctions -- but fix relevance before raising budget, or you scale the leak.")

    match_types = {m.lower() for m in totals.get("match_types", [])}
    if match_types and match_types <= {"broad match", "broad"}:
        queries_per_keyword = _safe_div(totals["queries"], totals["keywords"])
        add("critical", "Every keyword is broad match",
            f"{totals['keywords']} keywords reached {totals['queries']:,} distinct queries "
            f"({queries_per_keyword:,.0f} per keyword). With no exact or phrase tier the "
            "matching engine, not you, is choosing the traffic.")

    if totals["zero_conversion_share"] >= 0.90:
        add("warning", "Nearly all spend produced no order",
            f"{currency}{totals['zero_conversion_spend']:,.2f} of "
            f"{currency}{totals['spend']:,.2f} ({totals['zero_conversion_share']:.1%}) bought no "
            "conversion. Expected in a high-ticket category at this budget, but it means "
            "leading indicators must carry the decisions.")

    cheap = next((b for b in result.cpc_bands if b["band"] == "< 0.15"), None)
    premium = next((b for b in result.cpc_bands if b["band"] == "> 0.45"), None)
    if cheap and premium and cheap["conversions"] == 0 and premium["conversions"] > 0:
        add("info", "Expensive clicks are the ones that buy",
            f"The >{currency}0.45 bucket holds {premium['spend_share']:.1%} of spend and "
            f"{premium['conversions']:.0f} orders; the <{currency}0.15 bucket holds "
            f"{cheap['spend_share']:.1%} and none. Bid up, not down.")

    best = max(result.segments, key=lambda s: s["ctr"], default=None)
    if best and best["ctr"] > totals["ctr"] * 1.4 and best["spend_share"] < 0.3:
        add("good", f"{best['segment']} queries are your strongest segment",
            f"CTR {best['ctr']:.2%} against an account average of {totals['ctr']:.2%}, on "
            f"{best['spend_share']:.1%} of spend and {best['conversions']:.0f} orders.")

    dead = [k for k in result.keywords if k["gmv"] == 0 and k["spend"] > 0]
    if dead:
        wasted = sum(k["spend"] for k in dead)
        add("warning", f"{len(dead)} keyword(s) spent with no revenue",
            f"{currency}{wasted:,.2f} ({_safe_div(wasted, totals['spend']):.1%} of spend) across "
            + ", ".join(f"“{k['keyword']}”" for k in dead[:6])
            + ("…" if len(dead) > 6 else "") + ".")

    drifting = [k for k in result.keywords
                if k["on_theme_spend"] is not None and k["on_theme_spend"] < 0.20 and k["spend"] > 0]
    if drifting:
        worst = min(drifting, key=lambda k: k["on_theme_spend"])
        add("critical", f"{len(drifting)} keyword(s) are spending off their own subject",
            f"Worst is “{worst['keyword']}” at {worst['on_theme_spend']:.1%} on-theme "
            f"spend ({currency}{worst['spend']:,.2f}). A keyword spending that little on its own "
            "category is a broad-match funnel wearing a product name.")

    if result.negatives:
        total = sum(n["spend"] for n in result.negatives)
        add("warning", f"{len(result.negatives)} off-catalogue queries took spend",
            f"{currency}{total:,.2f} on terms matching your off-catalogue list. Load these as "
            "phrase negatives.")

    order = {"critical": 0, "warning": 1, "good": 2, "info": 3}
    return sorted(findings, key=lambda f: order.get(f["level"], 9))
