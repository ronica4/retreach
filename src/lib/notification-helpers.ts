// Shared helpers for generating notification records from vendor deadlines

import { formatDate } from '@/lib/utils'

interface VendorWithRetreat {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  deliverables: string | null
  deadline: string
  status: string
  retreat: {
    id: string
    name: string
    start_date: string
    end_date: string
    destination: string
  }
}

export function daysUntilDeadline(deadline: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(deadline + 'T00:00:00')
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

export function draftDeadlineNotification(
  vendor: VendorWithRetreat,
  daysUntil: number,
): { subject: string; body: string } {
  const retreat = vendor.retreat
  const contactName = vendor.contact_name ?? vendor.name
  const deliverables = vendor.deliverables ?? 'your agreed deliverables'
  const dueLabel =
    daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
  const urgencyPrefix =
    daysUntil <= 1 ? 'URGENT: ' : daysUntil <= 3 ? 'Reminder: ' : ''

  const subject = `${urgencyPrefix}${deliverables} due ${dueLabel} — ${retreat.name}`

  const body = `Hi ${contactName},

This is a reminder that your deliverables for "${retreat.name}" are due ${dueLabel} (${formatDate(vendor.deadline)}).

Deliverables: ${deliverables}
Retreat: ${retreat.name} at ${retreat.destination}
Retreat dates: ${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)}

Please confirm or send your deliverables at your earliest convenience.

If you have any questions, please reply to this message.

Best regards,
Retreat Manager`

  return { subject, body }
}

export function draftWelcomeNotification(
  participantName: string,
  participantEmail: string,
  retreatName: string,
  retreatStart: string,
  retreatDestination: string,
): { subject: string; body: string } {
  const subject = `You're registered for ${retreatName}!`
  const body = `Hi ${participantName},

Welcome! You've successfully registered for ${retreatName}.

Retreat details:
📍 ${retreatDestination}
📅 Starting ${formatDate(retreatStart)}

We'll be in touch with more details as the retreat approaches.

See you there!
The Retreat Team`

  return { subject, body }
}
