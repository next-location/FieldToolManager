'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, SlidersHorizontal, Search } from 'lucide-react'
import EstimateFiltersModal from './EstimateFiltersModal'

interface Estimate {
  id: string
  estimate_number: string
  estimate_date: string
  valid_until: string | null
  total_amount: number
  status: string
  manager_approved_at: string | null
  manager_approved_by_user?: { name: string }
  client?: { name: string }
  project?: { project_name: string }
  created_by_user?: { id: string; name: string }
}

interface Staff {
  id: string
  name: string
}

interface EstimateListClientProps {
  userRole: string
  staffList: Staff[]
}

export function EstimateListClient({ userRole, staffList }: EstimateListClientProps) {
  const router = useRouter()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('')
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false)
  const [sortField, setSortField] = useState<'estimate_date' | 'valid_until' | 'total_amount'>('estimate_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)

  // サーバーからデータ取得
  const fetchEstimates = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        sort_field: sortField,
        sort_order: sortOrder,
      })

      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (creatorFilter) params.append('creator_id', creatorFilter)

      const response = await fetch(`/api/estimates?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'データ取得に失敗しました')
      }

      setEstimates(result.data || [])
      setTotalCount(result.count || 0)
    } catch (error) {
      console.error('見積書取得エラー:', error)
      alert('見積書データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 初回読み込み & フィルター・ページ変更時に再取得
  useEffect(() => {
    fetchEstimates()
  }, [currentPage, searchQuery, statusFilter, creatorFilter, sortField, sortOrder])

  // フィルター変更時にページをリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, creatorFilter, sortField, sortOrder])

  // ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.creator-dropdown-container')) {
        setShowCreatorDropdown(false)
      }
    }

    if (showCreatorDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCreatorDropdown])

  const handleDelete = async (id: string, estimateNumber: string) => {
    if (!confirm(`見積書「${estimateNumber}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/estimates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      alert('見積書を削除しました')
      // 再取得
      fetchEstimates()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('見積書の削除に失敗しました')
    }
  }

  // 作成者の絞り込み
  const filteredStaffList = useMemo(() => {
    if (!creatorSearchQuery) return staffList

    const query = creatorSearchQuery.toLowerCase()
    return staffList.filter((staff) => {
      return staff.name.toLowerCase().includes(query)
    })
  }, [staffList, creatorSearchQuery])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    )
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || creatorFilter

  const filterCount = (statusFilter !== 'all' ? 1 : 0) + (creatorFilter ? 1 : 0)

  const handleReset = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCreatorFilter('')
    setCreatorSearchQuery('')
  }

  return (
    <>
      {/* モバイル: 検索+フィルターボタン */}
      <div className="sm:hidden mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="見積番号・取引先・工事名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="relative px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center gap-2"
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

      {/* PC: 検索・フィルタエリア */}
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

        <div className={`grid grid-cols-1 ${isManagerOrAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="見積番号・取引先・工事名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              <option value="draft">下書き</option>
              <option value="submitted">提出済み</option>
              <option value="sent">顧客送付済</option>
              <option value="accepted">顧客承認</option>
              <option value="rejected">顧客却下</option>
              <option value="expired">期限切れ</option>
            </select>
          </div>

          {/* 作成者フィルタ（マネージャー・管理者のみ） */}
          {isManagerOrAdmin && (
            <div className="relative creator-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作成者
              </label>
              <input
                type="text"
                placeholder="スタッフ名で検索"
                value={creatorSearchQuery}
                onChange={(e) => setCreatorSearchQuery(e.target.value)}
                onFocus={() => setShowCreatorDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />

              {/* ドロップダウンリスト */}
              {showCreatorDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {/* 全て表示オプション */}
                  <button
                    type="button"
                    onClick={() => {
                      setCreatorFilter('')
                      setCreatorSearchQuery('')
                      setShowCreatorDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                      !creatorFilter ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                    }`}
                  >
                    全て表示
                  </button>

                  {/* スタッフリスト */}
                  {filteredStaffList.length > 0 ? (
                    filteredStaffList.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => {
                          setCreatorFilter(staff.id)
                          setCreatorSearchQuery(staff.name)
                          setShowCreatorDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          creatorFilter === staff.id ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                        }`}
                      >
                        {staff.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-gray-500 text-sm">
                      該当するスタッフが見つかりません
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 件数表示とソート */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          {isLoading ? (
            'データ読み込み中...'
          ) : (
            `全 ${totalCount} 件を表示中（${currentPage}/${totalPages} ページ）`
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">並び替え:</label>
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [typeof sortField, 'asc' | 'desc']
              setSortField(field)
              setSortOrder(order)
            }}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="estimate_date-desc">見積日（新しい順）</option>
            <option value="estimate_date-asc">見積日（古い順）</option>
            <option value="valid_until-desc">有効期限（新しい順）</option>
            <option value="valid_until-asc">有効期限（古い順）</option>
            <option value="total_amount-desc">金額（高い順）</option>
            <option value="total_amount-asc">金額（安い順）</option>
          </select>
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* カード一覧 */}
      {!isLoading && (
        <div className="space-y-4">
          {estimates.map((estimate) => (
          <div key={estimate.id} className="bg-white border border-gray-300 rounded-lg shadow-sm">
            {/* クリック可能なカード本体 */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => router.push(`/estimates/${estimate.id}`)}
            >
              {/* モバイル: 縦並びレイアウト */}
              <div className="sm:hidden space-y-3">
                {/* ステータスと見積番号 */}
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                    estimate.status === 'draft'
                      ? 'bg-gray-200 text-gray-800'
                      : estimate.status === 'submitted' && estimate.manager_approved_at
                      ? 'bg-indigo-500 text-white'
                      : estimate.status === 'submitted'
                      ? 'bg-orange-500 text-white'
                      : estimate.status === 'sent'
                      ? 'bg-blue-500 text-white'
                      : estimate.status === 'accepted'
                      ? 'bg-green-500 text-white'
                      : estimate.status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : estimate.status === 'expired'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {estimate.status === 'draft' ? '下書き'
                      : estimate.status === 'submitted' && estimate.manager_approved_at ? '送付可能'
                      : estimate.status === 'submitted' ? '提出済み'
                      : estimate.status === 'sent' ? '送付済'
                      : estimate.status === 'accepted' ? '承認'
                      : estimate.status === 'rejected' ? '却下'
                      : estimate.status === 'expired' ? '期限切れ'
                      : estimate.status}
                  </span>
                  <span className="text-sm font-bold text-gray-700">{estimate.estimate_number}</span>
                </div>

                {/* 金額（目立つように上部に） */}
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">金額（税込）</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ¥{Math.floor(estimate.total_amount).toLocaleString()}
                  </div>
                </div>

                {/* 取引先 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">取引先</div>
                  <div className="font-medium text-gray-900">
                    {estimate.client?.name || '-'}
                  </div>
                </div>

                {/* 工事名 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">工事名</div>
                  <div className="text-sm text-gray-900">
                    {estimate.project?.project_name || '-'}
                  </div>
                </div>

                {/* 見積日 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">見積日</div>
                  <div className="text-sm text-gray-900">
                    {new Date(estimate.estimate_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                {/* 有効期限 */}
                {estimate.valid_until && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">有効期限</div>
                    <div className="text-sm text-gray-900">
                      {new Date(estimate.valid_until).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                )}

                {/* 作成者・承認者 */}
                {(isManagerOrAdmin && estimate.created_by_user) || estimate.manager_approved_at ? (
                  <div className="flex gap-4 text-xs">
                    {isManagerOrAdmin && estimate.created_by_user && (
                      <div>
                        <span className="text-gray-500">作成者: </span>
                        <span className="font-medium text-gray-900">{estimate.created_by_user.name}</span>
                      </div>
                    )}
                    {estimate.manager_approved_at && (
                      <div>
                        <span className="text-gray-500">承認者: </span>
                        <span className="font-medium text-gray-900">{estimate.manager_approved_by_user?.name}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* PC: 横並びレイアウト（既存） */}
              <div className="hidden sm:block relative">
                {/* ステータスと見積番号（左上） */}
                <div className="absolute top-0 left-0 flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                    estimate.status === 'draft'
                      ? 'bg-gray-200 text-gray-800'
                      : estimate.status === 'submitted' && estimate.manager_approved_at
                      ? 'bg-indigo-500 text-white'
                      : estimate.status === 'submitted'
                      ? 'bg-orange-500 text-white'
                      : estimate.status === 'sent'
                      ? 'bg-blue-500 text-white'
                      : estimate.status === 'accepted'
                      ? 'bg-green-500 text-white'
                      : estimate.status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : estimate.status === 'expired'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {estimate.status === 'draft' ? '下書き'
                      : estimate.status === 'submitted' && estimate.manager_approved_at ? '送付可能'
                      : estimate.status === 'submitted' ? '提出済み'
                      : estimate.status === 'sent' ? '送付済'
                      : estimate.status === 'accepted' ? '承認'
                      : estimate.status === 'rejected' ? '却下'
                      : estimate.status === 'expired' ? '期限切れ'
                      : estimate.status}
                  </span>
                  <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{estimate.estimate_number}</span>
                </div>

                {/* 見積日・有効期限（右上・横並び） */}
                <div className="absolute top-0 right-0 flex items-center gap-4 text-xs text-gray-500">
                  <div className="whitespace-nowrap">
                    見積日: {new Date(estimate.estimate_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  {estimate.valid_until && (
                    <div className="whitespace-nowrap">
                      有効期限: {new Date(estimate.valid_until).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6">
                  {/* 左側：取引先名・工事名（横並び） */}
                  <div className="flex-1 min-w-0 flex items-center gap-8">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">取引先</div>
                      <div className="font-bold text-gray-900 truncate">
                        {estimate.client?.name || '-'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">工事名</div>
                      <div className="text-sm text-gray-900 truncate">
                        {estimate.project?.project_name || '-'}
                      </div>
                    </div>
                  </div>

                  {/* 中央：作成者・承認者（縦並び） */}
                  <div className="mx-8">
                    {isManagerOrAdmin && estimate.created_by_user && (
                      <div className="mb-1">
                        <span className="text-xs text-gray-500">作成者: </span>
                        <span className="text-xs font-bold text-gray-900">
                          {estimate.created_by_user.name}
                        </span>
                      </div>
                    )}
                    {estimate.manager_approved_at && (
                      <div>
                        <span className="text-xs text-gray-500">承認者: </span>
                        <span className="text-xs font-bold text-gray-900">
                          {estimate.manager_approved_by_user?.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 右側：金額 */}
                  <div className="text-right ml-8">
                    <div className="text-xs text-gray-500 mb-0.5">金額（税込）</div>
                    <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                      ¥{Math.floor(estimate.total_amount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ボタンエリア（カード外・右寄せ） */}
            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex flex-wrap items-center justify-end gap-2">
              {/* 期限切れの場合は警告テキストのみ */}
              {estimate.status === 'expired' && (
                <span className="text-xs text-yellow-700 mr-auto">
                  有効期限: {estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString('ja-JP') : '-'}（期限切れ）
                </span>
              )}

              {estimate.status === 'draft' && (
                <Link
                  href={`/estimates/${estimate.id}/edit`}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  編集
                </Link>
              )}
              {/* PDF出力: 承認済み かつ 期限切れでない場合のみ */}
              {estimate.manager_approved_at && estimate.status !== 'expired' && (
                <a
                  href={`/api/estimates/${estimate.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  PDF出力
                </a>
              )}
              {estimate.status === 'accepted' && (
                <Link
                  href={`/invoices/new?estimate_id=${estimate.id}`}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  請求書作成
                </Link>
              )}
              {/* 削除ボタン: 未承認または期限切れの見積のみ */}
              {(!estimate.manager_approved_at || estimate.status === 'expired') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(estimate.id, estimate.estimate_number)
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                >
                  削除
                </button>
              )}
            </div>
          </div>
        ))}

          {estimates.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg py-12 text-center text-gray-500">
              {searchQuery || statusFilter !== 'all' || creatorFilter
                ? '検索条件に一致する見積書がありません'
                : '見積書データがありません'}
            </div>
          )}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {currentPage} / {totalPages} ページ
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* フィルターモーダル */}
      <EstimateFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        creatorFilter={creatorFilter}
        setCreatorFilter={setCreatorFilter}
        staffList={staffList}
        isManagerOrAdmin={isManagerOrAdmin}
        onReset={handleReset}
      />
    </>
  )
}
