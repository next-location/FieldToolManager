'use client'

import { useState, useEffect } from 'react'

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
}

export function AttendanceFilter({
  staffList,
  sitesList,
  onFiltersChange,
}: AttendanceFilterProps) {
  const [filters, setFilters] = useState({
    user_id: '',
    start_date: '',
    end_date: '',
    location_type: '',
    site_id: '',
  })

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
  }

  const hasActiveFilters = filters.user_id || filters.start_date || filters.end_date || filters.location_type || filters.site_id

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
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
  )
}