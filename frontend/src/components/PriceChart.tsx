import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api'

interface Props { chain: string; address: string }
interface Point { time: string; price: number }

export default function PriceChart({ chain, address }: Props) {
  const [data,    setData]    = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    setData([])
    api.kline(chain, address, 60, 72)
      .then(res => {
        const raw = res?.data?.points ?? []
        if (!Array.isArray(raw) || raw.length === 0) {
          setError('No chart data available')
          return
        }
        const points: Point[] = raw.map((p: { time: number; close: string }) => ({
          time:  new Date(p.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: parseFloat(p.close),
        }))
        setData(points)
      })
      .catch(() => setError('Failed to load chart'))
      .finally(() => setLoading(false))
  }, [chain, address])

  const prices   = data.map(d => d.price)
  const minPrice = prices.length ? Math.min(...prices) * 0.998 : 0
  const maxPrice = prices.length ? Math.max(...prices) * 1.002 : 1

  return (
    <div className='chart-panel'>
      <div className='chart-title'>Price Chart — 72h (1h candles)</div>
      {loading && <div className='chart-msg'>Loading...</div>}
      {error   && <div className='chart-msg'>{error}</div>}
      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width='100%' height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id='pg' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%'  stopColor='#6366f1' stopOpacity={0.4} />
                <stop offset='95%' stopColor='#6366f1' stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey='time' tick={{ fill: '#888', fontSize: 10 }} interval={11} />
            <YAxis
              tick={{ fill: '#888', fontSize: 10 }}
              domain={[minPrice, maxPrice]}
              tickFormatter={(v: number) =>
                v < 0.001 ? v.toExponential(2) : v.toPrecision(4)
              }
              width={72}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 12 }}
              formatter={(v: number) => ['$' + v.toPrecision(6), 'Price']}
            />
            <Area
              type='monotone'
              dataKey='price'
              stroke='#6366f1'
              fill='url(#pg)'
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
