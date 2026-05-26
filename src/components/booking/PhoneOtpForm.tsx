'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

interface PhoneOtpFormProps {
  hospitalId: string
  departmentId: string
  doctorId: string
  slotId: string
}

interface OtpSendResponse {
  success: boolean
  data?: {
    expiresAt: string
  }
  devCode?: string
  error?: string
}

export function PhoneOtpForm({
  hospitalId,
  departmentId,
  doctorId,
  slotId,
}: PhoneOtpFormProps) {
  const [phone, setPhone] = useState('')
  const [devCode, setDevCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const normalizedPhone = phone.replace(/\s/g, '')
  const canSubmit = /^05\d{9}$/.test(normalizedPhone) && !isSubmitting
  const verifyHref = `/verify?phone=${encodeURIComponent(
    normalizedPhone
  )}&slotId=${encodeURIComponent(slotId)}`

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError('')
    setDevCode('')

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone }),
      })
      const payload = (await response.json()) as OtpSendResponse

      if (!response.ok || !payload.success) {
        setIsSent(false)
        setError(payload.error ?? 'Doğrulama kodu gönderilemedi.')
        return
      }

      sessionStorage.setItem(
        'bookingDraft',
        JSON.stringify({
          hospitalId,
          departmentId,
          doctorId,
          slotId,
          phone: normalizedPhone,
        })
      )

      setIsSent(true)
      setDevCode(payload.devCode ?? '')
    } catch {
      setIsSent(false)
      setError('Doğrulama kodu gönderilemedi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm sm:p-7">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-base font-semibold text-[#0d1b3d]">
            Telefon Numaranız
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
              setIsSent(false)
              setDevCode('')
              setError('')
            }}
            placeholder="05XXXXXXXXX"
            className="h-14 w-full rounded-2xl border border-[#cbd8ea] px-4 text-lg font-semibold text-[#102040] outline-none transition placeholder:text-[#8a98ad] focus:border-red-500"
          />
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-14 rounded-2xl bg-red-600 px-8 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#c3ccdc]"
        >
          {isSubmitting ? 'Gönderiliyor' : 'Kod Gönder'}
        </button>
      </form>

      {error ? (
        <div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {devCode ? (
        <div className="mt-5 rounded-2xl border border-yellow-400 bg-yellow-100 px-5 py-4 text-sm font-semibold text-yellow-900">
          Test - Gönderilen kod: <strong>{devCode}</strong>
        </div>
      ) : null}

      {isSent ? (
        <Link
          href={verifyHref}
          className="mt-5 inline-flex h-14 items-center justify-center rounded-2xl bg-[#111827] px-8 text-base font-semibold text-white transition hover:bg-[#253044]"
        >
          Telefon Doğrulamaya Geç
        </Link>
      ) : null}
    </section>
  )
}
