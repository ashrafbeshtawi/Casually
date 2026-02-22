import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  changeShortTermTaskState,
  isValidTransition,
} from "@/lib/state-machine"
import { TaskState } from "@/types"

type RouteContext = {
  params: Promise<{ id: string }>
}

const VALID_STATES: TaskState[] = ["ACTIVE", "WAITING", "BLOCKED", "DONE"]

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { state?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { state: newState } = body

  if (!newState) {
    return NextResponse.json(
      { error: "State is required" },
      { status: 400 }
    )
  }

  if (!VALID_STATES.includes(newState as TaskState)) {
    return NextResponse.json(
      { error: `Invalid state: ${newState}` },
      { status: 400 }
    )
  }

  // Fetch task and verify ownership through parent LongTermTask
  const task = await prisma.shortTermTask.findFirst({
    where: {
      id,
      parent: {
        userId: session.user.id,
      },
    },
    include: {
      parent: {
        select: { id: true, title: true },
      },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Validate transition
  const currentState = task.state as TaskState
  if (!isValidTransition(currentState, newState as TaskState)) {
    return NextResponse.json(
      {
        error: `Invalid transition from ${currentState} to ${newState}`,
      },
      { status: 400 }
    )
  }

  // Execute state change with cascading logic
  try {
    await changeShortTermTaskState(prisma, id, newState as TaskState)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "State change failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Fetch and return updated task with parent info
  const updatedTask = await prisma.shortTermTask.findUnique({
    where: { id },
    include: {
      parent: {
        select: { id: true, title: true },
      },
    },
  })

  return NextResponse.json(updatedTask)
}
