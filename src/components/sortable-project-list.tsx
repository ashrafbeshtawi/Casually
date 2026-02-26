'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SortableList, DragHandle, type DragHandleProps } from '@/components/sortable-list'
import { ProjectCardLink } from '@/components/project-card-link'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { reorderItems } from '@/lib/reorder'
import { type Priority, type TaskState } from '@/types'
import { toast } from 'sonner'

interface ProjectItem {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  shortTermTaskCount: number
}

interface SortableProjectListProps {
  projects: ProjectItem[]
}

export function SortableProjectList({ projects: initial }: SortableProjectListProps) {
  const [projects, setProjects] = useState(initial)
  const router = useRouter()

  async function handleReorder(reordered: ProjectItem[]) {
    const previous = projects
    setProjects(reordered)
    try {
      await reorderItems(reordered, '/api/tasks/long')
      router.refresh()
    } catch {
      setProjects(previous)
      toast.error('Failed to reorder projects')
    }
  }

  if (projects.length === 0) return null

  return (
    <SortableList
      items={projects}
      getItemId={(p) => p.id}
      onReorder={handleReorder}
      renderItem={(project, dragHandleProps) => (
        <div className="flex items-center gap-1">
          <DragHandle {...dragHandleProps} />
          <div className="min-w-0 flex-1">
            <ProjectCardLink
              id={project.id}
              title={project.title}
              description={project.description}
              emoji={project.emoji}
              priority={project.priority}
              state={project.state}
              shortTermTaskCount={project.shortTermTaskCount}
            />
          </div>
          <DeleteTaskButton
            taskId={project.id}
            taskType="long"
            taskTitle={project.title}
            hasChildren={project.shortTermTaskCount > 0}
          />
        </div>
      )}
    />
  )
}
