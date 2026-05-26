import { notFound } from 'next/navigation'

import {
  BookingEmptyState,
  BookingPageShell,
} from '@/components/booking/BookingPageShell'
import { DoctorCard } from '@/components/booking/DoctorCard'
import { prisma } from '@/lib/prisma'
import { findByPathSlug } from '@/lib/slugs'
import type { DoctorOption } from '@/types'

export const dynamic = 'force-dynamic'

interface DoctorSelectionPageProps {
  params: Promise<{ hospitalId: string; departmentSlug: string }>
}

export default async function DoctorSelectionPage({
  params,
}: DoctorSelectionPageProps) {
  const { hospitalId, departmentSlug } = await params

  const hospital = await prisma.hospital.findFirst({
    where: {
      id: hospitalId,
      isActive: true,
    },
    include: {
      departments: {
        where: { isActive: true },
        include: {
          doctors: {
            where: { isActive: true },
            orderBy: [{ title: 'asc' }, { name: 'asc' }],
          },
        },
      },
    },
  })

  if (!hospital) notFound()

  const department = findByPathSlug(hospital.departments, departmentSlug)

  if (!department) notFound()

  const doctors: DoctorOption[] = department.doctors.map((doctor) => ({
    id: doctor.id,
    departmentId: department.id,
    departmentName: department.name,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    title: doctor.title,
    name: doctor.name,
  }))

  return (
    <BookingPageShell
      backHref={`/book/${hospitalId}`}
      backLabel="Tıbbi birimlere dön"
      eyebrow={hospital.name}
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
