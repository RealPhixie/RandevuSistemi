import { markExpiredScheduledAppointmentsNoShow } from '@/lib/appointment-auto-status'
import { isAppointmentStatusValue } from '@/lib/appointment-status'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface AppointmentPatchRequestBody {
  status?: unknown
}

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/appointments/[id]'>
) {
  const session = await auth()

  if (!session?.user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

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

  if (!isAppointmentStatusValue(body.status)) {
    return Response.json(
      { success: false, error: 'Randevu durumu geçersiz' },
      { status: 400 }
    )
  }

  await markExpiredScheduledAppointmentsNoShow()

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!appointment) {
    return Response.json(
      { success: false, error: 'Randevu bulunamadı' },
      { status: 404 }
    )
  }

  const updatedAppointment = await prisma.appointment.update({
    where: { id },
    data: { status: body.status },
    select: { id: true, status: true },
  })

  return Response.json({ success: true, data: updatedAppointment })
}
