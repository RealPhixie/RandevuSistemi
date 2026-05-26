import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { getUtcDateRange, isWorkingDate } from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_SLOT_TIMES,
  ensureRollingSlotsForActiveDoctors,
  getNextWorkingDate,
  getRollingSlotWindow,
  isWithinRollingSlotWindow,
  setTimeSlotActive,
  updateDoctorSlotAvailability,
} from '@/lib/working-hours'

export const dynamic = 'force-dynamic'

interface AdminWorkingHoursPageProps {
  searchParams: Promise<{
    doctorId?: string | string[]
    date?: string | string[]
    error?: string | string[]
    updated?: string | string[]
  }>
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
})

async function requireAdmin() {
  const session = await auth()

  if (!session?.user) {
    redirect('/admin/login')
  }
}

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : ''
}

function buildRedirectUrl(doctorId: FormDataEntryValue | null, date: FormDataEntryValue | null, suffix: string) {
  const params = new URLSearchParams()

  if (typeof doctorId === 'string' && doctorId) {
    params.set('doctorId', doctorId)
  }

  if (typeof date === 'string' && date) {
    params.set('date', date)
  }

  if (suffix) {
    const [key, value] = suffix.split('=')
    params.set(key, value)
  }

  return `/admin/slots?${params.toString()}`
}

async function applyWorkingHoursAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await updateDoctorSlotAvailability({
      doctorId: formData.get('doctorId'),
      date: formData.get('date'),
      isActive: formData.get('isActive'),
      allDay: formData.get('allDay'),
      times: formData.getAll('times'),
    })
  } catch {
    redirect(
      buildRedirectUrl(formData.get('doctorId'), formData.get('date'), 'error=hours')
    )
  }

  revalidatePath('/admin/slots')
  redirect(
    buildRedirectUrl(formData.get('doctorId'), formData.get('date'), 'updated=1')
  )
}

async function updateSlotStatusAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await setTimeSlotActive({
      id: formData.get('id'),
      isActive: formData.get('isActive'),
    })
  } catch {
    redirect(
      buildRedirectUrl(formData.get('doctorId'), formData.get('date'), 'error=slot')
    )
  }

  revalidatePath('/admin/slots')
  redirect(
    buildRedirectUrl(formData.get('doctorId'), formData.get('date'), 'updated=1')
  )
}

function getSelectedDate(rawDate: string) {
  if (
    rawDate &&
    getUtcDateRange(rawDate) &&
    isWithinRollingSlotWindow(rawDate) &&
    isWorkingDate(rawDate)
  ) {
    return rawDate
  }

  return getNextWorkingDate()
}

function getSlotStatus(slot: {
  isBooked: boolean
  isActive: boolean
}) {
  if (slot.isBooked) return 'Dolu'
  return slot.isActive ? 'Aktif' : 'Kapalı'
}

