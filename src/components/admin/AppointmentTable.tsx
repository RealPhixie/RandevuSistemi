'use client'

import type { PanelUserRole } from '@prisma/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import {
  APPOINTMENT_STATUS_OPTIONS,
  type AppointmentStatusValue,
} from '@/lib/appointment-status'
import type { AdminAppointmentOption } from '@/types'

interface AppointmentTableProps {
  appointments: AdminAppointmentOption[]
  initialTcknSearch: string
  role: PanelUserRole
}

interface AppointmentUpdateResponse {
  success: boolean
  error?: string
}

const statusClassNames: Record<AppointmentStatusValue, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-700',
}

const ACTION_BUTTONS = [
  {
    status: 'COMPLETED',
    label: 'Geldi',
    symbol: '✓',
    className: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
  },
  {
    status: 'CANCELLED',
    label: 'İptal Et',
    symbol: '×',
    className: 'border-red-200 text-red-700 hover:bg-red-50',
  },
] satisfies Array<{
  status: AppointmentStatusValue
  label: string
  symbol: string
  className: string
}>

const APPOINTMENTS_REFRESH_INTERVAL_MS = 5 * 60 * 1000

function statusLabel(status: AppointmentStatusValue) {
  return (
    APPOINTMENT_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  )
}

function confirmationClassName(isConfirmed: boolean) {
  return isConfirmed
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-slate-100 text-slate-700'
}

function tableMinWidth(role: PanelUserRole) {
  if (role === 'SECRETARY') return 'min-w-[1220px]'
  if (role === 'DOCTOR') return 'min-w-[760px]'
  return 'min-w-[1120px]'
}

function columnCount(role: PanelUserRole) {
  if (role === 'SECRETARY') return 9
  if (role === 'DOCTOR') return 5
  return 8
}

