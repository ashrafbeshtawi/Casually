import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { Dashboard } from '@/components/dashboard'

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  return <Dashboard />
}
