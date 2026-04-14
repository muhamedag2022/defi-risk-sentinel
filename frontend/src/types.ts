export interface Token {
  token: string
  chain: string
  name: string
  symbol: string
  current_price_usd: string
  market_cap: string
  holders: number
  tvl?: string
  logo_url: string
  updated_at: number
  token_price_change_24h?: number
  token_tx_volume_usd_24h?: string
  is_honeypot?: boolean
  ave_risk_level?: number
}

export interface RiskReport {
  token_address: string
  chain: string
  token_name: string
  token_symbol: string
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  price_usd: number
  market_cap: number
  holders: number
  tvl: number
  volume_24h: number
  price_change_24h: number
  top_holder_pct: number
  is_honeypot: boolean
  lock_percent: number
  liquidity_usd: number
  verdict: 'SAFE' | 'CAUTION' | 'DANGER'
  reasons: string[]
}

export interface KlinePoint {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}