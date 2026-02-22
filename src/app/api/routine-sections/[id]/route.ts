import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  const existing = await prisma.routineSection.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { name, order } = body

  const data: Record<string, unknown> = {}

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      )
    }
    data.name = name.trim()
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

  const section = await prisma.routineSection.update({
    where: { id },
    data,
  })

  return NextResponse.json(section)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  const existing = await prisma.routineSection.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.routineSection.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
