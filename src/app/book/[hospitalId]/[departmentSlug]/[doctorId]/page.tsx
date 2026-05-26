import { notFound } from 'next/navigation'

import { BookingPageShell } from '@/components/booking/BookingPageShell'
import { SlotPicker } from '@/components/booking/SlotPicker'
import {
  getLocalDateInputValue,
  getLocalDateTimeParts,
  getUtcDateRange,
} from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'
import { slugifyPathSegment } from '@/lib/slugs'
import {
  ensureRollingSlotsForDoctor,
  getNextWorkingDate,
  getRollingSlotWindow,
} from '@/lib/working-hours'

export const dynamic = 'force-dynamic'

interface SlotSelectionPageProps {
  params: Promise<{
    hospitalId: string
    departmentSlug: string
    doctorId: string
  }>
}

async function getInitialSlotDate(doctorId: string) {
  const localNow = getLocalDateTimeParts()
  const window = getRollingSlotWindow()
  const todayRange = getUtcDateRange(localNow.date)
  const windowStartRange = getUtcDateRange(window.startDate)
  const windowEndRange = getUtcDateRange(window.endDate)

  if (!todayRange || !windowStartRange || !windowEndRange) {
    return getNextWorkingDate()
  }

  await ensureRollingSlotsForDoctor(doctorId)

  const firstBookableSlot = await prisma.timeSlot.findFirst({
    where: {
      doctorId,
      isBooked: false,
      isActive: true,
      date: {
        gte: windowStartRange.start,
        lt: windowEndRange.end,
      },
      OR: [
        { date: { gt: todayRange.start } },
        {
          date: {
            gte: todayRange.start,
            lt: todayRange.end,
          },
          startTime: { gt: localNow.time },
        },
      ],
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    select: { date: true },
  })

  return firstBookableSlot
    ? getLocalDateInputValue(firstBookableSlot.date)
    : getNextWorkingDate()
}

export default async function SlotSelectionPage({
  params,
}: SlotSelectionPageProps) {
  const { hospitalId, departmentSlug, doctorId } = await params

  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      isActive: true,
      department: {
        hospitalId,
        isActive: true,
        hospital: { isActive: true },
      },
    },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!doctor) notFound()

  if (slugifyPathSegment(doctor.department.name) !== departmentSlug) {
    notFound()
  }

  const initialDate = await getInitialSlotDate(doctorId)

  return (
    <BookingPageShell
      backHref={`/book/${hospitalId}/${departmentSlug}`}
      backLabel="Doktorlara dön"
      eyebrow={`${doctor.department.hospital.name} · ${doctor.department.name}`}
      title={`${doctor.title} ${doctor.name}`}
      description="Uygun randevu tarihini seçip devam etmek istediğiniz saati işaretleyin."
    >
      <SlotPicker doctorId={doctorId} initialDate={initialDate} />
    </BookingPageShell>
  )
}
