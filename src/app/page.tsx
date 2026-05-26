import { HomeAppointmentPanel } from '@/components/booking/HomeAppointmentPanel'
import { prisma } from '@/lib/prisma'
import type {
  DepartmentOption,
  DoctorSearchOption,
  HospitalOption,
} from '@/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [hospitalRecords, departmentRecords, doctorRecords] =
    await Promise.all([
      prisma.hospital.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { departments: true },
          },
        },
      }),
      prisma.department.findMany({
        where: {
          isActive: true,
          hospital: { isActive: true },
        },
        orderBy: [{ hospital: { name: 'asc' } }, { name: 'asc' }],
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { panelUsers: { where: { role: 'DOCTOR' } } },
          },
        },
      }),
      prisma.panelUser.findMany({
        where: {
          role: 'DOCTOR',
          isActive: true,
          department: {
            isActive: true,
            hospital: { isActive: true },
          },
        },
        orderBy: [
          { department: { hospital: { name: 'asc' } } },
          { department: { name: 'asc' } },
          { name: 'asc' },
        ],
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
      }),
    ])

  const hospitals: HospitalOption[] = hospitalRecords.map((hospital) => ({
    id: hospital.id,
    name: hospital.name,
    address: hospital.address,
    phone: hospital.phone,
    departmentCount: hospital._count.departments,
  }))

  const departments: DepartmentOption[] = departmentRecords.map(
    (department) => ({
      id: department.id,
      hospitalId: department.hospital.id,
      hospitalName: department.hospital.name,
      name: department.name,
      icon: department.icon,
      doctorCount: department._count.panelUsers,
    })
  )

  const doctors: DoctorSearchOption[] = doctorRecords.flatMap((doctor) => {
    if (!doctor.department) return []

    return {
      id: doctor.id,
      departmentId: doctor.department.id,
      departmentName: doctor.department.name,
      hospitalId: doctor.department.hospital.id,
      hospitalName: doctor.department.hospital.name,
      title: doctor.title ?? '',
      name: doctor.name,
    }
  })

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eaf1fb] text-[#111827]">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-[8%] top-0 h-full w-36 -skew-x-[30deg] bg-white/30" />
        <div className="absolute left-[43%] top-0 h-full w-44 -skew-x-[30deg] bg-white/25" />
        <div className="absolute right-[8%] top-0 h-full w-56 -skew-x-[30deg] bg-white/20" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <HomeAppointmentPanel
          hospitals={hospitals}
          departments={departments}
          doctors={doctors}
        />
      </div>
    </main>
  )
}
