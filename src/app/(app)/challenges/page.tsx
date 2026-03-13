import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ChallengesDashboard } from '@/components/challenges-dashboard'

export default async function ChallengesPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  return <ChallengesDashboard />
}
