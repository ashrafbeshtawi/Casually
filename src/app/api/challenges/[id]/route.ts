import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const challenge = await prisma.challenge.findFirst({
    where: { id, userId: session.user.id },
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const challenge = await prisma.challenge.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!challenge) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.challenge.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
