'use client'

import { useState, type FormEvent } from 'react'

import { BookingStepper } from '@/components/booking/BookingStepper'

interface VerifyOtpFormProps {
  phone: string
  slotId: string
  appointmentDetails: {
    hospitalName: string
    departmentName: string
    doctorName: string
    date: string
    startTime: string
    endTime: string
  }
}

interface OtpVerifyResponse {
  success: boolean
  data?: {
    isExistingPatient: boolean
    phoneVerificationId: string
    patientId?: string
    patientName?: string
  }
  error?: string
}

interface PatientRegisterResponse {
  success: boolean
  data?: {
    patientId: string
  }
  error?: string
}

interface AppointmentCreateResponse {
  success: boolean
  data?: {
    appointmentId: string
  }
  error?: string
}

export function VerifyOtpForm({
  phone,
  slotId,
  appointmentDetails,
}: VerifyOtpFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [verification, setVerification] = useState<OtpVerifyResponse['data']>()
  const [registeredPatientId, setRegisteredPatientId] = useState('')
  const [tckn, setTckn] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const patientId = registeredPatientId || verification?.patientId || ''
  const canVerify = /^\d{6}$/.test(code) && !isVerifying
  const canRegister =
    Boolean(verification) &&
    !verification?.isExistingPatient &&
    /^\d{11}$/.test(tckn) &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    birthDate.length > 0 &&
    !isRegistering
  const canBook = Boolean(patientId && verification?.phoneVerificationId) && !isBooking
  const currentStep = !verification ? 1 : patientId ? 3 : 2
  const patientName = verification?.isExistingPatient
    ? verification.patientName ?? ''
    : [firstName, lastName]
        .map((namePart) => namePart.trim())
        .filter(Boolean)
        .join(' ')
  const appointmentDateTime = [
    appointmentDetails.date,
    `${appointmentDetails.startTime} - ${appointmentDetails.endTime}`,
  ].join(' ')
  const confirmationRows = [
    { label: 'Hastane', value: appointmentDetails.hospitalName },
    { label: 'Tıbbi Birim', value: appointmentDetails.departmentName },
    { label: 'Doktor', value: appointmentDetails.doctorName },
    { label: 'Hasta', value: patientName },
    {
      label: 'Tarih',
      value: appointmentDateTime,
    },
    { label: 'Telefon', value: phone },
  ]

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canVerify) return

    setIsVerifying(true)
    setError('')
    setVerification(undefined)
    setRegisteredPatientId('')

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
          phoneVerificationId: payload.data.phoneVerificationId,
          isExistingPatient: payload.data.isExistingPatient,
        })
      )

      setVerification(payload.data)
    } catch {
      setError('Telefon doğrulanamadı.')
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canRegister || !verification) return

    setIsRegistering(true)
    setError('')

    try {
      const response = await fetch('/api/patient/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          phoneVerificationId: verification.phoneVerificationId,
          tckn,
          firstName,
          lastName,
          birthDate,
        }),
      })
      const payload = (await response.json()) as PatientRegisterResponse

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error ?? 'Hasta kaydı oluşturulamadı.')
        return
      }

      sessionStorage.setItem(
        'bookingOtpVerified',
        JSON.stringify({
          phone,
          slotId,
          patientId: payload.data.patientId,
          phoneVerificationId: verification.phoneVerificationId,
          isExistingPatient: false,
        })
      )

      setRegisteredPatientId(payload.data.patientId)
    } catch {
      setError('Hasta kaydı oluşturulamadı.')
    } finally {
      setIsRegistering(false)
    }
  }

  async function handleCreateAppointment() {
    if (!canBook || !verification) return

    setIsBooking(true)
    setError('')

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          phoneVerificationId: verification.phoneVerificationId,
          patientId,
          timeSlotId: slotId,
        }),
      })
      const payload = (await response.json()) as AppointmentCreateResponse

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error ?? 'Randevu oluşturulamadı.')
        return
      }

      window.location.assign(
        `/appointment/success?appointmentId=${encodeURIComponent(
          payload.data.appointmentId
        )}`
      )
    } catch {
      setError('Randevu oluşturulamadı.')
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm sm:p-7">
      <BookingStepper currentStep={currentStep} />

      <form
        onSubmit={handleVerify}
        className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
      >
        <label className="block">
          <span className="mb-2 block text-base font-semibold text-[#0d1b3d]">
            Doğrulama Kodu
          </span>
          <input
            inputMode="numeric"
            value={code}
            disabled={Boolean(verification)}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
              setVerification(undefined)
              setRegisteredPatientId('')
            }}
            placeholder="6 haneli kod"
            className="h-14 w-full rounded-2xl border border-[#cbd8ea] px-4 text-lg font-semibold text-[#102040] outline-none transition placeholder:text-[#8a98ad] focus:border-red-500 disabled:bg-[#f5f8fe]"
          />
        </label>
        <button
          type="submit"
          disabled={!canVerify || Boolean(verification)}
          className="h-14 rounded-2xl bg-red-600 px-8 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#c3ccdc]"
        >
          {isVerifying ? 'Doğrulanıyor' : 'Onayla'}
        </button>
      </form>

      {error ? (
        <div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {verification && !verification.isExistingPatient && !registeredPatientId ? (
        <form
          onSubmit={handleRegister}
          className="mt-5 grid gap-4 border-t border-[#d7e0ef] pt-5 sm:grid-cols-2"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
              TCKN
            </span>
            <input
              inputMode="numeric"
              value={tckn}
              onChange={(event) =>
                setTckn(event.target.value.replace(/\D/g, '').slice(0, 11))
              }
              className="h-12 w-full rounded-2xl border border-[#cbd8ea] px-4 font-semibold text-[#102040] outline-none transition focus:border-red-500"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
              Doğum Tarihi
            </span>
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#cbd8ea] px-4 font-semibold text-[#102040] outline-none transition focus:border-red-500"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
              Ad
            </span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#cbd8ea] px-4 font-semibold text-[#102040] outline-none transition focus:border-red-500"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
              Soyad
            </span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#cbd8ea] px-4 font-semibold text-[#102040] outline-none transition focus:border-red-500"
            />
          </label>
          <button
            type="submit"
            disabled={!canRegister}
            className="h-12 rounded-2xl bg-[#111827] px-8 text-base font-semibold text-white transition hover:bg-[#253044] disabled:cursor-not-allowed disabled:bg-[#c3ccdc] sm:col-span-2"
          >
            {isRegistering ? 'Kaydediliyor' : 'Hasta Kaydını Oluştur'}
          </button>
        </form>
      ) : null}

      {patientId ? (
        <div className="mt-6 border-t border-[#d7e0ef] pt-5">
          <h2 className="text-lg font-bold text-[#0d1b3d]">
            Randevu Detayları
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#52617a]">
            Bu randevuyu onaylıyor musunuz?
          </p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {confirmationRows.map((row) => (
              <div key={row.label} className="border-b border-[#e1e8f4] pb-3">
                <dt className="text-xs font-semibold uppercase text-[#70809a]">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm font-bold text-[#102040]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 rounded-2xl bg-[#f5f8fe] px-4 py-3 text-sm font-semibold text-[#52617a]">
            Randevu tarihinizden 10 dakika önce hastanede bulunmanız
            gerekmektedir.
          </p>
        </div>
      ) : null}

      {patientId ? (
        <button
          type="button"
          onClick={handleCreateAppointment}
          disabled={!canBook}
          className="mt-5 h-14 rounded-2xl bg-red-600 px-8 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#c3ccdc]"
        >
          {isBooking ? 'Randevu Oluşturuluyor' : 'Randevuyu Oluştur'}
        </button>
      ) : null}
    </section>
  )
}
