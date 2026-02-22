import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
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
