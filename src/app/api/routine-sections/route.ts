import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sections = await prisma.routineSection.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      _count: {
        select: { routines: true },
      },
    },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(sections)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, order } = body

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    )
  }

  const section = await prisma.routineSection.create({
    data: {
      name: name.trim(),
      order: typeof order === "number" ? order : 0,
      userId: session.user.id,
    },
  })

  return NextResponse.json(section, { status: 201 })
}
