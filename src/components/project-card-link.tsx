'use client'

import { useRouter } from 'next/navigation'
import { TaskCard } from '@/components/task-card'
import { type Priority, type TaskState } from '@/types'
import { cn } from '@/lib/utils'

interface ProjectCardLinkProps {
  id: string
  title: string
  description?: string | null
  emoji?: string | null
  priority: Priority
  state: TaskState
  isOneOff: boolean
  shortTermTaskCount: number
}

export function ProjectCardLink({
  id,
  title,
  description,
  emoji,
  priority,
  state,
  isOneOff,
  shortTermTaskCount,
}: ProjectCardLinkProps) {
  const router = useRouter()

  return (
    <div className={cn(isOneOff && 'ring-primary/30 rounded-lg ring-2')}>
      <TaskCard
        id={id}
        title={title}
        description={description}
        emoji={emoji}
        priority={priority}
        state={state}
        onClick={() => router.push(isOneOff ? '/one-off' : `/projects/${id}`)}
      />
      <div className="text-muted-foreground px-4 pb-2 text-xs">
        {shortTermTaskCount} task{shortTermTaskCount !== 1 ? 's' : ''}
        {isOneOff && (
          <span className="text-primary ml-2 font-medium">One-Off Tasks</span>
        )}
      </div>
    </div>
  )
}
