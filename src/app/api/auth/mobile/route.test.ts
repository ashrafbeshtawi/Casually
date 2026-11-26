import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { verifyIdToken, prisma } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  prisma: {
    account: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    longRunningTask: { createMany: vi.fn() },
    session: { create: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(function () {
    return { verifyIdToken }
  }),
}))
vi.mock("@/lib/prisma", () => ({ prisma }))

const { POST, DELETE } = await import("@/app/api/auth/mobile/route")

const logout = (cookie?: string) =>
  DELETE(
    new NextRequest("http://localhost:3000/api/auth/mobile", {
      method: "DELETE",
      headers: cookie ? { Cookie: cookie } : {},
    })
  )

const login = (payload: Record<string, unknown>) => {
  verifyIdToken.mockResolvedValue({ getPayload: () => payload })
  return POST(
    new NextRequest("http://localhost:3000/api/auth/mobile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "token" }),
    })
  )
}

const alice = { id: "u1", email: "alice@example.com", name: "Alice", image: null }

beforeEach(() => {
  vi.clearAllMocks()
  prisma.account.findUnique.mockResolvedValue(null)
  prisma.user.findUnique.mockResolvedValue(null)
  prisma.user.create.mockResolvedValue({ id: "new", email: "bob@example.com", name: null, image: null })
})

describe("POST /api/auth/mobile", () => {
  it("rejects a token whose email is not verified", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...alice, accounts: [] })
    const res = await login({ sub: "g-attacker", email: alice.email, email_verified: false })
    expect(res.status).toBe(401)
    expect(prisma.session.create).not.toHaveBeenCalled()
  })

  it("logs in the user linked to the Google sub", async () => {
    prisma.account.findUnique.mockResolvedValue({ id: "a1", user: alice })
    const res = await login({ sub: "g-alice", email: alice.email, email_verified: true })
    expect(res.status).toBe(200)
    expect((await res.json()).user.id).toBe("u1")
    expect(prisma.account.create).not.toHaveBeenCalled()
  })

  it("rejects a different Google account carrying the email of a linked user", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...alice, accounts: [{ providerAccountId: "g-alice" }] })
    const res = await login({ sub: "g-other", email: alice.email, email_verified: true })
    expect(res.status).toBe(401)
    expect(prisma.session.create).not.toHaveBeenCalled()
  })

  it("links an unlinked user found by verified email", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...alice, accounts: [] })
    const res = await login({ sub: "g-alice", email: alice.email, email_verified: true })
    expect(res.status).toBe(200)
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: { userId: "u1", type: "oidc", provider: "google", providerAccountId: "g-alice" },
    })
  })

  it("creates a new user with default tasks and links the account", async () => {
    const res = await login({ sub: "g-bob", email: "bob@example.com", email_verified: true })
    expect(res.status).toBe(200)
    expect(prisma.user.create).toHaveBeenCalled()
    expect(prisma.longRunningTask.createMany).toHaveBeenCalled()
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: { userId: "new", type: "oidc", provider: "google", providerAccountId: "g-bob" },
    })
  })
})

describe("DELETE /api/auth/mobile", () => {
  it("deletes the session the cookie token points to", async () => {
    const res = await logout("__Secure-authjs.session-token=tok-1; authjs.session-token=tok-1")
    expect(res.status).toBe(204)
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { sessionToken: "tok-1" } })
  })

  it("accepts the non-secure cookie name too", async () => {
    await logout("authjs.session-token=tok-2")
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { sessionToken: "tok-2" } })
  })

  it("does nothing without a cookie and still answers 204", async () => {
    const res = await logout()
    expect(res.status).toBe(204)
    expect(prisma.session.deleteMany).not.toHaveBeenCalled()
  })
})
