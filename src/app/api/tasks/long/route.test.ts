import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/api-token", () => ({
  getAuthUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    longRunningTask: {
      create: vi.fn().mockResolvedValue({ id: "p1", title: "Groceries" }),
      findMany: vi.fn().mockResolvedValue([{ id: "p1" }, { id: "p2" }]),
    },
    shortRunningTask: {
      groupBy: vi.fn().mockResolvedValue([
        { parentId: "p1", state: "ACTIVE", _count: 2 },
        { parentId: "p1", state: "DONE", _count: 1 },
      ]),
    },
  },
}))

const { GET, POST } = await import("@/app/api/tasks/long/route")

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost:3000/api/tasks/long", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )

describe("GET /api/tasks/long", () => {
  it("attaches per-state subtask counts, zeros for empty projects", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/tasks/long"))
    const [p1, p2] = await res.json()
    expect(p1.subtaskCounts).toEqual({ ACTIVE: 2, WAITING: 0, BLOCKED: 0, DONE: 1 })
    expect(p2.subtaskCounts).toEqual({ ACTIVE: 0, WAITING: 0, BLOCKED: 0, DONE: 0 })
  })
})

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
