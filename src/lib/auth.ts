import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username
        const password = credentials?.password

        if (typeof username !== 'string' || typeof password !== 'string') {
          return null
        }

        const admin = await prisma.admin.findUnique({
          where: { username },
        })

        if (!admin) return null

        const validPassword = await bcrypt.compare(password, admin.password)
        if (!validPassword) return null

        return {
          id: admin.id,
          name: admin.name,
          username: admin.username,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.username = user.username
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.username =
          typeof token.username === 'string' ? token.username : ''
      }

      return session
    },
  },
  pages: { signIn: '/admin/login' },
  session: { strategy: 'jwt' },
})
