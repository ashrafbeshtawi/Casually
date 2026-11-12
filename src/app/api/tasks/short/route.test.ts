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
})
