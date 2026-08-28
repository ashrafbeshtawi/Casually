import { createMcpHandler, withMcpAuth, getPublicOrigin } from "mcp-handler"
import { z } from "zod"
import { getUserIdFromToken } from "@/lib/api-token"

const prioritySchema = z.enum(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"])
const stateSchema = z.enum(["ACTIVE", "WAITING", "BLOCKED", "DONE"])

type ToolCtx = { http?: { req?: Request; authInfo?: { token: string } } }

// Tools are thin wrappers over the existing REST API — all validation,
// ownership checks, and state-machine logic live there, not here.
function api(ctx: ToolCtx) {
  const req = ctx.http?.req
  const token = ctx.http?.authInfo?.token
  if (!req || !token) throw new Error("Unauthorized")
  const origin = getPublicOrigin(req)

  return async (path: string, init?: RequestInit) => {
    const res = await fetch(`${origin}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        content: [{ type: "text" as const, text: body.error || `Request failed (${res.status})` }],
        isError: true,
      }
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }] }
  }
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_projects",
      {
        description:
          "List the user's projects (long-running tasks) with subtask counts. Optionally filter by state.",
        inputSchema: z.object({ state: stateSchema.optional() }),
      },
      ({ state }, ctx) => api(ctx)(`/tasks/long${query({ state })}`)
    )

    server.registerTool(
      "list_tasks",
      {
        description:
          "List the user's subtasks (short-running tasks), optionally filtered by parent project and/or state.",
        inputSchema: z.object({
          parentId: z.string().optional(),
          state: stateSchema.optional(),
        }),
      },
      ({ parentId, state }, ctx) => api(ctx)(`/tasks/short${query({ parentId, state })}`)
    )

    server.registerTool(
      "create_project",
      {
        description: "Create a new project (long-running task).",
        inputSchema: z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          emoji: z.string().optional(),
          priority: prioritySchema.optional(),
        }),
      },
      (args, ctx) => api(ctx)("/tasks/long", { method: "POST", body: JSON.stringify(args) })
    )

    server.registerTool(
      "create_task",
      {
        description: "Create a subtask (short-running task) under a project.",
        inputSchema: z.object({
          parentId: z.string(),
          title: z.string().min(1),
          description: z.string().optional(),
          emoji: z.string().optional(),
          priority: prioritySchema.optional(),
        }),
      },
      (args, ctx) => api(ctx)("/tasks/short", { method: "POST", body: JSON.stringify(args) })
    )

    server.registerTool(
      "update_task_state",
      {
        description:
          "Change the state of a project or a subtask. Valid states: ACTIVE, WAITING, BLOCKED, DONE. When setting BLOCKED, blockedById can name the blocking task.",
        inputSchema: z.object({
          id: z.string(),
          kind: z.enum(["project", "task"]),
          state: stateSchema,
          blockedById: z.string().optional(),
        }),
      },
      ({ id, kind, state, blockedById }, ctx) =>
        api(ctx)(`/tasks/${kind === "project" ? "long" : "short"}/${encodeURIComponent(id)}/state`, {
          method: "PATCH",
          body: JSON.stringify({ state, blockedById }),
        })
    )

    server.registerTool(
      "list_challenges",
      {
        description: "List the user's challenges (habit streaks) with their start dates.",
        inputSchema: z.object({}),
      },
      (_args, ctx) => api(ctx)("/challenges")
    )
  },
  { serverInfo: { name: "casually", version: "1.0.0" } }
)

const verifyToken = async (_req: Request, bearerToken?: string) => {
  if (!bearerToken) return undefined
  const userId = await getUserIdFromToken(bearerToken)
  if (!userId) return undefined
  return { token: bearerToken, clientId: userId, scopes: [] }
}

const authHandler = withMcpAuth(handler, verifyToken, { required: true })

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
