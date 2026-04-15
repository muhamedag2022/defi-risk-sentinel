# 🛡️ DeFi Risk Sentinel

> **AVE Claw Hackathon 2026** — Complete Application Track  
> Built on AVE Cloud Skills: Monitoring + Trading + AI Intelligence

[![AVE Skills](https://img.shields.io/badge/Powered%20by-AVE%20Cloud%20Skills-6366f1?style=for-the-badge)](https://ave.ai)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20+%20TypeScript-61DAFB?style=for-the-badge)](https://react.dev)

---

## 🎯 What is DeFi Risk Sentinel?

DeFi Risk Sentinel is a **real-time on-chain intelligence platform** that helps DeFi traders make safer investment decisions. It combines AVE Cloud Skills with AI-powered analysis to detect scams, monitor live prices, and simulate investment scenarios — all in one unified dashboard.

**The problem:** DeFi traders lose billions annually to honeypots, rug pulls, and high-risk tokens — with no unified tool to assess risk before investing.

**Our solution:** A complete risk intelligence platform powered entirely by AVE Skills.

---

## 🚀 Live Demo

[![Watch Demo](https://img.shields.io/badge/▶%20Watch-Demo%20Video-red?style=for-the-badge&logo=youtube)](https://youtu.be/qCIO9hwI3rc)
[![Live App](https://img.shields.io/badge/🌐%20Live-App%20on%20Vercel-000000?style=for-the-badge&logo=vercel)](https://defi-risk-sentinel.vercel.app/)

| Resource | Link |
|----------|------|
| 🎬 **Demo Video** | [Watch on YouTube](https://youtu.be/qCIO9hwI3rc) |
| 🌐 **Live Application** | [defi-risk-sentinel.vercel.app](https://defi-risk-sentinel.vercel.app/) |
| 📖 **API Docs (Swagger)** | [railway.app/docs](https://defi-risk-sentinel-production.up.railway.app/docs) |

> **Try it now:** Open the Live App and search any BSC token like "TRADOOR" or "ARIA".
```

---

## ✨ Features

### 🔍 Token Risk Analysis (AVE Monitoring Skill)
- Search any token by name or contract address across BSC, ETH, BASE, Solana
- Comprehensive risk scoring (0-100) using AVE contract + holders data
- Detects: Honeypots, whale concentration, low liquidity, abnormal volume
- AI-powered risk reasons from AVE's own AI report
- Real-time price via AVE WebSocket

### 📊 Live Watchlist (AVE Monitoring Skill)
- Monitor multiple tokens simultaneously via AVE WSS
- Real-time PUMP (>+20%) and DUMP (<-10%) alert detection
- Token Comparison — compare 2-3 tokens side by side across 10 metrics
- Best value indicator (✓) per metric

### 💼 Portfolio Scanner (AVE Monitoring Skill)
- Scan any wallet address for all held tokens
- Risk score + P&L for each token
- Sort by value or risk level
- Supports BSC, ETH, BASE, Solana

### 📈 Price Chart (AVE Trading Skill)
- 72-hour candlestick chart (1h candles)
- Live price updates via AVE WebSocket
- Powered by AVE klines API

### 🔗 AVE Pro Integration (AVE Trading Skill)
- Direct link to Trade on AVE Pro
- Chart on AVE with one click
- Get Quote — real-time price estimate via AVE Trading API
- Blockchain explorer links (BscScan, Etherscan, BaseScan, Solscan)

### 🤖 AI Risk Analyst (dgrid.ai)
- Floating AI chat powered by dgrid.ai (OpenAI-compatible)
- Context-aware: knows the token's full risk data
- Quick questions: "Is this safe to buy?", "What are the main risks?"
- Typing animation, minimize/maximize
- Answers in user's language

### 🎲 Risk Simulator (dgrid.ai)
- "What If?" investment simulator
- 3 scenarios: Bullish / Balanced / Conservative
- AI generates: Best Case, Base Case, Worst Case
- Stop Loss + Take Profit suggestions
- Considers honeypot, risk score, liquidity in simulation

### 📲 Telegram Alerts
- Connect your Telegram Chat ID
- Receive instant PUMP/DUMP notifications via @DeFi_SentinelBot
- Test connection with one click
- Alert history with timestamps

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React + TS)              │
│  Dashboard │ Watchlist │ Portfolio │ Alerts          │
└─────────────────────────┬───────────────────────────┘
                          │ HTTP + WebSocket
┌─────────────────────────▼───────────────────────────┐
│                  Backend (FastAPI)                   │
│  /api/risk  /api/search  /api/trending               │
│  /api/kline  /api/wallet  /api/trade/quote           │
│  /api/ai/chat  /api/ai/simulate                      │
│  /api/telegram/test  /api/telegram/alert             │
│  /ws/price  /ws/watchlist                            │
└──────┬──────────────────┬──────────────────┬────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼──────┐  ┌───────▼───────┐
│  AVE Cloud  │  │   dgrid.ai    │  │   Telegram    │
│   Skills    │  │  (GPT-4o)     │  │   Bot API     │
│  REST + WSS │  │  AI Gateway   │  │               │
└─────────────┘  └───────────────┘  └───────────────┘
```

---

## 🔧 AVE Skills Used

| AVE Skill | Endpoint | Usage |
|-----------|----------|-------|
| **Token Search** | `GET /v2/tokens` | Search by name or address |
| **Token Detail** | `GET /v2/tokens/{id}` | Price, MarketCap, Holders, TVL |
| **Contract Analysis** | `GET /v2/contracts/{id}` | Honeypot, AI report, Lock%, DEX |
| **Top Holders** | `GET /v2/tokens/top100/{id}` | Whale concentration detection |
| **Trending** | `GET /v2/tokens/trending` | Top tokens by chain |
| **Klines** | `GET /v2/klines/token/{id}` | 72h price chart data |
| **Wallet Tokens** | `GET /v2/address/walletinfo/tokens` | Portfolio scanner |
| **Trade Quote** | `POST /v1/thirdParty/chainWallet/getAmountOut` | Price estimate |
| **Price WSS** | `wss://wss.ave-api.xyz` | Real-time price streaming |

---

## 🧠 Risk Engine

Custom risk scoring algorithm that combines AVE data:

```python
# Scoring logic (0-100, higher = more dangerous)
if is_honeypot:          score = max(score, 90)
if top_holder > 50%:     score = max(score, 75)
if holders < 100:        score = max(score, 70)
if price_drop > 30%:     score = max(score, 70)
if liquidity < $10K:     score = max(score, 65)
if liquidity < $50K:     score = max(score, 45)
if ai_risks detected:    score = max(score, 40)
if lock > 50%:           score -= 10  # positive signal

# Verdict
CRITICAL (80+) → DANGER
HIGH     (60+) → DANGER  
MEDIUM   (40+) → CAUTION
LOW      (<40) → SAFE
```

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- AVE API Key ([get one here](https://ave.ai))

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/defi-risk-sentinel.git
cd defi-risk-sentinel
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Environment Variables
```bash
cp .env.example .env
# Edit .env with your keys:
```

```env
AVE_API_KEY=your_ave_api_key_here
API_PLAN=free
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DGRID_API_KEY=your_dgrid_api_key
```

### 4. Run Backend
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 5. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 6. Open in browser
```
http://localhost:5173
```

---

## 📁 Project Structure

```
defi-risk-sentinel/
├── backend/
│   ├── main.py              # FastAPI app — all endpoints
│   ├── core/
│   │   └── risk_engine.py   # Risk scoring algorithm
│   ├── skills/
│   │   ├── data_rest.py     # AVE REST helpers
│   │   └── data_wss.py      # AVE WebSocket helpers
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx          # Main app + 4 tabs
│       ├── App.css          # All styles
│       ├── types.ts         # TypeScript interfaces
│       ├── api.ts           # API layer
│       └── components/
│           ├── SearchBar.tsx
│           ├── TrendingTable.tsx
│           ├── RiskPanel.tsx
│           ├── PriceChart.tsx
│           ├── TradePanel.tsx
│           ├── Watchlist.tsx
│           ├── AiChat.tsx
│           └── RiskSimulator.tsx
├── .env.example
└── README.md
```

---

## 🎬 Demo Walkthrough

1. **Search** any token (e.g. "TRADOOR" on BSC)
2. **Analyze** — see Risk Score, Honeypot status, AI findings
3. **Ask AI** — click "Ask AI" and ask "Is this safe to buy?"
4. **Simulate** — click "What If?" and simulate $100 investment
5. **Watch** — add to Watchlist for live price monitoring
6. **Compare** — select 2 tokens → "Compare" for side-by-side analysis
7. **Portfolio** — scan any wallet address for risk assessment
8. **Alerts** — connect Telegram to receive PUMP/DUMP notifications

---

## 🏆 Hackathon Track

**Complete Application** — combines both AVE Skill types:

- ✅ **Monitoring Skill**: Token risk analysis, live watchlist, portfolio scanner, PUMP/DUMP alerts
- ✅ **Trading Skill**: Price quotes, kline charts, AVE Pro integration

---

## 👨‍💻 Built With

| Technology | Purpose |
|-----------|---------|
| **AVE Cloud Skills** | On-chain data, risk data, live prices, trading |
| **FastAPI** | High-performance async Python backend |
| **React + TypeScript** | Modern, type-safe frontend |
| **dgrid.ai** | AI chat + investment simulation (GPT-4o) |
| **Telegram Bot API** | Real-time mobile alerts |
| **Recharts** | Price charts |
| **WebSocket** | Live price streaming |

---

## 📄 License

MIT License — built for AVE Claw Hackathon 2026  