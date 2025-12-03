'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  userRole: 'staff' | 'leader' | 'admin' | 'super_admin'
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const [equipmentExpanded, setEquipmentExpanded] = useState(false)
  const [movementExpanded, setMovementExpanded] = useState(false)
  const [masterExpanded, setMasterExpanded] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const isLeaderOrAdmin = userRole === 'leader' || userRole === 'admin' || userRole === 'super_admin'

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  return (
    <>
      {/* オーバーレイ（モバイル・タブレット用） */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* サイドバー */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <nav className="p-4 space-y-1">
          {/* ダッシュボード */}
          <Link
            href="/"
            onClick={onClose}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span>ダッシュボード</span>
          </Link>

          {/* QRスキャン */}
          <Link
            href="/scan"
            onClick={onClose}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive('/scan')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            <span>QRスキャン</span>
          </Link>

          {/* 道具管理 */}
          <div>
            <button
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                isActive('/tools') || isActive('/consumables') || isActive('/tool-sets')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                <span>道具管理</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${toolsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {toolsExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <Link
                  href="/tools"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/tools')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  道具一覧
                </Link>
                <Link
                  href="/consumables"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/consumables')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  消耗品一覧
                </Link>
                <Link
                  href="/tool-sets"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/tool-sets')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  道具セット登録
                </Link>
              </div>
            )}
          </div>

          {/* 重機管理 */}
          <div>
            <button
              onClick={() => setEquipmentExpanded(!equipmentExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                isActive('/equipment')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span>重機管理</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${equipmentExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {equipmentExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <Link
                  href="/equipment"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/equipment')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  重機一覧
                </Link>
                {isLeaderOrAdmin && (
                  <Link
                    href="/equipment/new"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/equipment/new')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    重機登録
                  </Link>
                )}
                {isLeaderOrAdmin && (
                  <Link
                    href="/equipment/cost-report"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/equipment/cost-report')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    コストレポート
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* 移動管理 */}
          <div>
            <button
              onClick={() => setMovementExpanded(!movementExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                isActive('/movements')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                <span>移動管理</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${movementExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {movementExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <Link
                  href="/movements/bulk"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/movements/bulk')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  道具一括移動
                </Link>
                <Link
                  href="/consumables/bulk-movement"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/consumables/bulk-movement')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  消耗品一括移動
                </Link>
                <Link
                  href="/tool-sets/movement"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/tool-sets/movement')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  道具セット移動
                </Link>
                <Link
                  href="/equipment/movement"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive('/equipment/movement')
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  重機移動
                </Link>
                <Link
                  href="/movements"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/movements'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  移動履歴
                </Link>
              </div>
            )}
          </div>

          {/* マスタ管理（リーダー・管理者） */}
          {isLeaderOrAdmin && (
            <div>
              <button
                onClick={() => setMasterExpanded(!masterExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/sites') || isActive('/warehouse-locations') || isActive('/categories')
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span>マスタ管理</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${masterExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {masterExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link
                    href="/sites"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/sites')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    現場マスタ
                  </Link>
                  {isAdmin && (
                    <>
                      <Link
                        href="/warehouse-locations"
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive('/warehouse-locations')
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        倉庫位置管理
                      </Link>
                      <Link
                        href="/categories"
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive('/categories')
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        カテゴリ管理
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* マニュアル */}
          <Link
            href="/manual"
            onClick={onClose}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive('/manual')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span>マニュアル</span>
          </Link>

          {/* 設定・管理 */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                isActive('/settings') || isActive('/admin')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>設定・管理</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${settingsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {settingsExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <Link
                  href="/settings"
                  onClick={onClose}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/settings'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  アカウント設定
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      href="/settings/organization"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/settings/organization')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      運用設定
                    </Link>
                    <Link
                      href="/admin/audit-logs"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/admin/audit-logs')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      監査ログ
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  )
}
