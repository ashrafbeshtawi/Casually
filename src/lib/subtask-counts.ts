import { prisma } from "@/lib/prisma"
import type { TaskState } from "@/types"

export type SubtaskCounts = Record<TaskState, number>

const empty = (): SubtaskCounts => ({ ACTIVE: 0, WAITING: 0, BLOCKED: 0, DONE: 0 })

// Per-state subtask counts for a set of projects in one query.
// Returns a lookup; projects without subtasks get all zeros.
export async function fetchSubtaskCounts(parentIds: string[]) {
  const rows = await prisma.shortRunningTask.groupBy({
    by: ["parentId", "state"],
    where: { parentId: { in: parentIds } },
    _count: true,
  })
  const byParent = new Map<string, SubtaskCounts>()
  for (const { parentId, state, _count } of rows) {
    const counts = byParent.get(parentId) ?? empty()
    counts[state] = _count
    byParent.set(parentId, counts)
  }
  return (parentId: string) => byParent.get(parentId) ?? empty()
}
