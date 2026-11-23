import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const findFirst = vi.fn()
const changeLongRunningTaskState = vi.fn()

vi.mock("@/lib/api-token", () => ({
  getAuthUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    longRunningTask: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      findUnique: vi.fn().mockResolvedValue({ id: "p1", state: "BLOCKED" }),
    },
  },
}))
vi.mock("@/lib/state-machine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/state-machine")>()),
  changeLongRunningTaskState: (...args: unknown[]) => changeLongRunningTaskState(...args),
}))

const { PATCH } = await import("@/app/api/tasks/long/[id]/state/route")

const patch = (body: unknown) =>
  PATCH(
    new NextRequest("http://localhost:3000/api/tasks/long/p1/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "p1" }) }
  )

// First findFirst loads the task itself, the second one the blocker.
const task = { id: "p1", title: "Groceries", state: "ACTIVE" }

describe("PATCH /api/tasks/long/[id]/state", () => {
  beforeEach(() => {
    findFirst.mockReset()
    changeLongRunningTaskState.mockReset()
  })

  it("rejects a blocker that belongs to another user", async () => {
    findFirst.mockResolvedValueOnce(task).mockResolvedValueOnce(null)
    const res = await patch({ state: "BLOCKED", blockedById: "foreign" })
    expect(res.status).toBe(400)
    expect(findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "foreign", userId: "user-1" } })
    )
    expect(changeLongRunningTaskState).not.toHaveBeenCalled()
  })

  it("rejects the task as its own blocker", async () => {
    findFirst.mockResolvedValueOnce(task)
    const res = await patch({ state: "BLOCKED", blockedById: "p1" })
    expect(res.status).toBe(400)
    expect(changeLongRunningTaskState).not.toHaveBeenCalled()
  })

  it("accepts a blocker of the same user", async () => {
    findFirst.mockResolvedValueOnce(task).mockResolvedValueOnce({ id: "p2" })
    const res = await patch({ state: "BLOCKED", blockedById: "p2" })
    expect(res.status).toBe(200)
    expect(changeLongRunningTaskState).toHaveBeenCalledWith(
      expect.anything(), "p1", "BLOCKED", "p2"
    )
  })

  it("allows BLOCKED without a blocker", async () => {
    findFirst.mockResolvedValueOnce(task)
    const res = await patch({ state: "BLOCKED" })
    expect(res.status).toBe(200)
    expect(findFirst).toHaveBeenCalledTimes(1)
  })
})
