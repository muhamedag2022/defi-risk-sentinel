import type { RiskReport } from '../types'
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle } from 'lucide-react'

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
  LOW:      { bg: '#0d2b1a', border: '#22c55e', text: '#22c55e' },
  MEDIUM:   { bg: '#2b2000', border: '#f59e0b', text: '#f59e0b' },
  HIGH:     { bg: '#2b0d00', border: '#f97316', text: '#f97316' },
  CRITICAL: { bg: '#2b0000', border: '#ef4444', text: '#ef4444' },
}

function fmt(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + n.toFixed(4)
}

function RiskIcon({ level }: { level: string }) {
  if (level === 'LOW') return <ShieldCheck size={32} />
  if (level === 'MEDIUM') return <AlertTriangle size={32} />
  if (level === 'HIGH') return <ShieldAlert size={32} />
  return <ShieldX size={32} />
}

export default function RiskPanel({ report }: { report: RiskReport }) {
  const c = COLORS[report.risk_level] ?? COLORS['MEDIUM']
  const stats: [string, string][] = [
    ['Price',      '$' + report.price_usd.toFixed(6)],
    ['Market Cap', fmt(report.market_cap)],
    ['Volume 24h', fmt(report.volume_24h)],
    ['TVL',        fmt(report.tvl)],
    ['Holders',    report.holders.toLocaleString()],
    ['Top Holder', (report.top_holder_pct * 100).toFixed(1) + '%'],
    ['Liquidity',  fmt(report.liquidity_usd)],
    ['Locked',     (report.lock_percent * 100).toFixed(1) + '%'],
    ['24h Change', report.price_change_24h.toFixed(2) + '%'],
    ['Honeypot',   report.is_honeypot ? 'YES' : 'No'],
  ]
  const aveUrl = 'https://pro.ave.ai/token/' + report.token_address + '-' + report.chain
  return (
    <div className='risk-panel' style={{ borderColor: c.border }}>
      <div className='risk-header' style={{ background: c.bg, color: c.text }}>
        <RiskIcon level={report.risk_level} />
        <div>
          <div className='risk-title'>{report.token_name} ({report.token_symbol})</div>
          <div className='risk-level'>{report.risk_level} RISK — {report.verdict}</div>
        </div>
        <div className='risk-score' style={{ color: c.text }}>
          {report.risk_score}<span>/100</span>
        </div>
      </div>
      <div className='risk-score-bar'>
        <div className='risk-score-fill' style={{ width: report.risk_score + '%', background: c.border }} />
      </div>
      <div className='risk-stats'>
        {stats.map(([label, value]) => (
          <div key={label} className='stat-card'>
            <div className='stat-label'>{label}</div>
            <div className='stat-value'>{value}</div>
          </div>
        ))}
      </div>
      <div className='risk-reasons'>
        <div className='reasons-title'>Analysis Findings</div>
        {report.reasons.map((reason, i) => (
          <div key={i} className='reason-item'>{reason}</div>
        ))}
      </div>
      <a className='ave-link' href={aveUrl} target='_blank' rel='noreferrer'>
        View on AVE Pro
      </a>
    </div>
  )
}
