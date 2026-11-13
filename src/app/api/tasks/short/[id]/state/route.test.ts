import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const findFirst = vi.fn()
const changeShortRunningTaskState = vi.fn()

vi.mock("@/lib/api-token", () => ({
  getAuthUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shortRunningTask: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      findUnique: vi.fn().mockResolvedValue({ id: "s1", state: "BLOCKED" }),
    },
  },
}))
vi.mock("@/lib/state-machine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/state-machine")>()),
  changeShortRunningTaskState: (...args: unknown[]) => changeShortRunningTaskState(...args),
}))

const { PATCH } = await import("@/app/api/tasks/short/[id]/state/route")

const patch = (body: unknown) =>
  PATCH(
    new NextRequest("http://localhost:3000/api/tasks/short/s1/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "s1" }) }
  )

// First findFirst loads the task itself, the second one the blocker.
const task = { id: "s1", title: "Milk", state: "ACTIVE" }

describe("PATCH /api/tasks/short/[id]/state", () => {
  beforeEach(() => {
    findFirst.mockReset()
    changeShortRunningTaskState.mockReset()
  })

  it("rejects a blocker that belongs to another user", async () => {
    findFirst.mockResolvedValueOnce(task).mockResolvedValueOnce(null)
    const res = await patch({ state: "BLOCKED", blockedById: "foreign" })
    expect(res.status).toBe(400)
    expect(findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "foreign", parent: { userId: "user-1" } } })
    )
    expect(changeShortRunningTaskState).not.toHaveBeenCalled()
  })

  it("rejects the task as its own blocker", async () => {
    findFirst.mockResolvedValueOnce(task)
    const res = await patch({ state: "BLOCKED", blockedById: "s1" })
    expect(res.status).toBe(400)
    expect(changeShortRunningTaskState).not.toHaveBeenCalled()
  })

  it("accepts a blocker of the same user", async () => {
    findFirst.mockResolvedValueOnce(task).mockResolvedValueOnce({ id: "s2" })
    const res = await patch({ state: "BLOCKED", blockedById: "s2" })
    expect(res.status).toBe(200)
    expect(changeShortRunningTaskState).toHaveBeenCalledWith(
      expect.anything(), "s1", "BLOCKED", "s2"
    )
  })
})
