import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton'
import { deletePatient } from '@/lib/admin-management'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

export const dynamic = 'force-dynamic'

interface AdminPatientsPageProps {
  searchParams: Promise<{
    error?: string | string[]
    q?: string | string[]
  }>
}

const birthDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
})

const createdAtFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : ''
}

function normalizePatientSearch(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 80)
}

async function requireAdmin() {
  const user = await requireRole(['ADMIN'])

  if (!user) {
    redirect('/admin/appointments')
  }
}

async function deletePatientAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await deletePatient(Object.fromEntries(formData))
  } catch {
    redirect('/admin/patients?error=delete')
  }

  revalidatePath('/admin/patients')
  redirect('/admin/patients')
}

export default async function AdminPatientsPage({
  searchParams,
}: AdminPatientsPageProps) {
  await requireAdmin()

  const query = await searchParams
  const search = normalizePatientSearch(getQueryValue(query.q))
  const hasError = typeof query.error === 'string'
  const where: Prisma.PatientWhereInput = search
    ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { tckn: { contains: search.replace(/\D/g, '') || search } },
          { phone: { contains: search.replace(/\s/g, '') } },
        ],
      }
    : {}

  const patients = await prisma.patient.findMany({
    where,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tckn: true,
      phone: true,
      birthDate: true,
      createdAt: true,
      _count: {
        select: { appointments: true },
      },
    },
  })

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">Hastalar</h1>
      </section>

      <form className="grid gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm md:grid-cols-[1fr_auto_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Hasta Ara
          </span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Ad, soyad, TC kimlik veya telefon"
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition placeholder:text-[#8a98ad] focus:border-red-500"
          />
        </label>

        <button
          type="submit"
          className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Ara
        </button>

        <Link
          href="/admin/patients"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#cbd8ea] px-6 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
        >
          Temizle
        </Link>
      </form>

      {hasError ? (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          İşlem tamamlanamadı. Hasta kaydını kontrol edin.
        </div>
      ) : null}

      <section className="rounded-3xl border border-[#cbd8ea] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
                <th className="px-5 py-4">Hasta</th>
                <th className="px-5 py-4">TC Kimlik</th>
                <th className="px-5 py-4">Telefon</th>
                <th className="px-5 py-4">Doğum Tarihi</th>
                <th className="px-5 py-4">Randevu</th>
                <th className="px-5 py-4">Kayıt Tarihi</th>
                <th className="px-5 py-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="border-b border-[#edf2f8] last:border-b-0"
                  >
                    <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                      {patient.firstName} {patient.lastName}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                      {patient.tckn}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                      {patient.phone}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                      {birthDateFormatter.format(patient.birthDate)}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                      {patient._count.appointments}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                      {createdAtFormatter.format(patient.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center">
                        <form action={deletePatientAction}>
                          <input type="hidden" name="id" value={patient.id} />
                          <ConfirmSubmitButton
                            message="Bu hastayı silmek istediğinize emin misiniz?"
                            className="h-10 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
                          >
                            Sil
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-6 text-sm font-semibold text-[#52617a]"
                  >
                    Kayıtlı hasta bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
