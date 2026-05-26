import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  createDepartment,
  setDepartmentActive,
} from '@/lib/admin-management'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface AdminDepartmentsPageProps {
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

async function createDepartmentAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await createDepartment(Object.fromEntries(formData))
  } catch {
    redirect('/admin/departments?error=create')
  }

  revalidatePath('/admin/departments')
  redirect('/admin/departments')
}

async function updateDepartmentStatusAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await setDepartmentActive(Object.fromEntries(formData))
  } catch {
    redirect('/admin/departments?error=status')
  }

  revalidatePath('/admin/departments')
  redirect('/admin/departments')
}

export default async function AdminDepartmentsPage({
  searchParams,
}: AdminDepartmentsPageProps) {
  const query = await searchParams
  const hasError = typeof query.error === 'string'
  const [hospitals, departments] = await Promise.all([
    prisma.hospital.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.department.findMany({
      orderBy: [{ hospital: { name: 'asc' } }, { name: 'asc' }],
      include: {
        hospital: { select: { name: true } },
        _count: { select: { panelUsers: { where: { role: 'DOCTOR' } } } },
      },
    }),
  ])

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
          Tıbbi Birimler
        </h1>
      </section>

      <form
        action={createDepartmentAction}
        className="grid gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_120px_auto] lg:items-end"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Hastane
          </span>
          <select
            name="hospitalId"
            required
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] bg-white px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          >
            <option value="">Seçin</option>
            {hospitals.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Tıbbi Birim
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
            Simge
          </span>
          <input
            name="icon"
            required
            maxLength={8}
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
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
                <th className="px-5 py-4">Birim</th>
                <th className="px-5 py-4">Hastane</th>
                <th className="px-5 py-4">Doktor</th>
                <th className="px-5 py-4">Durum</th>
                <th className="px-5 py-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr
                  key={department.id}
                  className="border-b border-[#edf2f8] last:border-b-0"
                >
                  <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                    <span className="mr-2">{department.icon}</span>
                    {department.name}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {department.hospital.name}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {department._count.panelUsers}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        department.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {department.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <form action={updateDepartmentStatusAction}>
                      <input type="hidden" name="id" value={department.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={String(!department.isActive)}
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-xl border border-[#cbd8ea] px-4 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
                      >
                        {department.isActive ? 'Pasifleştir' : 'Aktifleştir'}
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
