'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'

interface MobileBottomNavProps {
  onMenuClick: () => void
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const pathname = usePathname()
  const features = useFeatures()

  const isActive = (path: string) => pathname === path

  // パッケージに応じた表示制御
  const hasAssetPackage = features.contract.packages.asset_management
  const hasDxPackage = features.contract.packages.dx_efficiency
  const hasFullPackage = features.package_type === 'full'

  // 資産パック: ホーム、道具、QR、消耗品、メニュー
  if (hasAssetPackage && !hasDxPackage && !hasFullPackage) {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* ホーム */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/dashboard') ? 2.5 : 2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs mt-1">ホーム</span>
          </Link>

          {/* 道具 */}
          <Link
            href="/tools"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/tools') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/tools') ? 2.5 : 2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <span className="text-xs mt-1">道具</span>
          </Link>

          {/* QRスキャン（クイックアクション） */}
          <Link
            href="/scan"
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg -mt-8">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-600">QR</span>
          </Link>

          {/* 消耗品 */}
          <Link
            href="/consumables"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/consumables') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/consumables') ? 2.5 : 2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span className="text-xs mt-1">消耗品</span>
          </Link>

          {/* メニュー */}
          <button
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs mt-1">メニュー</span>
          </button>
        </div>
      </nav>
    )
  }

  // DXパック: ホーム、作報、出退勤、一覧、メニュー
  if (hasDxPackage && !hasAssetPackage && !hasFullPackage) {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* ホーム */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/dashboard') ? 2.5 : 2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs mt-1">ホーム</span>
          </Link>

          {/* 作報（作業報告書作成） */}
          <Link
            href="/work-reports/new"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/work-reports/new') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/work-reports/new') ? 2.5 : 2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-xs mt-1">作報</span>
          </Link>

          {/* 出退勤（クイックアクション） */}
          <Link
            href="/attendance/clock"
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg -mt-8">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-600">出退勤</span>
          </Link>

          {/* 一覧（作業報告書一覧） */}
          <Link
            href="/work-reports"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              pathname === '/work-reports' ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={pathname === '/work-reports' ? 2.5 : 2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span className="text-xs mt-1">一覧</span>
          </Link>

          {/* メニュー */}
          <button
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs mt-1">メニュー</span>
          </button>
        </div>
      </nav>
    )
  }

  // フルパック: ホーム、出退勤、QR、作報、メニュー
  if (hasFullPackage) {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* ホーム */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/dashboard') ? 2.5 : 2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs mt-1">ホーム</span>
          </Link>

          {/* 出退勤 */}
          <Link
            href="/attendance/clock"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/attendance/clock') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/attendance/clock') ? 2.5 : 2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs mt-1">出退勤</span>
          </Link>

          {/* QRスキャン（クイックアクション） */}
          <Link
            href="/scan"
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg -mt-8">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-600">QR</span>
          </Link>

          {/* 作報（作業報告書作成） */}
          <Link
            href="/work-reports/new"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/work-reports/new') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive('/work-reports/new') ? 2.5 : 2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-xs mt-1">作報</span>
          </Link>

          {/* メニュー */}
          <button
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs mt-1">メニュー</span>
          </button>
        </div>
      </nav>
    )
  }

  // デフォルト（パッケージなし・トライアル）: ホーム、QR、メニューのみ
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {/* ホーム */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={isActive('/dashboard') ? 2.5 : 2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className="text-xs mt-1">ホーム</span>
        </Link>

        {/* QRスキャン（クイックアクション） */}
        <Link
          href="/scan"
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg -mt-8">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <span className="text-xs mt-1 text-gray-600">QR</span>
        </Link>

        {/* メニュー */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs mt-1">メニュー</span>
        </button>
      </div>
    </nav>
  )
}
