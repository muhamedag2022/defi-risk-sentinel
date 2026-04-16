import asyncio
import json
import os
from dataclasses import asdict

import httpx
import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from core.risk_engine import analyze_risk

load_dotenv()

AVE_API_KEY    = os.getenv("AVE_API_KEY")
API_PLAN       = os.getenv("API_PLAN", "free")
BASE_URL       = "https://data.ave-api.xyz/v2"
WSS_URL        = "wss://wss.ave-api.xyz"
HEADERS        = {"X-API-KEY": AVE_API_KEY}
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
DGRID_API_KEY  = os.getenv("DGRID_API_KEY", "")

app = FastAPI(title="DeFi Risk Sentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────────────────────────────

async def ave_get(path: str, params: dict = None):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE_URL}{path}", headers=HEADERS, params=params)
        return r.json()

async def send_telegram(chat_id: str, text: str):
    """Send a Telegram message to the given chat_id"""
    if not TELEGRAM_TOKEN or not chat_id:
        return {"ok": False, "error": "No token or chat_id"}
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        })
        return r.json()

# ── AVE endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/search")
async def search_token(keyword: str, chain: str = None):
    params = {"keyword": keyword, "limit": 20}
    if chain:
        params["chain"] = chain
    return await ave_get("/tokens", params)

@app.get("/api/token/{chain}/{address}")
async def token_detail(chain: str, address: str):
    return await ave_get(f"/tokens/{address}-{chain}")

@app.get("/api/risk/{chain}/{address}")
async def token_risk(chain: str, address: str):
    token_id = f"{address}-{chain}"
    token_data, contract_data, holders_data = await asyncio.gather(
        ave_get(f"/tokens/{token_id}"),
        ave_get(f"/contracts/{token_id}"),
        ave_get(f"/tokens/top100/{token_id}"),
    )
    report = analyze_risk(token_data, contract_data, holders_data or [])
    return asdict(report)

@app.get("/api/trending")
async def trending(chain: str = "bsc"):
    return await ave_get("/tokens/trending", {"chain": chain, "page_size": 20})

@app.get("/api/kline/{chain}/{address}")
async def kline(chain: str, address: str, interval: int = 60, limit: int = 100):
    return await ave_get(
        f"/klines/token/{address}-{chain}",
        {"interval": interval, "limit": limit}
    )

@app.get("/api/trade/quote")
async def trade_quote(chain: str, token_address: str, amount_usd: float = 5.0):
    USDT = {
        "bsc":    "0x55d398326f99059ff775485246999027b3197955",
        "eth":    "0xdac17f958d2ee523a2206206994597c13d831ec7",
        "base":   "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "solana": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    }
    in_token  = USDT.get(chain, USDT["bsc"])
    decimals  = 6 if chain == "solana" else 18
    in_amount = str(int(amount_usd * (10 ** decimals)))
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                "https://bot-api.ave.ai/v1/thirdParty/chainWallet/getAmountOut",
                headers={"AVE-ACCESS-KEY": AVE_API_KEY},
                json={
                    "chain": chain,
                    "inAmount": in_amount,
                    "inTokenAddress": in_token,
                    "outTokenAddress": token_address,
                    "swapType": "buy",
                }
            )
            d = r.json()
            if d.get("status") == 200:
                raw      = int(d["data"]["estimateOut"])
                dec      = d["data"].get("decimals", 18)
                estimate = raw / (10 ** dec)
                return {"estimate_out": round(estimate, 6), "slippage": "auto", "chain": chain}
            return {"error": d.get("msg", "Quote failed"), "raw": d}
    except Exception as e:
        return {"error": str(e)}

# ── Telegram endpoints ────────────────────────────────────────────────────────

@app.post("/api/telegram/test")
async def telegram_test(chat_id: str):
    """Send a test message to verify Telegram connection"""
    result = await send_telegram(
        chat_id,
        "🛡️ <b>DeFi Risk Sentinel</b>\n\n"
        "✅ Telegram alerts connected successfully!\n"
        "You will receive PUMP/DUMP alerts for your Watchlist tokens."
    )
    if result.get("ok"):
        return {"success": True, "message": "Test message sent!"}
    return {"success": False, "error": result.get("description", "Failed")}

@app.post("/api/telegram/alert")
async def telegram_alert(chat_id: str, symbol: str, alert_type: str, change: float, price: float):
    """Send a PUMP or DUMP alert to Telegram"""
    emoji      = "🚀" if alert_type == "PUMP" else "🔴"
    change_str = f"+{change:.2f}%" if change >= 0 else f"{change:.2f}%"
    chart      = "📈" if alert_type == "PUMP" else "📉"
    text = (
        f"{emoji} <b>{alert_type} Alert — {symbol}</b>\n\n"
        f"{chart} Change: <b>{change_str}</b>\n"
        f"💵 Price: <b>${price:.6f}</b>\n\n"
        f"⚡️ <i>DeFi Risk Sentinel</i>"
    )
    return await send_telegram(chat_id, text)

