import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eaf1fb] px-5 py-8">
      <section className="w-full max-w-xl rounded-3xl border border-[#cbd8ea] bg-white p-7 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          Sayfa Bulunamadı
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#0d1b3d]">
          Aradığınız sayfa yok
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#52617a]">
          Bağlantı eski olabilir veya seçilen randevu artık uygun olmayabilir.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Ana Ekrana Dön
        </Link>
      </section>
    </main>
  )
}
