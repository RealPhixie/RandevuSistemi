export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Planlandı' },
  { value: 'COMPLETED', label: 'Geldi' },
  { value: 'CANCELLED', label: 'İptal Edildi' },
  { value: 'NO_SHOW', label: 'Gelmedi' },
] as const

export type AppointmentStatusValue =
  (typeof APPOINTMENT_STATUS_OPTIONS)[number]['value']

export function isAppointmentStatusValue(
  value: unknown
): value is AppointmentStatusValue {
  return APPOINTMENT_STATUS_OPTIONS.some((option) => option.value === value)
}
