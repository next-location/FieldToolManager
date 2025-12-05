'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Site {
  id: string
  name: string
}

interface WorkReportFilterProps {
  sites: Site[]
}

export function WorkReportFilter({ sites }: WorkReportFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [siteId, setSiteId] = useState(searchParams.get('site_id') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '')
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')

  const applyFilter = () => {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (siteId) params.set('site_id', siteId)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (keyword) params.set('keyword', keyword)

    router.push(`/work-reports?${params.toString()}`)
  }

  const clearFilter = () => {
    setStatus('all')
    setSiteId('')
    setDateFrom('')
    setDateTo('')
    setKeyword('')
    router.push('/work-reports')
  }

  return (
    <div className="bg-white shadow sm:rounded-lg p-4 mb-4">
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

        {/* ボタン群 */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={applyFilter}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            検索
          </button>
          <button
            type="button"
            onClick={clearFilter}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
          >
            クリア
          </button>
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
              onClick={() => {
                setStatus(s)
                const params = new URLSearchParams(searchParams)
                if (s !== 'all') {
                  params.set('status', s)
                } else {
                  params.delete('status')
                }
                router.push(`/work-reports?${params.toString()}`)
              }}
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
