import Link from 'next/link'

import { slugifyPathSegment } from '@/lib/slugs'
import type { DoctorOption } from '@/types'

interface DoctorCardProps {
  doctor: DoctorOption
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  const doctorHref = `/book/${doctor.hospitalId}/${slugifyPathSegment(
    doctor.departmentName
  )}/${doctor.id}`

  return (
    <Link
      href={doctorHref}
      className="flex min-h-28 rounded-xl border border-[#c9d6ea] bg-white px-5 py-4 text-left transition hover:border-red-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
    >
      <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff1f1] text-base font-bold text-red-600">
        Dr
      </span>
      <span>
        <span className="block text-base font-semibold text-[#0d1b3d]">
          {doctor.title} {doctor.name}
        </span>
        <span className="mt-1 block text-sm text-[#52617a]">
          {doctor.departmentName}
        </span>
        <span className="mt-2 block text-sm font-medium text-[#66789a]">
          {doctor.hospitalName}
        </span>
      </span>
    </Link>
  )
}
