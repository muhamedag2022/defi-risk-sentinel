import { useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../api'
import type { RiskReport, Token } from '../types'

interface Props {
  onSelect: (chain: string, address: string) => void
  onRisk:   (r: RiskReport) => void
  setLoading: (v: boolean) => void
}

export default function SearchBar({ onSelect, onRisk, setLoading }: Props) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Token[]>([])
  const [open,    setOpen]    = useState(false)

  const search = async () => {
    if (!query.trim()) return
    const data = await api.search(query)
    const list = Array.isArray(data) ? data : data?.data ?? []
    setResults(list.slice(0, 8))
    setOpen(true)
  }

  const pick = async (token: Token) => {
    setOpen(false)
    setQuery(`${token.symbol} — ${token.chain}`)
    setLoading(true)
    try {
      const report = await api.risk(token.chain, token.token)
      onSelect(token.chain, token.token)
      onRisk(report)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="search-wrap">
      <div className="search-box">
        <input
          className="search-input"
          placeholder="Search token by name or address..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button className="search-btn" onClick={search}>
          <Search size={18} />
          Analyze
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map(t => (
            <li key={`${t.token}-${t.chain}`} className="search-item" onClick={() => pick(t)}>
              <img src={t.logo_url} alt="" className="token-logo" onError={e => (e.currentTarget.style.display = 'none')} />
              <span className="token-symbol">{t.symbol}</span>
              <span className="token-name">{t.name}</span>
              <span className="token-chain">{t.chain}</span>
              <span className="token-price">${parseFloat(t.current_price_usd).toFixed(6)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}