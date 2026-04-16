import { useState } from 'react'
import type { RiskReport } from '../types'
import { Zap, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'

interface Props { report: RiskReport }

interface SimResult {
  simulation: string
  investment: number
  tokens_received: number
  current_price: number
  risk_score: number
}

export default function RiskSimulator({ report }: Props) {
  const [open,       setOpen]       = useState(false)
  const [investment, setInvestment] = useState('100')
  const [scenario,   setScenario]   = useState('balanced')
  const [result,     setResult]     = useState<SimResult | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const simulate = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    
    const BACKEND_URL = "https://defi-risk-sentinel-production.up.railway.app";

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/simulate`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            token_data: report, 
            investment_usd: parseFloat(investment), 
            scenario 
        }),
      })
      
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch (err) {
      setError('Failed to run simulation. Check console for details.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const riskColor = report.risk_score >= 80 ? '#ef4444' : report.risk_score >= 60 ? '#f97316' : report.risk_score >= 40 ? '#f59e0b' : '#22c55e'

  const formatSimulation = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim()
      if (!trimmed) return null
      const isBest    = trimmed.toLowerCase().includes('best case')
      const isBase    = trimmed.toLowerCase().includes('base case')
      const isWorst   = trimmed.toLowerCase().includes('worst case')
      const isRec     = trimmed.toLowerCase().includes('recommendation')
      const isStop    = trimmed.toLowerCase().includes('stop loss')
      const isTake    = trimmed.toLowerCase().includes('take profit')
      const isHeader  = isBest || isBase || isWorst || isRec || isStop || isTake
      return (
        <div key={i} className={isHeader ? 'sim-line-header' : 'sim-line'}>
          {isBest  && <TrendingUp  size={14} color="#22c55e" />}
          {isBase  && <Minus       size={14} color="#f59e0b" />}
          {isWorst && <TrendingDown size={14} color="#ef4444" />}
          {isRec   && <Zap         size={14} color="#818cf8" />}
          <span>{trimmed}</span>
        </div>
      )
    }).filter(Boolean)
  }

  return (
    <div className='simulator'>
      <button className='sim-toggle' onClick={() => setOpen(!open)}>
        <Zap size={15} />
        What If? — Risk Simulator
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className='sim-body'>
          <div className='sim-token-info'>
            <span className='sim-token-name'>{report.token_name} ({report.token_symbol})</span>
            <span className='sim-risk-badge' style={{ color: riskColor, borderColor: riskColor + '44', background: riskColor + '11' }}>
              {report.risk_level} {report.risk_score}/100
            </span>
          </div>

          {report.is_honeypot && (
            <div className='sim-warning'>
              ⚠️ Honeypot detected — simulation will show 100% loss risk
            </div>
          )}

          <div className='sim-controls'>
            <div className='sim-field'>
              <label className='sim-label'>Investment Amount (USD)</label>
              <div className='sim-presets'>
                {['50', '100', '500', '1000'].map(v => (
                  <button key={v} className={'sim-preset' + (investment === v ? ' active' : '')} onClick={() => setInvestment(v)}>
                    ${v}
                  </button>
                ))}
              </div>
              <input className='sim-input' type='number' value={investment} min='1' onChange={e => setInvestment(e.target.value)} placeholder='Custom amount...' />
            </div>

            <div className='sim-field'>
              <label className='sim-label'>Scenario</label>
              <div className='sim-scenarios'>
                {[
                  { id: 'bullish',      label: '🚀 Bullish',      desc: 'Best case' },
                  { id: 'balanced',     label: '⚖️ Balanced',     desc: 'Realistic' },
                  { id: 'conservative', label: '🛡️ Conservative',  desc: 'Risk-first' },
                ].map(s => (
                  <button key={s.id} className={'sim-scenario' + (scenario === s.id ? ' active' : '')} onClick={() => setScenario(s.id)}>
                    <span>{s.label}</span>
                    <span className='sim-scenario-desc'>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {parseFloat(investment) > 0 && report.price_usd > 0 && (
            <div className='sim-preview'>
              <span>${investment} → </span>
              <span className='sim-tokens'>{(parseFloat(investment) / report.price_usd).toFixed(4)} {report.token_symbol}</span>
              <span> @ ${report.price_usd.toFixed(6)}</span>
            </div>
          )}

          <button className='sim-run-btn' onClick={simulate} disabled={loading}>
            {loading ? (
              <><span className='sim-spinner' />Analyzing with AI...</>
            ) : (
              <><Zap size={15} />Run Simulation</>
            )}
          </button>

          {error && <div className='sim-error'>{error}</div>}

          {result && (
            <div className='sim-result'>
              <div className='sim-result-header'>
                <span>AI Simulation Results</span>
                <span className='sim-powered'>powered by dgrid.ai</span>
              </div>
              <div className='sim-result-body'>
                {formatSimulation(result.simulation)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
