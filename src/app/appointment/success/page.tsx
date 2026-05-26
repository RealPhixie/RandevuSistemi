import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { BookingStepper } from '@/components/booking/BookingStepper'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface AppointmentSuccessPageProps {
  searchParams: Promise<{
    appointmentId?: string | string[]
  }>
}

export default async function AppointmentSuccessPage({
  searchParams,
}: AppointmentSuccessPageProps) {
  const query = await searchParams
  const appointmentId =
    typeof query.appointmentId === 'string' ? query.appointmentId : ''

  if (!appointmentId) notFound()

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      timeSlot: {
        include: {
          doctor: {
            include: {
              department: {
                include: {
                  hospital: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!appointment || !appointment.timeSlot.doctor.department) notFound()

  const department = appointment.timeSlot.doctor.department

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
  }).format(appointment.timeSlot.date)

  return (
    <main className="min-h-screen bg-[#eaf1fb] px-4 py-10 text-[#111827] sm:px-6">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#cbd8ea] bg-white p-6 shadow-sm sm:p-8">
        <BookingStepper currentStep={3} />

        <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700">
          <p className="text-sm font-semibold">Randevunuz oluşturuldu</p>
          <h1 className="mt-1 text-3xl font-bold">
            {formattedDate}, {appointment.timeSlot.startTime}
          </h1>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <AppointmentDetail label="Hasta">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </AppointmentDetail>
          <AppointmentDetail label="Telefon">
            {appointment.patient.phone}
          </AppointmentDetail>
          <AppointmentDetail label="Hastane">
            {department.hospital.name}
          </AppointmentDetail>
          <AppointmentDetail label="Tıbbi Birim">
            {department.name}
          </AppointmentDetail>
          <AppointmentDetail label="Doktor">
            {appointment.timeSlot.doctor.title ?? ''} {appointment.timeSlot.doctor.name}
          </AppointmentDetail>
          <AppointmentDetail label="Saat">
            {appointment.timeSlot.startTime} - {appointment.timeSlot.endTime}
          </AppointmentDetail>
        </dl>

        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-[#111827] px-7 text-sm font-semibold text-white transition hover:bg-[#253044]"
        >
          Ana Ekrana Dön
        </Link>
      </section>
    </main>
  )
}

function AppointmentDetail({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#d7e0ef] bg-[#f5f8fe] px-5 py-4">
      <dt className="text-xs font-bold uppercase tracking-normal text-[#66789a]">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-[#0d1b3d]">
        {children}
      </dd>
    </div>
  )
}
