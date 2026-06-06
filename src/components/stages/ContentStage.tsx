'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, FolderOpen, ExternalLink, Image, Video, Presentation, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentLink {
  id: string
  title: string
  url: string
  type: 'photos' | 'videos' | 'decks' | 'other'
  addedAt: string
}

interface Props {
  retreatId: string
}

const LS_KEY = (id: string) => `retreach_content_${id}`

const TYPES: { key: ContentLink['type']; label: string; icon: React.ReactNode; bg: string; text: string }[] = [
  { key: 'photos', label: 'Photos',       icon: <Image size={15} />,        bg: 'bg-emerald-50 ring-emerald-200', text: 'text-emerald-700' },
  { key: 'videos', label: 'Videos',       icon: <Video size={15} />,        bg: 'bg-amber-50 ring-amber-200',    text: 'text-amber-700' },
  { key: 'decks',  label: 'Decks',        icon: <Presentation size={15} />, bg: 'bg-stone-100 ring-stone-200',   text: 'text-stone-600' },
  { key: 'other',  label: 'Other',        icon: <FileText size={15} />,     bg: 'bg-stone-50 ring-stone-200',    text: 'text-stone-500' },
]

const TYPE_CHIP: Record<string, string> = {
  photos: 'bg-emerald-100 text-emerald-700',
  videos: 'bg-amber-100 text-amber-700',
  decks:  'bg-stone-100 text-stone-600',
  other:  'bg-stone-50 text-stone-500',
}

export default function ContentStage({ retreatId }: Props) {
  const [links, setLinks] = useState<ContentLink[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', type: 'other' as ContentLink['type'] })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(retreatId))
      if (saved) setLinks(JSON.parse(saved))
    } catch { /* */ }
  }, [retreatId])

  function save(updated: ContentLink[]) {
    setLinks(updated)
    localStorage.setItem(LS_KEY(retreatId), JSON.stringify(updated))
  }

  function addLink(e: React.FormEvent) {
    e.preventDefault()
    const link: ContentLink = {
      id: Date.now().toString(), title: form.title, url: form.url, type: form.type,
      addedAt: new Date().toISOString().split('T')[0],
    }
    save([...links, link])
    setForm({ title: '', url: '', type: 'other' })
    setShowForm(false)
  }

  function deleteLink(id: string) { save(links.filter(l => l.id !== id)) }

  const grouped = links.reduce((acc, l) => {
    if (!acc[l.type]) acc[l.type] = []
    acc[l.type].push(l)
    return acc
  }, {} as Record<string, ContentLink[]>)

  const inputCls = 'w-full px-2.5 py-2 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
  const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Content Library</h1>
          <p className="text-sm text-stone-400 mt-0.5">Photos, videos, decks, and more</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Add link
        </button>
      </div>

      {/* count tiles */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {TYPES.map(t => {
          const count = (grouped[t.key] ?? []).length
          return (
            <div key={t.key} className={cn('ring-1 card rounded-2xl p-4 flex flex-col gap-2', t.bg)}>
              <div className={cn('flex items-center gap-1.5', t.text)}>
                {t.icon}
                <span className="text-xs font-semibold">{t.label}</span>
              </div>
              <div className={cn('text-2xl font-bold tabular-nums', count ? t.text : 'text-stone-400')}>{count}</div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <form onSubmit={addLink} className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5 space-y-3 mb-5 fade-up">
          <div><label className={labelCls}>Title *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Retreat photos album" className={inputCls} /></div>
          <div><label className={labelCls}>URL *</label>
            <input required type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" className={inputCls} /></div>
          <div><label className={labelCls}>Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setForm(f => ({ ...f, type: t.key }))}
                  className={cn('px-3 py-1.5 text-sm rounded-lg ring-1 capitalize transition-colors',
                    form.type === t.key ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'
                  )}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800">Add</button>
          </div>
        </form>
      )}

      {links.length > 0 ? (
        <div className="space-y-5">
          {TYPES.filter(t => grouped[t.key]?.length).map(t => (
            <div key={t.key}>
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2 capitalize">{t.label}</h2>
              <div className="space-y-2">
                {(grouped[t.key] ?? []).map(link => (
                  <div key={link.id} className="bg-white ring-1 ring-stone-200 card rounded-xl p-3.5 flex items-center justify-between group hover:ring-stone-300 transition-all">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-900 truncate">{link.title}</p>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full capitalize shrink-0', TYPE_CHIP[link.type])}>{link.type}</span>
                      </div>
                      <p className="text-xs text-stone-400 truncate mt-0.5">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-emerald-700 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                      <button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-14 text-stone-400">
          <FolderOpen size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No content added yet. Link your photos, videos, and decks here.</p>
        </div>
      )}
    </div>
  )
}
