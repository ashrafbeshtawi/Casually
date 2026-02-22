import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const state = searchParams.get("state")
  const priority = searchParams.get("priority")

  const where: Record<string, unknown> = {
    userId: session.user.id,
  }

  if (state) {
    where.state = state
  }

  if (priority) {
    where.priority = priority
  }

  const tasks = await prisma.longTermTask.findMany({
    where,
    include: {
      _count: {
        select: { shortTermTasks: true },
      },
    },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, order } = body

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

  const task = await prisma.longTermTask.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || null,
      priority,
      state: "ACTIVE",
      order: typeof order === "number" ? order : 0,
      userId: session.user.id,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
