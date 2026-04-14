import hashlib
import hmac
import time
import os
import httpx
from fastapi import APIRouter

router = APIRouter()

TRADE_BASE = "https://bot-api.ave.ai"
AVE_API_KEY   = os.getenv("AVE_API_KEY", "")
AVE_SECRET_KEY = os.getenv("AVE_SECRET_KEY", "")


def _sign(secret: str, body: dict) -> dict:
    ts = str(int(time.time() * 1000))
    payload = ts + str(body)
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return {"AVE-ACCESS-KEY": AVE_API_KEY, "AVE-TIMESTAMP": ts, "AVE-SIGN": sig}


@router.get("/api/trade/wallets")
async def get_wallets():
    headers = _sign(AVE_SECRET_KEY, {})
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{TRADE_BASE}/v1/proxy/wallets", headers=headers)
        return r.json()


@router.post("/api/trade/buy")
async def buy_token(chain: str, token_address: str, amount_usd: float, wallet_id: str):
    body = {
        "chain": chain,
        "tokenAddress": token_address,
        "amount": str(amount_usd),
        "walletId": wallet_id,
        "slippage": "500",
    }
    headers = _sign(AVE_SECRET_KEY, body)
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"{TRADE_BASE}/v1/proxy/market-order",
            headers=headers,
            json=body,
        )
        return r.json()


@router.post("/api/trade/sell")
async def sell_token(chain: str, token_address: str, sell_ratio: float, wallet_id: str):
    body = {
        "chain": chain,
        "tokenAddress": token_address,
        "sellRatio": str(int(sell_ratio * 10000)),
        "walletId": wallet_id,
        "slippage": "500",
    }
    headers = _sign(AVE_SECRET_KEY, body)
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"{TRADE_BASE}/v1/proxy/market-order",
            headers=headers,
            json=body,
        )
        return r.json()


@router.post("/api/trade/create-wallet")
async def create_wallet(name: str):
    body = {"name": name}
    headers = _sign(AVE_SECRET_KEY, body)
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"{TRADE_BASE}/v1/proxy/create-wallet",
            headers=headers,
            json=body,
        )
        return r.json()
