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

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

const pageShape = {
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
}

type UpdateFields = {
  title?: string
  description?: string
  emoji?: string
  priority?: z.infer<typeof prioritySchema>
  state?: z.infer<typeof stateSchema>
  order?: number
  blockedById?: string
}

// State changes go through the /state endpoint (state-machine logic lives
// there); everything else through the plain PATCH endpoint.
function patchTask(ctx: ToolCtx, kind: "long" | "short", id: string, fields: UpdateFields) {
  const { state, blockedById, ...rest } = fields
  if (state !== undefined) {
    return api(ctx)(`/tasks/${kind}/${encodeURIComponent(id)}/state`, {
      method: "PATCH",
      body: JSON.stringify({ state, blockedById }),
    })
  }
  return api(ctx)(`/tasks/${kind}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(rest),
  })
}

// Resolves a special project ("Routines", "One-Off Tasks") by title.
// Returns the project id, null if absent, or the upstream error response.
async function findProjectId(apiCall: ReturnType<typeof api>, title: string) {
  const res = await apiCall("/tasks/long")
  if (res.isError) return res
  const projects = JSON.parse(res.content[0].text) as { id: string; title: string }[]
  return projects.find((p) => p.title === title)?.id ?? null
}

function listTasksUnder(title: string) {
  return async ({ limit, offset }: { limit?: number; offset?: number }, ctx: ToolCtx) => {
    const apiCall = api(ctx)
    const found = await findProjectId(apiCall, title)
    if (typeof found === "object" && found !== null) return found
    if (!found) return { content: [{ type: "text" as const, text: "[]" }] }
    return apiCall(`/tasks/short${query({ parentId: found, limit, offset })}`)
  }
}

const updateFieldsShape = {
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  priority: prioritySchema.optional(),
  state: stateSchema.optional(),
  order: z.number().optional(),
  blockedById: z.string().optional(),
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_projects",
      {
        description:
          "List the user's projects (long-running tasks) with subtask counts (total and per state). Optionally filter by state and paginate with limit/offset.",
        inputSchema: z.object({ state: stateSchema.optional(), ...pageShape }),
      },
      ({ state, limit, offset }, ctx) => api(ctx)(`/tasks/long${query({ state, limit, offset })}`)
    )

    server.registerTool(
      "list_tasks",
      {
        description:
          "List the user's subtasks (short-running tasks), optionally filtered by parent project and/or state, paginated with limit/offset.",
        inputSchema: z.object({
          parentId: z.string().optional(),
          state: stateSchema.optional(),
          ...pageShape,
        }),
      },
      ({ parentId, state, limit, offset }, ctx) =>
        api(ctx)(`/tasks/short${query({ parentId, state, limit, offset })}`)
    )

    server.registerTool(
      "get_project",
      {
        description:
          "Get a single project (long-running task) by id, including per-state subtask counts and its subtasks (paginated with limit/offset).",
        inputSchema: z.object({ id: z.string(), ...pageShape }),
      },
      ({ id, limit, offset }, ctx) =>
        api(ctx)(`/tasks/long/${encodeURIComponent(id)}${query({ limit, offset })}`)
    )

    server.registerTool(
      "get_task",
      {
        description: "Get a single subtask (short-running task) by id.",
        inputSchema: z.object({ id: z.string() }),
      },
      ({ id }, ctx) => api(ctx)(`/tasks/short/${encodeURIComponent(id)}`)
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
      "update_task",
      {
        description:
          "Update a subtask (short-running task). Any combination of: title, description, emoji, priority, order, state. When setting state BLOCKED, blockedById can name the blocking task.",
        inputSchema: z.object({
          id: z.string(),
          ...updateFieldsShape,
        }),
      },
      ({ id, ...fields }, ctx) => patchTask(ctx, "short", id, fields)
    )

    server.registerTool(
      "update_project",
      {
        description:
          "Update a project (long-running task). Any combination of: title, description, emoji, priority, order, state. When setting state BLOCKED, blockedById can name the blocking task.",
        inputSchema: z.object({
          id: z.string(),
          ...updateFieldsShape,
        }),
      },
      ({ id, ...fields }, ctx) => patchTask(ctx, "long", id, fields)
    )

    server.registerTool(
      "move_task",
      {
        description: "Move a subtask to a different parent project.",
        inputSchema: z.object({
          id: z.string(),
          newParentId: z.string(),
        }),
      },
      ({ id, newParentId }, ctx) =>
        api(ctx)(`/tasks/short/${encodeURIComponent(id)}/move`, {
          method: "PATCH",
          body: JSON.stringify({ newParentId }),
        })
    )

    server.registerTool(
      "list_one_offs",
      {
        description: "List one-off tasks (subtasks under the One-Off Tasks project), paginated with limit/offset.",
        inputSchema: z.object({ ...pageShape }),
      },
      listTasksUnder("One-Off Tasks")
    )

    server.registerTool(
      "list_routines",
      {
        description: "List routines (subtasks under the Routines project), paginated with limit/offset.",
        inputSchema: z.object({ ...pageShape }),
      },
      listTasksUnder("Routines")
    )

    server.registerTool(
      "create_routine",
      {
        description:
          "Create a routine (a subtask under the Routines project). Use update_task to modify routines.",
        inputSchema: z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          emoji: z.string().optional(),
          priority: prioritySchema.optional(),
        }),
      },
      async (args, ctx) => {
        const apiCall = api(ctx)
        const found = await findProjectId(apiCall, "Routines")
        if (typeof found === "object" && found !== null) return found
        if (!found) {
          return {
            content: [
              {
                type: "text" as const,
                text: 'No "Routines" project found. Create a project titled "Routines" first.',
              },
            ],
            isError: true,
          }
        }
        return apiCall("/tasks/short", {
          method: "POST",
          body: JSON.stringify({ ...args, parentId: found }),
        })
      }
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
