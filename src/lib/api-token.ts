import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function generateToken(): string {
  return `csly_${randomBytes(24).toString("hex")}`
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  if (!token.startsWith("csly_")) return null
  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true },
  })
  return record?.userId ?? null
}
