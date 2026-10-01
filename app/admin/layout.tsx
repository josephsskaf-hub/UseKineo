import type { ReactNode } from 'react'
import AdminShell from '@/components/admin/AdminShell'
import './admin-porcelain.css'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
