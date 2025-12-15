'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown } from 'lucide-react'

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
  estimates: Estimate[]
  userRole: string
  staffList: Staff[]
}

export function EstimateListClient({ estimates: initialEstimates, userRole, staffList }: EstimateListClientProps) {
  const router = useRouter()
  const [estimates, setEstimates] = useState(initialEstimates)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('')
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false)
  const [sortField, setSortField] = useState<'estimate_date' | 'valid_until' | 'total_amount'>('estimate_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)

  // propsが変更されたらローカル状態も更新
  useEffect(() => {
    setEstimates(initialEstimates)
  }, [initialEstimates])

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

      // ローカル状態から削除
      setEstimates(estimates.filter(e => e.id !== id))
      alert('見積書を削除しました')
    } catch (error) {
      console.error('削除エラー:', error)
      alert('見積書の削除に失敗しました')
    }
  }

  // ソート処理
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
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

  // フィルタ・ソート済みデータ
  const filteredAndSortedEstimates = useMemo(() => {
    let filtered = estimates.filter((estimate) => {
      // 検索クエリフィルタ
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        estimate.estimate_number.toLowerCase().includes(searchLower) ||
        estimate.client?.name.toLowerCase().includes(searchLower) ||
        estimate.project?.project_name?.toLowerCase().includes(searchLower)

      // ステータスフィルタ
      const matchesStatus =
        statusFilter === 'all' || estimate.status === statusFilter

      // 作成者フィルタ（マネージャー・管理者のみ）
      const matchesCreator =
        !creatorFilter || estimate.created_by_user?.id === creatorFilter

      return matchesSearch && matchesStatus && matchesCreator
    })

    // ソート
    filtered.sort((a, b) => {
      let aValue: number | string = 0
      let bValue: number | string = 0

      if (sortField === 'estimate_date') {
        aValue = new Date(a.estimate_date).getTime()
        bValue = new Date(b.estimate_date).getTime()
      } else if (sortField === 'valid_until') {
        aValue = a.valid_until ? new Date(a.valid_until).getTime() : 0
        bValue = b.valid_until ? new Date(b.valid_until).getTime() : 0
      } else if (sortField === 'total_amount') {
        aValue = a.total_amount
        bValue = b.total_amount
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [estimates, searchQuery, statusFilter, creatorFilter, sortField, sortOrder])

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    )
  }

  return (
    <>
      {/* 検索・フィルタエリア */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className={`grid grid-cols-1 ${isManagerOrAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="見積番号・取引先・工事名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全て</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作成者
              </label>
              <input
                type="text"
                placeholder="スタッフ名で検索"
                value={creatorSearchQuery}
                onChange={(e) => setCreatorSearchQuery(e.target.value)}
                onFocus={() => setShowCreatorDropdown(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          全 {estimates.length} 件中 {filteredAndSortedEstimates.length} 件を表示
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

      {/* カード一覧 */}
      <div className="space-y-4">
        {filteredAndSortedEstimates.map((estimate) => (
          <div key={estimate.id} className="bg-white border border-gray-300 rounded-lg shadow-sm">
            {/* クリック可能なカード本体 */}
            <div
              className="px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors relative"
              onClick={() => router.push(`/estimates/${estimate.id}`)}
            >
              {/* ステータスと見積番号（左上） */}
              <div className="absolute top-2 left-2 flex items-center gap-2">
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
              <div className="absolute top-2 right-2 flex items-center gap-4 text-xs text-gray-500">
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

            {/* ボタンエリア（カード外・右寄せ） */}
            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-end gap-2">
              {estimate.status === 'draft' && (
                <Link
                  href={`/estimates/${estimate.id}/edit`}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  編集
                </Link>
              )}
              {/* PDF出力: 提出済み以降、またはマネージャー以上のみ */}
              {(estimate.status === 'submitted' || (estimate.status !== 'draft' && isManagerOrAdmin)) && (
                <a
                  href={`/api/estimates/${estimate.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                >
                  PDF出力
                </a>
              )}
              {estimate.status === 'accepted' && (
                <Link
                  href={`/invoices/new?estimate_id=${estimate.id}`}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                >
                  請求書作成
                </Link>
              )}
              {!estimate.manager_approved_at && (
                <button
                  onClick={() => handleDelete(estimate.id, estimate.estimate_number)}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                >
                  削除
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredAndSortedEstimates.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg py-12 text-center text-gray-500">
            {searchQuery || statusFilter !== 'all' || creatorFilter
              ? '検索条件に一致する見積書がありません'
              : '見積書データがありません'}
          </div>
        )}
      </div>
    </>
  )
}
