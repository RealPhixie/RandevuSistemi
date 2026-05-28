import {
  getUtcDateRange,
  getLocalDateTimeParts,
  isBookableSlot,
  isWorkingDate,
} from '@/lib/booking-time'
import { AdminMutationError } from '@/lib/admin-management'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import type { SlotOption } from '@/types'
import {
  ensureRollingSlotsForDoctor,
  isWithinRollingSlotWindow,
  updateDoctorSlotAvailability,
} from '@/lib/working-hours'

export const dynamic = 'force-dynamic'

interface SlotAvailabilityRequestBody {
  doctorId?: unknown
  date?: unknown
  isActive?: unknown
  allDay?: unknown
  times?: unknown
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

  const localNow = getLocalDateTimeParts()

  if (date < localNow.date) {
    return Response.json(
      { success: false, error: 'Geçmiş tarihler için randevu alınamaz' },
      { status: 400 }
    )
  }

  if (!isWithinRollingSlotWindow(date)) {
    return Response.json(
      { success: false, error: 'Randevu tarihi en fazla 2 hafta sonrası olabilir' },
      { status: 400 }
    )
  }

  if (!isWorkingDate(date)) {
    return Response.json({ success: true, data: [] })
  }

  try {
    await ensureRollingSlotsForDoctor(doctorId)

    const slots = await prisma.timeSlot.findMany({
      where: {
        doctorId,
        isBooked: false,
        isActive: true,
        appointments: { none: { status: 'SCHEDULED' } },
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

    const data: SlotOption[] = slots
      .filter((slot) => isBookableSlot(date, slot.startTime, localNow))
      .map((slot) => ({
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

export async function POST(request: Request) {
  const user = await requireRole(['ADMIN'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let body: SlotAvailabilityRequestBody

  try {
    body = (await request.json()) as SlotAvailabilityRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  try {
    const result = await updateDoctorSlotAvailability({
      doctorId: body.doctorId,
      date: body.date,
      isActive: body.isActive,
      allDay: body.allDay,
      times: body.times,
    })

    return Response.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AdminMutationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    return Response.json(
      { success: false, error: 'Çalışma saatleri güncellenemedi' },
      { status: 500 }
    )
  }
}
