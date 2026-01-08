'use client'

import { usePathname } from 'next/navigation'
import { useDemo } from '@/hooks/useDemo'
import { DemoRestrictionMessage } from './DemoRestrictionMessage'

export function DemoPageGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isPageRestricted } = useDemo()

  if (isPageRestricted(pathname)) {
    return <DemoRestrictionMessage />
  }

  return <>{children}</>
}
