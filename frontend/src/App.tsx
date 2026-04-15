import { useState } from 'react'
import SearchBar from './components/SearchBar'
import TrendingTable from './components/TrendingTable'
import RiskPanel from './components/RiskPanel'
import PriceChart from './components/PriceChart'
import TradePanel from './components/TradePanel'
import RiskSimulator from './components/RiskSimulator'
import Watchlist from './components/Watchlist'
import type { RiskReport } from './types'
import { api } from './api'
import { LayoutDashboard, Eye, Wallet, Bell } from 'lucide-react'
import './App.css'
import AiChat from './components/AiChat'

type Tab = 'dashboard' | 'watchlist' | 'portfolio' | 'alerts'

interface WatchItem { symbol: string; chain: string; address: string }
interface Alert { type: string; symbol: string; change: number; time: string }

export default function App() {
  const [tab,      setTab]      = useState<Tab>('dashboard')
  const [risk,     setRisk]     = useState<RiskReport | null>(null)
  const [selected, setSelected] = useState<{ chain: string; address: string } | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [watchAdd, setWatchAdd] = useState<WatchItem | null>(null)
  const [alerts,   setAlerts]   = useState<Alert[]>([])

  const analyze = async (chain: string, address: string) => {
    setTab('dashboard')
    setSelected({ chain, address })
    setRisk(null)
    setLoading(true)
    try {
      const report = await api.risk(chain, address)
      setRisk(report)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const [persistedItems, setPersistedItems] = useState<WatchItem[]>([])

  const isWatched = persistedItems.some(i => i.address === selected?.address)

  const addToWatch = () => {
    if (!risk || !selected) return
    const item = { symbol: risk.token_symbol, chain: selected.chain, address: selected.address }
    if (!isWatched) {
      setPersistedItems(prev => [...prev, item])
      setWatchAdd(item)
      setTimeout(() => setWatchAdd(null), 1000)
    }
  }

  const removeFromWatch = () => {
    if (!selected) return
    setPersistedItems(prev => prev.filter(i => i.address !== selected.address))
  }

  const onAlert = (alert: Alert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 49)])
  }

  const TABS = [
    { id: 'dashboard' as Tab, label: 'Dashboard',  icon: <LayoutDashboard size={15} /> },
    { id: 'watchlist' as Tab, label: 'Watchlist',  icon: <Eye size={15} /> },
    { id: 'portfolio' as Tab, label: 'Portfolio',  icon: <Wallet size={15} /> },
    { id: 'alerts'    as Tab, label: 'Alerts',     icon: <Bell size={15} />, badge: alerts.length },
  ]

  return (
    <div className='app'>
      <header className='header'>
        <div className='header-inner'>
          <div className='logo'>
            <span className='logo-icon'>🛡️</span>
            <span className='logo-text'>DeFi Risk Sentinel</span>
          </div>
          <nav className='nav-tabs'>
            {TABS.map(t => (
              <button
                key={t.id}
                className={'nav-tab' + (tab === t.id ? ' active' : '')}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                {t.label}
                {t.badge ? <span className='nav-badge'>{t.badge}</span> : null}
              </button>
            ))}
          </nav>
          <span className='logo-sub'>Powered by AVE Cloud Skills</span>
        </div>
      </header>

      <main className='main'>

        {tab === 'dashboard' && (
          <>
            <SearchBar onSelect={analyze} onRisk={setRisk} setLoading={setLoading} />
            {loading && <div className='loading-bar'><div className='loading-fill' /></div>}
            {risk && selected && (
              <div className='analysis-grid'>
                <div className='risk-col'>
                  <RiskPanel report={risk} />
                  {isWatched ? (
                    <button className='watch-btn watched' onClick={removeFromWatch}>✓ Remove from Watchlist</button>
                  ) : (
                    <button className='watch-btn' onClick={addToWatch}>+ Add to Watchlist</button>
                  )}
                  <RiskSimulator report={risk} />
                </div>
                <div className='right-col'>
                  <PriceChart chain={selected.chain} address={selected.address} />
                  <TradePanel report={risk} />
                </div>
                <AiChat report={risk} />
              </div>
            )}
            <TrendingTable onSelect={analyze} />
          </>
        )}

        {tab === 'watchlist' && (
          <Watchlist onSelect={analyze} addItem={watchAdd} onAlert={onAlert} persistedItems={persistedItems} fullPage />
        )}

        {tab === 'portfolio' && (
          <PortfolioTab onSelect={analyze} />
        )}

        {tab === 'alerts' && (
          <AlertsTab alerts={alerts} onClear={() => setAlerts([])} />
        )}

      </main>
    </div>
  )
}

