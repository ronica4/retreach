'use client'

import { useState } from 'react'
import { Bot, X } from 'lucide-react'
import type { Retreat } from '@/types'
import AgentPanel from './AgentPanel'

export default function AgentDrawer({ retreat }: { retreat: Retreat }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating toggle button — hidden when drawer is open */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI agent"
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-emerald-700 text-white shadow-lg hover:bg-emerald-800 transition-all flex items-center justify-center ${
          open ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        }`}
      >
        <Bot size={20} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-[380px] bg-white border-l border-stone-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">RetReach Agent</p>
              <p className="text-xs text-stone-400 truncate max-w-[220px]">{retreat.name}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close agent"
            className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 rounded-lg hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Chat */}
        <AgentPanel retreat={retreat} />
      </div>
    </>
  )
}
