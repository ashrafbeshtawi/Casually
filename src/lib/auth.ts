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
      // Auto-create the One-Off Tasks container for new users
      await prisma.longTermTask.create({
        data: {
          title: 'One-Off Tasks',
          isOneOff: true,
          state: 'ACTIVE',
          priority: 'MEDIUM',
          userId: user.id!,
          order: 0,
        },
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
