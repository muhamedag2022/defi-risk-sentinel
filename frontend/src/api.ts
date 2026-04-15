import axios from 'axios'

const BASE = 'https://defi-risk-sentinel-production.up.railway.app'

export const api = {
  search:  (keyword: string, chain?: string) =>
    axios.get(`${BASE}/api/search`, { params: { keyword, chain } }).then(r => r.data),

  risk: (chain: string, address: string) =>
    axios.get(`${BASE}/api/risk/${chain}/${address}`).then(r => r.data),

  trending: (chain = 'bsc') =>
    axios.get(`${BASE}/api/trending`, { params: { chain } }).then(r => r.data),

  kline: (chain: string, address: string, interval = 60, limit = 100) =>
    axios.get(`${BASE}/api/kline/${chain}/${address}`, {
      params: { interval, limit }
    }).then(r => r.data),
}