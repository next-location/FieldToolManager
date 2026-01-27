'use client'

import { useState, useEffect } from 'react'
import { AttendanceFilter } from './AttendanceFilter'
import { AttendanceRecordsTable } from './AttendanceRecordsTable'
import { ProxyClockInModal } from './ProxyClockInModal'
import { Plus } from 'lucide-react'

interface Staff {
  id: string
  name: string
  email: string
}

interface Site {
  id: string
  name: string
}

interface AttendanceRecordsWrapperProps {
  staffList: Staff[]
  sitesList: Site[]
  userRole: string
  currentUserId: string
  isAdminOrManager: boolean
  organizationName: string
}

export function AttendanceRecordsWrapper({
  staffList,
  sitesList,
  userRole,
  currentUserId,
  isAdminOrManager,
  organizationName,
}: AttendanceRecordsWrapperProps) {
  // デフォルトは今月
  const getDefaultYearMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [filters, setFilters] = useState({
    user_id: isAdminOrManager ? '' : currentUserId, // leader/userは自分のIDで固定
    year_month: getDefaultYearMonth(),
    location_type: '',
    site_id: '',
  })

  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false)
  const [tableKey, setTableKey] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  // スクロールアニメーション（道具一覧と同じ）
  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // スクロールダウン時に縮小
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolled(true)
      } else if (currentScrollY < lastScrollY) {
        setIsScrolled(false)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleProxySuccess = () => {
    setTableKey((prev) => prev + 1) // テーブルを再読み込み
  }

  return (
    <>
      {/* PC表示: タイトルとボタンを横並び */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">勤怠一覧</h1>
          <p className="mt-2 text-sm text-gray-600">
            {isAdminOrManager
              ? `${organizationName} のスタッフの出退勤記録を確認・編集できます`
              : `${organizationName} のスタッフの出退勤記録を確認できます（閲覧のみ）`}
          </p>
        </div>
        {isAdminOrManager && (
          <div className="hidden sm:flex">
            <button
              onClick={() => setIsProxyModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + 代理打刻
            </button>
          </div>
        )}
      </div>

      <AttendanceFilter
        staffList={staffList}
        sitesList={sitesList}
        onFiltersChange={setFilters}
        showStaffFilter={isAdminOrManager} // admin/managerのみスタッフフィルター表示
      />

      <AttendanceRecordsTable
        key={tableKey}
        userRole={userRole}
        filters={filters}
        showStaffName={true} // スタッフ名を常に表示
        showStaffSort={isAdminOrManager} // admin/managerのみソート表示
      />

      {/* スマホ表示: FABボタン（道具一覧と同じスタイル・アニメーション） */}
      {isAdminOrManager && (
        <button
          onClick={() => setIsProxyModalOpen(true)}
          className={`fixed right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40 sm:hidden ${
            isScrolled ? 'w-10 h-10 bottom-20' : 'w-14 h-14 bottom-24'
          }`}
          style={{ bottom: isScrolled ? '5rem' : '6rem' }}
          aria-label="代理打刻"
        >
          <Plus className={`${isScrolled ? 'h-5 w-5' : 'h-6 w-6'}`} />
        </button>
      )}

      {/* 代理打刻モーダル */}
      <ProxyClockInModal
        staffList={staffList}
        sitesList={sitesList}
        isOpen={isProxyModalOpen}
        onClose={() => setIsProxyModalOpen(false)}
        onSuccess={handleProxySuccess}
      />
    </>
  )
}