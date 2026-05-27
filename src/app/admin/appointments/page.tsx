import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AppointmentTable } from '@/components/admin/AppointmentTable'
import { markExpiredScheduledAppointmentsNoShow } from '@/lib/appointment-auto-status'
import {
  APPOINTMENT_STATUS_OPTIONS,
  isAppointmentStatusValue,
} from '@/lib/appointment-status'
import { getLocalDateInputValue, getUtcDateRange } from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import type { AdminAppointmentOption } from '@/types'

export const dynamic = 'force-dynamic'

interface AdminAppointmentsPageProps {
  searchParams: Promise<{
    date?: string | string[]
    status?: string | string[]
    tckn?: string | string[]
  }>
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
})

const birthDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
})

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : ''
}

function normalizeTcknSearch(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
}

function mapAppointment(
  appointment: Prisma.AppointmentGetPayload<{
    include: {
      patient: true
      timeSlot: {
        include: {
          doctor: {
            include: {
              department: {
                include: {
                  hospital: true
                }
              }
            }
          }
        }
      }
    }
  }>
): AdminAppointmentOption {
  const department = appointment.timeSlot.doctor.department

  return {
    id: appointment.id,
    status: appointment.status,
    isConfirmed: appointment.isConfirmed,
    patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    patientPhone: appointment.patient.phone,
    patientTckn: appointment.patient.tckn,
    patientBirthDate: birthDateFormatter.format(appointment.patient.birthDate),
    hospitalName: department?.hospital.name ?? '-',
    departmentName: department?.name ?? '-',
    doctorName: `${appointment.timeSlot.doctor.title ?? ''} ${
      appointment.timeSlot.doctor.name
    }`.trim(),
    date: dateFormatter.format(appointment.timeSlot.date),
    startTime: appointment.timeSlot.startTime,
    endTime: appointment.timeSlot.endTime,
  }
}

export default async function AdminAppointmentsPage({
  searchParams,
}: AdminAppointmentsPageProps) {
  const user = await requireRole(['ADMIN', 'SECRETARY', 'DOCTOR'])

  if (!user) {
    redirect('/admin/login')
  }

  const query = await searchParams
  const selectedDate = getQueryValue(query.date)
  const selectedStatus = getQueryValue(query.status)
  const tcknSearch =
    user.role === 'SECRETARY' ? normalizeTcknSearch(getQueryValue(query.tckn)) : ''
  const dateRange =
    selectedDate && user.role !== 'DOCTOR'
      ? getUtcDateRange(selectedDate)
      : null
  const todayRange =
    user.role === 'DOCTOR' ? getUtcDateRange(getLocalDateInputValue()) : null
  const status = isAppointmentStatusValue(selectedStatus) ? selectedStatus : ''
  const conditions: Prisma.AppointmentWhereInput[] = []

  if (user.role === 'DOCTOR') {
    if (!todayRange) {
      throw new Error('Invalid local date')
    }

    conditions.push({
      isConfirmed: true,
      timeSlot: {
        doctorId: user.id,
        date: { gte: todayRange.start, lt: todayRange.end },
      },
    })
  } else if (user.role === 'SECRETARY' && !status && !tcknSearch) {
    conditions.push({ status: 'SCHEDULED' })
  }

  if (status) {
    conditions.push({ status })
  }

  if (dateRange) {
    conditions.push({
      timeSlot: { date: { gte: dateRange.start, lt: dateRange.end } },
    })
  }

  const where: Prisma.AppointmentWhereInput =
    conditions.length > 0 ? { AND: conditions } : {}

  await markExpiredScheduledAppointmentsNoShow()

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: true,
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
    orderBy: [{ timeSlot: { date: 'asc' } }, { timeSlot: { startTime: 'asc' } }],
  })

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
          {user.role === 'DOCTOR' ? 'Randevularım' : 'Randevular'}
        </h1>
      </section>

      {user.role !== 'DOCTOR' ? (
        <form className="grid gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
              Tarih
            </span>
            <input
              type="date"
              name="date"
              defaultValue={dateRange ? selectedDate : ''}
              className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
              Durum
            </span>
            <select
              name="status"
              defaultValue={
                user.role === 'SECRETARY' && !status && !tcknSearch
                  ? 'SCHEDULED'
                  : status
              }
              className="h-11 w-full rounded-2xl border border-[#cbd8ea] bg-white px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
            >
              <option value="">Tümü</option>
              {APPOINTMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Filtrele
          </button>

          <Link
            href="/admin/appointments"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#cbd8ea] px-6 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
          >
            Temizle
          </Link>
        </form>
      ) : null}

      <AppointmentTable
        appointments={appointments.map(mapAppointment)}
        initialTcknSearch={tcknSearch}
        role={user.role}
      />
    </div>
  )
}
