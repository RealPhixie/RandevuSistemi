import type { PanelUserRole } from '@prisma/client'

import { auth } from '@/lib/auth'

export async function requireRole(
  allowed: PanelUserRole[]
): Promise<{
  id: string
  name: string
  username: string
  role: PanelUserRole
} | null> {
  const session = await auth()

  if (!session?.user) return null
  if (!allowed.includes(session.user.role)) return null

  return session.user
}
