import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { DoctorNoteForm } from '@/components/admin/DoctorNoteForm'
import {
  APPOINTMENT_STATUS_OPTIONS,
  type AppointmentStatusValue,
} from '@/lib/appointment-status'
import { getLocalDateInputValue } from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

export const dynamic = 'force-dynamic'

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
})

const birthDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
})

const statusClassNames: Record<AppointmentStatusValue, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-700',
}

function statusLabel(status: AppointmentStatusValue) {
  return (
    APPOINTMENT_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  )
}

export default async function DoctorAppointmentDetailPage(
  props: PageProps<'/admin/appointments/[id]'>
) {
  const user = await requireRole(['DOCTOR'])

  if (!user) {
    redirect('/admin/appointments')
  }

  const { id } = await props.params
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      timeSlot: { include: { doctor: true } },
    },
  })

  if (!appointment) {
    notFound()
  }

  if (
    appointment.timeSlot.doctorId !== user.id ||
    !appointment.isConfirmed ||
    getLocalDateInputValue(appointment.timeSlot.date) !==
      getLocalDateInputValue()
  ) {
    redirect('/admin/appointments')
  }

  const { doctorNote } = prisma
  const note = await doctorNote.findUnique({
    where: {
      doctorId_patientId: {
        doctorId: user.id,
        patientId: appointment.patientId,
      },
    },
  })

  return (
    <div className="grid gap-6">
      <section>
        <Link
          href="/admin/appointments"
          className="text-sm font-bold text-[#30476f] transition hover:text-red-600"
        >
          ← Randevularıma Dön
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-red-600">
          Doktor Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
          Randevu Detayı
        </h1>
      </section>

      <section className="rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-[#70809a]">
              Hasta
            </p>
            <p className="mt-1 text-lg font-bold text-[#102040]">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-[#70809a]">
              Doğum Tarihi
            </p>
            <p className="mt-1 text-lg font-bold text-[#102040]">
              {birthDateFormatter.format(appointment.patient.birthDate)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-[#70809a]">
              Randevu Tarihi
            </p>
            <p className="mt-1 text-lg font-bold text-[#102040]">
              {dateFormatter.format(appointment.timeSlot.date)}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#52617a]">
              {appointment.timeSlot.startTime} - {appointment.timeSlot.endTime}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-[#70809a]">Durum</p>
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                statusClassNames[appointment.status]
              }`}
            >
              {statusLabel(appointment.status)}
            </span>
          </div>
        </div>
      </section>

      <DoctorNoteForm
        patientId={appointment.patientId}
        initialContent={note?.content ?? ''}
        initialUpdatedAt={note?.updatedAt.toISOString() ?? ''}
      />
    </div>
  )
}
