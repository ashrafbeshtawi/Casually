import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ActiveDashboard } from '@/components/active-dashboard'

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  return <ActiveDashboard />
}
