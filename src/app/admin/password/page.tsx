import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

export const dynamic = 'force-dynamic'

interface AdminPasswordPageProps {
  searchParams: Promise<{
    error?: string | string[]
    updated?: string | string[]
  }>
}

const errorMessages: Record<string, string> = {
  current: 'Mevcut şifre hatalı.',
  invalid: 'Yeni şifre en az 8, en fazla 128 karakter olmalıdır.',
  mismatch: 'Yeni şifreler birbiriyle uyuşmuyor.',
  update: 'Şifre güncellenemedi.',
}

function getPassword(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}

async function requirePanelUser() {
  const user = await requireRole(['ADMIN', 'DOCTOR', 'SECRETARY'])

  if (!user) {
    redirect('/admin/login')
  }

  return user
}

async function changePasswordAction(formData: FormData) {
  'use server'

  const user = await requirePanelUser()
  const currentPassword = getPassword(formData.get('currentPassword'))
  const newPassword = getPassword(formData.get('newPassword'))
  const confirmPassword = getPassword(formData.get('confirmPassword'))

  if (newPassword.length < 8 || newPassword.length > 128) {
    redirect('/admin/password?error=invalid')
  }

  if (newPassword !== confirmPassword) {
    redirect('/admin/password?error=mismatch')
  }

  const panelUser = await prisma.panelUser.findUnique({
    where: { id: user.id },
    select: { password: true },
  })

  if (!panelUser) {
    redirect('/admin/login')
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    panelUser.password
  )

  if (!isCurrentPasswordValid) {
    redirect('/admin/password?error=current')
  }

  try {
    await prisma.panelUser.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
      select: { id: true },
    })
  } catch {
    redirect('/admin/password?error=update')
  }

  redirect('/admin/password?updated=1')
}

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : ''
}

export default async function AdminPasswordPage({
  searchParams,
}: AdminPasswordPageProps) {
  await requirePanelUser()

  const query = await searchParams
  const error = errorMessages[getQueryValue(query.error)]
  const isUpdated = query.updated === '1'

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim Paneli
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
          Şifre Değiştir
        </h1>
      </section>

      <form
        action={changePasswordAction}
        className="grid max-w-xl gap-4 rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Mevcut Şifre
          </span>
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Yeni Şifre
          </span>
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
            Yeni Şifre Tekrar
          </span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            className="h-11 w-full rounded-2xl border border-[#cbd8ea] px-4 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
          />
        </label>

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {isUpdated ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Şifre güncellendi.
          </div>
        ) : null}

        <button
          type="submit"
          className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Tamam
        </button>
      </form>
    </div>
  )
}
