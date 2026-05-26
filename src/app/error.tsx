'use client'

import Link from 'next/link'

interface ErrorPageProps {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export default function ErrorPage({ unstable_retry }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eaf1fb] px-5 py-8">
      <section className="w-full max-w-xl rounded-3xl border border-[#cbd8ea] bg-white p-7 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Sistem Uyarısı
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#0d1b3d]">
          Sayfa yüklenemedi
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#52617a]">
          İşlem sırasında beklenmeyen bir sorun oluştu. Yeniden deneyebilir veya
          ana ekrana dönebilirsiniz.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#cbd8ea] px-6 text-sm font-bold text-[#30476f] transition hover:bg-[#f5f8fe]"
          >
            Ana Ekran
          </Link>
        </div>
      </section>
    </main>
  )
}