interface WalletToken {
  address: string
  symbol: string
  chain: string
  balance_usd: number
  balance_amount: string
  price_usd: number
  unrealized_profit: string
  total_profit: string
  total_profit_ratio: string
  risk_score: number
  risk_level: number
  logo_url: string
}

function getRiskLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'CRITICAL', color: '#ef4444' }
  if (score >= 60) return { label: 'HIGH',     color: '#f97316' }
  if (score >= 40) return { label: 'MEDIUM',   color: '#f59e0b' }
  return                  { label: 'LOW',      color: '#22c55e' }
}

function fmtUsd(n: number): string {
  if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T'
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(2)  + 'B'
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(2)  + 'M'
  if (n >= 1e3)  return '$' + (n/1e3).toFixed(2)  + 'K'
  return '$' + n.toFixed(2)
}

function PortfolioTab({ onSelect }: { onSelect: (chain: string, address: string) => void }) {
  const [wallet,     setWallet]     = useState('')
  const [chain,      setChain]      = useState('bsc')
  const [tokens,     setTokens]     = useState<WalletToken[]>([])
  const [totalUsd,   setTotalUsd]   = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [sortBy,     setSortBy]     = useState<'value'|'risk'>('value')

  const scan = async () => {
    if (!wallet.trim()) return
    setLoading(true)
    setError('')
    setTokens([])
    try {
      const res  = await fetch('https://defi-risk-sentinel-production.up.railway.app/api/wallet/tokens?wallet=' + encodeURIComponent(wallet.trim()) + '&chain=' + chain)
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setTokens(data.tokens || [])
        setTotalUsd(data.total_usd || 0)
      }
    } catch {
      setError('Failed to scan wallet')
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...tokens].sort((a, b) =>
    sortBy === 'value' ? b.balance_usd - a.balance_usd : b.risk_score - a.risk_score
  )

  const dangerCount  = tokens.filter(t => t.risk_score >= 60).length
  const highestRisk  = tokens.reduce((max, t) => t.risk_score > max ? t.risk_score : max, 0)

  return (
    <div className='portfolio-page'>
      <div className='portfolio-header'>
        <h2 className='page-title'>Portfolio Scanner</h2>
        <p className='page-sub'>Analyze all tokens in any wallet — risk scores, balances, and P&L</p>
      </div>

      <div className='portfolio-search'>
        <input
          className='portfolio-input'
          placeholder='Wallet address (0x... or Solana)'
          value={wallet}
          onChange={e => setWallet(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
        />
        <select className='wl-select' value={chain} onChange={e => setChain(e.target.value)}>
          {['bsc', 'eth', 'base', 'solana'].map(c => (
            <option key={c} value={c}>{c.toUpperCase()}</option>
          ))}
        </select>
        <button className='search-btn' onClick={scan} disabled={loading}>
          {loading ? 'Scanning...' : 'Scan Wallet'}
        </button>
      </div>

      {loading && (
        <div className='portfolio-scanning'>
          <div className='loading-bar'><div className='loading-fill' /></div>
          <p style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>Fetching wallet tokens...</p>
        </div>
      )}

      {error && <div className='portfolio-error'>{error}</div>}

      {tokens.length > 0 && (
        <>
          <div className='portfolio-summary'>
            <div className='port-stat'>
              <span className='port-stat-label'>Total Tokens</span>
              <span className='port-stat-value'>{tokens.length}</span>
            </div>
            <div className='port-stat'>
              <span className='port-stat-label'>Total Value</span>
              <span className='port-stat-value'>{fmtUsd(totalUsd)}</span>
            </div>
            <div className='port-stat'>
              <span className='port-stat-label'>High Risk Tokens</span>
              <span className='port-stat-value' style={{ color: dangerCount > 0 ? '#ef4444' : '#22c55e' }}>
                {dangerCount}
              </span>
            </div>
            <div className='port-stat'>
              <span className='port-stat-label'>Highest Risk Score</span>
              <span className='port-stat-value' style={{ color: getRiskLabel(highestRisk).color }}>
                {highestRisk}/100
              </span>
            </div>
          </div>

          {dangerCount > 0 && (
            <div className='portfolio-alert'>
              ⚠️ {dangerCount} token{dangerCount > 1 ? 's' : ''} in your wallet flagged as HIGH/CRITICAL risk
            </div>
          )}

          <div className='portfolio-controls'>
            <span style={{ color: '#888', fontSize: '0.82rem' }}>Sort by:</span>
            <button className={'sort-btn' + (sortBy === 'value' ? ' active' : '')} onClick={() => setSortBy('value')}>Value</button>
            <button className={'sort-btn' + (sortBy === 'risk'  ? ' active' : '')} onClick={() => setSortBy('risk')}>Risk Score</button>
          </div>

          <div className='portfolio-grid'>
            {sorted.map((t, i) => {
              const risk = getRiskLabel(t.risk_score)
              const profit = parseFloat(t.unrealized_profit || '0')
              return (
                <div key={i} className='ptc-card' style={{ borderColor: t.risk_score >= 60 ? risk.color + '44' : '' }} onClick={() => onSelect(t.chain, t.address)}>
                  <div className='ptc-top'>
                    <div className='ptc-left'>
                      {t.logo_url && <img src={t.logo_url} alt='' className='token-logo-sm' onError={e => { (e.currentTarget as HTMLImageElement).style.display='none' }} />}
                      <div>
                        <div className='ptc-symbol'>{t.symbol}</div>
                        <div className='ptc-chain'>{t.chain.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className='ptc-risk-badge' style={{ background: risk.color + '22', color: risk.color, border: '1px solid ' + risk.color + '44' }}>
                      {risk.label} {t.risk_score}
                    </div>
                  </div>

                  <div className='ptc-value'>{fmtUsd(t.balance_usd)}</div>

                  <div className='ptc-stats'>
                    <div className='ptc-stat-row'>
                      <span>Price</span>
                      <span>{t.price_usd > 0 ? '$' + (t.price_usd < 0.001 ? t.price_usd.toExponential(2) : t.price_usd.toPrecision(4)) : '—'}</span>
                    </div>
                    <div className='ptc-stat-row'>
                      <span>Unrealized P&L</span>
                      <span style={{ color: profit >= 0 ? '#22c55e' : '#ef4444' }}>
                        {profit !== 0 ? (profit >= 0 ? '+' : '') + profit.toFixed(2) : '—'}
                      </span>
                    </div>
                    <div className='ptc-stat-row'>
                      <span>Total Profit</span>
                      <span>{t.total_profit !== '--' ? '$' + parseFloat(t.total_profit || '0').toFixed(2) : '—'}</span>
                    </div>
                  </div>

                  <div className='ptc-footer-btn'>Analyze Risk →</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function AlertsTab({
  alerts,
  onClear,
}: {
  alerts: { type: string; symbol: string; change: number; time: string }[]
  onClear: () => void
}) {
  const [chatId,  setChatId]  = useState('')
  const [saved,   setSaved]   = useState(() => localStorage.getItem('tg_chat_id') || '')
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState('')

  //  chat_id
  const saveChatId = () => {
    if (!chatId.trim()) return
    localStorage.setItem('tg_chat_id', chatId.trim())
    setSaved(chatId.trim())
    setChatId('')
    setTestMsg('✅ Chat ID saved!')
    setTimeout(() => setTestMsg(''), 3000)
  }

  // 
  const testConnection = async () => {
    const id = saved || chatId.trim()
    if (!id) { setTestMsg('⚠️ Enter your Chat ID first'); return }
    setTesting(true)
    setTestMsg('')
    try {
      const r    = await fetch(`https://defi-risk-sentinel-production.up.railway.app/api/telegram/test?chat_id=${encodeURIComponent(id)}`, { method: 'POST' })
      const data = await r.json()
      setTestMsg(data.success ? '✅ Message sent! Check Telegram.' : '❌ Failed: ' + (data.error || 'Unknown error'))
    } catch {
      setTestMsg('❌ Server error')
    } finally {
      setTesting(false)
    }
  }

  // Chat ID
  const howToGetId = () => {
    window.open('https://t.me/userinfobot', '_blank')
  }

  return (
    <div className='alerts-page'>

      {/* ── Telegram Setup Card ── */}
      <div className='tg-setup-card'>
        <div className='tg-setup-header'>
          <span className='tg-icon'>✈️</span>
          <div>
            <div className='tg-setup-title'>Telegram Alerts</div>
            <div className='tg-setup-sub'>Get PUMP/DUMP alerts instantly on Telegram</div>
          </div>
          {saved && (
            <div className='tg-connected-badge'>
              <span className='wl-dot2 live' />
              Connected
            </div>
          )}
        </div>

        {saved ? (
          // ── Already configured ──
          <div className='tg-configured'>
            <div className='tg-chat-display'>
              <span style={{ color: '#888', fontSize: '0.82rem' }}>Chat ID:</span>
              <span className='tg-chat-id-val'>{saved}</span>
              <button className='tg-change-btn' onClick={() => { setSaved(''); localStorage.removeItem('tg_chat_id') }}>
                Change
              </button>
            </div>
            <button className='tg-test-btn' onClick={testConnection} disabled={testing}>
              {testing ? 'Sending...' : '📨 Send Test Message'}
            </button>
          </div>
        ) : (
          // ── Setup form ──
          <div className='tg-setup-form'>
            <div className='tg-steps'>
              <div className='tg-step'>
                <span className='tg-step-num'>1</span>
                <span>Open Telegram → search <b>@DeFi_SentinelBot</b> → send <code>/start</code></span>
              </div>
              <div className='tg-step'>
                <span className='tg-step-num'>2</span>
                <span>Get your Chat ID from <button className='tg-link-btn' onClick={howToGetId}>@userinfobot</button></span>
              </div>
              <div className='tg-step'>
                <span className='tg-step-num'>3</span>
                <span>Enter your Chat ID below</span>
              </div>
            </div>

            <div className='tg-input-row'>
              <input
                className='portfolio-input'
                placeholder='Your Telegram Chat ID (e.g. 123456789)'
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveChatId()}
                type='number'
              />
              <button className='search-btn' onClick={saveChatId}>Save</button>
              <button className='tg-test-btn' onClick={testConnection} disabled={testing || !chatId.trim()}>
                {testing ? '...' : 'Test'}
              </button>
            </div>
          </div>
        )}

        {testMsg && (
          <div className={'tg-msg ' + (testMsg.startsWith('✅') ? 'tg-msg-ok' : 'tg-msg-err')}>
            {testMsg}
          </div>
        )}
      </div>

      {/* ── Alert History ── */}
      <div className='alerts-header'>
        <h2 className='page-title'>Alert History</h2>
        {alerts.length > 0 && (
          <button className='clear-btn' onClick={onClear}>Clear All</button>
        )}
      </div>

      {alerts.length === 0 && (
        <div className='alerts-empty'>
          <Bell size={32} style={{ opacity: 0.2 }} />
          <p>No alerts yet — add tokens to Watchlist to receive PUMP/DUMP alerts</p>
        </div>
      )}

      <div className='alerts-list'>
        {alerts.map((a, i) => (
          <div key={i} className={'alert-row ' + (a.type === 'DUMP' ? 'dump' : 'pump')}>
            <span className='alert-type'>{a.type === 'PUMP' ? '🚀' : '🔴'} {a.type}</span>
            <span className='alert-symbol'>{a.symbol}</span>
            <span className='alert-change'>{a.change.toFixed(2)}%</span>
            <span className='alert-time'>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}