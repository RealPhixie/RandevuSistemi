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
      className={`w-full rounded-xl border bg-white px-5 py-4 text-left transition ${
        isSelected
          ? 'border-red-500 shadow-sm ring-2 ring-red-100'
          : 'border-[#c9d6ea] hover:border-red-400'
      }`}
    >
      <span className="text-base font-semibold text-[#0d1b3d]">
        {hospital.name}
      </span>
      {hospital.address ? (
        <span className="mt-1 block text-sm text-[#52617a]">
          {hospital.address}
        </span>
      ) : null}
      <span className="mt-3 block text-sm font-medium text-[#66789a]">
        {hospital.departmentCount} tıbbi birim
      </span>
    </button>
  )
}
