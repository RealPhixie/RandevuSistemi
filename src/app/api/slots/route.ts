import { prisma } from '@/lib/prisma'
import type { SlotOption } from '@/types'

function getUtcDateRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const [year, month, day] = date.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, day))

  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return null
  }

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return { start, end }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const doctorId = searchParams.get('doctorId')
  const date = searchParams.get('date')

  if (!doctorId || doctorId.trim().length === 0) {
    return Response.json(
      { success: false, error: 'Doktor bilgisi gereklidir' },
      { status: 400 }
    )
  }

  if (!date || date.trim().length === 0) {
    return Response.json(
      { success: false, error: 'Tarih bilgisi gereklidir' },
      { status: 400 }
    )
  }

  const range = getUtcDateRange(date)

  if (!range) {
    return Response.json(
      { success: false, error: 'Tarih formatı geçersiz' },
      { status: 400 }
    )
  }

  try {
    const slots = await prisma.timeSlot.findMany({
      where: {
        doctorId,
        isBooked: false,
        date: {
          gte: range.start,
          lt: range.end,
        },
        doctor: {
          isActive: true,
          department: {
            isActive: true,
            hospital: { isActive: true },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    const data: SlotOption[] = slots.map((slot) => ({
      id: slot.id,
      doctorId: slot.doctorId,
      date: slot.date.toISOString(),
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))

    return Response.json({ success: true, data })
  } catch {
    return Response.json(
      { success: false, error: 'Uygun saatler yüklenemedi' },
      { status: 500 }
    )
  }
}
