import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const sectionId = searchParams.get("sectionId")
  const state = searchParams.get("state")
  const interval = searchParams.get("interval")

  // Build where clause: routines belonging to user's sections OR orphaned routines
  const where: Record<string, unknown> = {}

  if (sectionId) {
    // If filtering by sectionId, verify the section belongs to the user
    where.sectionId = sectionId
    where.section = {
      userId: session.user.id,
    }
  } else {
    // Get all routines: those in user's sections + orphaned ones (sectionId = null)
    where.OR = [
      {
        section: {
          userId: session.user.id,
        },
      },
      {
        sectionId: null,
      },
    ]
  }

  if (state) {
    where.state = state
  }

  if (interval) {
    where.interval = interval
  }

  const routines = await prisma.routine.findMany({
    where,
    include: {
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(routines)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, interval, customInterval, sectionId, order } = body

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    )
  }

  const validPriorities = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]
  if (!priority || !validPriorities.includes(priority)) {
    return NextResponse.json(
      { error: "Valid priority is required" },
      { status: 400 }
    )
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

  // If sectionId provided, verify it belongs to the user
  if (sectionId) {
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

  const routine = await prisma.routine.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || null,
      priority,
      state: "ACTIVE",
      interval: interval || null,
      customInterval: customInterval?.trim() || null,
      order: typeof order === "number" ? order : 0,
      sectionId: sectionId || null,
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

  return NextResponse.json(routine, { status: 201 })
}
