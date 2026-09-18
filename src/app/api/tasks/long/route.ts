import { NextRequest, NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/api-token"
import { prisma } from "@/lib/prisma"
import { subtaskCountsByParent } from "@/lib/subtask-counts"

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const state = searchParams.get("state")
  const priority = searchParams.get("priority")

  const where: Record<string, unknown> = { userId: userId }
  if (state) where.state = state
  if (priority) where.priority = priority

  const take = Math.max(0, Number(searchParams.get("limit"))) || undefined
  const skip = Math.max(0, Number(searchParams.get("offset"))) || undefined

  const tasks = await prisma.longRunningTask.findMany({
    where,
    include: {
      _count: { select: { children: true } },
      blockedBy: { select: { id: true, title: true, emoji: true } },
    },
    orderBy: { order: "asc" },
    take,
    skip,
  })

  const counts = await subtaskCountsByParent(tasks.map((t) => t.id))
  return NextResponse.json(tasks.map((t) => ({ ...t, subtaskCounts: counts(t.id) })))
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, state } = body

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  // Special projects auto-created at signup; every consumer assumes the
  // title is unique per user, so user-facing creation must not duplicate it.
  const PROTECTED_TITLES = ["One-Off Tasks", "Routines"]
  if (PROTECTED_TITLES.includes(title.trim())) {
    return NextResponse.json(
      { error: `"${title.trim()}" is a reserved project title` },
      { status: 400 }
    )
  }

  const validPriorities = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]
  if (priority && !validPriorities.includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
  }

  const validStates = ["ACTIVE", "WAITING", "BLOCKED", "DONE"]
  if (state && !validStates.includes(state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 })
  }

  const task = await prisma.longRunningTask.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || null,
      priority: priority || "MEDIUM",
      state: state || "WAITING",
      userId: userId,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
