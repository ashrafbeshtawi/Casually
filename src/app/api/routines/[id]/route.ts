import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cascadeOnDelete } from "@/lib/state-machine"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  // Find routine: ownership verified through section, or orphaned (sectionId = null)
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
    include: {
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!routine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(routine)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  // Verify ownership through section or orphaned
  const existing = await prisma.routine.findFirst({
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

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, interval, customInterval, sectionId, order } = body

  // Validate priority if provided
  if (priority) {
    const validPriorities = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      )
    }
  }

  // Validate interval if provided
  if (interval) {
    const validIntervals = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]
    if (!validIntervals.includes(interval)) {
      return NextResponse.json(
        { error: "Invalid interval" },
        { status: 400 }
      )
    }
  }

  // Build update data, only including provided fields
  const data: Record<string, unknown> = {}

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      )
    }
    data.title = title.trim()
  }

  if (description !== undefined) {
    data.description = description?.trim() || null
  }

  if (emoji !== undefined) {
    data.emoji = emoji?.trim() || null
  }

  if (priority !== undefined) {
    data.priority = priority
  }

  if (interval !== undefined) {
    data.interval = interval || null
  }

  if (customInterval !== undefined) {
    data.customInterval = customInterval?.trim() || null
  }

  if (sectionId !== undefined) {
    // If changing section, verify new section belongs to user
    if (sectionId !== null) {
      const section = await prisma.routineSection.findFirst({
        where: {
          id: sectionId,
          userId: session.user.id,
        },
      })

      if (!section) {
        return NextResponse.json(
          { error: "Section not found" },
          { status: 404 }
        )
      }
    }
    data.sectionId = sectionId
  }

  if (order !== undefined) {
    if (typeof order !== "number") {
      return NextResponse.json(
        { error: "Order must be a number" },
        { status: 400 }
      )
    }
    data.order = order
  }

  const routine = await prisma.routine.update({
    where: { id },
    data,
    include: {
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return NextResponse.json(routine)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  // Verify ownership through section or orphaned
  const existing = await prisma.routine.findFirst({
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

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Cascade: remove this routine from other routines' blockedBy arrays
  await cascadeOnDelete(prisma, id, "routine")

  await prisma.routine.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
