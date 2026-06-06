import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type RetreatStage, type Retreat } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parse YYYY-MM-DD as local midnight to avoid UTC-offset date shift
function localDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getRetreatStage(retreat: Retreat): RetreatStage {
  if (retreat.stage_override) return retreat.stage_override

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = localDate(retreat.start_date)
  const end = localDate(retreat.end_date)

  if (today < start) return 'planning'
  if (today > end) return 'closed'
  return 'active'
}

export function formatDate(dateStr: string) {
  return localDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = localDate(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
