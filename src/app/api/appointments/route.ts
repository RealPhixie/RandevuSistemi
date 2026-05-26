import {
  getLocalDateInputValue,
  getLocalDateTimeParts,
  isBookableSlot,
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
import type { PatientAppointmentOption } from '@/types'

interface AppointmentCreateRequestBody {
  patientId?: unknown
  timeSlotId?: unknown
  phone?: unknown
  phoneVerificationId?: unknown
}

type AppointmentRecord = {
  id: string
  status: string
  timeSlot: {
    date: Date
    startTime: string
    endTime: string
    doctor: {
      title: string
      name: string
      department: {
        name: string
        hospital: { name: string }
      }
    }
  }
}

function mapAppointment(record: AppointmentRecord): PatientAppointmentOption {
  return {
    id: record.id,
    status: record.status,
    date: record.timeSlot.date.toISOString(),
    startTime: record.timeSlot.startTime,
    endTime: record.timeSlot.endTime,
    hospitalName: record.timeSlot.doctor.department.hospital.name,
    departmentName: record.timeSlot.doctor.department.name,
    doctorTitle: record.timeSlot.doctor.title,
    doctorName: record.timeSlot.doctor.name,
  }
}

function isCurrentAppointment(record: AppointmentRecord) {
  const slotDate = getLocalDateInputValue(record.timeSlot.date)

  return (
    record.status === 'SCHEDULED' &&
    !isPastSlot(slotDate, record.timeSlot.startTime, getLocalDateTimeParts())
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phone = normalizePhone(searchParams.get('phone'))
  const phoneVerificationId = normalizeVerificationId(
    searchParams.get('phoneVerificationId')
  )

  if (!isValidTurkishMobilePhone(phone)) {
    return Response.json(
      { success: false, error: 'Telefon numarası geçersiz' },
      { status: 400 }
    )
  }

  try {
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

    const patient = await prisma.patient.findUnique({
      where: { phone },
      select: { id: true },
    })

    if (!patient) {
      return Response.json({
        success: true,
        data: { current: [], past: [] },
      })
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        timeSlot: {
          include: {
            doctor: {
              include: {
                department: {
                  include: {
                    hospital: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ timeSlot: { date: 'desc' } }, { timeSlot: { startTime: 'desc' } }],
    })

    const current: PatientAppointmentOption[] = []
    const past: PatientAppointmentOption[] = []

    appointments.forEach((appointment) => {
      if (isCurrentAppointment(appointment)) {
        current.push(mapAppointment(appointment))
        return
      }

      past.push(mapAppointment(appointment))
    })

    return Response.json({ success: true, data: { current, past } })
  } catch {
    return Response.json(
      { success: false, error: 'Randevular yüklenemedi' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let body: AppointmentCreateRequestBody

  try {
    body = (await request.json()) as AppointmentCreateRequestBody
  } catch {
    return Response.json(
      { success: false, error: 'Geçersiz istek gövdesi' },
      { status: 400 }
    )
  }

  const patientId = typeof body.patientId === 'string' ? body.patientId : ''
  const timeSlotId =
    typeof body.timeSlotId === 'string' ? body.timeSlotId : ''
  const phone = normalizePhone(body.phone)
  const phoneVerificationId = normalizeVerificationId(body.phoneVerificationId)

  if (!patientId || !timeSlotId) {
    return Response.json(
      { success: false, error: 'Hasta ve randevu saati bilgisi gereklidir' },
      { status: 400 }
    )
  }

  if (!isValidTurkishMobilePhone(phone)) {
    return Response.json(
      { success: false, error: 'Telefon numarası geçersiz' },
      { status: 400 }
    )
  }

  try {
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

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, phone: true },
    })

    if (!patient || patient.phone !== phone) {
      return Response.json(
        { success: false, error: 'Hasta bilgisi geçersiz' },
        { status: 400 }
      )
    }

    const slot = await prisma.timeSlot.findFirst({
      where: {
        id: timeSlotId,
        doctor: {
          isActive: true,
          department: {
            isActive: true,
            hospital: { isActive: true },
          },
        },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        isBooked: true,
      },
    })

    if (!slot) {
      return Response.json(
        { success: false, error: 'Randevu saati bulunamadı' },
        { status: 404 }
      )
    }

    if (slot.isBooked) {
      return Response.json(
        { success: false, error: 'Bu randevu saati dolu' },
        { status: 409 }
      )
    }

    const slotDate = getLocalDateInputValue(slot.date)

    if (!isBookableSlot(slotDate, slot.startTime, getLocalDateTimeParts())) {
      return Response.json(
        { success: false, error: 'Bu randevu saati artık alınamaz' },
        { status: 400 }
      )
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const updatedSlot = await tx.timeSlot.updateMany({
        where: { id: timeSlotId, isBooked: false },
        data: { isBooked: true },
      })

      if (updatedSlot.count !== 1) {
        throw new Error('SLOT_UNAVAILABLE')
      }

      return tx.appointment.create({
        data: { patientId, timeSlotId },
        select: { id: true },
      })
    })

    return Response.json({ success: true, data: { appointmentId: appointment.id } })
  } catch (error) {
    if (error instanceof Error && error.message === 'SLOT_UNAVAILABLE') {
      return Response.json(
        { success: false, error: 'Bu randevu saati dolu' },
        { status: 409 }
      )
    }

    return Response.json(
      { success: false, error: 'Randevu oluşturulamadı' },
      { status: 500 }
    )
  }
}
