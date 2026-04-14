import { useState } from 'react'
import { ExternalLink, Copy, Check, TrendingUp, Shield, Droplets, Users } from 'lucide-react'
import type { RiskReport } from '../types'

interface Props { report: RiskReport }

const EXPLORERS: Record<string, { name: string; url: string }> = {
  bsc:    { name: 'BscScan',   url: 'https://bscscan.com/token/' },
  eth:    { name: 'Etherscan', url: 'https://etherscan.io/token/' },
  base:   { name: 'BaseScan',  url: 'https://basescan.org/token/' },
  solana: { name: 'Solscan',   url: 'https://solscan.io/token/' },
}

function fmtUsd(n: number): string {
  if (!n) return '—'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toFixed(2)
}

export default function TradePanel({ report }: Props) {
  const [copied, setCopied] = useState(false)

  const vc = report.verdict === 'SAFE'
    ? '#22c55e' : report.verdict === 'CAUTION'
    ? '#f59e0b' : '#ef4444'

  const explorer    = EXPLORERS[report.chain]
  const aveTradeUrl = `https://ave.ai/token/${report.token_address}-${report.chain}`
  const aveChartUrl = `https://ave.ai/token/${report.token_address}-${report.chain}?tab=chart`
  const explorerUrl = explorer ? explorer.url + report.token_address : null

  const copyAddress = () => {
    navigator.clipboard.writeText(report.token_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = [
    { icon: <Shield size={13} />,     label: 'Risk Score', value: report.risk_score + '/100',  color: report.risk_score >= 60 ? '#ef4444' : report.risk_score >= 40 ? '#f59e0b' : '#22c55e' },
    { icon: <Users size={13} />,      label: 'Holders',    value: report.holders.toLocaleString(), color: undefined },
    { icon: <Droplets size={13} />,   label: 'Liquidity',  value: fmtUsd(report.liquidity_usd),    color: undefined },
    { icon: <TrendingUp size={13} />, label: '24h Change', value: (report.price_change_24h >= 0 ? '+' : '') + report.price_change_24h.toFixed(2) + '%', color: report.price_change_24h >= 0 ? '#22c55e' : '#ef4444' },
  ]

  return (
    <div className='action-panel'>

      {/* Header */}
      <div className='action-header'>
        <div className='action-token-info'>
          <span className='action-symbol'>{report.token_symbol}</span>
          <span className='action-price'>${report.price_usd < 0.001 ? report.price_usd.toExponential(2) : report.price_usd.toPrecision(5)}</span>
          <span className='action-chain-badge'>{report.chain.toUpperCase()}</span>
        </div>
        <span className='action-verdict' style={{ color: vc }}>{report.verdict}</span>
      </div>

      {/* Stats grid */}
      <div className='action-stats'>
        {stats.map((s, i) => (
          <div key={i} className='action-stat'>
            <span className='action-stat-label'>{s.icon} {s.label}</span>
            <span className='action-stat-value' style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Honeypot warning */}
      {report.is_honeypot && (
        <div className='action-honeypot-warn'>
          ⚠️ Honeypot Detected — Cannot sell this token
        </div>
      )}

      {/* Address copy */}
      <div className='action-address-row'>
        <span className='action-address-text'>
          {report.token_address.slice(0, 8)}...{report.token_address.slice(-6)}
        </span>
        <button className='action-copy-btn' onClick={copyAddress}>
          {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Address</>}
        </button>
      </div>

      {/* AVE Links */}
      <div className='action-links'>
        <a href={aveTradeUrl} target='_blank' rel='noopener noreferrer' className='action-link-btn action-link-primary'>
          <ExternalLink size={14} />
          Trade on AVE Pro
        </a>

        <a href={aveChartUrl} target='_blank' rel='noopener noreferrer' className='action-link-btn action-link-secondary'>
          <ExternalLink size={14} />
          Chart on AVE
        </a>

        {explorerUrl && (
          <a href={explorerUrl} target='_blank' rel='noopener noreferrer' className='action-link-btn action-link-secondary'>
            <ExternalLink size={14} />
            {explorer.name}
          </a>
        )}
      </div>

    </div>
  )
}