import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { SettingsDashboard } from '@/components/settings-dashboard'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  return <SettingsDashboard />
}
