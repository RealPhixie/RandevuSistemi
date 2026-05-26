'use client'

import { useState, type FormEvent } from 'react'

interface VerifyOtpFormProps {
  phone: string
  slotId: string
}

interface OtpVerifyResponse {
  success: boolean
  data?: {
    isExistingPatient: boolean
    patientId?: string
  }
  error?: string
}

export function VerifyOtpForm({ phone, slotId }: VerifyOtpFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<OtpVerifyResponse['data']>()

  const canSubmit = /^\d{6}$/.test(code) && !isSubmitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError('')
    setResult(undefined)

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const payload = (await response.json()) as OtpVerifyResponse

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error ?? 'Telefon doğrulanamadı.')
        return
      }

      sessionStorage.setItem(
        'bookingOtpVerified',
        JSON.stringify({
          phone,
          slotId,
          patientId: payload.data.patientId ?? null,
          isExistingPatient: payload.data.isExistingPatient,
        })
      )

      setResult(payload.data)
    } catch {
      setError('Telefon doğrulanamadı.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm sm:p-7">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-base font-semibold text-[#0d1b3d]">
            Doğrulama Kodu
          </span>
          <input
            inputMode="numeric"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
              setResult(undefined)
            }}
            placeholder="6 haneli kod"
            className="h-14 w-full rounded-2xl border border-[#cbd8ea] px-4 text-lg font-semibold text-[#102040] outline-none transition placeholder:text-[#8a98ad] focus:border-red-500"
          />
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-14 rounded-2xl bg-red-600 px-8 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#c3ccdc]"
        >
          {isSubmitting ? 'Doğrulanıyor' : 'Onayla'}
        </button>
      </form>

      {error ? (
        <div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-2xl bg-[#f5f8fe] px-5 py-5 text-sm font-semibold text-[#30476f]">
          {result.isExistingPatient
            ? 'Telefon doğrulandı. Hasta kaydı bulundu.'
            : 'Telefon doğrulandı. Hasta kayıt bilgileri sonraki adımda alınacak.'}
        </div>
      ) : null}
    </section>
  )
}
