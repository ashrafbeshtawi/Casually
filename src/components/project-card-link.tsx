'use client'

import { useRouter } from 'next/navigation'
import { TaskCard } from '@/components/task-card'
import { type Priority, type TaskState } from '@/types'

const PROTECTED_TITLES = ['One-Off Tasks', 'Routines']

interface ProjectCardLinkProps {
  id: string
  title: string
  description?: string | null
  emoji?: string | null
  priority: Priority
  state: TaskState
  shortTermTaskCount: number
  onActionComplete?: () => void
}

export function ProjectCardLink({
  id,
  title,
  description,
  emoji,
  priority,
  state,
  shortTermTaskCount,
  onActionComplete,
}: ProjectCardLinkProps) {
  const router = useRouter()
  const isProtected = PROTECTED_TITLES.includes(title)

  return (
    <div>
      <TaskCard
        id={id}
        title={title}
        description={description}
        emoji={emoji}
        priority={priority}
        state={state}
        taskType={isProtected ? undefined : 'long'}
        hasChildren={shortTermTaskCount > 0}
        showDelete={!isProtected}
        minimal={isProtected}
        onActionComplete={onActionComplete}
        onClick={() => router.push(`/projects/${id}`)}
      />
      <div className="text-muted-foreground px-4 pb-2 text-xs">
        {shortTermTaskCount} task{shortTermTaskCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
