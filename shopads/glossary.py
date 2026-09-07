"""Plain-language definitions for every metric the report shows.

Written for someone who has never run an ad account. Each entry answers four
questions in order: what it is, how it is worked out, why it matters, and what
a healthy value looks like.

The "good" field is deliberately conservative. Where a healthy value can be
derived (break-even ROAS is 1 / margin) it is stated as fact. Where it depends
on the shop it says so and points at the shop's own history instead. Invented
industry averages would read as authoritative and be worthless.
"""

from __future__ import annotations

#: metric key -> (title, what, how, why, good)
METRICS: dict[str, dict[str, str]] = {
    # ---------------------------------------------------------- traffic ---
    "impressions": {
        "title": "Impressions",
        "what": "How many times your ad was put in front of a shopper.",
        "how": "Counted by Shopee each time the ad is displayed in search results.",
        "why": "This is your reach. Low impressions mean shoppers never saw you, "
               "which no amount of clever bidding can fix.",
        "good": "Judge against your share of voice rather than the raw number — "
                "10,000 impressions is weak in a busy category and strong in a quiet one.",
    },
    "clicks": {
        "title": "Clicks",
        "what": "How many shoppers actually clicked your ad.",
        "how": "Counted once per click. You pay per click, not per impression.",
        "why": "Clicks are what you are buying. Everything you spend is spent here.",
        "good": "Rising clicks at a steady cost per click is healthy growth. "
                "Rising clicks with no orders means you are buying the wrong attention.",
    },
    "ctr": {
        "title": "CTR — click-through rate",
        "what": "The share of people who saw your ad and clicked it.",
        "how": "Clicks divided by impressions. 40 clicks from 1,000 impressions is 4%.",
        "why": "The clearest signal of whether your ad matches what the shopper wanted. "
               "A low CTR usually means the keyword is wrong, not the ad.",
        "good": "Compare segments against each other rather than an industry figure. "
                "If branded searches beat generic ones by 2x, that gap is the real finding.",
    },
    "cpc": {
        "title": "CPC — cost per click",
        "what": "What you actually paid, on average, for one click.",
        "how": "Total spend divided by total clicks.",
        "why": "Your bid sets a ceiling; CPC is what the auction really charged. "
               "It tells you how competitive your keywords are.",
        "good": "Cheap is not automatically good. Cheap clicks often come from "
                "low-intent placements — check which cost band actually produced orders.",
    },
    "sov": {
        "title": "Share of voice",
        "what": "The share of available ad slots you actually won.",
        "how": "Averaged across every row, weighted by impressions so busy "
               "keywords count more than quiet ones.",
        "why": "Tells you whether you are absent from the auction. Fixing relevance "
               "cannot help if you are only appearing 3% of the time.",
        "good": "Low share of voice is only worth fixing once your listing converts. "
                "Buying more of a leak makes a bigger leak.",
    },

    # -------------------------------------------------------- outcomes ----
    "conversions": {
        "title": "Conversions — orders",
        "what": "Orders Shopee credited to your ads.",
        "how": "Counted when a shopper who saw or clicked your ad then buys, "
               "within Shopee's attribution window.",
        "why": "The only outcome that pays for anything.",
        "good": "Below roughly 30 orders, no rate built on this number is reliable. "
                "That is a statistical limit, not a pessimistic opinion.",
    },
    "cvr": {
        "title": "Conversion rate",
        "what": "The share of clicks that turned into an order.",
        "how": "Orders divided by clicks.",
        "why": "Separates a traffic problem from a shop problem. Good CTR with poor "
               "conversion means the ad works and the listing does not.",
        "good": "High-ticket items convert far lower than cheap ones, because people "
                "take weeks to decide. Compare against your own past, not other shops.",
    },
    "gmv": {
        "title": "GMV — gross merchandise value",
        "what": "The total value of orders your ads were credited with.",
        "how": "Sum of order values. It is revenue before any cost is taken out.",
        "why": "The top line the ROAS figure is built on.",
        "good": "Check how concentrated it is. If one order is 40% of GMV, you have "
                "one lucky sale rather than a working system.",
    },
    "direct_gmv": {
        "title": "Direct GMV",
        "what": "Revenue from shoppers who bought the exact product they clicked.",
        "how": "Shopee reports it separately from total GMV.",
        "why": "The gap between total and direct GMV is halo — people who clicked one "
               "thing and bought another. Halo is real but easier to over-credit.",
        "good": "Treat total GMV as the generous reading and direct GMV as the "
                "conservative one. The truth is usually between them.",
    },

    # -------------------------------------------------------- efficiency --
    "roas": {
        "title": "ROAS — return on ad spend",
        "what": "How much revenue each unit of ad spend was credited with.",
        "how": "GMV divided by spend. 17x means RM17 of revenue per RM1 spent.",
        "why": "The headline number everyone quotes.",
        "good": "It is revenue, not profit, and it can be wildly misleading on few "
                "orders. Always read it beside its confidence range and your break-even ROAS.",
    },
    "acos": {
        "title": "ACOS — advertising cost of sale",
        "what": "What share of your ad-driven revenue was eaten by the ads.",
        "how": "Spend divided by GMV. It is simply ROAS turned upside down.",
        "why": "Easier to sanity-check than ROAS: 5% ACOS means ads cost five sen of "
               "every ringgit they brought in.",
        "good": "Only meaningful against your margin. A 30% ACOS is comfortable at a "
                "50% margin and fatal at 20%.",
    },
    "cpa": {
        "title": "Cost per order",
        "what": "What you paid in advertising to win one order.",
        "how": "Total spend divided by number of orders.",
        "why": "The most intuitive efficiency number — what does a customer cost.",
        "good": "Compare against the profit on one order, not against the order value. "
                "An order can be large and still not cover its acquisition cost.",
    },
    "aov": {
        "title": "AOV — average order value",
        "what": "The average size of an order your ads produced.",
        "how": "GMV divided by number of orders.",
        "why": "A high AOV is forgiving — it absorbs a lot of wasted clicks before the "
               "maths stops working.",
        "good": "Higher is generally better, but check it is not one huge order "
                "dragging the average up.",
    },

    # -------------------------------------------------------- profit ------
    "tacos": {
        "title": "TACOS — total advertising cost of sale",
        "what": "Ad spend measured against your whole shop's revenue, not just "
                "ad-attributed revenue.",
        "how": "Total ad spend divided by total shop revenue, paid and organic together.",
        "why": "Shows whether advertising is building a business or renting traffic. "
               "This is the metric mature sellers watch instead of ACOS.",
        "good": "Falling TACOS while ACOS stays flat is the good pattern: ads are "
                "growing organic demand. Flat or rising means you are on a treadmill.",
    },
    "poas": {
        "title": "POAS — profit on ad spend",
        "what": "How much actual profit, not revenue, each unit of ad spend produced.",
        "how": "GMV multiplied by your contribution margin, divided by spend.",
        "why": "ROAS can look excellent while the account loses money. A published "
               "case had 4x ROAS and lost $30,000 because the margin was too thin.",
        "good": "Above 1.0 makes money. Below 1.0 loses money no matter how good the "
                "ROAS looks.",
    },
    "breakeven_roas": {
        "title": "Break-even ROAS",
        "what": "The ROAS you must beat before a sale makes any money at all.",
        "how": "1 divided by your contribution margin. At 25% margin it is 4x.",
        "why": "Turns an abstract target into a hard line. Below it you are paying "
               "for the privilege of selling.",
        "good": "This is arithmetic, not opinion. Improve it by raising margin, not "
                "by hoping for better ROAS.",
    },
    "contribution_margin": {
        "title": "Contribution margin",
        "what": "What is left from a sale after every cost that grows with it.",
        "how": "Selling price minus product cost, shipping, payment fees and returns — "
               "expressed as a share of the price.",
        "why": "It sets your break-even ROAS. For heavy goods like ovens and mixers, "
               "freight makes this much lower than people expect.",
        "good": "You supply this figure; the tool cannot infer it. Getting it roughly "
                "right matters far more than getting it exactly right.",
    },

    # ------------------------------------------------------ the shopfront -
    "product_impressions": {
        "title": "Product impressions",
        "what": "How many times the product tiles inside your ad were shown.",
        "how": "Counted by Shopee for the item cards rendered within the shop ad.",
        "why": "Separates being seen from being chosen. Your ad can win attention and "
               "still lose the shopper at the tiles.",
        "good": "Read it only alongside product clicks — the ratio is what matters.",
    },
    "product_ctr": {
        "title": "Product CTR — tile click rate",
        "what": "The share of product tiles shown inside your ad that got clicked.",
        "how": "Product clicks divided by product impressions.",
        "why": "The clearest measure of whether your shopfront is ready for traffic. "
               "Large sellers refuse to advertise until this is healthy, because ads "
               "amplify whatever conversion rate a listing already has.",
        "good": "If this is very low, fix images, price legibility, reviews and stock "
                "before spending more. More budget against a poor tile buys more of "
                "the same result.",
    },

    # ------------------------------------------------------ diagnostics ---
    "on_theme_spend": {
        "title": "On-theme spend",
        "what": "The share of a keyword's budget that reached searches about that "
                "keyword's own product.",
        "how": "For each keyword, spend on queries in its product category divided by "
               "its total spend.",
        "why": "Exposes broad-match drift. A keyword can look busy and even show a high "
               "ROAS while sending almost none of its money to its own subject.",
        "good": "Below 20% the keyword is not targeting anything — it is a funnel "
                "wearing a product name. Above 50% it is doing its job.",
    },
    "efficiency_index": {
        "title": "Efficiency index",
        "what": "Whether something earned more than its share of the budget.",
        "how": "Share of GMV divided by share of spend.",
        "why": "Puts big and small keywords on the same footing.",
        "good": "Above 1.0 pays its way; below 1.0 is subsidised by everything else.",
    },
    "zero_conversion_share": {
        "title": "Zero-conversion spend",
        "what": "The share of your budget that produced no order at all.",
        "how": "Spend on rows with no conversion, divided by total spend.",
        "why": "Names the size of the problem in money rather than percentages of "
               "percentages.",
        "good": "A high figure is normal for expensive, slowly-considered products. "
                "It becomes a problem when it is not falling over time.",
    },
    "confidence_interval": {
        "title": "Confidence interval",
        "what": "The range the true value probably sits in, given how little data "
                "there is.",
        "how": "Calculated by resampling your own rows thousands of times and seeing "
                "how much the answer moves.",
        "why": "A single ROAS number pretends to a precision it does not have. The "
               "range is the honest version.",
        "good": "A narrow range means you can act on the number. A wide one means "
                "collect more data before making decisions.",
    },
    "ngram": {
        "title": "Phrase analysis (n-gram)",
        "what": "Spend added up by word or phrase instead of by whole search term.",
        "how": "Every one-, two- and three-word phrase inside your search terms, with "
               "the spend of every query containing it.",
        "why": "One word can drain budget across hundreds of searches while looking "
               "harmless in each one. This is the only view that catches that.",
        "good": "Look for phrases with real spend across many queries and no orders. "
                "Those are your best negative-keyword candidates.",
    },
    "match_type": {
        "title": "Match type",
        "what": "How loosely Shopee is allowed to match your keyword to a search.",
        "how": "Broad matches anything related. Phrase matches searches containing "
               "your words. Exact matches only that term.",
        "why": "Broad finds new demand but spends on irrelevant searches. Exact gives "
               "control but only reaches what you already thought of.",
        "good": "Use both: exact for terms you know convert, broad on a small capped "
                "budget purely to discover new terms — then promote the winners.",
    },
    "negative_keyword": {
        "title": "Negative keyword",
        "what": "A term you tell Shopee never to match your ads against.",
        "how": "Added in Seller Centre. Blocks the search before you pay for it.",
        "why": "Broad match without negatives is an open tab. This is the cheapest "
               "win available in any ad account.",
        "good": "Shopee's own guidance: block a term after about 1,000 impressions "
                "with no order. That much exposure has answered the question.",
    },
    "incrementality": {
        "title": "Incrementality",
        "what": "Whether an ad caused a sale, or was merely present when it happened.",
        "how": "Measured by switching ads off for a period and watching total orders.",
        "why": "When eBay ran this test on branded search, 99.5% of paid clicks came "
               "back through organic results — the ads were being credited with sales "
               "that would have happened anyway.",
        "good": "Any segment with a spectacular ROAS deserves this test, especially "
                "brand terms. Two weeks of pausing settles it.",
    },
    "spend_concentration": {
        "title": "Spend concentration",
        "what": "How much of your budget sits in how few search terms.",
        "how": "Search terms ranked by spend, then added up cumulatively.",
        "why": "Tells you whether the account can be managed by hand. A few hundred "
               "terms holding half the budget is a governable list.",
        "good": "Concentrated spend is easier to control. A long flat tail means many "
                "small leaks and needs rules rather than manual review.",
    },
}