# ── AI Chat endpoint ──────────────────────────────────────────────────────────

@app.post("/api/ai/chat")
async def ai_chat(request: dict):
    """Send token data + user question to dgrid.ai and return AI response"""
    question   = request.get("question", "")
    token_data = request.get("token_data", {})

    if not question:
        return {"error": "No question provided"}

    context = f"""You are a DeFi risk analysis expert. Analyze the following token and answer the user's question.

Token Data:
- Name: {token_data.get('token_name', 'Unknown')} ({token_data.get('token_symbol', '???')})
- Chain: {token_data.get('chain', 'Unknown')}
- Price: ${token_data.get('price_usd', 0)}
- Market Cap: ${token_data.get('market_cap', 0):,.0f}
- Holders: {token_data.get('holders', 0):,}
- Liquidity: ${token_data.get('liquidity_usd', 0):,.0f}
- Volume 24h: ${token_data.get('volume_24h', 0):,.0f}
- Risk Score: {token_data.get('risk_score', 0)}/100
- Risk Level: {token_data.get('risk_level', 'Unknown')}
- Verdict: {token_data.get('verdict', 'Unknown')}
- Honeypot: {token_data.get('is_honeypot', False)}
- Top Holder %: {token_data.get('top_holder_pct', 0) * 100:.1f}%
- Liquidity Lock: {token_data.get('lock_percent', 0) * 100:.0f}%
- 24h Change: {token_data.get('price_change_24h', 0):.2f}%
- Risk Reasons: {', '.join(token_data.get('reasons', []))}

Be concise, clear, and focus on practical DeFi risk assessment. Answer in the same language as the user's question."""

    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                "https://api.dgrid.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {DGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o",
                    "messages": [
                        {"role": "system", "content": context},
                        {"role": "user",   "content": question},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7,
                }
            )
            d = r.json()
            # Handle both success and error responses
            if "choices" in d and len(d["choices"]) > 0:
                answer = d["choices"][0]["message"]["content"]
                return {"answer": answer}
            elif "error" in d:
                return {"error": str(d["error"])}
            else:
                return {"error": f"Unexpected response: {str(d)}"}
    except Exception as e:
        return {"error": str(e)}

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "plan": API_PLAN}

# ── WebSocket: single token ───────────────────────────────────────────────────

@app.websocket("/ws/price/{chain}/{address}")
async def price_stream(websocket: WebSocket, chain: str, address: str):
    await websocket.accept()
    token_id      = f"{address}-{chain}"
    subscribe_msg = json.dumps({
        "jsonrpc": "2.0", "method": "subscribe",
        "params": ["price", [token_id]], "id": 1
    })
    try:
        async with websockets.connect(
            WSS_URL,
            additional_headers={"X-API-KEY": AVE_API_KEY},
            open_timeout=20,
            ping_timeout=10
        ) as ave_ws:
            await ave_ws.send(subscribe_msg)
            while True:
                msg = await ave_ws.recv()
                await websocket.send_text(msg)
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()

# ── WebSocket: watchlist ──────────────────────────────────────────────────────

@app.websocket("/ws/watchlist")
async def watchlist_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        async with websockets.connect(
            WSS_URL,
            additional_headers={"X-API-KEY": AVE_API_KEY},
            open_timeout=20,
            ping_timeout=10
        ) as ave_ws:

            async def listen_ave():
                while True:
                    msg  = await ave_ws.recv()
                    data = json.loads(msg)
                    if data.get("result", {}).get("topic") == "price":
                        prices = data["result"].get("prices", [])
                        for p in prices:
                            change = float(p.get("price_change", 0))
                            alert  = None
                            
                            # تحديد نوع التنبيه
                            if change <= -10:
                                alert = {"type": "DUMP", "symbol": p.get("target_token"), "change": change, "price": p.get("uprice")}
                            elif change >= 20:
                                alert = {"type": "PUMP", "symbol": p.get("target_token"), "change": change, "price": p.get("uprice")}
                            
                            if alert:
                                target_chat_id = "5014111239" 
                                
                                await telegram_alert(
                                    chat_id=target_chat_id,
                                    symbol=alert["symbol"],
                                    alert_type=alert["type"],
                                    change=alert["change"],
                                    price=float(alert["price"])
                                )
                                print(f"DEBUG: Telegram alert sent for {alert['symbol']}")

                            await websocket.send_text(json.dumps({"prices": prices, "alert": alert}))
       
            async def listen_client():
                while True:
                    msg = await websocket.receive_text()
                    cmd = json.loads(msg)
                    if cmd.get("action") == "subscribe":
                        token_ids = cmd.get("token_ids", [])
                        await ave_ws.send(json.dumps({
                            "jsonrpc": "2.0", "method": "subscribe",
                            "params": ["price", token_ids], "id": 1
                        }))
                    elif cmd.get("action") == "unsubscribe":
                        token_ids = cmd.get("token_ids", [])
                        await ave_ws.send(json.dumps({
                            "jsonrpc": "2.0", "method": "unsubscribe",
                            "params": ["price", token_ids], "id": 2
                        }))

            await asyncio.gather(listen_ave(), listen_client())
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()

