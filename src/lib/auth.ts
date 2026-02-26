import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  events: {
    createUser: async ({ user }) => {
      await prisma.longRunningTask.createMany({
        data: [
          {
            title: 'One-Off Tasks',
            emoji: '📌',
            state: 'ACTIVE',
            priority: 'MEDIUM',
            userId: user.id!,
            order: 0,
          },
          {
            title: 'Routines',
            emoji: '🔄',
            state: 'ACTIVE',
            priority: 'MEDIUM',
            userId: user.id!,
            order: 1,
          },
        ],
      })
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
