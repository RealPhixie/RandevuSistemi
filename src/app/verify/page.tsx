import { notFound } from 'next/navigation'

import { BookingPageShell } from '@/components/booking/BookingPageShell'
import { VerifyOtpForm } from '@/components/booking/VerifyOtpForm'
import {
  getLocalDateInputValue,
  getLocalDateTimeParts,
  isBookableSlot,
} from '@/lib/booking-time'
import { prisma } from '@/lib/prisma'
import { slugifyPathSegment } from '@/lib/slugs'

export const dynamic = 'force-dynamic'

interface VerifyPageProps {
  searchParams: Promise<{
    phone?: string | string[]
    slotId?: string | string[]
  }>
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const query = await searchParams
  const phone = typeof query.phone === 'string' ? query.phone : ''
  const slotId = typeof query.slotId === 'string' ? query.slotId : ''

  if (!phone || !/^05\d{9}$/.test(phone) || !slotId) {
    notFound()
  }

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

  if (!slot || !slot.doctor.department) notFound()

  const slotDate = getLocalDateInputValue(slot.date)

  if (!isBookableSlot(slotDate, slot.startTime, getLocalDateTimeParts())) {
    notFound()
  }

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
  }).format(slot.date)
  const department = slot.doctor.department
  const departmentSlug = slugifyPathSegment(department.name)
  const backHref = `/book/${department.hospital.id}/${departmentSlug}/${slot.doctor.id}`

  return (
    <BookingPageShell
      backHref={backHref}
      backLabel="Randevu seçimine dön"
      eyebrow={`${department.hospital.name} · ${department.name}`}
      title="Telefon Doğrulama"
      description={`${slot.doctor.title ?? ''} ${slot.doctor.name} - ${formattedDate}, ${slot.startTime} randevusu için ${phone} numarasına gönderilen kodu girin.`}
    >
      <VerifyOtpForm
        phone={phone}
        slotId={slotId}
        appointmentDetails={{
          hospitalName: department.hospital.name,
          departmentName: department.name,
          doctorName: `${slot.doctor.title ?? ''} ${slot.doctor.name}`.trim(),
          date: formattedDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }}
      />
    </BookingPageShell>
  )
}
