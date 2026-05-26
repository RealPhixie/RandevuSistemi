import { prisma } from '@/lib/prisma'

export function normalizeVerificationId(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function findActivePhoneVerification(
  phone: string,
  verificationId: string
) {
  if (!verificationId) return null

  return prisma.otpCode.findFirst({
    where: {
      id: verificationId,
      phone,
      used: true,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
}
