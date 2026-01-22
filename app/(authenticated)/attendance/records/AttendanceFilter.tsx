'use client'

import { useState, useEffect } from 'react'
import { SlidersHorizontal, Search } from 'lucide-react'
import RecordsFiltersModal from '@/components/attendance/RecordsFiltersModal'

interface Staff {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
}

interface AttendanceFilterProps {
  staffList: Staff[]
  sitesList: Site[]
  onFiltersChange: (filters: any) => void
  showStaffFilter?: boolean
}

export function AttendanceFilter({
  staffList,
  sitesList,
  onFiltersChange,
  showStaffFilter = true,
}: AttendanceFilterProps) {
  const [filters, setFilters] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    location_type: '',
    site_id: '',
  })
  const [keyword, setKeyword] = useState('')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters])

  const handleResetFilters = () => {
    const resetFilters = {
      user_id: '',
      start_date: '',
      end_date: '',
      location_type: '',
      site_id: '',
    }
    setFilters(resetFilters)
    setKeyword('')
  }

  const hasActiveFilters = filters.user_id || filters.start_date || filters.end_date || filters.location_type || filters.site_id

  // フィルター適用数をカウント
  const filterCount = [
    filters.user_id !== '',
    filters.start_date !== '',
    filters.end_date !== '',
    filters.location_type !== '',
    filters.site_id !== '',
  ].filter(Boolean).length

  return (
    <>
      {/* モバイル表示 */}
      <div className="sm:hidden mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="スタッフ名で検索"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="relative p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="フィルター"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PC表示 */}
      <div className="hidden sm:block bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">検索・フィルター</h2>
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            クリア
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* スタッフ */}
        <div>
          <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
            スタッフ
          </label>
          <select
            id="user_id"
            value={filters.user_id}
            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全員</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>

        {/* 開始日 */}
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            開始日
          </label>
          <input
            id="start_date"
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 終了日 */}
        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
            終了日
          </label>
          <input
            id="end_date"
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 出勤場所 */}
        <div>
          <label htmlFor="location_type" className="block text-sm font-medium text-gray-700 mb-1">
            出勤場所
          </label>
          <select
            id="location_type"
            value={filters.location_type}
            onChange={(e) => setFilters({ ...filters, location_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">すべて</option>
            <option value="office">会社</option>
            <option value="site">現場</option>
            <option value="remote">リモート</option>
          </select>
        </div>

        {/* 現場 */}
        <div>
          <label htmlFor="site_id" className="block text-sm font-medium text-gray-700 mb-1">
            現場
          </label>
          <select
            id="site_id"
            value={filters.site_id}
            onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">すべて</option>
            {sitesList.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>

      {/* フィルターモーダル */}
      <RecordsFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        userId={filters.user_id}
        setUserId={(value) => setFilters({ ...filters, user_id: value })}
        startDate={filters.start_date}
        setStartDate={(value) => setFilters({ ...filters, start_date: value })}
        endDate={filters.end_date}
        setEndDate={(value) => setFilters({ ...filters, end_date: value })}
        locationType={filters.location_type}
        setLocationType={(value) => setFilters({ ...filters, location_type: value })}
        siteId={filters.site_id}
        setSiteId={(value) => setFilters({ ...filters, site_id: value })}
        staffList={staffList}
        sitesList={sitesList}
        onReset={handleResetFilters}
      />
    </>
  )
}