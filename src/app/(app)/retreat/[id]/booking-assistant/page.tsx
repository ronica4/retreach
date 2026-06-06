import { redirect } from 'next/navigation'

// The booking assistant has been split into dedicated Flights and Hotels
// stages. Keep this route working by redirecting to the Flights stage.
export default async function BookingAssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/retreat/${id}/flights`)
}
