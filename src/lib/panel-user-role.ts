import type { PanelUserRole } from '@prisma/client'

export function isPanelUserRole(value: unknown): value is PanelUserRole {
  return value === 'ADMIN' || value === 'DOCTOR' || value === 'SECRETARY'
}
