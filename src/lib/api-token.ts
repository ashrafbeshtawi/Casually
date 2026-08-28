import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function generateToken(): string {
  return `csly_${randomBytes(24).toString("hex")}`
}

// Single source of truth for API auth: bearer token (MCP/API clients) or
// NextAuth session cookie (web app). Routes fail closed on null.
export async function getAuthUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return getUserIdFromToken(header.slice(7))
  }
  const session = await auth()
  return session?.user?.id ?? null
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  if (!token.startsWith("csly_")) return null
  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true },
  })
  return record?.userId ?? null
}
