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

  // Verify blocker routine exists and belongs to user (through section or orphaned)
  const blockerRoutine = await prisma.routine.findFirst({
    where: {
      id: blockerTaskId,
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

  if (!blockerRoutine) {
    return NextResponse.json(
      { error: "Blocker routine not found" },
      { status: 404 }
    )
  }

  // Check for circular dependency
  const cyclic = await wouldCreateCycle(prisma, id, blockerTaskId, "routine")
  if (cyclic) {
    return NextResponse.json(
      { error: "Adding this blocker would create a circular dependency" },
      { status: 400 }
    )
  }

  // Add the blocker
  try {
    await addBlocker(prisma, id, blockerTaskId, "routine")
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add blocker"
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
