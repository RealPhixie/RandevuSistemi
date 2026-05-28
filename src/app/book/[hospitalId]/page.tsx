import { notFound } from 'next/navigation'

import {
  BookingEmptyState,
  BookingPageShell,
} from '@/components/booking/BookingPageShell'
import { DepartmentCard } from '@/components/booking/DepartmentCard'
import { resolveDepartmentIcon } from '@/lib/medical-departments'
import { prisma } from '@/lib/prisma'
import type { DepartmentOption } from '@/types'

export const dynamic = 'force-dynamic'

interface DepartmentSelectionPageProps {
  params: Promise<{ hospitalId: string }>
}

export default async function DepartmentSelectionPage({
  params,
}: DepartmentSelectionPageProps) {
  const { hospitalId } = await params

  const hospital = await prisma.hospital.findFirst({
    where: {
      id: hospitalId,
      isActive: true,
    },
    include: {
      departments: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { panelUsers: { where: { role: 'DOCTOR' } } },
          },
        },
      },
    },
  })

  if (!hospital) notFound()

  const departments: DepartmentOption[] = hospital.departments.map(
    (department) => ({
      id: department.id,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      name: department.name,
      icon: resolveDepartmentIcon(department.name, department.icon),
      doctorCount: department._count.panelUsers,
    })
  )

  return (
    <BookingPageShell
      backHref="/"
      backLabel="Ana ekrana dön"
      eyebrow={hospital.name}
      title="Tıbbi Birim Seçin"
      description="Randevu almak istediğiniz tıbbi birimi seçerek doktor listesine geçin."
    >
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {departments.length > 0 ? (
          departments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))
        ) : (
          <BookingEmptyState message="Bu hastane için aktif tıbbi birim bulunamadı." />
        )}
      </div>
    </BookingPageShell>
  )
}
