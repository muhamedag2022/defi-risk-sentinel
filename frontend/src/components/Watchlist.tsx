import { useState, useEffect, useRef } from 'react'
import { Bell, X, Activity, Plus, GitCompare } from 'lucide-react'

interface WatchItem {
  token_id: string
  symbol: string
  chain: string
  address: string
  price?: number
  change?: number
}

interface Alert {
  type: 'PUMP' | 'DUMP'
  symbol: string
  change: number
  time: string
}

interface Props {
  onSelect:        (chain: string, address: string) => void
  addItem?:        { symbol: string; chain: string; address: string } | null
  onAlert?:        (alert: Alert) => void
  persistedItems?: { symbol: string; chain: string; address: string }[]
  fullPage?:       boolean
}

interface CompareData {
  symbol:          string
  chain:           string
  address:         string
  price:           number
  change:          number
  risk_score:      number
  risk_level:      string
  market_cap:      number
  holders:         number
  liquidity_usd:   number
  volume_24h:      number
  top_holder_pct:  number
  is_honeypot:     boolean
  lock_percent:    number
  verdict:         string
}

const SUPPORTED = ['bsc', 'eth', 'base', 'solana']

function fmtUsd(n: number): string {
  if (!n || n === 0) return '—'
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3)  return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + n.toFixed(2)
}

function fmtPrice(p: number): string {
  if (!p) return '—'
  if (p < 0.001) return '$' + p.toExponential(2)
  return '$' + p.toPrecision(5)
}

function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#f59e0b'
  return '#22c55e'
}

