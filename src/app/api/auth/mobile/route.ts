import { NextRequest, NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function POST(request: NextRequest) {
  let body: { idToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { idToken } = body
  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 })
  }

  // Verify the Google ID token
  let payload
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    payload = ticket.getPayload()
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 })
  }

  if (!payload?.email) {
    return NextResponse.json({ error: "No email in token" }, { status: 401 })
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: payload.email } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? null,
        image: payload.picture ?? null,
        emailVerified: payload.email_verified ? new Date() : null,
      },
    })

    // Create default tasks (same as auth.ts createUser event)
    await prisma.longRunningTask.createMany({
      data: [
        {
          title: "One-Off Tasks",
          emoji: "📌",
          state: "ACTIVE",
          priority: "MEDIUM",
          userId: user.id,
          order: 0,
        },
        {
          title: "Routines",
          emoji: "🔄",
          state: "ACTIVE",
          priority: "MEDIUM",
          userId: user.id,
          order: 1,
        },
      ],
    })
  }

  // Create a database session (30-day expiry)
  const sessionToken = randomUUID()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  })

  return NextResponse.json({
    sessionToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
  })
}
