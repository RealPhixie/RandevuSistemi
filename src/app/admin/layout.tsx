import { Sidebar } from '@/components/admin/Sidebar'
import { requireRole } from '@/lib/require-role'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await requireRole(['ADMIN', 'DOCTOR', 'SECRETARY'])

  if (!user) {
    return children
  }

  const name = user.name ?? user.username

  return (
    <div className="min-h-screen bg-[#eaf1fb] lg:flex">
      <Sidebar
        name={name}
        role={user.role}
        username={user.username}
      />
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
        {children}
      </main>
    </div>
  )
}
