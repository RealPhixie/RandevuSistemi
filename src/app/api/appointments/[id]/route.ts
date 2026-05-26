import type { AppointmentStatus } from '@prisma/client'

import { markExpiredScheduledAppointmentsNoShow } from '@/lib/appointment-auto-status'
import { isAppointmentStatusValue } from '@/lib/appointment-status'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

type AppointmentAction = 'COMPLETED' | 'CANCELLED' | 'CONFIRM'

interface AppointmentPatchRequestBody {
  action?: unknown
  status?: unknown
}

function getAction(body: AppointmentPatchRequestBody): AppointmentAction | null {
  const rawAction = typeof body.action === 'string' ? body.action : ''

  if (
    rawAction === 'COMPLETED' ||
    rawAction === 'CANCELLED' ||
    rawAction === 'CONFIRM'
  ) {
    return rawAction
  }

  if (
    isAppointmentStatusValue(body.status) &&
    (body.status === 'COMPLETED' || body.status === 'CANCELLED')
  ) {
    return body.status
  }

  return null
}

function canConfirmStatus(status: AppointmentStatus) {
  return status === 'SCHEDULED' || status === 'NO_SHOW'
}

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/appointments/[id]'>
) {
  const { id } = await context.params
  let body: AppointmentPatchRequestBody

  try {
    body = (await request.json()) as AppointmentPatchRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const action = getAction(body)

  if (!action) {
    return Response.json(
      { success: false, error: 'Randevu işlemi geçersiz' },
      { status: 400 }
    )
  }

  await markExpiredScheduledAppointmentsNoShow()

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!appointment) {
    return Response.json(
      { success: false, error: 'Randevu bulunamadı' },
      { status: 404 }
    )
  }

  if (action === 'CONFIRM') {
    const session = await auth()

    if (!session?.user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await requireRole(['SECRETARY'])

    if (!user) {
      return Response.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (!canConfirmStatus(appointment.status)) {
      return Response.json(
        { success: false, error: 'Bu randevu onaylanamaz' },
        { status: 400 }
      )
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        isConfirmed: true,
        confirmedAt: new Date(),
        confirmedById: user.id,
      },
      select: {
        id: true,
        status: true,
        isConfirmed: true,
        confirmedAt: true,
        confirmedById: true,
      },
    })

    return Response.json({ success: true, data: updatedAppointment })
  }

  const user = await requireRole(['ADMIN'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const updatedAppointment = await prisma.appointment.update({
    where: { id },
    data: { status: action },
    select: { id: true, status: true },
  })

  return Response.json({ success: true, data: updatedAppointment })
}
