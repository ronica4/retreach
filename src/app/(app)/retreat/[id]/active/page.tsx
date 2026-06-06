import { redirect } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default async function ActivePage({ params }: Props) {
  const { id } = await params
  redirect(`/retreat/${id}/during`)
}
