'use client'

import { useDemo } from '@/hooks/useDemo'
import { ReactNode } from 'react'

interface DemoRestrictionProps {
  feature: string
  children: ReactNode
}

export default function DemoRestriction({ feature, children }: DemoRestrictionProps) {
  const { isDemo, isFeatureDisabled } = useDemo()

  if (isDemo && isFeatureDisabled(feature)) {
    return (
      <div className="relative">
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
            製品版でご利用可能
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
