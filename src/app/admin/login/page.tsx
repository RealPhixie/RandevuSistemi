import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

import { auth, signIn } from '@/lib/auth'

interface AdminLoginPageProps {
  searchParams: Promise<{
    error?: string | string[]
  }>
}

async function loginAction(formData: FormData) {
  'use server'

  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!username || !password) {
    redirect('/admin/login?error=CredentialsSignin')
  }

  try {
    await signIn('credentials', {
      username,
      password,
      redirectTo: '/admin',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/admin/login?error=CredentialsSignin')
    }

    throw error
  }
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const session = await auth()

  if (session?.user) {
    redirect('/admin')
  }

  const query = await searchParams
  const hasError = query.error === 'CredentialsSignin'

  return (
    <main className="min-h-screen bg-[#eaf1fb] px-5 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-[#cbd8ea] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-red-600">
            Yönetim
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
            Admin Girişi
          </h1>

          <form action={loginAction} className="mt-7 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
                Kullanıcı Adı
              </span>
              <input
                name="username"
                autoComplete="username"
                className="h-12 w-full rounded-2xl border border-[#cbd8ea] px-4 font-semibold text-[#102040] outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0d1b3d]">
                Şifre
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="h-12 w-full rounded-2xl border border-[#cbd8ea] px-4 font-semibold text-[#102040] outline-none transition focus:border-red-500"
              />
            </label>

            {hasError ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Kullanıcı adı veya şifre hatalı.
              </div>
            ) : null}

            <button
              type="submit"
              className="h-12 rounded-2xl bg-red-600 px-6 text-base font-bold text-white transition hover:bg-red-700"
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
