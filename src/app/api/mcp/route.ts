import { createMcpHandler, withMcpAuth } from "mcp-handler"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserIdFromToken } from "@/lib/api-token"
import {
  changeLongRunningTaskState,
  changeShortRunningTaskState,
} from "@/lib/state-machine"
import { TaskState } from "@/types"

const prioritySchema = z.enum(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"])
const stateSchema = z.enum(["ACTIVE", "WAITING", "BLOCKED", "DONE"])

function userIdOf(ctx: { http?: { authInfo?: { extra?: Record<string, unknown> } } }): string {
  const userId = ctx.http?.authInfo?.extra?.userId
  if (typeof userId !== "string") throw new Error("Unauthorized")
  return userId
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true }
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_projects",
      {
        description:
          "List the user's projects (long-running tasks) including their subtasks. Optionally filter by state.",
        inputSchema: z.object({ state: stateSchema.optional() }),
      },
      async ({ state }, ctx) => {
        const userId = userIdOf(ctx)
        const projects = await prisma.longRunningTask.findMany({
          where: { userId, ...(state ? { state } : {}) },
          include: {
            children: { orderBy: { order: "asc" } },
            blockedBy: { select: { id: true, title: true } },
          },
          orderBy: { order: "asc" },
        })
        return json(projects)
      }
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
      async ({ title, description, emoji, priority }, ctx) => {
        const userId = userIdOf(ctx)
        const project = await prisma.longRunningTask.create({
          data: {
            title: title.trim(),
            description: description?.trim() || null,
            emoji: emoji?.trim() || null,
            priority: priority || "MEDIUM",
            userId,
          },
        })
        return json(project)
      }
    )

    server.registerTool(
      "create_task",
      {
        description: "Create a subtask (short-running task) under a project.",
        inputSchema: z.object({
          projectId: z.string(),
          title: z.string().min(1),
          description: z.string().optional(),
          emoji: z.string().optional(),
          priority: prioritySchema.optional(),
        }),
      },
      async ({ projectId, title, description, emoji, priority }, ctx) => {
        const userId = userIdOf(ctx)
        const project = await prisma.longRunningTask.findFirst({
          where: { id: projectId, userId },
        })
        if (!project) return error(`Project ${projectId} not found`)

        const task = await prisma.shortRunningTask.create({
          data: {
            title: title.trim(),
            description: description?.trim() || null,
            emoji: emoji?.trim() || null,
            priority: priority || "MEDIUM",
            parentId: projectId,
          },
        })
        return json(task)
      }
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
      async ({ id, kind, state, blockedById }, ctx) => {
        const userId = userIdOf(ctx)
        try {
          if (kind === "project") {
            const project = await prisma.longRunningTask.findFirst({
              where: { id, userId },
            })
            if (!project) return error(`Project ${id} not found`)
            await changeLongRunningTaskState(prisma, id, state as TaskState, blockedById)
            return json(await prisma.longRunningTask.findUnique({ where: { id } }))
          }
          const task = await prisma.shortRunningTask.findFirst({
            where: { id, parent: { userId } },
          })
          if (!task) return error(`Task ${id} not found`)
          await changeShortRunningTaskState(prisma, id, state as TaskState, blockedById)
          return json(await prisma.shortRunningTask.findUnique({ where: { id } }))
        } catch (err) {
          return error(err instanceof Error ? err.message : "State change failed")
        }
      }
    )

    server.registerTool(
      "list_challenges",
      {
        description: "List the user's challenges (habit streaks) with their start dates.",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const userId = userIdOf(ctx)
        const challenges = await prisma.challenge.findMany({
          where: { userId },
          orderBy: { startedAt: "asc" },
        })
        return json(challenges)
      }
    )
  },
  { serverInfo: { name: "casually", version: "1.0.0" } }
)

const verifyToken = async (_req: Request, bearerToken?: string) => {
  if (!bearerToken) return undefined
  const userId = await getUserIdFromToken(bearerToken)
  if (!userId) return undefined
  return {
    token: bearerToken,
    clientId: userId,
    scopes: [],
    extra: { userId },
  }
}

const authHandler = withMcpAuth(handler, verifyToken, { required: true })

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
