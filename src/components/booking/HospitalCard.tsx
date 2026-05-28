import Image from 'next/image'

import type { HospitalOption } from '@/types'

interface HospitalCardProps {
  hospital: HospitalOption
  isSelected: boolean
  onSelect: (hospitalId: string) => void
}

export function HospitalCard({
  hospital,
  isSelected,
  onSelect,
}: HospitalCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hospital.id)}
      className={`flex min-h-28 w-full rounded-xl border bg-white px-5 py-4 text-left transition ${
        isSelected
          ? 'border-red-500 shadow-sm ring-2 ring-red-100'
          : 'border-[#c9d6ea] hover:border-red-400'
      }`}
    >
      <span className="mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff]">
        <Image
          src="/hastane.png"
          alt=""
          width={44}
          height={44}
          className="h-[72%] w-[72%] object-contain"
        />
      </span>
      <span>
        <span className="block text-base font-semibold text-[#0d1b3d]">
          {hospital.name}
        </span>
        {hospital.address ? (
          <span className="mt-1 block text-sm text-[#52617a]">
            {hospital.address}
          </span>
        ) : null}
        <span className="mt-2 block text-sm font-medium text-[#66789a]">
          {hospital.departmentCount} tıbbi birim
        </span>
      </span>
    </button>
  )
}
