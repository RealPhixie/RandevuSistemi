import { AdminMutationError } from '@/lib/admin-management'
import {
  addDaysToDateInput as addDateInputDays,
  getLocalDateInputValue,
  getUtcDateRange,
  isWorkingDate,
} from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'

export const ROLLING_SLOT_DAYS = 14

export interface SlotTimeOption {
  startTime: string
  endTime: string
}

function toTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildDefaultSlotTimes(): SlotTimeOption[] {
  const times: SlotTimeOption[] = []

  for (let start = 9 * 60; start <= 16 * 60 + 30; start += 30) {
    times.push({
      startTime: toTime(start),
      endTime: toTime(start + 30),
    })
  }

  return times
}

export const DEFAULT_SLOT_TIMES = buildDefaultSlotTimes()
const DEFAULT_SLOT_START_TIMES = new Set(
  DEFAULT_SLOT_TIMES.map((slot) => slot.startTime)
)

export function addDaysToDateInput(date: string, days: number) {
  const nextDate = addDateInputDays(date, days)

  if (!nextDate) {
    throw new AdminMutationError('Tarih geçersiz')
  }

  return nextDate
}

export function getRollingSlotWindow(date = new Date()) {
  const startDate = getLocalDateInputValue(date)

  return {
    startDate,
    endDate: addDaysToDateInput(startDate, ROLLING_SLOT_DAYS),
  }
}

export function getNextWorkingDate(date = getLocalDateInputValue()) {
  for (let offset = 0; offset <= ROLLING_SLOT_DAYS; offset += 1) {
    const candidate = addDaysToDateInput(date, offset)

    if (isWorkingDate(candidate)) {
      return candidate
    }
  }

  return date
}

export function isWithinRollingSlotWindow(date: string) {
  const window = getRollingSlotWindow()

  return date >= window.startDate && date <= window.endDate
}

function requireText(value: unknown, fieldName: string) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text) {
    throw new AdminMutationError(`${fieldName} gereklidir`)
  }

  return text
}

function requireDate(value: unknown) {
  const date = requireText(value, 'Tarih')

  if (!getUtcDateRange(date)) {
    throw new AdminMutationError('Tarih geçersiz')
  }

  if (!isWithinRollingSlotWindow(date)) {
    throw new AdminMutationError('Tarih yalnızca önümüzdeki 2 hafta içinde olabilir')
  }

  if (!isWorkingDate(date)) {
    throw new AdminMutationError('Hafta sonu için randevu saati açılmaz')
  }

  return date
}

function toBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on'
}

function normalizeTimes(value: unknown, allDay: boolean) {
  if (allDay) {
    return DEFAULT_SLOT_TIMES.map((slot) => slot.startTime)
  }

  const rawTimes = Array.isArray(value) ? value : [value]
  const times = rawTimes.filter(
    (time): time is string =>
      typeof time === 'string' && DEFAULT_SLOT_START_TIMES.has(time)
  )

  const uniqueTimes = Array.from(new Set(times))

  if (uniqueTimes.length === 0) {
    throw new AdminMutationError('En az bir saat seçilmelidir')
  }

  return uniqueTimes
}

function buildSlotRows(doctorIds: string[], startDate: string, endDate: string) {
  const rows: {
    doctorId: string
    date: Date
    startTime: string
    endTime: string
  }[] = []

  for (
    let date = startDate;
    date <= endDate;
    date = addDaysToDateInput(date, 1)
  ) {
    if (!isWorkingDate(date)) continue

    const range = getUtcDateRange(date)
    if (!range) continue

    doctorIds.forEach((doctorId) => {
      DEFAULT_SLOT_TIMES.forEach((time) => {
        rows.push({
          doctorId,
          date: range.start,
          startTime: time.startTime,
          endTime: time.endTime,
        })
      })
    })
  }

  return rows
}

async function createRollingSlotsForDoctorIds(doctorIds: string[]) {
  if (doctorIds.length === 0) {
    return { createdCount: 0 }
  }

  const window = getRollingSlotWindow()
  const rows = buildSlotRows(doctorIds, window.startDate, window.endDate)

  if (rows.length === 0) {
    return { createdCount: 0 }
  }

  const result = await prisma.timeSlot.createMany({
    data: rows,
    skipDuplicates: true,
  })

  return { createdCount: result.count }
}

export async function ensureRollingSlotsForDoctor(doctorId: string) {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      isActive: true,
      department: {
        isActive: true,
        hospital: { isActive: true },
      },
    },
    select: { id: true },
  })

  if (!doctor) {
    return { createdCount: 0 }
  }

  return createRollingSlotsForDoctorIds([doctor.id])
}

export async function ensureRollingSlotsForActiveDoctors() {
  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      department: {
        isActive: true,
        hospital: { isActive: true },
      },
    },
    select: { id: true },
  })

  return createRollingSlotsForDoctorIds(doctors.map((doctor) => doctor.id))
}

export async function updateDoctorSlotAvailability(
  input: Record<string, unknown>
) {
  const doctorId = requireText(input.doctorId, 'Doktor')
  const date = requireDate(input.date)
  const isActive = toBoolean(input.isActive)
  const allDay = toBoolean(input.allDay)
  const times = normalizeTimes(input.times, allDay)

  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      isActive: true,
      department: {
        isActive: true,
        hospital: { isActive: true },
      },
    },
    select: { id: true },
  })

  if (!doctor) {
    throw new AdminMutationError('Doktor bulunamadı', 404)
  }

  await createRollingSlotsForDoctorIds([doctor.id])

  const range = getUtcDateRange(date)
  if (!range) {
    throw new AdminMutationError('Tarih geçersiz')
  }

  const result = await prisma.timeSlot.updateMany({
    where: {
      doctorId,
      isBooked: false,
      startTime: { in: times },
      date: {
        gte: range.start,
        lt: range.end,
      },
    },
    data: { isActive },
  })

  return { updatedCount: result.count }
}

export async function setTimeSlotActive(input: Record<string, unknown>) {
  const id = requireText(input.id, 'Randevu saati')
  const isActive = toBoolean(input.isActive)

  const slot = await prisma.timeSlot.findUnique({
    where: { id },
    select: { id: true, isBooked: true },
  })

  if (!slot) {
    throw new AdminMutationError('Randevu saati bulunamadı', 404)
  }

  if (slot.isBooked) {
    throw new AdminMutationError('Dolu randevu saati değiştirilemez', 409)
  }

  return prisma.timeSlot.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  })
}
