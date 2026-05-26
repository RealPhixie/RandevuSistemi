import Link from 'next/link'

import { signOut } from '@/lib/auth'

interface SidebarProps {
  adminName: string
  username: string
}

const NAV_LINKS = [
  { href: '/admin', label: 'Panel' },
  { href: '/admin/appointments', label: 'Randevular' },
  { href: '/admin/hospitals', label: 'Hastaneler' },
  { href: '/admin/departments', label: 'Tıbbi Birimler' },
  { href: '/admin/doctors', label: 'Doktorlar' },
  { href: '/admin/slots', label: 'Çalışma Saatleri' },
]

export function Sidebar({ adminName, username }: SidebarProps) {
  async function handleSignOut() {
    'use server'

    await signOut({ redirectTo: '/admin/login' })
  }

  return (
    <aside className="flex min-h-screen w-full flex-col border-r border-[#d7e0ef] bg-white px-5 py-6 shadow-sm lg:w-72">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Yönetim
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#0d1b3d]">
          Hastane Randevu
        </h1>
      </div>

      <nav className="mt-8 grid gap-2">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#30476f] transition hover:bg-red-50 hover:text-red-700"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-[#d7e0ef] pt-5">
        <p className="text-sm font-bold text-[#0d1b3d]">{adminName}</p>
        <p className="mt-1 text-xs font-semibold text-[#70809a]">{username}</p>
        <form action={handleSignOut} className="mt-4">
          <button
            type="submit"
            className="h-11 w-full rounded-2xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
          >
            Çıkış Yap
          </button>
        </form>
      </div>
    </aside>
  )
}
