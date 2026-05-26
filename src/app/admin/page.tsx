import Link from 'next/link'

import { markExpiredScheduledAppointmentsNoShow } from '@/lib/appointment-auto-status'
import { getLocalDateInputValue, getUtcDateRange } from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getCurrentMonthRange(localDate: string) {
  const [year, month] = localDate.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))

  return { start, end }
}

function getUpcomingRange(start: Date) {
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)

  return { start, end }
}

export default async function AdminPage() {
  const today = getLocalDateInputValue()
  const todayRange = getUtcDateRange(today)

  if (!todayRange) {
    throw new Error('Invalid local date')
  }

  const monthRange = getCurrentMonthRange(today)
  const upcomingRange = getUpcomingRange(todayRange.start)

  await markExpiredScheduledAppointmentsNoShow()

  const [todayAppointments, totalPatients, monthAppointments, upcomingAppointments] =
    await Promise.all([
      prisma.appointment.count({
        where: {
          timeSlot: { date: { gte: todayRange.start, lt: todayRange.end } },
        },
      }),
      prisma.patient.count(),
      prisma.appointment.count({
        where: {
          timeSlot: { date: { gte: monthRange.start, lt: monthRange.end } },
        },
      }),
      prisma.appointment.count({
        where: {
          status: 'SCHEDULED',
          timeSlot: {
            date: { gte: upcomingRange.start, lt: upcomingRange.end },
          },
        },
      }),
    ])

  const stats = [
    { label: 'Bugünkü Randevular', value: todayAppointments },
    { label: 'Toplam Hasta', value: totalPatients },
    { label: 'Bu Ayki Randevular', value: monthAppointments },
    { label: 'Yaklaşan 7 Gün', value: upcomingAppointments },
  ]

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0d1b3d]">Özet</h1>
            <p className="mt-2 text-sm font-semibold text-[#52617a]">
              Randevu ve hasta durumunu hızlıca takip edin.
            </p>
          </div>
          <Link
            href="/admin/appointments"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Randevuları Gör
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-bold text-[#52617a]">{stat.label}</p>
            <p className="mt-4 text-4xl font-bold text-[#0d1b3d]">
              {stat.value}
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}
