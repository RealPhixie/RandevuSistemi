'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { PanelUserRole } from '@prisma/client'

interface SidebarProps {
  name: string
  role: PanelUserRole
  signOutAction: () => Promise<void>
  username: string
}

const NAV_LINKS: Record<PanelUserRole, { href: string; label: string }[]> = {
  ADMIN: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/appointments', label: 'Randevular' },
    { href: '/admin/patients', label: 'Hastalar' },
    { href: '/admin/hospitals', label: 'Hastaneler' },
    { href: '/admin/departments', label: 'Birimler' },
    { href: '/admin/doctors', label: 'Doktorlar' },
    { href: '/admin/secretaries', label: 'Sekreterler' },
    { href: '/admin/slots', label: 'Çalışma Saatleri' },
  ],
  SECRETARY: [{ href: '/admin/appointments', label: 'Randevular' }],
  DOCTOR: [{ href: '/admin/appointments', label: 'Randevularım' }],
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span className="relative h-5 w-5" aria-hidden="true">
      <span
        className={`absolute left-0 top-1 h-0.5 w-5 rounded-full bg-current transition ${
          isOpen ? 'translate-y-2 rotate-45' : ''
        }`}
      />
      <span
        className={`absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition ${
          isOpen ? 'opacity-0' : ''
        }`}
      />
      <span
        className={`absolute bottom-1 left-0 h-0.5 w-5 rounded-full bg-current transition ${
          isOpen ? '-translate-y-2 -rotate-45' : ''
        }`}
      />
    </span>
  )
}

export function Sidebar({
  name,
  role,
  signOutAction,
  username,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function closeMenu() {
    setIsOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#d7e0ef] bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <button
          type="button"
          aria-controls="admin-sidebar"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#cbd8ea] text-[#0d1b3d] transition hover:bg-[#f5f8fe]"
        >
          <MenuIcon isOpen={isOpen} />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-600">
            Yönetim
          </p>
          <p className="truncate text-sm font-bold text-[#0d1b3d]">
            Hastane Randevu
          </p>
        </div>
      </header>

      <button
        type="button"
        aria-label="Menüyü kapat"
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        onClick={closeMenu}
        className={`fixed inset-0 z-40 bg-[#0d1b3d]/45 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-[#d7e0ef] bg-white px-5 py-6 shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:h-screen lg:min-h-0 lg:w-72 lg:shrink-0 lg:translate-x-0 lg:shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                Yönetim
              </p>
              <h1 className="mt-2 text-2xl font-bold text-[#0d1b3d]">
                Hastane Randevu
              </h1>
            </div>
            <button
              type="button"
              aria-label="Menüyü kapat"
              onClick={closeMenu}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cbd8ea] text-[#30476f] transition hover:bg-[#f5f8fe] lg:hidden"
            >
              <MenuIcon isOpen />
            </button>
          </div>
        </div>

        <nav className="mt-8 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
          {NAV_LINKS[role].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#30476f] transition hover:bg-red-50 hover:text-red-700"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-[#d7e0ef] pt-5">
          <p className="text-sm font-bold text-[#0d1b3d]">{name}</p>
          <p className="mt-1 text-xs font-semibold text-[#70809a]">
            {username}
          </p>
          <Link
            href="/admin/password"
            className="mt-4 flex h-11 items-center justify-center rounded-2xl border border-[#cbd8ea] px-4 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
            onClick={closeMenu}
          >
            Şifre Değiştir
          </Link>
          <form action={signOutAction} className="mt-3">
            <button
              type="submit"
              onClick={closeMenu}
              className="h-11 w-full rounded-2xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
            >
              Çıkış Yap
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
