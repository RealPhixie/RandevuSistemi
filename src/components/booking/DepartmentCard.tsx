import Link from 'next/link'

import { DepartmentIcon } from '@/components/DepartmentIcon'
import { slugifyPathSegment } from '@/lib/slugs'
import type { DepartmentOption } from '@/types'

interface DepartmentCardProps {
  department: DepartmentOption
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  const departmentHref = `/book/${department.hospitalId}/${slugifyPathSegment(
    department.name
  )}`

  return (
    <Link
      href={departmentHref}
      className="flex min-h-28 rounded-xl border border-[#c9d6ea] bg-white px-5 py-4 text-left transition hover:border-red-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
    >
      <DepartmentIcon
        icon={department.icon}
        name={department.name}
        className="mr-4"
      />
      <span>
        <span className="block text-base font-semibold text-[#0d1b3d]">
          {department.name}
        </span>
        <span className="mt-1 block text-sm text-[#52617a]">
          {department.hospitalName}
        </span>
        <span className="mt-2 block text-sm font-medium text-[#66789a]">
          {department.doctorCount} doktor
        </span>
      </span>
    </Link>
  )
}
