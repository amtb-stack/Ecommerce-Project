"""Product-performance analysis over a combined shop-statistics workbook.

The framing that matters for products is a quadrant: traffic against
conversion. A product with heavy traffic and poor conversion is a listing
problem; one with strong conversion and no traffic is a merchandising
problem. They look identical on a sales-ranked list and need opposite work.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .shopstats import ShopStats


def _div(a: float, b: float) -> float:
    return float(a) / float(b) if b else 0.0


@dataclass
class ProductAnalysis:
    totals: dict[str, Any] = field(default_factory=dict)
    products: list[dict] = field(default_factory=list)
    channels: list[dict] = field(default_factory=list)
    subchannels: list[dict] = field(default_factory=list)
    daily: list[dict] = field(default_factory=list)
    findings: list[dict] = field(default_factory=list)
    quadrants: dict[str, list[str]] = field(default_factory=dict)
    ad_spend: float = 0.0


#: quadrant key -> (label, what it means, what to do)
QUADRANTS = {
    "scale": ("Scale", "Seen a lot and converts well.",
              "Your proven winners. Give them budget and keep them in stock."),
    "fix": ("Fix the listing", "Plenty of traffic, few buyers.",
            "People are looking and walking away. Images, price, reviews and specs."),
    "feed": ("Feed traffic", "Converts well but almost nobody sees it.",
             "The offer works. It is starved of impressions, so advertise it."),
    "review": ("Review", "Little traffic and little conversion.",
               "Decide deliberately: invest, reprice, or stop carrying it."),
}


def analyse_products(stats: ShopStats, config: dict) -> ProductAnalysis:
    result = ProductAnalysis()
    placed = stats.totals.get("placed", {})
    paid = stats.totals.get("paid", {})

    shop_impressions = sum(p["placed"]["impressions"] for p in stats.products)
    shop_clicks = sum(p["placed"]["clicks"] for p in stats.products)
    shop_sales = sum(p["placed"]["sales"] for p in stats.products)
    paid_sales = sum(p["paid"]["sales"] for p in stats.products)

    result.totals = {
        "days": stats.days,
        "products": len(stats.products),
        "selling_products": sum(1 for p in stats.products if p["placed"]["sales"] > 0),
        "sales": placed.get("sales", shop_sales),
        "paid_sales": paid.get("sales", paid_sales),
        "orders": placed.get("orders", 0.0),
        "paid_orders": paid.get("orders", 0.0),
        "visitors": placed.get("visitors", 0.0),
        "clicks": placed.get("clicks", shop_clicks),
        "cvr": placed.get("cvr", 0.0),
        "aov": _div(placed.get("sales", 0.0), placed.get("orders", 0.0)),
        "buyers": placed.get("buyers", 0.0),
        "new_buyers": placed.get("new_buyers", 0.0),
        "existing_buyers": placed.get("existing_buyers", 0.0),
        "potential_buyers": placed.get("potential_buyers", 0.0),
        "repeat_rate": placed.get("repeat_rate", 0.0),
        "cancelled_orders": placed.get("cancelled_orders", 0.0),
        "cancelled_sales": placed.get("cancelled_sales", 0.0),
        "refunded_sales": placed.get("refunded_sales", 0.0),
        "product_impressions": shop_impressions,
        "product_clicks": shop_clicks,
        "ctr": _div(shop_clicks, shop_impressions),
        "leak": 1.0 - _div(paid.get("sales", paid_sales), placed.get("sales", shop_sales)),
        "sales_per_day": _div(placed.get("sales", shop_sales), stats.days),
        "visitor_value": _div(placed.get("sales", shop_sales), placed.get("visitors", 0.0)),
    }

    # Medians split the quadrant, so the cut adapts to the shop instead of
    # relying on a benchmark that does not exist for this category.
    engaged = [p for p in stats.products if p["placed"]["impressions"] > 0]
    median_impr = _median([p["placed"]["impressions"] for p in engaged]) if engaged else 0.0
    converting = [p for p in engaged if p["placed"]["clicks"] > 0]
    median_cvr = _median([
        _div(p["placed"]["orders"], p["placed"]["clicks"]) for p in converting
    ]) if converting else 0.0

    for product in stats.products:
        pl, cf, pd_ = product["placed"], product["confirmed"], product["paid"]
        ctr = _div(pl["clicks"], pl["impressions"])
        cvr = _div(pl["orders"], pl["clicks"])
        leak = 1.0 - _div(pd_["sales"], pl["sales"]) if pl["sales"] else 0.0

        if pl["impressions"] <= 0 and pl["clicks"] <= 0:
            quadrant = "review"
        else:
            # "Busy" needs both a median-beating count and a real share of the
            # shop's traffic, so one dominant listing cannot drag the median
            # down and make a quiet product look well-seen.
            busy = (pl["impressions"] >= median_impr
                    and _div(pl["impressions"], shop_impressions) >= 0.05)
            converts = cvr >= median_cvr and cvr > 0
            quadrant = ("scale" if busy and converts else
                        "fix" if busy else
                        "feed" if converts else "review")

        row = {
            "id": product["id"],
            "name": product["name"],
            "status": product["status"],
            "channels": sorted(product["channels"]),
            "impressions": pl["impressions"],
            "unique_impressions": pl["unique_impressions"],
            "clicks": pl["clicks"],
            "unique_clicks": pl["unique_clicks"],
            "orders": pl["orders"],
            "units": pl["units"],
            "buyers": pl["buyers"],
            "sales": pl["sales"],
            "confirmed_sales": cf["sales"],
            "paid_sales": pd_["sales"],
            "paid_orders": pd_["orders"],
            "ctr": ctr,
            "cvr": cvr,
            "leak": leak,
            "aov": _div(pl["sales"], pl["orders"]),
            "share": _div(pl["sales"], shop_sales),
            "sales_per_impression": _div(pl["sales"], pl["impressions"]),
            "quadrant": quadrant,
            "quadrant_label": QUADRANTS[quadrant][0],
            "channel_split": [
                {"channel": name, **{k: v for k, v in metrics.items()}}
                for name, metrics in sorted(
                    product["channels"].items(), key=lambda kv: -kv[1]["sales"])
            ],
        }
        result.products.append(row)

    result.quadrants = {key: [p["id"] for p in result.products if p["quadrant"] == key]
                        for key in QUADRANTS}
    # Below a handful of products with traffic, a median split is arbitrary.
    result.totals["quadrant_reliable"] = len(engaged) >= 5
    result.totals["median_impressions"] = median_impr
    result.totals["median_cvr"] = median_cvr

    def _channel_row(source: dict, name: str, parent: str = "") -> dict:
        return {
            "channel": name,
            "parent": parent,
            "sales": source.get("sales", 0.0),
            "impressions": source.get("impressions", 0.0),
            "has_impressions": source.get("has_impressions", False),
            "impression_label": source.get("impression_label", "Impressions"),
            "clicks": source.get("clicks", 0.0),
            "has_clicks": source.get("has_clicks", False),
            "orders": source.get("orders", 0.0),
            "buyers": source.get("buyers", 0.0),
            "ctr": source.get("ctr", 0.0),
            "cvr": source.get("cvr", 0.0),
            "ad_spend": source.get("ad_spend", 0.0),
            "ad_roas": source.get("ad_roas", 0.0),
            "is_ads": source.get("is_ads", False),
            "share": _div(source.get("sales", 0.0), shop_sales),
        }

    result.channels = [
        _channel_row(c.get("placed", {}), c["channel"]) for c in stats.channels
    ]

    result.subchannels = [
        _channel_row(s, s["source"], s["channel"])
        for s in stats.subchannels if s["source"] and s["source"] != s["channel"]
    ]
    result.ad_spend = sum(s["ad_spend"] for s in result.subchannels)
    result.totals["ad_spend"] = result.ad_spend
    result.totals["ad_sales"] = sum(
        s["sales"] for s in result.subchannels if s["is_ads"])
    result.totals["ad_roas"] = _div(result.totals["ad_sales"], result.ad_spend)
    result.totals["tacos"] = _div(result.ad_spend, result.totals["sales"])

    result.daily = stats.daily
    result.findings = _findings(result, config)
    return result


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2.0


def _findings(result: ProductAnalysis, config: dict) -> list[dict]:
    cur = config.get("currency", "RM")
    t = result.totals
    out: list[dict] = []

    def add(level: str, title: str, detail: str) -> None:
        out.append({"level": level, "title": title, "detail": detail})

    top = result.products[0] if result.products else None
    if top and top["share"] >= 0.4:
        add("critical", "One product carries the shop",
            f"“{top['name']}” is {top['share']:.1%} of sales "
            f"({cur}{top['sales']:,.2f} of {cur}{t['sales']:,.2f}). If it goes out of stock, "
            "loses its rating, or is undercut, most of your revenue goes with it.")

    fix = [p for p in result.products if p["quadrant"] == "fix"]
    if fix:
        worst = max(fix, key=lambda p: p["impressions"])
        wasted = sum(p["impressions"] for p in fix)
        add("critical", f"{len(fix)} listing(s) get traffic but few buyers",
            f"“{worst['name']}” was shown {worst['impressions']:,.0f} times, drew "
            f"{worst['clicks']:,.0f} clicks and converted {worst['cvr']:.2%}. Across these "
            f"listings that is {wasted:,.0f} impressions of demand arriving at a page that "
            "does not close. This is listing work, not traffic work.")

    feed = [p for p in result.products if p["quadrant"] == "feed"]
    if feed:
        best = max(feed, key=lambda p: p["cvr"])
        add("good", f"{len(feed)} listing(s) convert well and are starved",
            f"“{best['name']}” converts at {best['cvr']:.2%} — well above the shop's "
            f"{_div(t['orders'], t['clicks']):.2%} — on only {best['impressions']:,.0f} "
            "impressions. The offer already works; it needs to be seen.")

    dead = [p for p in result.products if p["quadrant"] == "review" and p["impressions"] < 100]
    if dead:
        add("warning", f"{len(dead)} listing(s) are effectively invisible",
            "Fewer than 100 impressions each across the whole period: "
            + ", ".join(f"“{p['name'][:44]}”" for p in dead[:4])
            + ("…" if len(dead) > 4 else "")
            + ". They are neither earning nor being tested.")

    if t["leak"] > 0.01:
        add("warning", "Some orders never turn into payment",
            f"{cur}{t['sales'] - t['paid_sales']:,.2f} of {cur}{t['sales']:,.2f} placed "
            f"({t['leak']:.1%}) did not reach paid, across {t['cancelled_orders']:,.0f} "
            "cancelled order(s). Worth checking whether it is stock, delivery estimates or "
            "payment friction.")

    if result.daily and len(result.daily) >= 4:
        half = len(result.daily) // 2
        early, late = result.daily[:half], result.daily[half:]
        early_cvr = _div(sum(d["orders"] for d in early), sum(d["clicks"] for d in early))
        late_cvr = _div(sum(d["orders"] for d in late), sum(d["clicks"] for d in late))
        early_clicks = sum(d["clicks"] for d in early)
        late_clicks = sum(d["clicks"] for d in late)
        if late_cvr < early_cvr * 0.7 and late_clicks >= early_clicks:
            add("critical", "Traffic is rising while conversion falls",
                f"Clicks went from {early_clicks:,.0f} in the first half of the period to "
                f"{late_clicks:,.0f} in the second, but conversion fell from {early_cvr:.2%} to "
                f"{late_cvr:.2%}. More people are arriving and fewer are buying — usually newer "
                "traffic that is a worse match, or a listing that has slipped.")

    ads = [c for c in result.subchannels if c["is_ads"]]
    if ads:
        spend = sum(a["ad_spend"] for a in ads)
        per_day = _div(spend, t["days"])
        add("info", f"Advertising cost {cur}{spend:,.2f} in {t['days']:.0f} days",
            f"That is {cur}{per_day:,.2f} a day, returning {cur}{t['ad_sales']:,.2f} at a "
            f"blended {t['ad_roas']:.1f}x. Against the whole shop it is a TACOS of "
            f"{t['tacos']:.2%} — the share of all revenue, advertised or not, that went on ads.")

        dead_ads = [a for a in ads if a["ad_spend"] > 0 and a["sales"] <= 0]
        if dead_ads:
            wasted = sum(a["ad_spend"] for a in dead_ads)
            add("warning", f"{len(dead_ads)} ad placement(s) spent and returned nothing",
                ", ".join(f"“{a['channel']}” {cur}{a['ad_spend']:,.2f}" for a in dead_ads)
                + f". {cur}{wasted:,.2f} with no attributed sale. Pause them or find out why "
                "they are not converting before the next campaign.")

        earning = [a for a in ads if a["sales"] > 0]
        if len(earning) > 1:
            best = max(earning, key=lambda a: a["ad_roas"])
            worst = min(earning, key=lambda a: a["ad_roas"])
            if best["ad_roas"] >= worst["ad_roas"] * 1.5:
                add("good", f"“{best['channel']}” is your strongest ad type",
                    f"{best['ad_roas']:.1f}x against {worst['ad_roas']:.1f}x on "
                    f"“{worst['channel']}”, which takes {cur}{worst['ad_spend']:,.2f}. Shifting "
                    "budget toward the stronger placement is the cheapest change here — though "
                    "at this order count, confirm it holds for another period first.")

    if not t.get("quadrant_reliable", True):
        add("info", "Too few products to group confidently",
            "The four groups are split at this shop's own medians, and with this few "
            "products carrying traffic that split is arbitrary. Treat the grouping as a "
            "prompt rather than a verdict until the catalogue is wider.")

    if t["visitors"]:
        add("info", "What a visitor is worth",
            f"{t['visitors']:,.0f} visitors produced {cur}{t['sales']:,.2f}, so an average "
            f"visit is worth {cur}{t['visitor_value']:.2f}. Use it to sanity-check what you are "
            "willing to pay for a click.")

    if t["potential_buyers"]:
        add("info", "Interested but not buying",
            f"{t['potential_buyers']:,.0f} shoppers engaged without ordering, against "
            f"{t['buyers']:,.0f} who bought. That pool is the cheapest demand you have — it "
            "already knows you exist.")

    if t["new_buyers"] and t["buyers"]:
        share = _div(t["new_buyers"], t["buyers"])
        add("info" if share < 0.9 else "warning",
            f"{share:.0%} of buyers were new",
            f"{t['new_buyers']:,.0f} new against {t['existing_buyers']:,.0f} returning, with a "
            f"{t['repeat_rate']:.2%} repeat rate. For equipment this is expected — but it means "
            "every month's revenue has to be won again from scratch.")

    order = {"critical": 0, "warning": 1, "good": 2, "info": 3}
    return sorted(out, key=lambda f: order.get(f["level"], 9))
