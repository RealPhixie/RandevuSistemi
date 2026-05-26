export const BOOKING_TIME_ZONE = 'Europe/Istanbul'

export interface LocalDateTimeParts {
  date: string
  time: string
}

function datePartMap(date: Date, options: Intl.DateTimeFormatOptions) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TIME_ZONE,
    ...options,
  })

  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  )
}

export function getLocalDateInputValue(date = new Date()) {
  const parts = datePartMap(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function getLocalDateTimeParts(date = new Date()): LocalDateTimeParts {
  const parts = datePartMap(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

export function getUtcDateRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const [year, month, day] = date.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, day))

  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return null
  }

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return { start, end }
}

export function addDaysToDateInput(date: string, days: number) {
  const range = getUtcDateRange(date)
  if (!range) return null

  const nextDate = new Date(range.start)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)

  return nextDate.toISOString().slice(0, 10)
}

export function isWorkingDate(date: string) {
  const range = getUtcDateRange(date)
  if (!range) return false

  const day = range.start.getUTCDay()
  return day >= 1 && day <= 5
}

export function isPastSlot(
  date: string,
  startTime: string,
  now = getLocalDateTimeParts()
) {
  return date < now.date || (date === now.date && startTime <= now.time)
}

export function isBookableSlot(
  date: string,
  startTime: string,
  now = getLocalDateTimeParts()
) {
  return isWorkingDate(date) && !isPastSlot(date, startTime, now)
}
