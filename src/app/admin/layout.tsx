import { Sidebar } from '@/components/admin/Sidebar'
import { auth } from '@/lib/auth'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth()

  if (!session?.user) {
    return children
  }

  const adminName = session.user.name ?? session.user.username

  return (
    <div className="min-h-screen bg-[#eaf1fb] lg:flex">
      <Sidebar adminName={adminName} username={session.user.username} />
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
        {children}
      </main>
    </div>
  )
}
