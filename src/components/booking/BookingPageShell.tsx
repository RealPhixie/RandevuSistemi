import Link from 'next/link'
import type { ReactNode } from 'react'

interface BookingPageShellProps {
  backHref: string
  backLabel: string
  eyebrow: ReactNode
  title: ReactNode
  description: string
  children: ReactNode
}

export function BookingPageShell({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  children,
}: BookingPageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eaf1fb] text-[#111827]">
      <BackgroundBands />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={backHref}
          className="mb-8 inline-flex w-fit rounded-full border border-[#cbd8ea] bg-white px-4 py-2 text-sm font-semibold text-[#30476f] transition hover:border-red-400 hover:text-red-600"
        >
          {backLabel}
        </Link>

        <section className="mx-auto w-full max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-[#1a2130] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium text-[#52617a]">
            {description}
          </p>

          {children}
        </section>
      </div>
    </main>
  )
}

export function BookingEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#cbd8ea] bg-white px-5 py-6 text-sm font-medium text-[#52617a] md:col-span-2">
      {message}
    </div>
  )
}

function BackgroundBands() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-60">
      <div className="absolute left-[8%] top-0 h-full w-36 -skew-x-[30deg] bg-white/30" />
      <div className="absolute left-[43%] top-0 h-full w-44 -skew-x-[30deg] bg-white/25" />
      <div className="absolute right-[8%] top-0 h-full w-56 -skew-x-[30deg] bg-white/20" />
    </div>
  )
}
