'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import {
  addDaysToDateInput,
  getLocalDateInputValue,
  getLocalDateTimeParts,
  isBookableSlot,
} from '@/lib/booking-time'
import type { SlotOption } from '@/types'

interface SlotPickerProps {
  doctorId: string
  initialDate: string
}

interface SlotsApiResponse {
  success: boolean
  data?: SlotOption[]
  error?: string
}

export function SlotPicker({
  doctorId,
  initialDate,
}: SlotPickerProps) {
  const today = useMemo(() => getLocalDateInputValue(), [])
  const maxDate = useMemo(() => addDaysToDateInput(today, 14) ?? today, [today])
  const [selectedDate, setSelectedDate] = useState(() =>
    initialDate < today ? today : initialDate > maxDate ? maxDate : initialDate
  )
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [localNow, setLocalNow] = useState(() => getLocalDateTimeParts())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLocalNow(getLocalDateTimeParts())
    }, 30000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadSlots() {
      setIsLoading(true)
      setError('')

      if (selectedDate < today) {
        setSlots([])
        setError('Geçmiş tarihler için randevu alınamaz.')
        setIsLoading(false)
        return
      }

      if (selectedDate > maxDate) {
        setSlots([])
        setError('Randevu tarihi en fazla 2 hafta sonrası olabilir.')
        setIsLoading(false)
        return
      }

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
  }, [doctorId, maxDate, selectedDate, today])

  const bookableSlots = useMemo(
    () =>
      slots.filter((slot) =>
        isBookableSlot(selectedDate, slot.startTime, localNow)
      ),
    [localNow, selectedDate, slots]
  )

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
            max={maxDate}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-14 w-full rounded-2xl border border-[#cbd8ea] px-4 text-lg font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>
        <span className="flex h-14 items-center rounded-2xl bg-[#f5f8fe] px-5 text-sm font-semibold text-[#52617a]">
          {isLoading ? 'Saatler yükleniyor' : `${bookableSlots.length} uygun saat`}
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

        {!error && !isLoading && bookableSlots.length === 0 ? (
          <div className="rounded-2xl bg-[#f5f8fe] px-5 py-6 text-sm font-medium text-[#52617a]">
            Seçilen tarihte uygun randevu saati bulunamadı.
          </div>
        ) : null}

        {!error && !isLoading && bookableSlots.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bookableSlots.map((slot) => (
              <Link
                key={slot.id}
                href={`/book/slot/${slot.id}`}
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
