import type { PanelUserRole } from '@prisma/client'

import { auth } from '@/lib/auth'
import { isPanelUserRole } from '@/lib/panel-user-role'

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
  if (!isPanelUserRole(session.user.role)) return null
  if (!allowed.includes(session.user.role)) return null

  return {
    id: session.user.id,
    name: session.user.name,
    username: session.user.username,
    role: session.user.role,
  }
}
