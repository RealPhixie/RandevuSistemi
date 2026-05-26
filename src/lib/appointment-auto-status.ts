import { getLocalDateTimeParts, getUtcDateRange } from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'

const NO_SHOW_GRACE_PERIOD_MINUTES = 15

export async function markExpiredScheduledAppointmentsNoShow(
  referenceDate = new Date()
) {
  const cutoff = new Date(
    referenceDate.getTime() - NO_SHOW_GRACE_PERIOD_MINUTES * 60 * 1000
  )
  const cutoffParts = getLocalDateTimeParts(cutoff)
  const cutoffRange = getUtcDateRange(cutoffParts.date)

  if (!cutoffRange) {
    return { count: 0 }
  }

  return prisma.appointment.updateMany({
    where: {
      status: 'SCHEDULED',
      OR: [
        {
          timeSlot: {
            date: { lt: cutoffRange.start },
          },
        },
        {
          timeSlot: {
            date: { gte: cutoffRange.start, lt: cutoffRange.end },
            startTime: { lte: cutoffParts.time },
          },
        },
      ],
    },
    data: { status: 'NO_SHOW' },
  })
}
