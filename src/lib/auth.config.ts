import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

/**
 * Shared auth config (Edge-compatible — no Prisma imports).
 * Used by middleware and as the base for the full auth config.
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig
