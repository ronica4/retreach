import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RetreatShell from '@/components/retreat/RetreatShell'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function RetreatLayout({ children, params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: retreat } = await supabase
    .from('retreats')
    .select('*')
    .eq('id', id)
    .eq('manager_id', user.id)
    .single()

  if (!retreat) notFound()

  return <RetreatShell retreat={retreat}>{children}</RetreatShell>
}
