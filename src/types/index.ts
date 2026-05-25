import type { DefaultSession } from 'next-auth'
import type {} from 'next-auth/jwt'

export interface AdminSessionUser {
  id: string
  name?: string | null
  username: string
}

declare module 'next-auth' {
  interface Session {
    user?: AdminSessionUser & DefaultSession['user']
  }

  interface User {
    username: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string
  }
}
