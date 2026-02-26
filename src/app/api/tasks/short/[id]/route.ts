import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const task = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
    include: {
      parent: { select: { id: true, title: true, emoji: true } },
      blockedBy: { select: { id: true, title: true, emoji: true } },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(task)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, order } = body

  if (priority) {
    const valid = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]
    if (!valid.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = {}
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
    }
    data.title = title.trim()
  }
  if (description !== undefined) data.description = description?.trim() || null
  if (emoji !== undefined) data.emoji = emoji?.trim() || null
  if (priority !== undefined) data.priority = priority
  if (order !== undefined) data.order = order

  const task = await prisma.shortRunningTask.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.shortRunningTask.updateMany({
    where: { blockedById: id },
    data: { blockedById: null },
  })

  await prisma.shortRunningTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
