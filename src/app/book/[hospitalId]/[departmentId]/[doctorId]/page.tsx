import { notFound } from 'next/navigation'

import { BookingPageShell } from '@/components/booking/BookingPageShell'
import { SlotPicker } from '@/components/booking/SlotPicker'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface SlotSelectionPageProps {
  params: Promise<{ hospitalId: string; departmentId: string; doctorId: string }>
}

export default async function SlotSelectionPage({
  params,
}: SlotSelectionPageProps) {
  const { hospitalId, departmentId, doctorId } = await params

  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      departmentId,
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

  return (
    <BookingPageShell
      backHref={`/book/${hospitalId}/${departmentId}`}
      backLabel="Doktorlara dön"
      eyebrow={`${doctor.department.hospital.name} · ${doctor.department.name}`}
      title={`${doctor.title} ${doctor.name}`}
      description="Uygun randevu tarihini seçip devam etmek istediğiniz saati işaretleyin."
    >
      <SlotPicker
        hospitalId={hospitalId}
        departmentId={departmentId}
        doctorId={doctorId}
      />
    </BookingPageShell>
  )
}
