from dataclasses import dataclass


@dataclass
class RiskReport:
    token_address: str
    chain: str
    token_name: str
    token_symbol: str
    risk_score: int
    risk_level: str
    price_usd: float
    market_cap: float
    holders: int
    tvl: float
    volume_24h: float
    price_change_24h: float
    top_holder_pct: float
    is_honeypot: bool
    lock_percent: float
    liquidity_usd: float
    verdict: str
    reasons: list


def _float(val, default=0.0):
    try:
        return float(val or default)
    except (TypeError, ValueError):
        return default


def _int(val, default=0):
    try:
        return int(val or default)
    except (TypeError, ValueError):
        return default


STABLECOINS = {
    '0x55d398326f99059ff775485246999027b3197955',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
}

def analyze_risk(token_data: dict, contract_data: dict, holders_data) -> RiskReport:
    reasons = []

    token_info = {}
    pairs = []
    if isinstance(token_data, dict):
        inner = token_data.get("data", {})
        if isinstance(inner, dict):
            token_info = inner.get("token", {})
            pairs = inner.get("pairs", [])
        elif isinstance(inner, list) and inner:
            token_info = inner[0]

    cdata = {}
    if isinstance(contract_data, dict):
        inner = contract_data.get("data", {})
        if isinstance(inner, dict) and inner:
            cdata = inner

    holders_list = []
    if isinstance(holders_data, dict):
        inner = holders_data.get("data", [])
        holders_list = inner if isinstance(inner, list) else []
    elif isinstance(holders_data, list):
        holders_list = holders_data

    score        = _int(cdata.get("analysis_risk_score", 50))
    price_usd    = _float(token_info.get("current_price_usd"))
    market_cap   = _float(token_info.get("market_cap"))
    holders      = _int(token_info.get("holders"))
    tvl          = _float(token_info.get("tvl"))
    volume_24h   = _float(token_info.get("tx_volume_u_24h") or
                          sum(_float(p.get("volume_u")) for p in pairs))
    price_change = _float(pairs[0].get("price_change_24h") if pairs else 0)
    lock_pct     = _float(cdata.get("token_lock_percent"))
    is_honeypot  = bool(cdata.get("is_honeypot", False))
    liquidity    = sum(_float(d.get("liquidity")) for d in cdata.get("dex", []))
    top_holder   = _float(holders_list[0].get("balance_ratio") if holders_list else 0)
    token_name   = cdata.get("token_name") or token_info.get("name", "Unknown")
    token_symbol = cdata.get("token_symbol") or token_info.get("symbol", "???")
    token_addr   = cdata.get("token") or token_info.get("token", "")
    chain        = cdata.get("chain") or token_info.get("chain", "")

    ai_risks = []
    if isinstance(cdata.get("ai_report"), dict):
        ai_risks = cdata["ai_report"].get("risk", [])
        if ai_risks:
            score = max(score, 40)
            for r in ai_risks[:3]:
                desc = r.get("description_en") or r.get("title_en") or ""
                if desc:
                    reasons.append("AI: " + desc[:80])

    if token_addr.lower() in STABLECOINS:
        is_honeypot = False
        score = min(score, 30)
        reasons.append("Verified stablecoin — low risk")

    if is_honeypot:
        reasons.append("Honeypot detected")
        score = max(score, 90)

    if top_holder > 0.5:
        reasons.append("Top holder owns " + str(round(top_holder * 100, 1)) + "% of supply")
        score = max(score, 75)
    elif top_holder > 0.2:
        reasons.append("Top holder owns " + str(round(top_holder * 100, 1)) + "%")
        score = max(score, 55)

    if holders < 100:
        reasons.append("Only " + str(holders) + " holders — very low distribution")
        score = max(score, 70)
    elif holders < 500:
        reasons.append(str(holders) + " holders — low distribution")
        score = max(score, 50)

    if 0 < liquidity < 10000:
        reasons.append("Very low liquidity: $" + str(round(liquidity)))
        score = max(score, 65)
    elif 0 < liquidity < 50000:
        reasons.append("Low liquidity: $" + str(round(liquidity)))
        score = max(score, 45)

    if lock_pct > 0.5:
        reasons.append(str(round(lock_pct * 100)) + "% of supply locked")
        score = max(0, score - 10)
    elif lock_pct > 0.2:
        reasons.append(str(round(lock_pct * 100)) + "% of supply locked")

    if market_cap > 0 and volume_24h > market_cap * 3:
        reasons.append("Abnormal volume: >3x market cap in 24h")
        score = max(score, 55)

    if price_change < -30:
        reasons.append("Price crashed " + str(round(price_change, 1)) + "% in 24h")
        score = max(score, 70)
    elif price_change < -15:
        reasons.append("Sharp decline " + str(round(price_change, 1)) + "% in 24h")

    if not cdata:
        reasons.append("Contract data unavailable — manual review recommended")

    if not reasons:
        reasons.append("No major red flags detected")

    if score >= 80 or is_honeypot:
        risk_level, verdict = "CRITICAL", "DANGER"
    elif score >= 60:
        risk_level, verdict = "HIGH",     "DANGER"
    elif score >= 40:
        risk_level, verdict = "MEDIUM",   "CAUTION"
    else:
        risk_level, verdict = "LOW",      "SAFE"

    return RiskReport(
        token_address=token_addr,
        chain=chain,
        token_name=token_name,
        token_symbol=token_symbol,
        risk_score=score,
        risk_level=risk_level,
        price_usd=price_usd,
        market_cap=market_cap,
        holders=holders,
        tvl=tvl,
        volume_24h=volume_24h,
        price_change_24h=price_change,
        top_holder_pct=top_holder,
        is_honeypot=is_honeypot,
        lock_percent=lock_pct,
        liquidity_usd=liquidity,
        verdict=verdict,
        reasons=reasons,
    )
