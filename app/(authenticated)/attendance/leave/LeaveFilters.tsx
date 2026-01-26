'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SlidersHorizontal } from 'lucide-react'
import LeaveFiltersModal from './LeaveFiltersModal'

export interface LeaveFilterState {
  staffName: string
  startDate: string
  endDate: string
  leaveType: string
}

interface LeaveFiltersProps {
  onFilterChange: (filters: LeaveFilterState) => void
  isAdminOrManager: boolean
}

interface User {
  id: string
  name: string
}

export default function LeaveFilters({ onFilterChange, isAdminOrManager }: LeaveFiltersProps) {
  const [filters, setFilters] = useState<LeaveFilterState>({
    staffName: '',
    startDate: '',
    endDate: '',
    leaveType: '',
  })

  const [users, setUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    // スタッフ一覧を取得（管理者のみ）
    if (isAdminOrManager) {
      const fetchUsers = async () => {
        const response = await fetch('/api/staff')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.data || [])
        }
      }

      fetchUsers()
    }
  }, [isAdminOrManager])

  const handleFilterChange = (key: keyof LeaveFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      staffName: '',
      startDate: '',
      endDate: '',
      leaveType: '',
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  const hasActiveFilters =
    filters.staffName ||
    filters.startDate ||
    filters.endDate ||
    filters.leaveType

  // フィルター数をカウント（スタッフ名検索以外）
  const filterCount = [filters.startDate, filters.endDate, filters.leaveType].filter(Boolean).length

  const handleApply = () => {
    onFilterChange(filters)
  }

  const leaveTypes = [
    { value: 'paid', label: '有給休暇' },
    { value: 'sick', label: '病気休暇' },
    { value: 'personal', label: '私用休暇' },
    { value: 'other', label: 'その他' },
  ]

  return (
    <>
      {/* モバイル表示: 検索ボックスとフィルターボタンを1行に */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <div className="flex-1">
              <input
                type="text"
                value={filters.staffName}
                onChange={(e) => handleFilterChange('staffName', e.target.value)}
                placeholder="スタッフ名で検索..."
                list="staff-list-mobile"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <datalist id="staff-list-mobile">
                {users.map((user) => (
                  <option key={user.id} value={user.name} />
                ))}
              </datalist>
            </div>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="relative p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
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

      {/* PC表示: 従来通りのフィルター */}
      <div className="hidden sm:block bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">検索・フィルター</h2>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              クリア
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* スタッフ名検索（管理者のみ） */}
          {isAdminOrManager && (
            <div>
              <label
                htmlFor="staffName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                スタッフ名
              </label>
              <input
                type="text"
                id="staffName"
                value={filters.staffName}
                onChange={(e) => handleFilterChange('staffName', e.target.value)}
                placeholder="スタッフ名で検索..."
                list="staff-list"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <datalist id="staff-list">
                {users.map((user) => (
                  <option key={user.id} value={user.name} />
                ))}
              </datalist>
            </div>
          )}

          {/* 期間開始日 */}
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              期間（開始）
            </label>
            <input
              type="date"
              id="startDate"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* 期間終了日 */}
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              期間（終了）
            </label>
            <input
              type="date"
              id="endDate"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* 休暇種別フィルター */}
          <div>
            <label
              htmlFor="leaveType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              種別
            </label>
            <select
              id="leaveType"
              value={filters.leaveType}
              onChange={(e) => handleFilterChange('leaveType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">すべて</option>
              {leaveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* アクティブなフィルターの表示 */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">適用中:</span>
            {filters.staffName && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                スタッフ: {filters.staffName}
                <button
                  onClick={() => handleFilterChange('staffName', '')}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                >
                  ×
                </button>
              </span>
            )}
            {filters.startDate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                開始: {filters.startDate}
                <button
                  onClick={() => handleFilterChange('startDate', '')}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                >
                  ×
                </button>
              </span>
            )}
            {filters.endDate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                終了: {filters.endDate}
                <button
                  onClick={() => handleFilterChange('endDate', '')}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                >
                  ×
                </button>
              </span>
            )}
            {filters.leaveType && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {leaveTypes.find(t => t.value === filters.leaveType)?.label}
                <button
                  onClick={() => handleFilterChange('leaveType', '')}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* モバイル用フィルターモーダル */}
      <LeaveFiltersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        filters={filters}
        users={users}
        isAdminOrManager={isAdminOrManager}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
        onReset={handleReset}
      />
    </>
  )
}
