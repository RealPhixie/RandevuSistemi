import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  createHospital,
  setHospitalActive,
} from '@/lib/admin-management'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface AdminHospitalsPageProps {
  searchParams: Promise<{
    error?: string | string[]
  }>
}

async function requireAdmin() {
  const session = await auth()

  if (!session?.user) {
    redirect('/admin/login')
  }
}

async function createHospitalAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await createHospital(Object.fromEntries(formData))
  } catch {
    redirect('/admin/hospitals?error=create')
  }

  revalidatePath('/admin/hospitals')
  redirect('/admin/hospitals')
}

async function updateHospitalStatusAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await setHospitalActive(Object.fromEntries(formData))
  } catch {
    redirect('/admin/hospitals?error=status')
  }

  revalidatePath('/admin/hospitals')
  redirect('/admin/hospitals')
}

export default async function AdminHospitalsPage({
  searchParams,
}: AdminHospitalsPageProps) {
  const query = await searchParams
  const hasError = typeof query.error === 'string'
  const hospitals = await prisma.hospital.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { departments: true },
      },
    },
  })

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">Hastaneler</h1>
      </section>

      <form
        action={createHospitalAction}
        className="grid gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Hastane Adı
          </span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Adres
          </span>
          <input
            name="address"
            maxLength={200}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Telefon
          </span>
          <input
            name="phone"
            maxLength={30}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <button
          type="submit"
          className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Ekle
        </button>
      </form>

      {hasError ? (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          İşlem tamamlanamadı. Bilgileri kontrol edin.
        </div>
      ) : null}

      <section className="rounded-3xl border border-[#cbd8ea] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
                <th className="px-5 py-4">Hastane</th>
                <th className="px-5 py-4">Adres</th>
                <th className="px-5 py-4">Telefon</th>
                <th className="px-5 py-4">Birim</th>
                <th className="px-5 py-4">Durum</th>
                <th className="px-5 py-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((hospital) => (
                <tr
                  key={hospital.id}
                  className="border-b border-[#edf2f8] last:border-b-0"
                >
                  <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                    {hospital.name}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {hospital.address ?? '-'}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {hospital.phone ?? '-'}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {hospital._count.departments}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        hospital.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {hospital.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <form action={updateHospitalStatusAction}>
                      <input type="hidden" name="id" value={hospital.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={String(!hospital.isActive)}
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-xl border border-[#cbd8ea] px-4 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
                      >
                        {hospital.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
