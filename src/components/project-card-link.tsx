'use client'

import { useRouter } from 'next/navigation'
import { TaskCard } from '@/components/task-card'
import { type Priority, type TaskState } from '@/types'

interface ProjectCardLinkProps {
  id: string
  title: string
  description?: string | null
  emoji?: string | null
  priority: Priority
  state: TaskState
  shortTermTaskCount: number
}

export function ProjectCardLink({
  id,
  title,
  description,
  emoji,
  priority,
  state,
  shortTermTaskCount,
}: ProjectCardLinkProps) {
  const router = useRouter()

  return (
    <div>
      <TaskCard
        id={id}
        title={title}
        description={description}
        emoji={emoji}
        priority={priority}
        state={state}
        onClick={() => router.push(`/projects/${id}`)}
      />
      <div className="text-muted-foreground px-4 pb-2 text-xs">
        {shortTermTaskCount} task{shortTermTaskCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
