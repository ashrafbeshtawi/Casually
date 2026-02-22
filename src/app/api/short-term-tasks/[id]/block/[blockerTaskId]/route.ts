import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { removeBlocker } from "@/lib/state-machine"

type RouteContext = {
  params: Promise<{ id: string; blockerTaskId: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, blockerTaskId } = await context.params

  // Verify target task exists and belongs to user (through parent)
  const task = await prisma.shortTermTask.findFirst({
    where: {
      id,
      parent: {
        userId: session.user.id,
      },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Remove the blocker
  try {
    await removeBlocker(prisma, id, blockerTaskId, "shortTerm")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove blocker"
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
