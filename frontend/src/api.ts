import axios from 'axios'

const BASE = 'https://defi-risk-sentinel-production.up.railway.app'
const WS_BASE = 'wss://defi-risk-sentinel-production.up.railway.app/ws/watchlist'

export const api = {
  search: (keyword: string, chain?: string) =>
    axios.get(`${BASE}/api/search`, { params: { keyword, chain } }).then(r => r.data),

  risk: (chain: string, address: string) =>
    axios.get(`${BASE}/api/risk/${chain}/${address}`).then(r => r.data),

  trending: (chain = 'bsc') =>
    axios.get(`${BASE}/api/trending`, { params: { chain } }).then(r => r.data),

  kline: (chain: string, address: string, interval = 60, limit = 100) =>
    axios.get(`${BASE}/api/kline/${chain}/${address}`, {
      params: { interval, limit }
    }).then(r => r.data),

  /**

  */
  createAlertSocket: (onAlertReceived: (data: any) => void): WebSocket => {
    const socket = new WebSocket(WS_BASE);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.alert) {
          onAlertReceived(data.alert);
        } else {
          onAlertReceived(data);
        }
      } catch (e) {
        console.error("WS Parsing Error", e);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected. Retrying in 3 seconds...");

      setTimeout(() => api.createAlertSocket(onAlertReceived), 3000);
    };

    socket.onerror = (err) => {
      console.error("WebSocket Error:", err);
    };

    return socket;
  },
}