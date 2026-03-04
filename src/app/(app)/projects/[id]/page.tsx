import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ProjectDetailView } from '@/components/project-detail-view'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  const { id } = await params

  return <ProjectDetailView projectId={id} />
}
