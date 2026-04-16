// frontend/src/components/AiChat.tsx
// New file — AI Chat panel powered by dgrid.ai

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, Minimize2, Maximize2 } from 'lucide-react'
import type { RiskReport } from '../types'

interface Message {
  role: 'user' | 'ai'
  text: string
}

const QUICK = [
  'Is this token safe to buy?',
  'What are the main risks?',
  'Should I invest in this token?',
  'Explain the risk score',
]

export default function AiChat({ report }: { report: RiskReport }) {
  const [open,     setOpen]     = useState(false)
  const [mini,     setMini]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: `Hello! I'm your DeFi AI analyst. I've analyzed **${report.token_name} (${report.token_symbol})** — Risk Score: **${report.risk_score}/100** (${report.risk_level}). Ask me anything about this token!`,
    },
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset when token changes
  useEffect(() => {
    setMessages([{
      role: 'ai',
      text: `Hello! I've analyzed **${report.token_name} (${report.token_symbol})** — Risk Score: **${report.risk_score}/100** (${report.risk_level}). Ask me anything!`,
    }])
  }, [report.token_address])

  const send = async (question: string) => {
    if (!question.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)
    try {
      const r = await fetch('https://defi-risk-sentinel-production.up.railway.app/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, token_data: report }),
      })
      const d = await r.json()
      setMessages(prev => [...prev, {
        role: 'ai',
        text: d.answer || d.error || 'No response',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '❌ Connection error. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  // Render markdown bold
  const fmt = (text: string) =>
    text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    )

  if (!open) {
    return (
      <button className='ai-fab' onClick={() => setOpen(true)} title='Ask AI about this token'>
        <Bot size={20} />
        <span>Ask AI</span>
      </button>
    )
  }

  return (
    <div className={'ai-chat-panel' + (mini ? ' ai-mini' : '')}>
      {/* Header */}
      <div className='ai-chat-header'>
        <div className='ai-chat-title'>
          <Bot size={16} />
          <span>AI Analyst</span>
          <span className='ai-powered'>dgrid.ai</span>
        </div>
        <div className='ai-chat-controls'>
          <button onClick={() => setMini(!mini)} className='ai-ctrl-btn'>
            {mini ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={() => setOpen(false)} className='ai-ctrl-btn'>
            <X size={14} />
          </button>
        </div>
      </div>

      {!mini && (
        <>
          {/* Messages */}
          <div className='ai-messages'>
            {messages.map((m, i) => (
              <div key={i} className={'ai-msg ' + (m.role === 'user' ? 'ai-msg-user' : 'ai-msg-ai')}>
                {m.role === 'ai' && <div className='ai-avatar'><Bot size={13} /></div>}
                <div className='ai-bubble'>{fmt(m.text)}</div>
              </div>
            ))}
            {loading && (
              <div className='ai-msg ai-msg-ai'>
                <div className='ai-avatar'><Bot size={13} /></div>
                <div className='ai-bubble ai-typing'>
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div className='ai-quick'>
              {QUICK.map((q, i) => (
                <button key={i} className='ai-quick-btn' onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className='ai-input-row'>
            <input
              className='ai-input'
              placeholder='Ask about this token...'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              disabled={loading}
            />
            <button
              className='ai-send-btn'
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}