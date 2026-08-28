import { NextRequest, NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/api-token"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const challenge = await prisma.challenge.findFirst({
    where: { id, userId: userId },
  })

  if (!challenge) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { title, emoji } = body

  const data: Record<string, unknown> = {}
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
    }
    data.title = title.trim()
  }
  if (emoji !== undefined) data.emoji = emoji?.trim() || null

  const updated = await prisma.challenge.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const challenge = await prisma.challenge.findFirst({
    where: { id, userId: userId },
  })

  if (!challenge) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.challenge.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
