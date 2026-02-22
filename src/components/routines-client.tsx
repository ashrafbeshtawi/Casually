'use client'

import { type Priority, type TaskState, type Interval } from '@/types'
import { TaskCard } from '@/components/task-card'
import { CreateRoutineDialog } from '@/components/create-routine-dialog'
import {
  AddSectionButton,
  EditSectionName,
  DeleteSectionButton,
} from '@/components/section-manager'

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

export function RoutinesClient({ sections, routines }: RoutinesClientProps) {
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

      {/* Sections with routines */}
      {sections.map((section) => {
        const sectionRoutines = routinesBySection.get(section.id) ?? []

        return (
          <div key={section.id} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
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

            {/* Routines in section */}
            {sectionRoutines.length > 0 ? (
              <div className="grid gap-2">
                {sectionRoutines.map((routine) => (
                  <TaskCard
                    key={routine.id}
                    id={routine.id}
                    title={routine.title}
                    description={routine.description}
                    emoji={routine.emoji}
                    priority={routine.priority}
                    state={routine.state}
                    taskType="routine"
                    intervalLabel={getIntervalLabel(
                      routine.interval,
                      routine.customInterval
                    )}
                    variant="compact"
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-3 text-center text-xs">
                No routines in this section.
              </p>
            )}
          </div>
        )
      })}

      {/* Unsorted routines (sectionId = null) */}
      {unsortedRoutines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center border-b pb-2">
            <h2 className="text-lg font-semibold">Unsorted</h2>
            <span className="text-muted-foreground ml-2 text-xs">
              ({unsortedRoutines.length})
            </span>
          </div>
          <div className="grid gap-2">
            {unsortedRoutines.map((routine) => (
              <TaskCard
                key={routine.id}
                id={routine.id}
                title={routine.title}
                description={routine.description}
                emoji={routine.emoji}
                priority={routine.priority}
                state={routine.state}
                taskType="routine"
                intervalLabel={getIntervalLabel(
                  routine.interval,
                  routine.customInterval
                )}
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
