import { auth } from '@/lib/auth'

export default async function AdminPage() {
  const session = await auth()
  const adminName = session?.user?.name ?? session?.user?.username ?? 'Admin'

  return (
    <section className="rounded-3xl border border-[#cbd8ea] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-red-600">
        Yönetim Paneli
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#0d1b3d]">
        Hoş geldiniz, {adminName}
      </h1>
    </section>
  )
}
