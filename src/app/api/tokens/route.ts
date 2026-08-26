import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateToken, hashToken } from "@/lib/api-token"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(tokens)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { name?: string } = {}
  try {
    body = await request.json()
  } catch {
    // name is optional; empty body is fine
  }

  const name = body.name?.trim() || "MCP Token"
  const token = generateToken()

  const created = await prisma.apiToken.create({
    data: {
      name,
      tokenHash: hashToken(token),
      userId: session.user.id,
    },
    select: { id: true, name: true, createdAt: true },
  })

  // The plaintext token is only returned here, once. We store the hash.
  return NextResponse.json({ ...created, token }, { status: 201 })
}
