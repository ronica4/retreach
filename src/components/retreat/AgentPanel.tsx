'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { type Retreat } from '@/types'
import { Send, Bot, User, Loader2, CheckCircle, XCircle, CalendarDays, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  interactionId?: string
  actions?: Array<{ type: string; count?: number }>
}

interface Props {
  retreat: Retreat
}

const CHAT_KEY  = (id: string) => `retreach_agent_${id}`
const MAX_MSGS  = 50

function makeWelcome(retreat: Retreat): Message {
  return {
    role: 'assistant',
    content: `Hi! I'm your RetReach AI for **${retreat.name}**.\n\nI have full access to your retreat data — vendors, participants, schedule — plus feedback patterns from all your past retreats.\n\nI can:\n• Build the schedule (I'll propose first, then wait for your OK)\n• Draft emails to specific vendors with real deadlines\n• Flag overdue items and budget risks\n• Answer anything about this retreat\n• Suggest improvements based on past retreat feedback`,
  }
}

export default function AgentPanel({ retreat }: Props) {
  const router  = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_KEY(retreat.id))
      const parsed: Message[] | null = saved ? JSON.parse(saved) : null
      setMessages(parsed && parsed.length > 0 ? parsed : [makeWelcome(retreat)])
    } catch {
      setMessages([makeWelcome(retreat)])
    }
  }, [retreat.id])

  // Persist to localStorage whenever messages change
  useEffect(() => {
    if (messages.length === 0) return
    try {
      localStorage.setItem(CHAT_KEY(retreat.id), JSON.stringify(messages.slice(-MAX_MSGS)))
    } catch {}
  }, [messages, retreat.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const updated = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          retreatId: retreat.id,
          history: updated.slice(-14, -1),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error || !data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.detail?.includes('Missing credentials')
            ? 'The AI agent is not configured yet. Please add an OpenAI API key to .env.local and restart.'
            : `Agent error: ${data.detail ?? data.error ?? 'unknown'}`,
        }])
        return
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        interactionId: data.interactionId,
        actions: data.actionsPerformed,
      }])
      if (data.actionsPerformed?.length > 0) router.refresh()
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  async function recordFeedback(interactionId: string, accepted: boolean) {
    await fetch('/api/agent/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interactionId, accepted }),
    })
    setMessages(prev => prev.map(m =>
      m.interactionId === interactionId ? { ...m, interactionId: undefined } : m
    ))
  }

  function clearHistory() {
    try { localStorage.removeItem(CHAT_KEY(retreat.id)) } catch {}
    setMessages([makeWelcome(retreat)])
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 nice-scroll">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-emerald-100' : 'bg-stone-100')}>
              {msg.role === 'assistant'
                ? <Bot size={12} className="text-emerald-700" />
                : <User size={12} className="text-stone-600" />}
            </div>
            <div className={cn('max-w-[85%] flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn('px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'assistant'
                  ? 'bg-stone-50 text-stone-800 rounded-tl-none'
                  : 'bg-emerald-700 text-white rounded-tr-none')}>
                {msg.content}
              </div>
              {msg.actions?.some(a => a.type === 'schedule_created') && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-2.5 py-1.5">
                  <CalendarDays size={12} />
                  Schedule updated — open the Agenda tab to see it
                </div>
              )}
              {msg.interactionId && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-stone-400">Helpful?</span>
                  <button onClick={() => recordFeedback(msg.interactionId!, true)} className="text-emerald-500 hover:text-emerald-600">
                    <CheckCircle size={14} />
                  </button>
                  <button onClick={() => recordFeedback(msg.interactionId!, false)} className="text-rose-400 hover:text-rose-500">
                    <XCircle size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Bot size={12} className="text-emerald-700" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-stone-50 rounded-tl-none">
              <Loader2 size={14} className="text-stone-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-stone-100 space-y-1.5 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask anything about this retreat…"
            className="flex-1 text-sm bg-white rounded-lg px-3 py-2 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs text-stone-300">Build schedule · Draft vendor email · Who hasn't paid?</p>
          <button onClick={clearHistory} title="Clear chat history"
            className="text-xs text-stone-300 hover:text-stone-500 flex items-center gap-0.5 transition-colors">
            <Trash2 size={10} /> Clear
          </button>
        </div>
      </div>
    </div>
  )
}
