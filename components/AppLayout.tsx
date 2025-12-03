'use client'

import { useState } from 'react'
import { SimpleHeader } from './SimpleHeader'
import { Sidebar } from './Sidebar'
import { MobileBottomNav } from './MobileBottomNav'

interface AppLayoutProps {
  user: {
    email: string | null
    id: string
    name?: string | null
  }
  userRole: 'staff' | 'leader' | 'admin' | 'super_admin'
  organizationId: string
  organizationName?: string
  heavyEquipmentEnabled?: boolean
  children: React.ReactNode
}

export function AppLayout({
  user,
  userRole,
  organizationId,
  organizationName,
  heavyEquipmentEnabled = false,
  children,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <SimpleHeader
        user={user}
        userRole={userRole}
        organizationId={organizationId}
        organizationName={organizationName}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* サイドバー */}
      <Sidebar
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        heavyEquipmentEnabled={heavyEquipmentEnabled}
      />

      {/* メインコンテンツエリア */}
      <div className="pt-16 lg:pl-64 pb-16 lg:pb-0">
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* モバイル下部固定ナビ */}
      <MobileBottomNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
    </div>
  )
}
