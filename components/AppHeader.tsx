'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { NotificationBell } from './NotificationBell'

interface AppHeaderProps {
  user: {
    email: string | null
    id: string
  }
  userRole: 'staff' | 'leader' | 'manager' | 'admin' | 'super_admin'
  organizationId: string
  organizationName?: string
  currentPage?: string
}

export function AppHeader({
  user,
  userRole,
  organizationId,
  organizationName,
  currentPage,
}: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* 上部バー：組織情報・ユーザー情報 */}
      <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            {/* 左：組織名 */}
            <div className="flex items-center space-x-2">
              <Image
                src="/zairoku-icon.png"
                alt="ザイロク"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="text-sm font-semibold text-gray-900">
                {organizationName || '組織名未設定'}
              </span>
            </div>

            {/* 右：通知・ユーザー情報・ログアウト */}
            <div className="flex items-center space-x-3">
              <NotificationBell organizationId={organizationId} />
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>{user.email}</span>
              </div>
              <form action="/auth/signout" method="post" className="hidden sm:block">
                <button
                  type="submit"
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-white hover:bg-red-500 border border-gray-300 hover:border-red-500 rounded-md transition-all duration-200 shadow-sm hover:shadow"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>ログアウト</span>
                </button>
              </form>

              {/* モバイルメニューボタン */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 下部バー：メインナビゲーション */}
      <nav className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden sm:flex sm:space-x-1 h-12 items-center">
            {/* ダッシュボード */}
            <Link
              href="/"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              ダッシュボード
            </Link>

            {/* 道具管理 */}
            <div className="relative">
              <button
                onMouseEnter={() => setToolsMenuOpen(true)}
                onMouseLeave={() => setToolsMenuOpen(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  currentPage?.startsWith('tools') || currentPage === 'consumables'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>道具管理</span>
                <svg
                  className={`w-4 h-4 transition-transform ${toolsMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {toolsMenuOpen && (
                <div
                  onMouseEnter={() => setToolsMenuOpen(true)}
                  onMouseLeave={() => setToolsMenuOpen(false)}
                  className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                >
                  <Link
                    href="/tools"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <span className="mr-2">🔧</span>個別管理道具
                  </Link>
                  <Link
                    href="/consumables"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <span className="mr-2">🧰</span>消耗品管理
                  </Link>
                  <Link
                    href="/tool-sets"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <span className="mr-2">📋</span>道具セット
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <Link
                    href="/movements"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <span className="mr-2">📦</span>移動履歴
                  </Link>
                  <Link
                    href="/consumable-movements"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <span className="mr-2">📊</span>消耗品移動履歴
                  </Link>
                </div>
              )}
            </div>

            {/* 現場管理 */}
            <Link
              href="/sites"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'sites'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              現場管理
            </Link>

            {/* QRスキャン */}
            <Link
              href="/scan"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 'scan'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              QRスキャン
            </Link>

            {/* 将来の機能（プラン別で表示）*/}
            {/*
            <Link href="/reports" className="...">作業報告書</Link>
            <Link href="/staff" className="...">スタッフ管理</Link>
            <Link href="/attendance" className="...">出退勤管理</Link>
            */}

            {/* 設定・管理 */}
            {isAdmin && (
              <div className="relative ml-auto">
                <button
                  onMouseEnter={() => setSettingsMenuOpen(true)}
                  onMouseLeave={() => setSettingsMenuOpen(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                    currentPage?.startsWith('admin') || currentPage?.startsWith('settings')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>設定</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${settingsMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {settingsMenuOpen && (
                  <div
                    onMouseEnter={() => setSettingsMenuOpen(true)}
                    onMouseLeave={() => setSettingsMenuOpen(false)}
                    className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                  >
                    <Link
                      href="/settings/organization"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <span className="mr-2">⚙️</span>組織設定
                    </Link>
                    <Link
                      href="/warehouse-locations"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <span className="mr-2">📍</span>倉庫位置管理
                    </Link>
                    <Link
                      href="/admin/audit-logs"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <span className="mr-2">📝</span>監査ログ
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* モバイルメニュー */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/"
              className="block px-4 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              ダッシュボード
            </Link>
            <div className="border-t border-gray-100 my-2 pt-2">
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">道具管理</div>
              <Link
                href="/tools"
                className="block pl-8 pr-4 py-2 rounded-md text-base text-gray-700 hover:bg-gray-50"
              >
                🔧 個別管理道具
              </Link>
              <Link
                href="/consumables"
                className="block pl-8 pr-4 py-2 rounded-md text-base text-gray-700 hover:bg-gray-50"
              >
                🧰 消耗品管理
              </Link>
              <Link
                href="/tool-sets"
                className="block pl-8 pr-4 py-2 rounded-md text-base text-gray-700 hover:bg-gray-50"
              >
                📋 道具セット
              </Link>
              <Link
                href="/movements"
                className="block pl-8 pr-4 py-2 rounded-md text-base text-gray-700 hover:bg-gray-50"
              >
                📦 移動履歴
              </Link>
            </div>
            <Link
              href="/sites"
              className="block px-4 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              現場管理
            </Link>
            <Link
              href="/scan"
              className="block px-4 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              QRスキャン
            </Link>
            {isAdmin && (
              <>
                <div className="border-t border-gray-100 my-2 pt-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">設定・管理</div>
                  <Link
                    href="/settings/organization"
                    className="block pl-8 pr-4 py-2 rounded-md text-base text-gray-700 hover:bg-gray-50"
                  >
                    ⚙️ 組織設定
                  </Link>
                  <Link
                    href="/warehouse-locations"
                    className="block pl-8 pr-4 py-2 rounded-md text-base text-gray-700 hover:bg-gray-50"
                  >
                    📍 倉庫位置管理
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className="block pl-8 pr-4 py-2 rounded-md text-base text-gray-700 hover:bg-gray-50"
                  >
                    📝 監査ログ
                  </Link>
                </div>
              </>
            )}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="px-4 py-2 text-sm text-gray-700">{user.email}</div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
