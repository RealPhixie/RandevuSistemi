'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

interface DepartmentIconProps {
  icon: string
  name: string
  size?: 'sm' | 'md'
  className?: string
}

const sizeClassNames = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
}

function getIconCandidates(icon: string) {
  const value = icon.trim()

  if (!value) return []

  if (value.startsWith('/') || /\.(png|svg)$/i.test(value)) {
    return [value]
  }

  if (/^[a-z0-9-]+$/i.test(value)) {
    return [`/departments/${value}.svg`, `/departments/${value}.png`]
  }

  return []
}

function getFallbackLabel(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('tr-TR')

  return initials || 'TB'
}

export function DepartmentIcon({
  icon,
  name,
  size = 'md',
  className = '',
}: DepartmentIconProps) {
  const candidates = useMemo(() => getIconCandidates(icon), [icon])
  const [imageState, setImageState] = useState({ icon, candidateIndex: 0 })
  const candidateIndex =
    imageState.icon === icon ? imageState.candidateIndex : 0
  const imageSrc = candidates[candidateIndex]
  const legacyTextIcon = icon.trim()

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] font-bold text-[#30476f] ${sizeClassNames[size]} ${className}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          width={44}
          height={44}
          unoptimized
          className="h-[72%] w-[72%] object-contain"
          onError={() =>
            setImageState({
              icon,
              candidateIndex: candidateIndex + 1,
            })
          }
        />
      ) : legacyTextIcon && candidates.length === 0 ? (
        legacyTextIcon
      ) : (
        getFallbackLabel(name)
      )}
    </span>
  )
}
