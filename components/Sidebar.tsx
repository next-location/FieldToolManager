'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useDemo } from '@/hooks/useDemo'
import { useNewSettingsMenu } from '@/lib/feature-flags'

interface SidebarProps {
  userRole: 'staff' | 'leader' | 'manager' | 'admin' | 'super_admin'
  isOpen: boolean
  onClose: () => void
  heavyEquipmentEnabled?: boolean
  isImpersonating?: boolean
}

export function Sidebar({ userRole, isOpen, onClose, heavyEquipmentEnabled = false, isImpersonating = false }: SidebarProps) {
  const pathname = usePathname()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [submittedEstimatesCount, setSubmittedEstimatesCount] = useState(0)
  const [submittedInvoicesCount, setSubmittedInvoicesCount] = useState(0)
  const [submittedPurchaseOrdersCount, setSubmittedPurchaseOrdersCount] = useState(0)
  const features = useFeatures()
  const { isDemo } = useDemo()
  const [useNewMenu, setUseNewMenu] = useState(false)

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin' || userRole === 'super_admin'
  const isLeaderOrAbove = userRole === 'leader' || userRole === 'manager' || userRole === 'admin' || userRole === 'super_admin'

  // パッケージに応じた表示制御
  const hasAssetPackage = features.contract.packages.asset_management
  const hasDxPackage = features.contract.packages.dx_efficiency
  const hasFullPackage = features.package_type === 'full' // フル機能統合パック

  // DX機能が使えるか（DXパック または フルパック）
  const canUseDxFeatures = hasDxPackage || hasFullPackage

  // フィーチャーフラグの初期化
  useEffect(() => {
    setUseNewMenu(useNewSettingsMenu())
  }, [])

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  // アコーディオンを排他的に開く関数
  const toggleMenu = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName)
  }

  // 未読の提出済み見積もり、請求書、発注書の数を取得（管理者とマネージャーのみ）
  useEffect(() => {
    if (isManagerOrAdmin) {
      const fetchUnreadCounts = async () => {
        try {
          // 見積もりの承認待ち件数
          const estimatesResponse = await fetch('/api/estimates/unread-count')
          if (estimatesResponse.ok) {
            const result = await estimatesResponse.json()
            setSubmittedEstimatesCount(result.unreadCount || 0)
          }

          // 請求書の承認待ち件数
          const invoicesResponse = await fetch('/api/invoices/pending-count')
          if (invoicesResponse.ok) {
            const result = await invoicesResponse.json()
            setSubmittedInvoicesCount(result.count || 0)
          }

          // 発注書の承認待ち件数
          const purchaseOrdersResponse = await fetch('/api/purchase-orders/pending-count')
          if (purchaseOrdersResponse.ok) {
            const result = await purchaseOrdersResponse.json()
            setSubmittedPurchaseOrdersCount(result.count || 0)
          }
        } catch (error) {
          console.error('Failed to fetch unread counts:', error)
        }
      }
      fetchUnreadCounts()
      // 30秒ごとに更新
      const interval = setInterval(fetchUnreadCounts, 30000)
      return () => clearInterval(interval)
    }
  }, [isManagerOrAdmin])

  return (
    <div>
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
          fixed ${isImpersonating ? 'top-[68px] h-[calc(100vh-68px)]' : 'top-[58px] h-[calc(100vh-58px)]'} left-0 w-64 bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out overflow-y-auto
          pb-16 lg:pb-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <nav className="p-4 space-y-2">
          {/* ダッシュボード */}
          <Link
            href="/dashboard"
            onClick={onClose}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              pathname === '/dashboard'
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

          {/* QRスキャン（現場資産パック または フル機能統合パックが必要） */}
          {hasAssetPackage && (
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
          )}

          {/* 道具管理（現場資産パックが必要） */}
          {hasAssetPackage && (
            <div>
              <button
                onClick={() => toggleMenu('tools')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  (pathname === '/tools' || (pathname?.startsWith('/tools/') && !pathname?.startsWith('/tools/movements'))) ||
                  (pathname === '/consumables' || (pathname?.startsWith('/consumables/') && !pathname?.startsWith('/consumables/bulk-movement'))) ||
                  (pathname === '/tool-sets' || pathname?.startsWith('/tool-sets/'))
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
                  className={`w-4 h-4 transition-transform ${expandedMenu === 'tools' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'tools' && (
                <div className="ml-6 mt-2 space-y-1.5">
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
                      pathname === '/consumables' || (pathname?.startsWith('/consumables/') && !pathname?.startsWith('/consumables/orders') && !pathname?.startsWith('/consumables/bulk-movement'))
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    消耗品一覧
                  </Link>
                  {/* 消耗品発注管理 - フル機能統合パック限定 */}
                  {hasFullPackage && (
                    <Link
                      href="/consumables/orders"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/consumables/orders')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      消耗品発注管理
                    </Link>
                  )}
                  {!isDemo && (
                    <Link
                      href="/tool-sets"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        pathname === '/tool-sets' || pathname?.startsWith('/tool-sets/')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      道具セット登録
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 重機管理（現場資産パックが必要 かつ 運用設定で有効化） */}
          {hasAssetPackage && heavyEquipmentEnabled && (
            <div>
              <button
                onClick={() => toggleMenu('equipment')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  pathname === '/equipment' || (pathname?.startsWith('/equipment/') && !pathname?.startsWith('/equipment/cost-report') && !pathname?.startsWith('/equipment/analytics') && !pathname?.startsWith('/equipment/movement'))
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
                  className={`w-4 h-4 transition-transform ${expandedMenu === 'equipment' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'equipment' && (
                <div className="ml-6 mt-2 space-y-1.5">
                  <Link
                    href="/equipment"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/equipment' || (pathname?.startsWith('/equipment/') && !pathname?.startsWith('/equipment/cost-report') && !pathname?.startsWith('/equipment/analytics') && !pathname?.startsWith('/equipment/movement') && !pathname?.startsWith('/equipment/maintenance-records'))
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    重機一覧
                  </Link>
                  <Link
                    href="/equipment/maintenance-records"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/equipment/maintenance-records' || pathname?.startsWith('/equipment/maintenance-records/')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    点検記録一覧
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 移動管理（現場資産パックが必要、デモでは非表示） */}
          {hasAssetPackage && !isDemo && (
            <div>
              <button
                onClick={() => toggleMenu('movement')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/movements') || isActive('/equipment/movement') || isActive('/consumables/bulk-movement')
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
                  className={`w-4 h-4 transition-transform ${expandedMenu === 'movement' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'movement' && (
                <div className="ml-6 mt-2 space-y-1.5">
                  <Link
                    href="/movements/bulk"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/movements/bulk')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    道具移動
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
                    消耗品移動
                  </Link>
                  {heavyEquipmentEnabled && (
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
                  )}
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
          )}

          {/* 作業報告書（現場DX業務効率化パックが必要） */}
          {hasDxPackage && (
            <div>
              <button
                onClick={() => toggleMenu('work-reports')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  (pathname === '/work-reports' || pathname === '/work-reports/new' || (pathname?.startsWith('/work-reports/') && !pathname.startsWith('/work-reports/settings')))
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>作業報告書</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    expandedMenu === 'work-reports' ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'work-reports' && (
                <div className="ml-6 mt-2 space-y-1.5">
                  <Link
                    href="/work-reports"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg transition-colors text-sm ${
                      pathname === '/work-reports'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    報告書一覧
                  </Link>
                  <Link
                    href="/work-reports/new"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg transition-colors text-sm ${
                      pathname === '/work-reports/new'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    新規作成
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 勤怠管理（現場DX業務効率化パックが必要） */}
          {hasDxPackage && (
            <div>
              <button
                onClick={() => toggleMenu('attendance')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  (pathname === '/attendance/clock' ||
                   pathname === '/attendance/my-records' ||
                   pathname === '/attendance/records' ||
                   pathname === '/attendance/leave' ||
                   pathname === '/attendance/qr/leader' ||
                   pathname === '/attendance/alerts')
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>勤怠管理</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedMenu === 'attendance' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'attendance' && (
                <div className="ml-6 mt-2 space-y-1.5">
                  {/* 出退勤（全員） */}
                  <Link
                    href="/attendance/clock"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/attendance/clock')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    出退勤
                  </Link>

                  {/* 勤務記録（全員） */}
                  <Link
                    href="/attendance/my-records"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/attendance/my-records')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    勤務記録
                  </Link>

                  {/* リーダー以上のみ表示 */}
                  {isLeaderOrAbove && (
                    <div className="space-y-1.5">
                      <Link
                        href="/attendance/records"
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive('/attendance/records')
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          <span>勤務記録一覧</span>
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        </span>
                      </Link>
                      {isManagerOrAdmin && (
                        <Link
                          href="/attendance/leave"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive('/attendance/leave')
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>休暇管理</span>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </span>
                        </Link>
                      )}
                      <Link
                        href="/attendance/qr/leader"
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive('/attendance/qr/leader')
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        出退勤QR発行
                      </Link>
                      <Link
                        href="/attendance/alerts"
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive('/attendance/alerts')
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          <span>アラート通知</span>
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* マスタ管理（リーダー・管理者） */}
          {isLeaderOrAbove && (
            <div>
              <button
                onClick={() => toggleMenu('master')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/sites') || (pathname === '/clients' || (pathname?.startsWith('/clients/') && !pathname?.startsWith('/clients/stats'))) || isActive('/warehouse-locations') || isActive('/master/tools-consumables') || isActive('/master/equipment-categories')
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
                  className={`w-4 h-4 transition-transform ${expandedMenu === 'master' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'master' && (
                <div className="ml-6 mt-2 space-y-1.5">
                  {isAdmin && (
                    <Link
                      href="/clients"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        pathname === '/clients' || (pathname?.startsWith('/clients/') && !pathname?.startsWith('/clients/stats'))
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>取引先マスタ</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      </span>
                    </Link>
                  )}
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
                  {isAdmin && hasAssetPackage && heavyEquipmentEnabled && (
                    <Link
                      href="/master/equipment-categories"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/master/equipment-categories')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>重機カテゴリ管理</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      </span>
                    </Link>
                  )}
                  {/* マスタ管理（道具・消耗品）- Manager/Admin only + 現場資産パック必須 */}
                  {isManagerOrAdmin && hasAssetPackage && (
                    <Link
                      href="/master/tools-consumables"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/master/tools-consumables')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>道具マスタ</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      </span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 帳票管理（リーダー以上 & 現場DX業務効率化パック または フル機能統合パックが必要） */}
          {isLeaderOrAbove && canUseDxFeatures && (
            <div>
              <button
                onClick={() => toggleMenu('billing')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/billing') || isActive('/projects') || isActive('/estimates') || isActive('/invoices') || isActive('/purchase-orders') || isActive('/payments')
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>帳票管理</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedMenu === 'billing' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'billing' && (
                <div className="ml-6 mt-2 space-y-1.5">
                  <Link
                    href="/projects"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/projects')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    工事管理
                  </Link>
                  <Link
                    href="/estimates"
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/estimates')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>見積書一覧</span>
                    {submittedEstimatesCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {submittedEstimatesCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/invoices"
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/invoices')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>請求書一覧</span>
                    {submittedInvoicesCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {submittedInvoicesCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/purchase-orders"
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive('/purchase-orders')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>発注書一覧</span>
                    {submittedPurchaseOrdersCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {submittedPurchaseOrdersCount}
                      </span>
                    )}
                  </Link>
                  {/* 入出金管理（マネージャー・管理者のみ） */}
                  {isManagerOrAdmin && (
                    <Link
                      href="/payments"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/payments')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      入出金管理
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* レポート・分析（マネージャー・管理者 & パッケージに応じて表示） */}
          {isManagerOrAdmin && (hasAssetPackage || hasDxPackage) && (
            <div>
              <button
                onClick={() => toggleMenu('analytics')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/analytics')
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>レポート・分析</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedMenu === 'analytics' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedMenu === 'analytics' && (
                <div className="ml-6 mt-2 space-y-1.5">
                  {/* 経営ダッシュボード */}
                  {isManagerOrAdmin && (hasDxPackage || isAdmin) && (
                    <Link
                      href="/analytics/business"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/analytics/business')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>📈 経営ダッシュボード</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      </span>
                    </Link>
                  )}

                  {/* 資産管理分析 */}
                  {hasAssetPackage && (
                    <Link
                      href="/analytics/assets"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/analytics/assets')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>🔧 資産管理分析</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      </span>
                    </Link>
                  )}

                  {/* 重機管理分析 */}
                  {hasAssetPackage && heavyEquipmentEnabled && (
                    <Link
                      href="/analytics/equipment-management"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive('/analytics/equipment-management')
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>🚜 重機管理分析</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      </span>
                    </Link>
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
              onClick={() => toggleMenu('settings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                pathname === '/settings' ||
                pathname === '/settings/organization-management' ||
                pathname === '/organization' ||
                pathname === '/staff' ||
                pathname === '/settings/organization' ||
                pathname === '/settings/locations' ||
                pathname === '/settings/feature-settings' ||
                pathname === '/attendance/settings' ||
                pathname === '/work-reports/settings' ||
                pathname === '/attendance/terminals' ||
                pathname === '/settings/data-management' ||
                pathname === '/settings/data-export' ||
                pathname === '/admin/audit-logs'
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
                className={`w-4 h-4 transition-transform ${expandedMenu === 'settings' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedMenu === 'settings' && (
              <div className="ml-6 mt-2 space-y-1.5">
                {useNewMenu ? (
                  /* 新メニュー構造 */
                  <>
                    {isAdmin && (
                      <>
                        <Link
                          href="/settings/organization-management"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === '/settings/organization-management' ||
                            pathname === '/organization' ||
                            pathname === '/staff' ||
                            pathname === '/settings/organization'
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          組織管理
                        </Link>
                        {hasDxPackage && (
                          <Link
                            href="/settings/feature-settings"
                            onClick={onClose}
                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                              pathname === '/settings/feature-settings' ||
                              pathname === '/attendance/settings' ||
                              pathname === '/work-reports/settings'
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            機能設定
                          </Link>
                        )}
                        <Link
                          href="/settings/data-management"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === '/settings/data-management' ||
                            pathname === '/settings/data-export' ||
                            pathname === '/admin/audit-logs'
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          データ管理
                        </Link>
                      </>
                    )}
                    <Link
                      href="/settings"
                      onClick={onClose}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        pathname === '/settings'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      マイアカウント
                    </Link>
                  </>
                ) : (
                  /* 旧メニュー構造（既存のまま） */
                  <>
                    {isAdmin && (
                      <>
                        <Link
                          href="/organization"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive('/organization')
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>組織情報設定</span>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </span>
                        </Link>
                        <Link
                          href="/settings/locations"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive('/settings/locations')
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>自社拠点管理</span>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </span>
                        </Link>
                      </>
                    )}
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
                      <div className="space-y-1.5">
                        <Link
                          href="/staff"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive('/staff')
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>スタッフ管理</span>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </span>
                        </Link>
                        <Link
                          href="/settings/organization"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive('/settings/organization')
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>運用設定</span>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </span>
                        </Link>
                        <Link
                          href="/settings/data-export"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive('/settings/data-export')
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>データエクスポート</span>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </span>
                        </Link>
                        {hasDxPackage && (
                          <>
                            <Link
                              href="/attendance/settings"
                              onClick={onClose}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive('/attendance/settings')
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                <span>勤怠管理設定</span>
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              </span>
                            </Link>
                            <Link
                              href="/work-reports/settings"
                              onClick={onClose}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive('/work-reports/settings')
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                <span>作業報告書設定</span>
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              </span>
                            </Link>
                            <Link
                              href="/attendance/terminals"
                              onClick={onClose}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive('/attendance/terminals')
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                <span>タブレット端末管理</span>
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              </span>
                            </Link>
                          </>
                        )}
                        <Link
                          href="/admin/audit-logs"
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive('/admin/audit-logs')
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>監査ログ</span>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </span>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </aside>
    </div>
  )
}
