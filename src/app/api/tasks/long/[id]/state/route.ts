import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { changeLongRunningTaskState, isValidTransition } from "@/lib/state-machine"
import { TaskState } from "@/types"

type RouteContext = { params: Promise<{ id: string }> }

const VALID_STATES: TaskState[] = ["ACTIVE", "WAITING", "BLOCKED", "DONE"]

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { state?: string; blockedById?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { state: newState, blockedById } = body

  if (!newState || !VALID_STATES.includes(newState as TaskState)) {
    return NextResponse.json({ error: `Invalid state: ${newState}` }, { status: 400 })
  }

  const task = await prisma.longRunningTask.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!isValidTransition(task.state as TaskState, newState as TaskState)) {
    return NextResponse.json(
      { error: `Invalid transition from ${task.state} to ${newState}` },
      { status: 400 }
    )
  }

  try {
    await changeLongRunningTaskState(prisma, id, newState as TaskState, blockedById)
  } catch (error) {
    const message = error instanceof Error ? error.message : "State change failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const updatedTask = await prisma.longRunningTask.findUnique({
    where: { id },
    include: { children: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json(updatedTask)
}
