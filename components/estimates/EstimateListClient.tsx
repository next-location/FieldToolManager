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
  client?: { name: string }
  project?: { project_name: string }
}

interface EstimateListClientProps {
  estimates: Estimate[]
}

export function EstimateListClient({ estimates: initialEstimates }: EstimateListClientProps) {
  const router = useRouter()
  const [estimates, setEstimates] = useState(initialEstimates)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<'estimate_date' | 'valid_until' | 'total_amount'>('estimate_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // propsが変更されたらローカル状態も更新
  useEffect(() => {
    setEstimates(initialEstimates)
  }, [initialEstimates])

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

      return matchesSearch && matchesStatus
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
  }, [estimates, searchQuery, statusFilter, sortField, sortOrder])

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="sent">送付済</option>
              <option value="accepted">承認済</option>
              <option value="rejected">却下</option>
            </select>
          </div>
        </div>
      </div>

      {/* 件数表示 */}
      <div className="mb-4">
        <div className="text-sm text-gray-700">
          全 {estimates.length} 件中 {filteredAndSortedEstimates.length} 件を表示
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  見積番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工事名
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('estimate_date')}
                >
                  見積日 <SortIcon field="estimate_date" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('valid_until')}
                >
                  有効期限 <SortIcon field="valid_until" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_amount')}
                >
                  金額（税込） <SortIcon field="total_amount" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedEstimates.map((estimate) => (
                <tr key={estimate.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {estimate.estimate_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {estimate.client?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {estimate.project?.project_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(estimate.estimate_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {estimate.valid_until
                      ? new Date(estimate.valid_until).toLocaleDateString('ja-JP')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ¥{estimate.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                      estimate.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : estimate.status === 'sent'
                        ? 'bg-blue-100 text-blue-800'
                        : estimate.status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : estimate.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {estimate.status === 'draft' ? '下書き'
                        : estimate.status === 'sent' ? '送付済'
                        : estimate.status === 'accepted' ? '承認済'
                        : estimate.status === 'rejected' ? '却下'
                        : '期限切れ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/estimates/${estimate.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      詳細
                    </Link>
                    {estimate.status === 'draft' && (
                      <Link
                        href={`/estimates/${estimate.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        編集
                      </Link>
                    )}
                    <a
                      href={`/api/estimates/${estimate.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      PDF
                    </a>
                    {estimate.status === 'accepted' && (
                      <Link
                        href={`/invoices/new?estimate_id=${estimate.id}`}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                      >
                        請求書作成
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(estimate.id, estimate.estimate_number)}
                      className="text-red-600 hover:text-red-900"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedEstimates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? '検索条件に一致する見積書がありません'
                : '見積書データがありません'}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
