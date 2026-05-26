import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

interface DoctorNotePutRequestBody {
  patientId?: unknown
  content?: unknown
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
