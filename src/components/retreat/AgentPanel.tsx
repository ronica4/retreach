'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import { Send, Bot, User, Loader2, CheckCircle, XCircle, CalendarDays } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  interactionId?: string
  actions?: Array<{ type: string; count?: number }>
}

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

export default function AgentPanel({ retreat, vendors, participants, schedule }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your RetReach manager for **${retreat.name}**. I know your full schedule, all ${vendors.length} vendors, and ${participants.length} participants.\n\nI can:\n• Draft emails to specific vendors with their real deadlines and deliverables\n• Build or update the schedule for you — just ask\n• Flag overdue items and budget risks\n• Answer any question about this retreat`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          retreat,
          vendors,
          participants,
          schedule,
          history: messages.slice(-10),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error || !data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, the agent is unavailable right now. Please try again later.',
        }])
        return
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        interactionId: data.interactionId,
        actions: data.actionsPerformed,
      }])
      if (data.actionsPerformed?.length > 0) {
        router.refresh()
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
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

  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl flex flex-col h-[600px] sticky top-20">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center">
          <Bot size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">RetReach Agent</p>
          <p className="text-xs text-stone-400">Your AI retreat manager</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 nice-scroll">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === 'assistant' ? 'bg-emerald-100' : 'bg-stone-100'
            }`}>
              {msg.role === 'assistant'
                ? <Bot size={12} className="text-emerald-700" />
                : <User size={12} className="text-stone-600" />}
            </div>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'assistant'
                  ? 'bg-stone-50 text-stone-800 rounded-tl-none'
                  : 'bg-emerald-700 text-white rounded-tr-none'
              }`}>
                {msg.content}
              </div>
              {msg.actions?.some(a => a.type === 'schedule_created') && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-2.5 py-1.5">
                  <CalendarDays size={12} />
                  Schedule updated — open the Agenda tab to see it
                </div>
              )}
              {msg.interactionId && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-stone-400">Was this helpful?</span>
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

      <div className="p-3 border-t border-stone-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything about this retreat…"
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
        <p className="text-xs text-stone-300 mt-1.5 text-center">Try: "Build me a 3-day schedule" · "Draft an email to the hotel" · "Who hasn't paid?"</p>
      </div>
    </div>
  )
}