# ── Portfolio ─────────────────────────────────────────────────────────────────

@app.get("/api/wallet/tokens")
async def wallet_tokens(wallet: str, chain: str = "bsc"):
    try:
        raw = await ave_get("/address/walletinfo/tokens", {
            "wallet_address": wallet,
            "chain": chain,
            "pageSize": 50,
            "pageNO": 1,
            "hide_small": 1,
        })
        if not isinstance(raw, dict) or raw.get("msg") != "SUCCESS":
            return {"error": raw.get("msg", "API error") if isinstance(raw, dict) else "Invalid response"}
        data = raw.get("data", [])
        if not isinstance(data, list) or len(data) == 0:
            return {"error": "No tokens found in this wallet on " + chain.upper()}
        tokens = []
        for t in data:
            if not isinstance(t, dict):
                continue
            balance_usd = float(t.get("balance_usd") or 0)
            tokens.append({
                "address":            t.get("token", ""),
                "symbol":             t.get("symbol", "???"),
                "chain":              chain,
                "balance_usd":        balance_usd,
                "balance_amount":     t.get("balance_amount", "0"),
                "price_usd":          float(t.get("current_price_usd") or 0),
                "unrealized_profit":  t.get("unrealized_profit", "0"),
                "realized_profit":    t.get("realized_profit", ""),
                "total_profit":       t.get("total_profit", "--"),
                "total_profit_ratio": t.get("total_profit_ratio", "--"),
                "risk_score":         int(t.get("risk_score") or 50),
                "risk_level":         int(t.get("risk_level") or 0),
                "logo_url":           t.get("logo_url", ""),
            })
        tokens.sort(key=lambda x: x["balance_usd"], reverse=True)
        total_usd = sum(t["balance_usd"] for t in tokens)
        return {
            "tokens":    tokens,
            "total":     len(tokens),
            "total_usd": round(total_usd, 2),
            "wallet":    wallet,
            "chain":     chain,
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/ai/simulate")
async def risk_simulator(request: dict):
    token_data = request.get("token_data", {})
    investment = float(request.get("investment_usd", 100))
    scenario   = request.get("scenario", "conservative")

    price        = float(token_data.get("price_usd", 0))
    risk_score   = int(token_data.get("risk_score", 50))
    is_honeypot  = bool(token_data.get("is_honeypot", False))
    top_holder   = float(token_data.get("top_holder_pct", 0))
    liquidity    = float(token_data.get("liquidity_usd", 0))
    volume_24h   = float(token_data.get("volume_24h", 0))
    market_cap   = float(token_data.get("market_cap", 0))
    price_change = float(token_data.get("price_change_24h", 0))

    tokens_received = (investment / price) if price > 0 else 0

    context = f"""You are a DeFi investment risk simulator. Analyze this token and simulate investment scenarios.

Token: {token_data.get("token_name")} ({token_data.get("token_symbol")})
Chain: {token_data.get("chain")}
Current Price: ${price}
Risk Score: {risk_score}/100
Verdict: {token_data.get("verdict")}
Honeypot: {is_honeypot}
Top Holder: {top_holder*100:.1f}%
Liquidity: ${liquidity:,.0f}
Volume 24h: ${volume_24h:,.0f}
Market Cap: ${market_cap:,.0f}
24h Change: {price_change:.2f}%
Risk Reasons: {", ".join(token_data.get("reasons", []))}

Investment Amount: ${investment}
Tokens to receive: {tokens_received:.4f}
Scenario: {scenario}

Provide a structured simulation with:
1. BEST CASE scenario (price target + % gain + timeframe)
2. BASE CASE scenario (realistic outcome)
3. WORST CASE scenario (rug pull / dump risk)
4. RECOMMENDATION (Buy / Avoid / Wait with one clear reason)
5. STOP LOSS suggestion (price level)
6. TAKE PROFIT suggestion (price level)

Be specific with numbers. Consider the risk score heavily.
If honeypot=True, worst case = 100% loss, recommend AVOID.
Answer concisely in bullet points. Use the same language as the scenario parameter language hint if provided."""

    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                "https://api.dgrid.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {DGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o",
                    "messages": [
                        {"role": "system", "content": context},
                        {"role": "user",   "content": f"Simulate investing ${investment} in this token. Scenario: {scenario}"},
                    ],
                    "max_tokens": 600,
                    "temperature": 0.4,
                }
            )
            d = r.json()
            if "choices" in d and d["choices"]:
                return {
                    "simulation": d["choices"][0]["message"]["content"],
                    "investment": investment,
                    "tokens_received": round(tokens_received, 6),
                    "current_price": price,
                    "risk_score": risk_score,
                }
            return {"error": d.get("error", "Unknown error")}
    except Exception as e:
        return {"error": str(e)}
