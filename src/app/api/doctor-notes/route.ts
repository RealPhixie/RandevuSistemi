import { getLocalDateInputValue, getUtcDateRange } from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

interface DoctorNotePutRequestBody {
  patientId?: unknown
  content?: unknown
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function canAccessPatientNote(doctorId: string, patientId: string) {
  const todayRange = getUtcDateRange(getLocalDateInputValue())

  if (!todayRange) return false

  const appointment = await prisma.appointment.findFirst({
    where: {
      patientId,
      isConfirmed: true,
      timeSlot: {
        doctorId,
        date: {
          gte: todayRange.start,
          lt: todayRange.end,
        },
      },
    },
    select: { id: true },
  })

  return Boolean(appointment)
}

export async function GET(request: Request) {
  const user = await requireRole(['DOCTOR'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const patientId = normalizeText(searchParams.get('patientId'))

  if (!patientId) {
    return Response.json(
      { success: false, error: 'Hasta bilgisi gereklidir' },
      { status: 400 }
    )
  }

  const canAccess = await canAccessPatientNote(user.id, patientId)

  if (!canAccess) {
    return Response.json(
      { success: false, error: 'Bu hasta için not erişiminiz yok' },
      { status: 403 }
    )
  }

  const { doctorNote } = prisma
  const note = await doctorNote.findUnique({
    where: {
      doctorId_patientId: {
        doctorId: user.id,
        patientId,
      },
    },
  })

  return Response.json({ success: true, data: note })
}

export async function PUT(request: Request) {
  const user = await requireRole(['DOCTOR'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let body: DoctorNotePutRequestBody

  try {
    body = (await request.json()) as DoctorNotePutRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const patientId = normalizeText(body.patientId)
  const content = normalizeText(body.content)

  if (!patientId) {
    return Response.json(
      { success: false, error: 'Hasta bilgisi gereklidir' },
      { status: 400 }
    )
  }

  if (!content || content.length > 5000) {
    return Response.json(
      { success: false, error: 'Doktor notu geçersiz' },
      { status: 400 }
    )
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true },
  })

  if (!patient) {
    return Response.json(
      { success: false, error: 'Hasta bulunamadı' },
      { status: 404 }
    )
  }

  const canAccess = await canAccessPatientNote(user.id, patientId)

  if (!canAccess) {
    return Response.json(
      { success: false, error: 'Bu hasta için not erişiminiz yok' },
      { status: 403 }
    )
  }

  const { doctorNote } = prisma
  const note = await doctorNote.upsert({
    where: {
      doctorId_patientId: {
        doctorId: user.id,
        patientId,
      },
    },
    create: {
      doctorId: user.id,
      patientId,
      content,
    },
    update: { content },
  })

  return Response.json({ success: true, data: note })
}
