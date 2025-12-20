'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

interface Site {
  id: string
  name: string
}

interface User {
  id: string
  name: string
}

interface WorkReportFilterProps {
  sites: Site[]
  users: User[]
}

export function WorkReportFilter({ sites, users }: WorkReportFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [siteId, setSiteId] = useState(searchParams.get('site_id') || '')
  const [createdBy, setCreatedBy] = useState(searchParams.get('created_by') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '')
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')

  // キーワードのみデバウンス（500ms）
  const debouncedKeyword = useDebounce(keyword, 500)

  // フィルター自動適用
  useEffect(() => {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (siteId) params.set('site_id', siteId)
    if (createdBy) params.set('created_by', createdBy)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (debouncedKeyword) params.set('keyword', debouncedKeyword)

    router.push(`/work-reports?${params.toString()}`)
  }, [status, siteId, createdBy, dateFrom, dateTo, debouncedKeyword, router])

  const clearFilter = () => {
    setStatus('all')
    setSiteId('')
    setCreatedBy('')
    setDateFrom('')
    setDateTo('')
    setKeyword('')
  }

  const hasActiveFilters = status !== 'all' || siteId || createdBy || dateFrom || dateTo || keyword

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">検索・フィルター</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilter}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            クリア
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ステータス */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">すべて</option>
            <option value="draft">下書き</option>
            <option value="submitted">提出済</option>
            <option value="approved">承認済</option>
            <option value="rejected">差戻</option>
          </select>
        </div>

        {/* 現場 */}
        <div>
          <label htmlFor="site_id" className="block text-sm font-medium text-gray-700 mb-1">
            現場
          </label>
          <select
            id="site_id"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">すべての現場</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {/* 作成者 */}
        <div>
          <label htmlFor="created_by" className="block text-sm font-medium text-gray-700 mb-1">
            作成者
          </label>
          <select
            id="created_by"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全員</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* キーワード検索 */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
            キーワード
          </label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="作業内容・場所で検索"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 日付範囲（From） */}
        <div>
          <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-1">
            開始日
          </label>
          <input
            type="date"
            id="date_from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 日付範囲（To） */}
        <div>
          <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-1">
            終了日
          </label>
          <input
            type="date"
            id="date_to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* タブ型ステータスフィルター（モバイル向け簡易版） */}
      <div className="mt-4 md:hidden flex gap-2 overflow-x-auto pb-2">
        {['all', 'draft', 'submitted', 'approved', 'rejected'].map((s) => {
          const labels: Record<string, string> = {
            all: 'すべて',
            draft: '下書き',
            submitted: '提出済',
            approved: '承認済',
            rejected: '差戻',
          }
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {labels[s]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
