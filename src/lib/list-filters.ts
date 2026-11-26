import { NextResponse } from "next/server"
import { PRIORITY_LABELS, STATE_LABELS, type Priority, type TaskState } from "@/types"

const isState = (v: string): v is TaskState => Object.hasOwn(STATE_LABELS, v)
const isPriority = (v: string): v is Priority => Object.hasOwn(PRIORITY_LABELS, v)

// Reads optional state/priority list filters. Unknown values get a 400
// instead of reaching Prisma (which would throw and surface as a 500).
export function parseStatePriorityFilters(
  searchParams: URLSearchParams
):
  | { state?: TaskState; priority?: Priority; error?: undefined }
  | { error: NextResponse } {
  const state = searchParams.get("state") || undefined
  const priority = searchParams.get("priority") || undefined
  if (state !== undefined && !isState(state)) {
    return { error: NextResponse.json({ error: "Invalid state" }, { status: 400 }) }
  }
  if (priority !== undefined && !isPriority(priority)) {
    return { error: NextResponse.json({ error: "Invalid priority" }, { status: 400 }) }
  }
  return { state, priority }
}
