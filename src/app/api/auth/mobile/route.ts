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

  if (!payload?.email || !payload.sub) {
    return NextResponse.json({ error: "No email in token" }, { status: 401 })
  }

  // An unverified address proves nothing about who owns it
  if (payload.email_verified !== true) {
    return NextResponse.json({ error: "Email not verified" }, { status: 401 })
  }

  // Look the user up by Google account (sub), like the web NextAuth flow
  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: payload.sub,
      },
    },
    include: { user: true },
  })
  let user = account?.user ?? null

  if (!user) {
    const byEmail = await prisma.user.findUnique({
      where: { email: payload.email },
      include: { accounts: { where: { provider: "google" } } },
    })

    // The email belongs to a user already linked to another Google account
    if (byEmail && byEmail.accounts.length > 0) {
      return NextResponse.json({ error: "Account mismatch" }, { status: 401 })
    }
    user = byEmail
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? null,
        image: payload.picture ?? null,
        emailVerified: new Date(),
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

  // Link the Google account so later logins (mobile and web) match on sub
  if (!account) {
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oidc",
        provider: "google",
        providerAccountId: payload.sub,
      },
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
