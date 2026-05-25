'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type { SlotOption } from '@/types'

interface SlotPickerProps {
  hospitalId: string
  departmentId: string
  doctorId: string
}

interface SlotsApiResponse {
  success: boolean
  data?: SlotOption[]
  error?: string
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function SlotPicker({
  hospitalId,
  departmentId,
  doctorId,
}: SlotPickerProps) {
  const today = useMemo(() => formatDateInputValue(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSlots() {
      setIsLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          doctorId,
          date: selectedDate,
        })
        const response = await fetch(`/api/slots?${params.toString()}`, {
          signal: controller.signal,
        })
        const payload = (await response.json()) as SlotsApiResponse

        if (!response.ok || !payload.success) {
          setSlots([])
          setError(payload.error ?? 'Uygun saatler yüklenemedi.')
          return
        }

        setSlots(payload.data ?? [])
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return
        }

        setSlots([])
        setError('Uygun saatler yüklenemedi.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadSlots()

    return () => controller.abort()
  }, [doctorId, selectedDate])

  return (
    <section className="mt-8 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-base font-semibold text-[#0d1b3d]">
            Randevu Tarihi
          </span>
          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-14 w-full rounded-2xl border border-[#cbd8ea] px-4 text-lg font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>
        <span className="flex h-14 items-center rounded-2xl bg-[#f5f8fe] px-5 text-sm font-semibold text-[#52617a]">
          {isLoading ? 'Saatler yükleniyor' : `${slots.length} uygun saat`}
        </span>
      </div>

      <div className="mt-6" aria-live="polite">
        {error ? (
          <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {!error && isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <span
                key={index}
                className="h-14 animate-pulse rounded-2xl bg-[#eef3fb]"
              />
            ))}
          </div>
        ) : null}

        {!error && !isLoading && slots.length === 0 ? (
          <div className="rounded-2xl bg-[#f5f8fe] px-5 py-6 text-sm font-medium text-[#52617a]">
            Seçilen tarihte uygun saat bulunamadı.
          </div>
        ) : null}

        {!error && !isLoading && slots.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {slots.map((slot) => (
              <Link
                key={slot.id}
                href={`/book/${hospitalId}/${departmentId}/${doctorId}/${slot.id}`}
                className="flex h-14 items-center justify-center rounded-2xl border border-[#c9d6ea] bg-white text-base font-bold text-[#0d1b3d] transition hover:border-red-500 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                {slot.startTime}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