#: Extra terms explained in the report that are not numeric metrics.
CONCEPTS: dict[str, dict[str, str]] = {
    "segment": {
        "title": "Intent segment",
        "what": "Search terms grouped by what the shopper seemed to want.",
        "how": "Read from the words used: your brand, a competitor's brand, Malay, "
               "Chinese, or generic English. Each term falls in one group only.",
        "why": "Different intents deserve different bids. Someone typing your shop "
               "name is far closer to buying than someone typing 'oven'.",
        "good": "Branded traffic usually looks strongest — check it is incremental "
                "before pouring money in.",
    },
    "theme": {
        "title": "Product theme",
        "what": "Search terms grouped by the product category they describe.",
        "how": "Pattern rules you can edit in the settings file.",
        "why": "Shows where demand actually is, whether or not you currently bid on it.",
        "good": "A theme with high click-through that you do not advertise is the "
                "cleanest opportunity in the report.",
    },
    "retail_readiness": {
        "title": "Retail readiness",
        "what": "Whether a listing is good enough to deserve advertising.",
        "how": "A quality check before spend: images, reviews, price clarity, stock.",
        "why": "Ads amplify an existing conversion rate; they cannot create one. "
               "Large marketplace sellers gate ad budget behind this check.",
        "good": "If tile click rate is poor, this is the work — not bidding.",
    },
}

ALL: dict[str, dict[str, str]] = {**METRICS, **CONCEPTS}


def tip(key: str) -> str | None:
    """Return the tooltip text for a metric key, or None if undefined."""
    entry = ALL.get(key)
    if not entry:
        return None
    return (
        f"<b>{entry['title']}</b>"
        f"<span class='tl'>What</span>{entry['what']}"
        f"<span class='tl'>How</span>{entry['how']}"
        f"<span class='tl'>Why it matters</span>{entry['why']}"
        f"<span class='tl'>What good looks like</span>{entry['good']}"
    )
