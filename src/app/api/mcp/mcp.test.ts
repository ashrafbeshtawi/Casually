import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/api-token", () => ({
  getUserIdFromToken: vi.fn().mockResolvedValue("user-1"),
}))

const { POST } = await import("@/app/api/mcp/route")

// The MCP tools are thin wrappers that call the REST API via fetch —
// mock fetch and assert on the requests the tools make.
const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })

function rpc(method: string, params?: unknown) {
  return POST(
    new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    })
  )
}

// Responses may be SSE-framed ("data: {...}") or plain JSON.
async function result(res: Response) {
  const text = await res.text()
  const dataLines = text.split("\n").filter((l) => l.startsWith("data:"))
  const payload = dataLines.length ? dataLines[dataLines.length - 1].slice(5).trim() : text
  return JSON.parse(payload).result
}

function callArgs(n = 0) {
  const [url, init] = fetchMock.mock.calls[n]
  return { url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(init.body) : undefined }
}

describe("MCP handler", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(json({}))
  })

  it("exposes the expected tools", async () => {
    const { tools } = await result(await rpc("tools/list"))
    const names = tools.map((t: { name: string }) => t.name)
    expect(names.sort()).toEqual(
      [
        "list_projects",
        "list_tasks",
        "get_project",
        "get_task",
        "create_project",
        "create_task",
        "update_task",
        "update_project",
        "move_task",
        "list_one_offs",
        "list_routines",
        "create_routine",
      ].sort()
    )
  })

  it("list tools pass limit and offset through", async () => {
    await rpc("tools/call", { name: "list_projects", arguments: { limit: 5, offset: 10 } })
    expect(callArgs(0).url).toContain("/api/tasks/long?limit=5&offset=10")

    fetchMock.mockClear()
    await rpc("tools/call", { name: "list_tasks", arguments: { parentId: "p1", limit: 2 } })
    expect(callArgs(0).url).toContain("/api/tasks/short?parentId=p1&limit=2")
  })

  it("list tools default to limit 20, offset 0", async () => {
    await rpc("tools/call", { name: "list_projects", arguments: {} })
    expect(callArgs(0).url).toContain("/api/tasks/long?limit=20")
  })

  it("list_routines passes limit through to the task listing", async () => {
    fetchMock
      .mockResolvedValueOnce(json([{ id: "r1", title: "Routines" }]))
      .mockResolvedValueOnce(json([]))
    await result(await rpc("tools/call", { name: "list_routines", arguments: { limit: 3 } }))
    expect(callArgs(1).url).toContain("/api/tasks/short?parentId=r1&limit=3")
  })

  it("get_project and get_task GET single items", async () => {
    await rpc("tools/call", { name: "get_project", arguments: { id: "p1", limit: 5 } })
    expect(callArgs(0).url).toContain("/api/tasks/long/p1?limit=5")
    expect(callArgs(0).method).toBe("GET")

    fetchMock.mockClear()
    await rpc("tools/call", { name: "get_task", arguments: { id: "t1" } })
    expect(callArgs(0).url).toContain("/api/tasks/short/t1")
  })

  it("update_task with state hits the state endpoint", async () => {
    await rpc("tools/call", { name: "update_task", arguments: { id: "t1", state: "ACTIVE" } })
    const { url, method, body } = callArgs()
    expect(url).toContain("/api/tasks/short/t1/state")
    expect(method).toBe("PATCH")
    expect(body).toEqual({ state: "ACTIVE" })
  })

  it("update_task with fields hits the plain PATCH endpoint", async () => {
    await rpc("tools/call", { name: "update_task", arguments: { id: "t1", title: "New", order: 3 } })
    const { url, method, body } = callArgs()
    expect(url).toContain("/api/tasks/short/t1")
    expect(url).not.toContain("/state")
    expect(method).toBe("PATCH")
    expect(body).toEqual({ title: "New", order: 3 })
  })

  it("update_project works with state only (no title required)", async () => {
    await rpc("tools/call", { name: "update_project", arguments: { id: "p1", state: "DONE" } })
    const { url, body } = callArgs()
    expect(url).toContain("/api/tasks/long/p1/state")
    expect(body).toEqual({ state: "DONE" })
  })

  it("move_task PATCHes the move endpoint", async () => {
    await rpc("tools/call", { name: "move_task", arguments: { id: "t1", newParentId: "p2" } })
    const { url, method, body } = callArgs()
    expect(url).toContain("/api/tasks/short/t1/move")
    expect(method).toBe("PATCH")
    expect(body).toEqual({ newParentId: "p2" })
  })

  it("list_routines resolves the Routines project then lists its tasks", async () => {
    fetchMock
      .mockResolvedValueOnce(json([{ id: "r1", title: "Routines" }, { id: "x", title: "Other" }]))
      .mockResolvedValueOnce(json([{ id: "t1", title: "Morning run" }]))
    const res = await result(await rpc("tools/call", { name: "list_routines", arguments: {} }))
    expect(callArgs(0).url).toContain("/api/tasks/long")
    expect(callArgs(1).url).toContain("/api/tasks/short?parentId=r1")
    expect(res.content[0].text).toContain("Morning run")
  })

  it("create_routine creates under the Routines project", async () => {
    fetchMock
      .mockResolvedValueOnce(json([{ id: "r1", title: "Routines" }]))
      .mockResolvedValueOnce(json({ id: "t9", title: "Stretch" }))
    await result(await rpc("tools/call", { name: "create_routine", arguments: { title: "Stretch" } }))
    const { url, method, body } = callArgs(1)
    expect(url).toContain("/api/tasks/short")
    expect(method).toBe("POST")
    expect(body).toEqual({ title: "Stretch", parentId: "r1" })
  })

  it("create_routine errors when no Routines project exists", async () => {
    fetchMock.mockResolvedValueOnce(json([{ id: "x", title: "Other" }]))
    const res = await result(await rpc("tools/call", { name: "create_routine", arguments: { title: "Stretch" } }))
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toContain('"Routines" project')
  })
})
