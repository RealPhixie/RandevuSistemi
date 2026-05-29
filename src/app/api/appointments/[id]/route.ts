import type { AppointmentStatus } from '@prisma/client'

import { markExpiredScheduledAppointmentsNoShow } from '@/lib/appointment-auto-status'
import { isAppointmentStatusValue } from '@/lib/appointment-status'
import { auth } from '@/lib/auth'
import {
  getLocalDateInputValue,
  getLocalDateTimeParts,
  isPastSlot,
} from '@/lib/booking-time'
import {
  isValidTurkishMobilePhone,
  normalizePhone,
} from '@/lib/patient-validation'
import {
  findActivePhoneVerification,
  normalizeVerificationId,
} from '@/lib/phone-verification'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

type AppointmentAction = 'COMPLETED' | 'CANCELLED' | 'CONFIRM'
type AppointmentStatusAction = Exclude<AppointmentAction, 'CONFIRM'>

interface AppointmentPatchRequestBody {
  action?: unknown
  phone?: unknown
  phoneVerificationId?: unknown
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

function canConfirmAppointment(status: AppointmentStatus, date: Date) {
  return (
    (status === 'SCHEDULED' || status === 'NO_SHOW') &&
    getLocalDateInputValue(date) === getLocalDateInputValue()
  )
}

function hasPatientCancellationCredentials(body: AppointmentPatchRequestBody) {
  return (
    typeof body.phone === 'string' &&
    typeof body.phoneVerificationId === 'string'
  )
}

function canCancelFutureScheduledAppointment(
  status: AppointmentStatus,
  date: Date,
  startTime: string
) {
  return (
    status === 'SCHEDULED' &&
    !isPastSlot(getLocalDateInputValue(date), startTime, getLocalDateTimeParts())
  )
}

async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatusAction,
  reopenSlot: boolean
) {
  if (status !== 'CANCELLED' || !reopenSlot) {
    return prisma.appointment.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    })
  }

  return prisma.$transaction(async (tx) => {
    const updatedAppointment = await tx.appointment.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, timeSlotId: true },
    })

    await tx.timeSlot.update({
      where: { id: updatedAppointment.timeSlotId },
      data: { isBooked: false },
    })

    return {
      id: updatedAppointment.id,
      status: updatedAppointment.status,
    }
  })
}

async function findAppointmentForPatch(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      isConfirmed: true,
      patient: { select: { phone: true } },
      timeSlot: { select: { date: true, startTime: true } },
    },
  })
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

    await markExpiredScheduledAppointmentsNoShow()

    const appointment = await findAppointmentForPatch(id)

    if (!appointment) {
      return Response.json(
        { success: false, error: 'Randevu bulunamadı' },
        { status: 404 }
      )
    }

    if (appointment.isConfirmed) {
      return Response.json(
        { success: false, error: 'Randevu zaten onaylandı.' },
        { status: 409 }
      )
    }

    if (!canConfirmAppointment(appointment.status, appointment.timeSlot.date)) {
      return Response.json(
        { success: false, error: 'Bu randevu onaylanamaz' },
        { status: 400 }
      )
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
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

  if (action === 'CANCELLED' && hasPatientCancellationCredentials(body)) {
    const phone = normalizePhone(body.phone)
    const phoneVerificationId = normalizeVerificationId(body.phoneVerificationId)

    if (!isValidTurkishMobilePhone(phone)) {
      return Response.json(
        { success: false, error: 'Telefon numarası geçersiz' },
        { status: 400 }
      )
    }

    const verification = await findActivePhoneVerification(
      phone,
      phoneVerificationId
    )

    if (!verification) {
      return Response.json(
        { success: false, error: 'Telefon doğrulaması geçersiz' },
        { status: 401 }
      )
    }

    let appointment = await findAppointmentForPatch(id)

    if (!appointment) {
      return Response.json(
        { success: false, error: 'Randevu bulunamadı' },
        { status: 404 }
      )
    }

    if (appointment.patient.phone !== phone) {
      return Response.json(
        { success: false, error: 'Bu randevu bu telefona ait değil' },
        { status: 403 }
      )
    }

    await markExpiredScheduledAppointmentsNoShow()

    appointment = await findAppointmentForPatch(id)

    if (!appointment) {
      return Response.json(
        { success: false, error: 'Randevu bulunamadı' },
        { status: 404 }
      )
    }

    if (
      !canCancelFutureScheduledAppointment(
        appointment.status,
        appointment.timeSlot.date,
        appointment.timeSlot.startTime
      )
    ) {
      return Response.json(
        { success: false, error: 'Bu randevu iptal edilemez' },
        { status: 400 }
      )
    }

    const updatedAppointment = await updateAppointmentStatus(id, 'CANCELLED', true)

    return Response.json({ success: true, data: updatedAppointment })
  }

  const user = await requireRole(['ADMIN'])

  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  await markExpiredScheduledAppointmentsNoShow()

  const appointment = await findAppointmentForPatch(id)

  if (!appointment) {
    return Response.json(
      { success: false, error: 'Randevu bulunamadı' },
      { status: 404 }
    )
  }

  const reopenSlot =
    action === 'CANCELLED' &&
    canCancelFutureScheduledAppointment(
      appointment.status,
      appointment.timeSlot.date,
      appointment.timeSlot.startTime
    )
  const updatedAppointment = await updateAppointmentStatus(id, action, reopenSlot)

  return Response.json({ success: true, data: updatedAppointment })
}
