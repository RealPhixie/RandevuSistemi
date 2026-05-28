import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton'
import {
  createDoctor,
  deleteDoctor,
  setDoctorActive,
} from '@/lib/admin-management'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

export const dynamic = 'force-dynamic'

interface AdminDoctorsPageProps {
  searchParams: Promise<{
    error?: string | string[]
  }>
}

async function requireAdmin() {
  const user = await requireRole(['ADMIN'])

  if (!user) {
    redirect('/admin/appointments')
  }
}

async function createDoctorAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await createDoctor(Object.fromEntries(formData))
  } catch {
    redirect('/admin/doctors?error=create')
  }

  revalidatePath('/admin/doctors')
  redirect('/admin/doctors')
}

async function updateDoctorStatusAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await setDoctorActive(Object.fromEntries(formData))
  } catch {
    redirect('/admin/doctors?error=status')
  }

  revalidatePath('/admin/doctors')
  redirect('/admin/doctors')
}

async function deleteDoctorAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await deleteDoctor(Object.fromEntries(formData))
  } catch {
    redirect('/admin/doctors?error=delete')
  }

  revalidatePath('/admin/doctors')
  redirect('/admin/doctors')
}

export default async function AdminDoctorsPage({
  searchParams,
}: AdminDoctorsPageProps) {
  await requireAdmin()

  const query = await searchParams
  const hasError = typeof query.error === 'string'
  const [departments, doctors] = await Promise.all([
    prisma.department.findMany({
      orderBy: [{ hospital: { name: 'asc' } }, { name: 'asc' }],
      include: { hospital: { select: { name: true } } },
    }),
    prisma.panelUser.findMany({
      where: { role: 'DOCTOR' },
      orderBy: [
        { department: { hospital: { name: 'asc' } } },
        { department: { name: 'asc' } },
        { name: 'asc' },
      ],
      include: {
        department: {
          include: {
            hospital: { select: { name: true } },
          },
        },
      },
    }),
  ])

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">Doktorlar</h1>
      </section>

      <form
        action={createDoctorAction}
        className="grid gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm lg:grid-cols-[1fr_130px_1fr_1fr_160px_auto] lg:items-end"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Tıbbi Birim
          </span>
          <select
            name="departmentId"
            required
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] bg-white px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          >
            <option value="">Seçin</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.hospital.name} - {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Unvan
          </span>
          <input
            name="title"
            required
            minLength={2}
            maxLength={50}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Doktor Adı
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
            Kullanıcı Adı
          </span>
          <input
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={60}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Şifre
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
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
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
                <th className="px-5 py-4">Doktor</th>
                <th className="px-5 py-4">Kullanıcı Adı</th>
                <th className="px-5 py-4">Hastane</th>
                <th className="px-5 py-4">Birim</th>
                <th className="px-5 py-4">Durum</th>
                <th className="px-5 py-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr
                  key={doctor.id}
                  className="border-b border-[#edf2f8] last:border-b-0"
                >
                  <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                    {doctor.title ?? ''} {doctor.name}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {doctor.username}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {doctor.department?.hospital.name ?? '-'}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#30476f]">
                    {doctor.department?.name ?? '-'}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        doctor.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {doctor.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      <form action={updateDoctorStatusAction}>
                        <input type="hidden" name="id" value={doctor.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={String(!doctor.isActive)}
                        />
                        <button
                          type="submit"
                          className="h-10 rounded-xl border border-[#cbd8ea] px-4 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
                        >
                          {doctor.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                      </form>

                      <form action={deleteDoctorAction}>
                        <input type="hidden" name="id" value={doctor.id} />
                        <ConfirmSubmitButton
                          message="Bu doktoru silmek istediğinize emin misiniz?"
                          className="h-10 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
                        >
                          Sil
                        </ConfirmSubmitButton>
                      </form>
                    </div>
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
