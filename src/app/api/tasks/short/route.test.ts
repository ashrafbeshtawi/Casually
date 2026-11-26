import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/api-token", () => ({
  getAuthUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shortRunningTask: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

const { prisma } = await import("@/lib/prisma")
const { GET } = await import("@/app/api/tasks/short/route")

describe("GET /api/tasks/short", () => {
  it("sorts by order with id as tie-breaker, so limit/offset pages neither repeat nor skip tasks", async () => {
    await GET(new NextRequest("http://localhost:3000/api/tasks/short?limit=100&offset=100"))
    expect(prisma.shortRunningTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ order: "asc" }, { id: "asc" }], take: 100, skip: 100 })
    )
  })

  it("filters by state so the dashboard only loads ACTIVE subtasks", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/tasks/short?state=ACTIVE"))
    expect(res.status).toBe(200)
    expect(prisma.shortRunningTask.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { parent: { userId: "user-1" }, state: "ACTIVE" },
      })
    )
  })

  it.each([
    ["state=active", "Invalid state"],
    ["state=toString", "Invalid state"],
    ["priority=URGENT", "Invalid priority"],
  ])("rejects %s with 400 without querying", async (query, message) => {
    vi.mocked(prisma.shortRunningTask.findMany).mockClear()
    const res = await GET(new NextRequest(`http://localhost:3000/api/tasks/short?${query}`))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe(message)
    expect(prisma.shortRunningTask.findMany).not.toHaveBeenCalled()
  })
})
