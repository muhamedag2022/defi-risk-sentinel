import httpx
import os
from dotenv import load_dotenv

load_dotenv()

AVE_API_KEY = os.getenv("AVE_API_KEY")
BASE_URL = "https://data.ave-api.xyz/v2"

HEADERS = {
    "X-API-KEY": AVE_API_KEY
}

async def search_token(keyword: str, chain: str = None):
    params = {"keyword": keyword}
    if chain:
        params["chain"] = chain
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/tokens", headers=HEADERS, params=params)
        return r.json()

async def get_token_detail(address: str, chain: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/tokens/{address}-{chain}",
            headers=HEADERS
        )
        return r.json()

async def get_token_risk(address: str, chain: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/contracts/{address}-{chain}",
            headers=HEADERS
        )
        return r.json()

async def get_trending(chain: str = "bsc"):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/tokens/trending",
            headers=HEADERS,
            params={"chain": chain}
        )
        return r.json()