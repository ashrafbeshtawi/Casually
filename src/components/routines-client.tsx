'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Priority, type TaskState, type Interval } from '@/types'
import { TaskCard } from '@/components/task-card'
import { CreateRoutineDialog } from '@/components/create-routine-dialog'
import {
  AddSectionButton,
  EditSectionName,
  DeleteSectionButton,
} from '@/components/section-manager'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { SortableList, DragHandle } from '@/components/sortable-list'
import { reorderItems } from '@/lib/reorder'
import { toast } from 'sonner'

interface RoutineData {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  interval: Interval | null
  customInterval: string | null
  order: number
  sectionId: string | null
  blockedBy: Array<{ type: string; taskId: string }>
}

interface SectionData {
  id: string
  name: string
  order: number
  routineCount: number
}

interface RoutinesClientProps {
  sections: SectionData[]
  routines: RoutineData[]
}

const INTERVAL_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom',
}

function getIntervalLabel(
  interval: Interval | null,
  customInterval: string | null
): string | null {
  if (!interval) return null
  if (interval === 'CUSTOM' && customInterval) return customInterval
  return INTERVAL_LABELS[interval] ?? null
}

export function RoutinesClient({ sections: initialSections, routines: initialRoutines }: RoutinesClientProps) {
  const [sections, setSections] = useState(initialSections)
  const [routines, setRoutines] = useState(initialRoutines)
  const router = useRouter()

  // Group routines by sectionId
  const routinesBySection = new Map<string | null, RoutineData[]>()

  for (const routine of routines) {
    const key = routine.sectionId
    if (!routinesBySection.has(key)) {
      routinesBySection.set(key, [])
    }
    routinesBySection.get(key)!.push(routine)
  }

  const unsortedRoutines = routinesBySection.get(null) ?? []
  const sectionList = sections.map((s) => ({ id: s.id, name: s.name }))

  const hasNoContent =
    sections.length === 0 && routines.length === 0

  async function handleSectionReorder(reorderedSections: SectionData[]) {
    const previous = sections
    setSections(reorderedSections)
    try {
      await reorderItems(reorderedSections, '/api/routine-sections')
      router.refresh()
    } catch {
      setSections(previous)
      toast.error('Failed to reorder sections')
    }
  }

  function handleRoutineReorder(sectionId: string | null) {
    return async (reorderedRoutines: RoutineData[]) => {
      const previous = routines
      // Update the routines state: replace the routines for this section
      setRoutines((prev) => {
        const otherRoutines = prev.filter((r) => r.sectionId !== sectionId)
        return [...otherRoutines, ...reorderedRoutines]
      })
      try {
        await reorderItems(reorderedRoutines, '/api/routines')
        router.refresh()
      } catch {
        setRoutines(previous)
        toast.error('Failed to reorder routines')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Routines</h1>
          <p className="text-muted-foreground text-sm">
            Manage your recurring routines organized by section.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddSectionButton />
          <CreateRoutineDialog sections={sectionList} />
        </div>
      </div>

      {/* Empty state */}
      {hasNoContent && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground text-sm">
            No routines yet. Create a section and add your first routine to get
            started.
          </p>
        </div>
      )}

      {/* Sections — sortable */}
      {sections.length > 0 && (
        <SortableList
          items={sections}
          getItemId={(s) => s.id}
          onReorder={handleSectionReorder}
          renderItem={(section, dragHandleProps) => {
            const sectionRoutines = routinesBySection.get(section.id) ?? []

            return (
              <div className="space-y-3">
                {/* Section header */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <DragHandle {...dragHandleProps} />
                    <EditSectionName
                      sectionId={section.id}
                      currentName={section.name}
                    />
                    <span className="text-muted-foreground text-xs">
                      ({sectionRoutines.length})
                    </span>
                  </div>
                  <DeleteSectionButton
                    sectionId={section.id}
                    sectionName={section.name}
                    routineCount={sectionRoutines.length}
                  />
                </div>

                {/* Routines in section — sortable */}
                {sectionRoutines.length > 0 ? (
                  <SortableList
                    items={sectionRoutines}
                    getItemId={(r) => r.id}
                    onReorder={handleRoutineReorder(section.id)}
                    renderItem={(routine, routineDragHandleProps) => (
                      <div className="flex items-center gap-1">
                        <DragHandle {...routineDragHandleProps} />
                        <div className="min-w-0 flex-1">
                          <TaskCard
                            id={routine.id}
                            title={routine.title}
                            description={routine.description}
                            emoji={routine.emoji}
                            priority={routine.priority}
                            state={routine.state}
                            taskType="routine"
                            interval={routine.interval}
                            customInterval={routine.customInterval}
                            intervalLabel={getIntervalLabel(
                              routine.interval,
                              routine.customInterval
                            )}
                            variant="compact"
                          />
                        </div>
                        <DeleteTaskButton
                          taskId={routine.id}
                          taskType="routine"
                          taskTitle={routine.title}
                        />
                      </div>
                    )}
                  />
                ) : (
                  <p className="text-muted-foreground py-3 text-center text-xs">
                    No routines in this section.
                  </p>
                )}
              </div>
            )
          }}
        />
      )}

      {/* Unsorted routines (sectionId = null) — sortable */}
      {unsortedRoutines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center border-b pb-2">
            <h2 className="text-lg font-semibold">Unsorted</h2>
            <span className="text-muted-foreground ml-2 text-xs">
              ({unsortedRoutines.length})
            </span>
          </div>
          <SortableList
            items={unsortedRoutines}
            getItemId={(r) => r.id}
            onReorder={handleRoutineReorder(null)}
            renderItem={(routine, routineDragHandleProps) => (
              <div className="flex items-center gap-1">
                <DragHandle {...routineDragHandleProps} />
                <div className="min-w-0 flex-1">
                  <TaskCard
                    id={routine.id}
                    title={routine.title}
                    description={routine.description}
                    emoji={routine.emoji}
                    priority={routine.priority}
                    state={routine.state}
                    taskType="routine"
                    interval={routine.interval}
                    customInterval={routine.customInterval}
                    intervalLabel={getIntervalLabel(
                      routine.interval,
                      routine.customInterval
                    )}
                    variant="compact"
                  />
                </div>
                <DeleteTaskButton
                  taskId={routine.id}
                  taskType="routine"
                  taskTitle={routine.title}
                />
              </div>
            )}
          />
        </div>
      )}
    </div>
  )
}
