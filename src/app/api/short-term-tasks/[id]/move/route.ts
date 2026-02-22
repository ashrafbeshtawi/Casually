import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { type BlockEntry, type TaskState } from "@/types"

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseBlockedBy(raw: unknown): BlockEntry[] {
  if (Array.isArray(raw)) return raw as BlockEntry[]
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as BlockEntry[]
    } catch {
      return []
    }
  }
  return []
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  // Parse request body
  let body: { newParentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { newParentId } = body

  if (!newParentId || typeof newParentId !== "string") {
    return NextResponse.json(
      { error: "newParentId is required" },
      { status: 400 }
    )
  }

  // Verify task exists and belongs to user (through current parent)
  const task = await prisma.shortTermTask.findFirst({
    where: {
      id,
      parent: {
        userId: session.user.id,
      },
    },
    include: {
      parent: {
        select: { id: true, state: true },
      },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const oldParentId = task.parentId

  // No-op if moving to the same parent
  if (oldParentId === newParentId) {
    const fullTask = await prisma.shortTermTask.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, title: true },
        },
      },
    })
    return NextResponse.json(fullTask)
  }

  // Verify new parent exists and belongs to user
  const newParent = await prisma.longTermTask.findFirst({
    where: {
      id: newParentId,
      userId: session.user.id,
    },
    select: { id: true, state: true },
  })

  if (!newParent) {
    return NextResponse.json(
      { error: "New parent project not found" },
      { status: 404 }
    )
  }

  // Handle parent_block logic within a transaction
  const updatedTask = await prisma.$transaction(async (tx) => {
    const blockedBy = parseBlockedBy(task.blockedBy)
    const newParentState = newParent.state as TaskState

    // Remove old parent_block (from any parent, there should be at most one)
    let filtered = blockedBy.filter((e) => e.type !== "parent_block")

    let newState: TaskState

    if (newParentState !== "ACTIVE") {
      // New parent is NOT ACTIVE: add parent_block for new parent, set state to BLOCKED
      filtered.push({ type: "parent_block", taskId: newParentId })
      newState = "BLOCKED"
    } else {
      // New parent IS ACTIVE: no parent_block needed
      // If blockedBy is now empty -> WAITING; if still has task_blocks -> BLOCKED
      if (filtered.length > 0) {
        newState = "BLOCKED"
      } else {
        // Only change to WAITING if currently BLOCKED; preserve ACTIVE and DONE
        const currentState = task.state as TaskState
        if (currentState === "BLOCKED") {
          newState = "WAITING"
        } else {
          newState = currentState
        }
      }
    }

    return tx.shortTermTask.update({
      where: { id },
      data: {
        parentId: newParentId,
        blockedBy: JSON.parse(JSON.stringify(filtered)),
        state: newState,
      },
      include: {
        parent: {
          select: { id: true, title: true },
        },
      },
    })
  })

  return NextResponse.json(updatedTask)
}
