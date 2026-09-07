'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isFocusedWorkspace } from '@/lib/ui/workspaceFocus'

export default function WorkspaceSecondaryNotice({children}: {children: ReactNode}) {
  const pathname = usePathname()
  return pathname && isFocusedWorkspace(pathname) ? null : <>{children}</>
}
