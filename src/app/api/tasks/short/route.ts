import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskState } from "@/types"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const parentId = searchParams.get("parentId")
  const state = searchParams.get("state")
  const priority = searchParams.get("priority")

  const where: Record<string, unknown> = {
    parent: { userId: session.user.id },
  }
  if (parentId) where.parentId = parentId
  if (state) where.state = state
  if (priority) where.priority = priority

  const tasks = await prisma.shortRunningTask.findMany({
    where,
    include: { parent: { select: { id: true, title: true, emoji: true } } },
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
  const { parentId, title, description, emoji, priority } = body

  if (!parentId) {
    return NextResponse.json({ error: "parentId is required" }, { status: 400 })
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const parent = await prisma.longRunningTask.findFirst({
    where: { id: parentId, userId: session.user.id },
  })

  if (!parent) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 })
  }

  const parentState = parent.state as TaskState
  if (parentState === "BLOCKED" || parentState === "DONE") {
    return NextResponse.json(
      { error: `Cannot add tasks: parent is ${parentState}` },
      { status: 400 }
    )
  }

  const task = await prisma.shortRunningTask.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || null,
      priority: priority || "MEDIUM",
      state: parentState,
      parentId,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
