'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function ClientFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [clientType, setClientType] = useState(searchParams.get('client_type') || 'all')
  const [isActive, setIsActive] = useState(searchParams.get('is_active') !== 'false')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === 'all' || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    router.push(`/clients?${params.toString()}`)
  }

  return (
    <div className="bg-white shadow sm:rounded-md p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 取引先分類フィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">取引先分類</label>
          <div className="space-y-2">
            {[
              { value: 'all', label: 'すべて' },
              { value: 'customer', label: '顧客' },
              { value: 'supplier', label: '仕入先' },
              { value: 'partner', label: '協力会社' },
            ].map((option) => (
              <label key={option.value} className="inline-flex items-center mr-4">
                <input
                  type="radio"
                  value={option.value}
                  checked={clientType === option.value}
                  onChange={(e) => {
                    setClientType(e.target.value)
                    updateFilters({ client_type: e.target.value })
                  }}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 有効/無効フィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                setIsActive(e.target.checked)
                updateFilters({ is_active: e.target.checked ? 'true' : 'false' })
              }}
              className="form-checkbox h-4 w-4 text-blue-600 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">有効のみ表示</span>
          </label>
        </div>

        {/* 検索ボックス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="取引先名、コード、住所"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateFilters({ search })
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              onClick={() => updateFilters({ search })}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              検索
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
