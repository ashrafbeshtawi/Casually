import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/api-token", () => ({
  getAuthUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { longRunningTask: { create: vi.fn().mockResolvedValue({ id: "p1", title: "Groceries" }) } },
}))

const { POST } = await import("@/app/api/tasks/long/route")

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost:3000/api/tasks/long", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )

describe("POST /api/tasks/long", () => {
  it.each(["Routines", "One-Off Tasks", "  Routines  "])(
    "rejects reserved title %j",
    async (title) => {
      const res = await post({ title })
      expect(res.status).toBe(400)
      const { error } = await res.json()
      expect(error).toContain("reserved")
    }
  )

  it("accepts a normal title", async () => {
    const res = await post({ title: "Groceries" })
    expect(res.status).toBe(201)
  })
})
