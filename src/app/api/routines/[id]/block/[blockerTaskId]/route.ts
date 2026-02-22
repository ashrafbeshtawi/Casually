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

  // Verify target routine exists and belongs to user (through section or orphaned)
  const routine = await prisma.routine.findFirst({
    where: {
      id,
      OR: [
        {
          section: {
            userId: session.user.id,
          },
        },
        {
          sectionId: null,
        },
      ],
    },
  })

  if (!routine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Remove the blocker
  try {
    await removeBlocker(prisma, id, blockerTaskId, "routine")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove blocker"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Return updated routine with section info
  const updatedRoutine = await prisma.routine.findUnique({
    where: { id },
    include: {
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return NextResponse.json(updatedRoutine)
}
