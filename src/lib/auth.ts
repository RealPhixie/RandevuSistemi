import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

import { isPanelUserRole } from '@/lib/panel-user-role'
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

        const user = await prisma.panelUser.findUnique({
          where: { username },
        })

        if (!user || !user.isActive) return null

        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) return null

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id =
          typeof token.id === 'string' ? token.id : token.sub ?? ''
        session.user.name =
          typeof token.name === 'string' ? token.name : session.user.name ?? ''
        session.user.username =
          typeof token.username === 'string' ? token.username : ''
        if (isPanelUserRole(token.role)) {
          session.user.role = token.role
        }
      }

      return session
    },
  },
  pages: { signIn: '/admin/login' },
  session: { strategy: 'jwt' },
})
