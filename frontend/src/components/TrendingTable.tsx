import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { api } from '../api'
import type { Token } from '../types'

const CHAINS = ['bsc', 'eth', 'solana', 'base']

export default function TrendingTable({ onSelect }: { onSelect: (chain: string, address: string) => void }) {
  const [chain,  setChain]  = useState('bsc')
  const [tokens, setTokens] = useState<Token[]>([])

  useEffect(() => {
    api.trending(chain).then(d => {
      const list =
        d?.data?.tokens ??
        d?.tokens ??
        (Array.isArray(d?.data) ? d.data : [])
      setTokens(list.slice(0, 15))
    }).catch(console.error)
  }, [chain])

  return (
    <div className='trending'>
      <div className='trending-header'>
        <div className='trending-title'>
          <TrendingUp size={18} />
          Trending
        </div>
        <div className='chain-tabs'>
          {CHAINS.map(c => (
            <button
              key={c}
              className={'chain-tab' + (chain === c ? ' active' : '')}
              onClick={() => setChain(c)}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <table className='token-table'>
        <thead>
          <tr>
            <th>#</th>
            <th>Token</th>
            <th>Price</th>
            <th>24h %</th>
            <th>Market Cap</th>
            <th>Volume 24h</th>
            <th>Holders</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => {
            const chg = Number(t.token_price_change_24h ?? 0)
            const price = parseFloat(t.current_price_usd)
            const mcap  = parseFloat(t.market_cap) / 1e6
            const vol   = parseFloat(t.token_tx_volume_usd_24h ?? '0') / 1e6
            return (
              <tr key={t.token} className='token-row' onClick={() => onSelect(t.chain, t.token)}>
                <td className='td-rank'>{i + 1}</td>
                <td className='td-token'>
                  <img
                    src={t.logo_url}
                    alt=''
                    className='token-logo-sm'
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className='td-symbol'>{t.symbol}</span>
                  <span className='td-name'>{t.name}</span>
                </td>
                <td>${price < 0.01 ? price.toFixed(8) : price.toFixed(4)}</td>
                <td style={{ color: chg >= 0 ? '#22c55e' : '#ef4444' }}>
                  {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                </td>
                <td>${mcap.toFixed(2)}M</td>
                <td>${vol.toFixed(2)}M</td>
                <td>{t.holders.toLocaleString()}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {tokens.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          Loading...
        </div>
      )}
    </div>
  )
}
