import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
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

  const updated = await prisma.challenge.update({
    where: { id },
    data: { startedAt: new Date() },
  })

  return NextResponse.json(updated)
}