// ─── Compare Modal ────────────────────────────────────────────────────────────
function CompareModal({ items, onClose }: { items: WatchItem[]; onClose: () => void }) {
  const [data,    setData]    = useState<(CompareData | null)[]>(items.map(() => null))
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const results = await Promise.all(
          items.map(async (item) => {
            try {
              const r = await fetch(
                `http://localhost:8000/api/risk/${item.chain}/${item.address}`
              )
              const d = await r.json()
              return {
                symbol:         item.symbol,
                chain:          item.chain,
                address:        item.address,
                price:          d.price_usd        ?? item.price ?? 0,
                change:         d.price_change_24h ?? item.change ?? 0,
                risk_score:     d.risk_score       ?? 0,
                risk_level:     d.risk_level       ?? '—',
                market_cap:     d.market_cap       ?? 0,
                holders:        d.holders          ?? 0,
                liquidity_usd:  d.liquidity_usd    ?? 0,
                volume_24h:     d.volume_24h       ?? 0,
                top_holder_pct: d.top_holder_pct   ?? 0,
                is_honeypot:    d.is_honeypot      ?? false,
                lock_percent:   d.lock_percent     ?? 0,
                verdict:        d.verdict          ?? '—',
              } as CompareData
            } catch {
              return null
            }
          })
        )
        setData(results)
      } catch {
        setError('Failed to fetch comparison data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // For each metric, which token has the best value?
  const best = (vals: (number | boolean | string)[], higherIsBetter: boolean): number => {
    const nums = vals.map(v => typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0)
    if (higherIsBetter) return nums.indexOf(Math.max(...nums))
    return nums.indexOf(Math.min(...nums))
  }

  const rows: { label: string; key: keyof CompareData; fmt: (v: number | boolean | string) => string; higherIsBetter: boolean; invertBest?: boolean }[] = [
    { label: 'Price',          key: 'price',          fmt: v => fmtPrice(v as number),                                      higherIsBetter: false },
    { label: '24h Change',     key: 'change',         fmt: v => (v as number) >= 0 ? `+${(v as number).toFixed(2)}%` : `${(v as number).toFixed(2)}%`, higherIsBetter: true },
    { label: 'Risk Score',     key: 'risk_score',     fmt: v => `${v}/100`,                                                  higherIsBetter: false, invertBest: true },
    { label: 'Market Cap',     key: 'market_cap',     fmt: v => fmtUsd(v as number),                                        higherIsBetter: true },
    { label: 'Holders',        key: 'holders',        fmt: v => (v as number).toLocaleString(),                             higherIsBetter: true },
    { label: 'Liquidity',      key: 'liquidity_usd',  fmt: v => fmtUsd(v as number),                                        higherIsBetter: true },
    { label: 'Volume 24h',     key: 'volume_24h',     fmt: v => fmtUsd(v as number),                                        higherIsBetter: true },
    { label: 'Top Holder %',   key: 'top_holder_pct', fmt: v => `${((v as number) * 100).toFixed(1)}%`,                    higherIsBetter: false, invertBest: true },
    { label: 'Liquidity Lock', key: 'lock_percent',   fmt: v => `${((v as number) * 100).toFixed(0)}%`,                    higherIsBetter: true },
    { label: 'Honeypot',       key: 'is_honeypot',    fmt: v => v ? '⚠️ YES' : '✅ NO',                                    higherIsBetter: false, invertBest: true },
  ]

  const loaded = data.filter(Boolean) as CompareData[]

  return (
    <div className='compare-overlay' onClick={onClose}>
      <div className='compare-modal' onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className='compare-header'>
          <div className='compare-title'>
            <GitCompare size={18} />
            Token Comparison
          </div>
          <button className='compare-close' onClick={onClose}><X size={18} /></button>
        </div>

        {loading && (
          <div className='compare-loading'>
            <div className='loading-bar'><div className='loading-fill' /></div>
            <p style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', marginTop: 8 }}>
              Fetching risk data for {items.length} tokens...
            </p>
          </div>
        )}

        {error && <div className='portfolio-error'>{error}</div>}

        {!loading && loaded.length > 0 && (
          <div className='compare-table-wrap'>
            <table className='compare-table'>
              <thead>
                <tr>
                  <th className='compare-th-label'>Metric</th>
                  {loaded.map((d, i) => (
                    <th key={i} className='compare-th-token'>
                      <div className='compare-token-head'>
                        <span className='compare-tok-sym'>{d.symbol}</span>
                        <span className='compare-tok-chain'>{d.chain.toUpperCase()}</span>
                        <span
                          className='compare-verdict'
                          style={{
                            background: d.verdict === 'SAFE' ? '#22c55e22' : d.verdict === 'CAUTION' ? '#f59e0b22' : '#ef444422',
                            color:      d.verdict === 'SAFE' ? '#22c55e'  : d.verdict === 'CAUTION' ? '#f59e0b'  : '#ef4444',
                            border: `1px solid ${d.verdict === 'SAFE' ? '#22c55e44' : d.verdict === 'CAUTION' ? '#f59e0b44' : '#ef444444'}`,
                          }}
                        >
                          {d.verdict}
                        </span>
                      </div>
                      {/* Risk gauge */}
                      <div className='compare-gauge'>
                        <div
                          className='compare-gauge-fill'
                          style={{
                            width: `${d.risk_score}%`,
                            background: getRiskColor(d.risk_score),
                          }}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const vals = loaded.map(d => d[row.key])
                  const bestIdx = best(vals, row.invertBest ? !row.higherIsBetter : row.higherIsBetter)
                  return (
                    <tr key={ri} className='compare-row'>
                      <td className='compare-td-label'>{row.label}</td>
                      {loaded.map((d, ci) => {
                        const v     = d[row.key]
                        const isBest = ci === bestIdx && loaded.length > 1
                        const color  = row.key === 'change'
                          ? (v as number) >= 0 ? '#22c55e' : '#ef4444'
                          : row.key === 'risk_score'
                          ? getRiskColor(v as number)
                          : row.key === 'is_honeypot'
                          ? (v ? '#ef4444' : '#22c55e')
                          : undefined
                        return (
                          <td
                            key={ci}
                            className={'compare-td-val' + (isBest ? ' compare-best' : '')}
                            style={{ color }}
                          >
                            {row.fmt(v as number | boolean | string)}
                            {isBest && <span className='compare-best-badge'>✓</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <p className='compare-note'>
              ✓ = Best value in category &nbsp;|&nbsp; Risk score: lower is safer
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Watchlist ───────────────────────────────────────────────────────────
export default function Watchlist({ onSelect, addItem, onAlert, persistedItems, fullPage }: Props) {
  const [items,     setItems]     = useState<WatchItem[]>(() =>
    (persistedItems || []).map(p => ({
      token_id: p.address + '-' + p.chain,
      symbol:   p.symbol,
      chain:    p.chain,
      address:  p.address,
    }))
  )
  const [connected,  setConnected]  = useState(false)
  const [input,      setInput]      = useState('')
  const [chain,      setChain]      = useState('bsc')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [comparing,  setComparing]  = useState(false)
  const ws = useRef<WebSocket | null>(null)

  // ── WebSocket ──
  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws/watchlist')
    ws.current.onopen = () => {
      setConnected(true)
      const initial = (persistedItems || []).map(p => p.address + '-' + p.chain)
      if (initial.length > 0) {
        ws.current?.send(JSON.stringify({ action: 'subscribe', token_ids: initial }))
      }
    }
    ws.current.onclose  = () => setConnected(false)
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.prices) {
        setItems(prev => prev.map(item => {
          const p = data.prices.find((px: { target_token: string }) =>
            item.address.toLowerCase() === px.target_token?.toLowerCase()
          )
          if (!p) return item
          return { ...item, price: parseFloat(p.uprice), change: parseFloat(p.price_change) }
        }))
      }
      if (data.alert) {
        setItems(prev => {
          const item = prev.find(i => i.address.toLowerCase() === data.alert.token?.toLowerCase())
          if (!item) return prev
          const newAlert: Alert = {
            type:   data.alert.type,
            symbol: item.symbol,
            change: data.alert.change,
            time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
          onAlert?.(newAlert)
          return prev
        })
      }
    }
    return () => ws.current?.close()
  }, [])

  // ── Auto-add from Dashboard ──
  useEffect(() => {
    if (!addItem) return
    const exists = items.find(i => i.address === addItem.address)
    if (exists) return
    const token_id = addItem.address + '-' + addItem.chain
    const newItem: WatchItem = { token_id, symbol: addItem.symbol, chain: addItem.chain, address: addItem.address }
    setItems(prev => [...prev, newItem])
    const sendSub = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'subscribe', token_ids: [token_id] }))
      } else setTimeout(sendSub, 500)
    }
    sendSub()
  }, [addItem])

  const addManual = () => {
    if (!input.trim()) return
    const token_id = input.trim() + '-' + chain
    const newItem: WatchItem = { token_id, symbol: input.slice(0, 10) + '...', chain, address: input.trim() }
    setItems(prev => [...prev, newItem])
    const sendSub = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'subscribe', token_ids: [token_id] }))
      } else setTimeout(sendSub, 500)
    }
    sendSub()
    setInput('')
  }

  const remove = (address: string, chain: string) => {
    setItems(prev => prev.filter(i => i.address !== address))
    setSelected(prev => { const s = new Set(prev); s.delete(address); return s })
    ws.current?.send(JSON.stringify({ action: 'unsubscribe', token_ids: [address + '-' + chain] }))
  }

  const toggleSelect = (address: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(address)) s.delete(address)
      else if (s.size < 3) s.add(address)
      return s
    })
  }

  const selectedItems = items.filter(i => selected.has(i.address))

  // ─── Full Page ───
  if (fullPage) {
    return (
      <div className='watchlist-page'>
        {/* Header */}
        <div className='wl-page-header'>
          <h2 className='page-title'>Live Watchlist</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Compare button */}
            {selected.size >= 2 && (
              <button className='compare-trigger-btn' onClick={() => setComparing(true)}>
                <GitCompare size={15} />
                Compare {selected.size} Tokens
              </button>
            )}
            <div className='wl-live-badge' style={{ color: connected ? '#22c55e' : '#888' }}>
              <span className={'wl-dot2 ' + (connected ? 'live' : '')} />
              {connected ? 'LIVE' : 'Connecting...'}
            </div>
          </div>
        </div>

        {/* Select hint */}
        {items.length >= 2 && selected.size === 0 && (
          <div className='compare-hint'>
            <GitCompare size={13} />
            Select 2–3 tokens to compare them side by side
          </div>
        )}
        {selected.size === 1 && (
          <div className='compare-hint'>
            <GitCompare size={13} />
            Select 1 or 2 more tokens to compare
          </div>
        )}

        {/* Add input */}
        <div className='wl-page-add'>
          <input
            className='portfolio-input'
            placeholder='Token address...'
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addManual()}
          />
          <select className='wl-select' value={chain} onChange={e => setChain(e.target.value)}>
            {SUPPORTED.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <button className='search-btn' onClick={addManual}><Plus size={15} /> Add</button>
        </div>

        {/* Token Grid */}
        <div className='wl-page-grid'>
          {items.length === 0 && (
            <div className='alerts-empty'>
              <Bell size={32} style={{ opacity: 0.2 }} />
              <p>Add token addresses to monitor live prices and receive alerts</p>
            </div>
          )}
          {items.map(item => {
            const isSelected = selected.has(item.address)
            return (
              <div
                key={item.address}
                className={'wl-page-card' + (isSelected ? ' wl-card-selected' : '')}
                onClick={() => onSelect(item.chain, item.address)}
                style={{ borderColor: isSelected ? '#6366f1' : undefined }}
              >
                <div className='wl-card-top'>
                  {/* Checkbox for compare */}
                  <input
                    type='checkbox'
                    className='wl-compare-check'
                    checked={isSelected}
                    disabled={!isSelected && selected.size >= 3}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleSelect(item.address)}
                    title='Select to compare'
                  />
                  <span className='wl-row-symbol'>{item.symbol}</span>
                  <span className='wl-row-chain'>{item.chain.toUpperCase()}</span>
                  <button
                    className='wl-row-remove'
                    onClick={e => { e.stopPropagation(); remove(item.address, item.chain) }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className='wl-card-price'>
                  {item.price
                    ? '$' + (item.price < 0.01 ? item.price.toExponential(2) : item.price.toPrecision(5))
                    : '—'}
                </div>
                <div
                  className='wl-card-change'
                  style={{ color: !item.change ? '#888' : item.change >= 0 ? '#22c55e' : '#ef4444' }}
                >
                  {item.change !== undefined
                    ? (item.change >= 0 ? '+' : '') + item.change.toFixed(2) + '%'
                    : 'Waiting...'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Compare Modal */}
        {comparing && selectedItems.length >= 2 && (
          <CompareModal items={selectedItems} onClose={() => setComparing(false)} />
        )}
      </div>
    )
  }

  // ─── Sidebar ───
  return (
    <div className='wl-sidebar'>
      <div className='wl-sidebar-header'>
        <div className='wl-sidebar-title'><Activity size={14} />Watchlist</div>
        <div className='wl-live-badge' style={{ color: connected ? '#22c55e' : '#888' }}>
          <span className={'wl-dot2 ' + (connected ? 'live' : '')} />
          {connected ? 'LIVE' : 'OFF'}
        </div>
      </div>
      <div className='wl-list'>
        {items.length === 0 && (
          <div className='wl-empty2'><Bell size={20} style={{ opacity: 0.3 }} /><span>Click "Watch" on any token</span></div>
        )}
        {items.map(item => (
          <div key={item.address} className='wl-row' onClick={() => onSelect(item.chain, item.address)}>
            <div className='wl-row-left'>
              <span className='wl-row-symbol'>{item.symbol}</span>
              <span className='wl-row-chain'>{item.chain.toUpperCase()}</span>
            </div>
            <div className='wl-row-right'>
              {item.price && (
                <span className='wl-row-price'>
                  ${item.price < 0.01 ? item.price.toExponential(2) : item.price.toPrecision(4)}
                </span>
              )}
              {item.change !== undefined && (
                <span className='wl-row-change' style={{ color: item.change >= 0 ? '#22c55e' : '#ef4444' }}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                </span>
              )}
              <button
                className='wl-row-remove'
                onClick={e => { e.stopPropagation(); remove(item.address, item.chain) }}
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}