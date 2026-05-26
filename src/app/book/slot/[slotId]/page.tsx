import { notFound } from 'next/navigation'

import { BookingPageShell } from '@/components/booking/BookingPageShell'
import { PhoneOtpForm } from '@/components/booking/PhoneOtpForm'
import {
  getLocalDateInputValue,
  getLocalDateTimeParts,
  isBookableSlot,
} from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'
import { slugifyPathSegment } from '@/lib/slugs'

export const dynamic = 'force-dynamic'

interface PhoneEntryPageProps {
  params: Promise<{
    slotId: string
  }>
}

export default async function PhoneEntryPage({ params }: PhoneEntryPageProps) {
  const { slotId } = await params

  const slot = await prisma.timeSlot.findFirst({
    where: {
      id: slotId,
      isBooked: false,
      isActive: true,
      doctor: {
        isActive: true,
        department: {
          isActive: true,
          hospital: { isActive: true },
        },
      },
    },
    include: {
      doctor: {
        select: {
          id: true,
          title: true,
          name: true,
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
      },
    },
  })

  if (!slot) notFound()

  const localNow = getLocalDateTimeParts()
  const slotDate = getLocalDateInputValue(slot.date)

  if (!isBookableSlot(slotDate, slot.startTime, localNow)) {
    notFound()
  }

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
  }).format(slot.date)
  const hospitalId = slot.doctor.department.hospital.id
  const departmentId = slot.doctor.department.id
  const departmentSlug = slugifyPathSegment(slot.doctor.department.name)
  const doctorId = slot.doctor.id

  return (
    <BookingPageShell
      backHref={`/book/${hospitalId}/${departmentSlug}/${doctorId}`}
      backLabel="Saatlere dön"
      eyebrow={`${slot.doctor.department.hospital.name} · ${slot.doctor.department.name}`}
      title={`${slot.doctor.title} ${slot.doctor.name}`}
      description={`${formattedDate}, ${slot.startTime} tarihli randevunuzu almak için telefon numaranızı girerek doğrulayın`}
    >
      <PhoneOtpForm
        hospitalId={hospitalId}
        departmentId={departmentId}
        doctorId={doctorId}
        slotId={slotId}
      />
    </BookingPageShell>
  )
}
