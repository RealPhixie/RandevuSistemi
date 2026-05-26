'use client'

import { useState } from 'react'

import {
  APPOINTMENT_STATUS_OPTIONS,
  type AppointmentStatusValue,
} from '@/lib/appointment-status'
import type { AdminAppointmentOption } from '@/types'

interface AppointmentTableProps {
  appointments: AdminAppointmentOption[]
}

interface AppointmentUpdateResponse {
  success: boolean
  data?: {
    id: string
    status: AppointmentStatusValue
  }
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

function statusLabel(status: AppointmentStatusValue) {
  return (
    APPOINTMENT_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  )
}

export function AppointmentTable({ appointments }: AppointmentTableProps) {
  const [rows, setRows] = useState(appointments)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

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
        body: JSON.stringify({ status: nextStatus }),
      })
      const payload = (await response.json()) as AppointmentUpdateResponse

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error ?? 'Randevu durumu güncellenemedi.')
        return
      }

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === payload.data?.id
            ? { ...row, status: payload.data.status }
            : row
        )
      )
    } catch {
      setError('Randevu durumu güncellenemedi.')
    } finally {
      setUpdatingId('')
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-[#cbd8ea] bg-white p-6 text-sm font-semibold text-[#52617a] shadow-sm">
        Kayıtlı randevu bulunamadı.
      </div>
    )
  }

  return (
    <section className="rounded-3xl border border-[#cbd8ea] bg-white shadow-sm">
      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
              <th className="px-5 py-4">Hasta</th>
              <th className="px-5 py-4">Telefon</th>
              <th className="px-5 py-4">Doktor</th>
              <th className="px-5 py-4">Birim</th>
              <th className="px-5 py-4">Tarih</th>
              <th className="px-5 py-4">Durum</th>
              <th className="px-5 py-4">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((appointment) => (
              <tr
                key={appointment.id}
                className="border-b border-[#edf2f8] last:border-b-0"
              >
                <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                  {appointment.patientName}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                  {appointment.patientPhone}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-[#102040]">
                  {appointment.doctorName}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                  <span>{appointment.hospitalName}</span>
                  <span className="mt-1 block text-xs text-[#70809a]">
                    {appointment.departmentName}
                  </span>
                </td>
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
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {ACTION_BUTTONS.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        title={action.label}
                        aria-label={`${appointment.patientName} - ${action.label}`}
                        disabled={updatingId === appointment.id}
                        onClick={() =>
                          void updateStatus(appointment.id, action.status)
                        }
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-bold transition disabled:cursor-not-allowed disabled:border-[#d7e0ef] disabled:bg-[#f5f8fe] disabled:text-[#9aa7ba] ${action.className}`}
                      >
                        <span aria-hidden="true">{action.symbol}</span>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
