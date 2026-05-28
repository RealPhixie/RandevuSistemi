import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton'
import {
  createSecretary,
  deleteSecretary,
  setSecretaryActive,
} from '@/lib/admin-management'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

export const dynamic = 'force-dynamic'

interface AdminSecretariesPageProps {
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

async function createSecretaryAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await createSecretary(Object.fromEntries(formData))
  } catch {
    redirect('/admin/secretaries?error=create')
  }

  revalidatePath('/admin/secretaries')
  redirect('/admin/secretaries')
}

async function updateSecretaryStatusAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await setSecretaryActive(Object.fromEntries(formData))
  } catch {
    redirect('/admin/secretaries?error=status')
  }

  revalidatePath('/admin/secretaries')
  redirect('/admin/secretaries')
}

async function deleteSecretaryAction(formData: FormData) {
  'use server'

  await requireAdmin()

  try {
    await deleteSecretary(Object.fromEntries(formData))
  } catch {
    redirect('/admin/secretaries?error=delete')
  }

  revalidatePath('/admin/secretaries')
  redirect('/admin/secretaries')
}

export default async function AdminSecretariesPage({
  searchParams,
}: AdminSecretariesPageProps) {
  await requireAdmin()

  const query = await searchParams
  const hasError = typeof query.error === 'string'
  const secretaries = await prisma.panelUser.findMany({
    where: { role: 'SECRETARY' },
    orderBy: { username: 'asc' },
    select: {
      id: true,
      username: true,
      isActive: true,
    },
  })

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
          Sekreterler
        </h1>
      </section>

      <form
        action={createSecretaryAction}
        className="grid gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_auto] lg:items-end"
      >
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
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#d7e0ef] text-xs font-bold uppercase text-[#70809a]">
                <th className="px-5 py-4">Kullanıcı Adı</th>
                <th className="px-5 py-4">Durum</th>
                <th className="px-5 py-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {secretaries.map((secretary) => (
                <tr
                  key={secretary.id}
                  className="border-b border-[#edf2f8] last:border-b-0"
                >
                  <td className="px-5 py-4 text-sm font-bold text-[#102040]">
                    {secretary.username}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        secretary.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {secretary.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      <form action={updateSecretaryStatusAction}>
                        <input type="hidden" name="id" value={secretary.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={String(!secretary.isActive)}
                        />
                        <button
                          type="submit"
                          className="h-10 rounded-xl border border-[#cbd8ea] px-4 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
                        >
                          {secretary.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                      </form>

                      <form action={deleteSecretaryAction}>
                        <input type="hidden" name="id" value={secretary.id} />
                        <ConfirmSubmitButton
                          message="Bu sekreteri silmek istediğinize emin misiniz?"
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