export function AppointmentTable({
  appointments,
  initialTcknSearch,
  role,
}: AppointmentTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')
  const [tcknSearch, setTcknSearch] = useState(initialTcknSearch)

  useEffect(() => {
    if (role !== 'SECRETARY' && role !== 'DOCTOR') return

    const interval = window.setInterval(() => {
      router.refresh()
    }, APPOINTMENTS_REFRESH_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [role, router])

  useEffect(() => {
    if (role !== 'SECRETARY') return

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const currentTckn = params.get('tckn') ?? ''

      if (currentTckn === tcknSearch) return

      if (tcknSearch) {
        params.set('tckn', tcknSearch)
      } else {
        params.delete('tckn')
      }

      const query = params.toString()
      router.replace(
        query ? `/admin/appointments?${query}` : '/admin/appointments'
      )
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [role, router, searchParams, tcknSearch])

  const visibleRows = useMemo(() => {
    if (role !== 'SECRETARY' || !tcknSearch) return appointments
    return appointments.filter((row) => row.patientTckn.includes(tcknSearch))
  }, [appointments, role, tcknSearch])

  async function updateStatus(
    appointmentId: string,
    nextStatus: AppointmentStatusValue
  ) {
    setUpdatingId(appointmentId)
    setError('')

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextStatus }),
      })
      const payload = (await response.json()) as AppointmentUpdateResponse

      if (!response.ok || !payload.success) {
        setError(payload.error ?? 'Randevu durumu güncellenemedi.')
        return
      }

      router.refresh()
    } catch {
      setError('Randevu durumu güncellenemedi.')
    } finally {
      setUpdatingId('')
    }
  }

  async function confirmAppointment(appointmentId: string) {
    setUpdatingId(appointmentId)
    setError('')

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CONFIRM' }),
      })
      const payload = (await response.json()) as AppointmentUpdateResponse

      if (!response.ok || !payload.success) {
        setError(payload.error ?? 'Randevu onaylanamadı.')
        return
      }

      router.refresh()
    } catch {
      setError('Randevu onaylanamadı.')
    } finally {
      setUpdatingId('')
    }
  }

  function handleTcknSearch(value: string) {
    setTcknSearch(value.replace(/\D/g, '').slice(0, 11))
  }

  return (
    <section className="grid gap-4">
      {role === 'SECRETARY' ? (
        <label className="block rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            TC Kimlik No ile Ara
          </span>
          <input
            type="search"
            inputMode="numeric"
            value={tcknSearch}
            onChange={(event) => handleTcknSearch(event.target.value)}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>
      ) : null}

      <div className="rounded-3xl border border-[#cbd8ea] bg-white shadow-sm">
        {error ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table
            className={`w-full ${tableMinWidth(
              role
            )} border-collapse text-left`}
          >
            <thead>
              <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
                <th className="px-5 py-4">Hasta</th>
                {role === 'SECRETARY' ? (
                  <th className="px-5 py-4">TC Kimlik</th>
                ) : null}
                {role === 'DOCTOR' ? (
                  <th className="px-5 py-4">Doğum Tarihi</th>
                ) : (
                  <th className="px-5 py-4">Telefon</th>
                )}
                {role === 'ADMIN' ? (
                  <th className="px-5 py-4">Hastane</th>
                ) : null}
                {role !== 'DOCTOR' ? (
                  <th className="px-5 py-4">Birim</th>
                ) : null}
                {role !== 'DOCTOR' ? (
                  <th className="px-5 py-4">Doktor</th>
                ) : null}
                <th className="px-5 py-4">Tarih/Saat</th>
                <th className="px-5 py-4">Durum</th>
                {role === 'SECRETARY' ? (
                  <th className="px-5 py-4">Onay Durumu</th>
                ) : null}
                <th className="px-5 py-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length > 0 ? (
                visibleRows.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-[#edf2f8] last:border-b-0"
                  >
                    <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                      {appointment.patientName}
                    </td>
                    {role === 'SECRETARY' ? (
                      <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                        {appointment.patientTckn}
                      </td>
                    ) : null}
                    <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                      {role === 'DOCTOR'
                        ? appointment.patientBirthDate
                        : appointment.patientPhone}
                    </td>
                    {role === 'ADMIN' ? (
                      <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                        {appointment.hospitalName}
                      </td>
                    ) : null}
                    {role !== 'DOCTOR' ? (
                      <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                        {appointment.departmentName}
                        {role === 'SECRETARY' ? (
                          <span className="mt-1 block text-xs text-[#70809a]">
                            {appointment.hospitalName}
                          </span>
                        ) : null}
                      </td>
                    ) : null}
                    {role !== 'DOCTOR' ? (
                      <td className="px-5 py-4 text-sm font-semibold text-[#102040]">
                        {appointment.doctorName}
                      </td>
                    ) : null}
                    <td className="px-5 py-4 text-sm font-semibold text-[#102040]">
                      {appointment.date}
                      <span className="mt-1 block text-xs text-[#70809a]">
                        {appointment.startTime} - {appointment.endTime}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          statusClassNames[appointment.status]
                        }`}
                      >
                        {statusLabel(appointment.status)}
                      </span>
                    </td>
                    {role === 'SECRETARY' ? (
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${confirmationClassName(
                            appointment.isConfirmed
                          )}`}
                        >
                          {appointment.isConfirmed ? 'Onaylandı' : 'Bekliyor'}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-5 py-4">
                      {role === 'ADMIN' ? (
                        <div className="flex items-center gap-2">
                          {ACTION_BUTTONS.map((action) => (
                            <button
                              key={action.status}
                              type="button"
                              title={action.label}
                              aria-label={`${appointment.patientName} - ${action.label}`}
                              disabled={updatingId === appointment.id}
                              onClick={() =>
                                void updateStatus(
                                  appointment.id,
                                  action.status
                                )
                              }
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-bold transition disabled:cursor-not-allowed disabled:border-[#d7e0ef] disabled:bg-[#f5f8fe] disabled:text-[#9aa7ba] ${action.className}`}
                            >
                              <span aria-hidden="true">{action.symbol}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {role === 'SECRETARY' && appointment.canConfirm ? (
                        <button
                          type="button"
                          disabled={updatingId === appointment.id}
                          onClick={() =>
                            void confirmAppointment(appointment.id)
                          }
                          className="h-10 rounded-xl border border-emerald-200 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-[#d7e0ef] disabled:bg-[#f5f8fe] disabled:text-[#9aa7ba]"
                        >
                          Onayla
                        </button>
                      ) : null}

                      {role === 'SECRETARY' && !appointment.canConfirm ? (
                        <span className="text-sm font-semibold text-[#70809a]">
                          -
                        </span>
                      ) : null}

                      {role === 'DOCTOR' ? (
                        <Link
                          href={`/admin/appointments/${appointment.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#cbd8ea] px-4 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
                        >
                          Görüntüle
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columnCount(role)}
                    className="px-5 py-6 text-sm font-semibold text-[#52617a]"
                  >
                    Kayıtlı randevu bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
