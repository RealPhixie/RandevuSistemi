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
  const todayRange = getUtcDateRange(localNow.date)

  if (!todayRange) return localNow.date

  const [firstBookableSlot] = await prisma.$queryRaw<{ date: Date }[]>`
    SELECT "date"
    FROM "TimeSlot"
    WHERE "doctorId" = ${doctorId}
      AND "isBooked" = false
      AND EXTRACT(ISODOW FROM "date") BETWEEN 1 AND 5
      AND (
        "date" > ${todayRange.start}
        OR (
          "date" >= ${todayRange.start}
          AND "date" < ${todayRange.end}
          AND "startTime" > ${localNow.time}
        )
      )
    ORDER BY "date" ASC, "startTime" ASC
    LIMIT 1
  `

  return firstBookableSlot
    ? getLocalDateInputValue(firstBookableSlot.date)
    : localNow.date
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
