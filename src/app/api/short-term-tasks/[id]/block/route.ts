import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addBlocker, wouldCreateCycle } from "@/lib/state-machine"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  // Parse request body
  let body: { blockerTaskId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { blockerTaskId } = body

  if (!blockerTaskId || typeof blockerTaskId !== "string") {
    return NextResponse.json(
      { error: "blockerTaskId is required" },
      { status: 400 }
    )
  }

  // Verify target task exists and belongs to user (through parent)
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

  // Verify blocker task exists and belongs to user (through parent)
  const blockerTask = await prisma.shortTermTask.findFirst({
    where: {
      id: blockerTaskId,
      parent: {
        userId: session.user.id,
      },
    },
  })

  if (!blockerTask) {
    return NextResponse.json(
      { error: "Blocker task not found" },
      { status: 404 }
    )
  }

  // Check for circular dependency
  const cyclic = await wouldCreateCycle(prisma, id, blockerTaskId, "shortTerm")
  if (cyclic) {
    return NextResponse.json(
      { error: "Adding this blocker would create a circular dependency" },
      { status: 400 }
    )
  }

  // Add the blocker
  try {
    await addBlocker(prisma, id, blockerTaskId, "shortTerm")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add blocker"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Return updated task with parent info
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