export default async function AdminWorkingHoursPage({
  searchParams,
}: AdminWorkingHoursPageProps) {
  const query = await searchParams
  const selectedDate = getSelectedDate(getQueryValue(query.date))
  const hasError = typeof query.error === 'string'
  const hasUpdate = typeof query.updated === 'string'
  const window = getRollingSlotWindow()

  await ensureRollingSlotsForActiveDoctors()

  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      department: {
        isActive: true,
        hospital: { isActive: true },
      },
    },
    orderBy: [
      { department: { hospital: { name: 'asc' } } },
      { department: { name: 'asc' } },
      { name: 'asc' },
    ],
    include: {
      department: {
        include: {
          hospital: { select: { name: true } },
        },
      },
    },
  })

  const requestedDoctorId = getQueryValue(query.doctorId)
  const selectedDoctor = doctors.find((doctor) => doctor.id === requestedDoctorId) ?? doctors[0]
  const selectedDoctorId = selectedDoctor?.id ?? ''
  const selectedDateRange = getUtcDateRange(selectedDate)
  const slots =
    selectedDoctorId && selectedDateRange
      ? await prisma.timeSlot.findMany({
          where: {
            doctorId: selectedDoctorId,
            date: {
              gte: selectedDateRange.start,
              lt: selectedDateRange.end,
            },
          },
          orderBy: { startTime: 'asc' },
          include: {
            appointment: {
              select: {
                id: true,
                patient: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        })
      : []

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
          Çalışma Saatleri
        </h1>
      </section>

      <form className="grid gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm md:grid-cols-[1fr_220px_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Doktor
          </span>
          <select
            name="doctorId"
            defaultValue={selectedDoctorId}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] bg-white px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          >
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.department.hospital.name} - {doctor.department.name} -{' '}
                {doctor.title} {doctor.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Tarih
          </span>
          <input
            type="date"
            name="date"
            min={window.startDate}
            max={window.endDate}
            defaultValue={selectedDate}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <button
          type="submit"
          className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Göster
        </button>
      </form>

      {hasError ? (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          İşlem tamamlanamadı. Doktor, tarih ve saat bilgilerini kontrol edin.
        </div>
      ) : null}

      {hasUpdate ? (
        <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          Çalışma saatleri güncellendi.
        </div>
      ) : null}

      {selectedDoctor ? (
        <form
          action={applyWorkingHoursAction}
          className="grid gap-5 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="doctorId" value={selectedDoctorId} />
          <input type="hidden" name="date" value={selectedDate} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7e0ef] pb-4">
            <div>
              <p className="text-sm font-bold text-[#0d1b3d]">
                {selectedDoctor.title} {selectedDoctor.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#52617a]">
                {selectedDoctor.department.hospital.name} -{' '}
                {selectedDoctor.department.name} -{' '}
                {dateFormatter.format(selectedDateRange?.start ?? new Date())}
              </p>
            </div>

            <label className="inline-flex items-center gap-2 rounded-2xl bg-[#f5f8fe] px-4 py-3 text-sm font-bold text-[#30476f]">
              <input
                type="checkbox"
                name="allDay"
                className="size-4 accent-red-600"
              />
              Tüm gün
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DEFAULT_SLOT_TIMES.map((slot) => (
              <label
                key={slot.startTime}
                className="flex h-12 items-center justify-between rounded-2xl border border-[#d7e0ef] px-4 text-sm font-bold text-[#102040]"
              >
                <span>
                  {slot.startTime} - {slot.endTime}
                </span>
                <input
                  type="checkbox"
                  name="times"
                  value={slot.startTime}
                  className="size-4 accent-red-600"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="isActive"
              value="false"
              className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Randevuya Kapat
            </button>
            <button
              type="submit"
              name="isActive"
              value="true"
              className="h-11 rounded-2xl border border-[#cbd8ea] px-6 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
            >
              Aktif Et
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-3xl border border-[#cbd8ea] bg-white p-6 text-sm font-semibold text-[#52617a] shadow-sm">
          Aktif doktor bulunamadı.
        </div>
      )}

      <section className="rounded-3xl border border-[#cbd8ea] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
                <th className="px-5 py-4">Saat</th>
                <th className="px-5 py-4">Durum</th>
                <th className="px-5 py-4">Hasta</th>
                <th className="px-5 py-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {slots.length > 0 ? (
                slots.map((slot) => (
                  <tr
                    key={slot.id}
                    className="border-b border-[#edf2f8] last:border-b-0"
                  >
                    <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                      {slot.startTime} - {slot.endTime}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          slot.isBooked
                            ? 'bg-amber-50 text-amber-700'
                            : slot.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {getSlotStatus(slot)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                      {slot.appointment
                        ? `${slot.appointment.patient.firstName} ${slot.appointment.patient.lastName}`
                        : '-'}
                    </td>
                    <td className="px-5 py-4">
                      {slot.isBooked ? (
                        <span className="text-sm font-semibold text-[#70809a]">
                          Dolu
                        </span>
                      ) : (
                        <form action={updateSlotStatusAction}>
                          <input type="hidden" name="id" value={slot.id} />
                          <input
                            type="hidden"
                            name="doctorId"
                            value={selectedDoctorId}
                          />
                          <input
                            type="hidden"
                            name="date"
                            value={selectedDate}
                          />
                          <input
                            type="hidden"
                            name="isActive"
                            value={String(!slot.isActive)}
                          />
                          <button
                            type="submit"
                            className="h-10 rounded-xl border border-[#cbd8ea] px-4 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
                          >
                            {slot.isActive ? 'Kapat' : 'Aktif Et'}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-sm font-semibold text-[#52617a]"
                  >
                    Seçili gün için randevu saati bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
