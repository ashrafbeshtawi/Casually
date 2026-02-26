import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskState } from "@/types"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { newParentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { newParentId } = body
  if (!newParentId) {
    return NextResponse.json({ error: "newParentId is required" }, { status: 400 })
  }

  const task = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.parentId === newParentId) {
    return NextResponse.json(task)
  }

  const newParent = await prisma.longRunningTask.findFirst({
    where: { id: newParentId, userId: session.user.id },
  })

  if (!newParent) {
    return NextResponse.json({ error: "New parent not found" }, { status: 404 })
  }

  const newParentState = newParent.state as TaskState
  const newState =
    newParentState === "BLOCKED" || newParentState === "DONE"
      ? newParentState
      : (task.state as TaskState)

  const updatedTask = await prisma.shortRunningTask.update({
    where: { id },
    data: {
      parentId: newParentId,
      state: newState,
      blockedById: null,
    },
    include: { parent: { select: { id: true, title: true } } },
  })

  return NextResponse.json(updatedTask)
}
