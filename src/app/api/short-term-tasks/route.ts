import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BlockEntry } from "@/types"

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
    parent: {
      userId: session.user.id,
    },
  }

  if (parentId) {
    where.parentId = parentId
  }

  if (state) {
    where.state = state
  }

  if (priority) {
    where.priority = priority
  }

  const tasks = await prisma.shortTermTask.findMany({
    where,
    include: {
      parent: {
        select: {
          id: true,
          title: true,
        },
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
  const { parentId, title, description, emoji, priority, order } = body

  if (!parentId || typeof parentId !== "string") {
    return NextResponse.json(
      { error: "parentId is required" },
      { status: 400 }
    )
  }

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

  // Verify the parent exists and belongs to the current user
  const parent = await prisma.longTermTask.findFirst({
    where: {
      id: parentId,
      userId: session.user.id,
    },
  })

  if (!parent) {
    return NextResponse.json(
      { error: "Parent task not found" },
      { status: 404 }
    )
  }

  // Determine initial state and blockedBy based on parent state
  let initialState: "WAITING" | "BLOCKED" = "WAITING"
  const blockedBy: BlockEntry[] = []

  if (parent.state !== "ACTIVE") {
    blockedBy.push({ type: "parent_block", taskId: parent.id })
    initialState = "BLOCKED"
  }

  const task = await prisma.shortTermTask.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || null,
      priority,
      state: initialState,
      order: typeof order === "number" ? order : 0,
      parentId,
      blockedBy: JSON.parse(JSON.stringify(blockedBy)),
    },
  })

  return NextResponse.json(task, { status: 201 })
}
