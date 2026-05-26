export default function Loading() {
  return (
    <main className="min-h-screen bg-[#eaf1fb] px-5 py-8 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-[#dbe6f5]" />
        <div className="rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-4">
            <div className="h-5 w-40 animate-pulse rounded-lg bg-[#e7eef9]" />
            <div className="h-14 animate-pulse rounded-2xl bg-[#eef3fb]" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-12 animate-pulse rounded-2xl bg-[#eef3fb]" />
              <div className="h-12 animate-pulse rounded-2xl bg-[#eef3fb]" />
              <div className="h-12 animate-pulse rounded-2xl bg-[#eef3fb]" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
