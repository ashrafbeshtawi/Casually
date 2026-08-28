import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/api-token"
import { prisma } from "@/lib/prisma"

export async function POST(
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

  const updated = await prisma.challenge.update({
    where: { id },
    data: { startedAt: new Date() },
  })

  return NextResponse.json(updated)
}
