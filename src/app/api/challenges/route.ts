import { NextRequest, NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/api-token"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const challenges = await prisma.challenge.findMany({
    where: { userId: userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(challenges)
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, emoji } = body

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const challenge = await prisma.challenge.create({
    data: {
      title: title.trim(),
      emoji: emoji?.trim() || null,
      userId: userId,
    },
  })

  return NextResponse.json(challenge, { status: 201 })
}
