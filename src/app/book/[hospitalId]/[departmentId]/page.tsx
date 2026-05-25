import { notFound } from 'next/navigation'

import {
  BookingEmptyState,
  BookingPageShell,
} from '@/components/booking/BookingPageShell'
import { DoctorCard } from '@/components/booking/DoctorCard'
import { prisma } from '@/lib/prisma'
import type { DoctorOption } from '@/types'

export const dynamic = 'force-dynamic'

interface DoctorSelectionPageProps {
  params: Promise<{ hospitalId: string; departmentId: string }>
}

export default async function DoctorSelectionPage({
  params,
}: DoctorSelectionPageProps) {
  const { hospitalId, departmentId } = await params

  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      hospitalId,
      isActive: true,
      hospital: { isActive: true },
    },
    include: {
      hospital: {
        select: {
          id: true,
          name: true,
        },
      },
      doctors: {
        where: { isActive: true },
        orderBy: [{ title: 'asc' }, { name: 'asc' }],
      },
    },
  })

  if (!department) notFound()

  const doctors: DoctorOption[] = department.doctors.map((doctor) => ({
    id: doctor.id,
    departmentId: department.id,
    departmentName: department.name,
    hospitalId: department.hospital.id,
    hospitalName: department.hospital.name,
    title: doctor.title,
    name: doctor.name,
  }))

  return (
    <BookingPageShell
      backHref={`/book/${hospitalId}`}
      backLabel="Tıbbi birimlere dön"
      eyebrow={department.hospital.name}
      title={department.name}
      description="Randevu almak istediğiniz doktoru seçerek uygun saatlere geçin."
    >
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {doctors.length > 0 ? (
          doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))
        ) : (
          <BookingEmptyState message="Bu tıbbi birim için aktif doktor bulunamadı." />
        )}
      </div>
    </BookingPageShell>
  )
}
