import { getLocalDateInputValue, getUtcDateRange } from '@/lib/booking-time'
import {
  appendDoctorNoteEntry,
  deleteDoctorNoteEntry,
  updateDoctorNoteEntry,
} from '@/lib/doctor-note-entries'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

interface DoctorNoteRequestBody {
  patientId?: unknown
  content?: unknown
  entryIndex?: unknown
}

const MAX_DOCTOR_NOTE_LENGTH = 5000

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEntryIndex(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null
}

function doctorNoteKey(doctorId: string, patientId: string) {
  return {
    doctorId_patientId: {
      doctorId,
      patientId,
    },
  }
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as DoctorNoteRequestBody
  } catch {
    return null
  }
}

async function validatePatientNoteAccess(doctorId: string, patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true },
  })

  if (!patient) {
    return { status: 404, error: 'Hasta bulunamadı' }
  }

  const canAccess = await canAccessPatientNote(doctorId, patientId)

  if (!canAccess) {
    return { status: 403, error: 'Bu hasta için not erişiminiz yok' }
  }

  return null
}

function validateNoteLength(content: string) {
  return content.length <= MAX_DOCTOR_NOTE_LENGTH
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

  const body = await readBody(request)

  if (!body) {
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

  if (!content) {
    return Response.json(
      { success: false, error: 'Doktor notu geçersiz' },
      { status: 400 }
    )
  }

  const accessError = await validatePatientNoteAccess(user.id, patientId)

  if (accessError) {
    return Response.json(
      { success: false, error: accessError.error },
      { status: accessError.status }
    )
  }

  const { doctorNote } = prisma
  const noteKey = doctorNoteKey(user.id, patientId)
  const existingNote = await doctorNote.findUnique({
    where: noteKey,
    select: { content: true },
  })
  const nextContent = appendDoctorNoteEntry(existingNote?.content ?? '', content)

  if (!validateNoteLength(nextContent)) {
    return Response.json(
      { success: false, error: 'Doktor notu en fazla 5000 karakter olabilir' },
      { status: 400 }
    )
  }

  const note = await doctorNote.upsert({
    where: noteKey,
    create: {
      doctorId: user.id,
      patientId,
      content: nextContent,
    },
    update: { content: nextContent },
  })

  return Response.json({ success: true, data: note })
}

export async function PATCH(request: Request) {
  const user = await requireRole(['DOCTOR'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const body = await readBody(request)

  if (!body) {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const patientId = normalizeText(body.patientId)
  const content = normalizeText(body.content)
  const entryIndex = normalizeEntryIndex(body.entryIndex)

  if (!patientId) {
    return Response.json(
      { success: false, error: 'Hasta bilgisi gereklidir' },
      { status: 400 }
    )
  }

  if (entryIndex === null || !content) {
    return Response.json(
      { success: false, error: 'Doktor notu geçersiz' },
      { status: 400 }
    )
  }

  const accessError = await validatePatientNoteAccess(user.id, patientId)

  if (accessError) {
    return Response.json(
      { success: false, error: accessError.error },
      { status: accessError.status }
    )
  }

  const { doctorNote } = prisma
  const noteKey = doctorNoteKey(user.id, patientId)
  const existingNote = await doctorNote.findUnique({
    where: noteKey,
    select: { content: true },
  })
  const nextContent = updateDoctorNoteEntry(
    existingNote?.content ?? '',
    entryIndex,
    content
  )

  if (!nextContent) {
    return Response.json(
      { success: false, error: 'Doktor notu bulunamadı' },
      { status: 404 }
    )
  }

  if (!validateNoteLength(nextContent)) {
    return Response.json(
      { success: false, error: 'Doktor notu en fazla 5000 karakter olabilir' },
      { status: 400 }
    )
  }

  const note = await doctorNote.update({
    where: noteKey,
    data: { content: nextContent },
  })

  return Response.json({ success: true, data: note })
}

export async function DELETE(request: Request) {
  const user = await requireRole(['DOCTOR'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const body = await readBody(request)

  if (!body) {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const patientId = normalizeText(body.patientId)
  const entryIndex = normalizeEntryIndex(body.entryIndex)

  if (!patientId) {
    return Response.json(
      { success: false, error: 'Hasta bilgisi gereklidir' },
      { status: 400 }
    )
  }

  if (entryIndex === null) {
    return Response.json(
      { success: false, error: 'Doktor notu geçersiz' },
      { status: 400 }
    )
  }

  const accessError = await validatePatientNoteAccess(user.id, patientId)

  if (accessError) {
    return Response.json(
      { success: false, error: accessError.error },
      { status: accessError.status }
    )
  }

  const { doctorNote } = prisma
  const noteKey = doctorNoteKey(user.id, patientId)
  const existingNote = await doctorNote.findUnique({
    where: noteKey,
    select: { content: true },
  })
  const nextContent = deleteDoctorNoteEntry(
    existingNote?.content ?? '',
    entryIndex
  )

  if (nextContent === null) {
    return Response.json(
      { success: false, error: 'Doktor notu bulunamadı' },
      { status: 404 }
    )
  }

  if (!nextContent) {
    await doctorNote.delete({ where: noteKey })
    return Response.json({
      success: true,
      data: { content: '', updatedAt: '' },
    })
  }

  const note = await doctorNote.update({
    where: noteKey,
    data: { content: nextContent },
  })

  return Response.json({ success: true, data: note })
}
