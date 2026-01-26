'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'

interface LeaveListProps {
  userRole: string
  userId: string
  onEdit: (leave: any) => void
  onRefresh: () => void
}

const leaveTypeLabels: Record<string, string> = {
  paid: '有給休暇',
  sick: '病気休暇',
  personal: '私用休暇',
  other: 'その他',
}

const statusLabels: Record<string, string> = {
  pending: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export function LeaveList({ userRole, userId, onEdit, onRefresh }: LeaveListProps) {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const isAdminOrManager = ['admin', 'manager'].includes(userRole)

  useEffect(() => {
    fetchLeaves()
  }, [selectedStatus])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      let url = '/api/leave'

      const params = new URLSearchParams()
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setLeaves(data.leaves || [])
      } else {
        console.error('Failed to fetch leaves')
      }
    } catch (error) {
      console.error('Error fetching leaves:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm('この休暇を承認しますか？')) return

    try {
      const response = await fetch(`/api/leave/${id}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        onRefresh()
      } else {
        const data = await response.json()
        alert(data.error || '承認に失敗しました')
      }
    } catch (error) {
      console.error('Error approving leave:', error)
      alert('承認処理中にエラーが発生しました')
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('却下理由を入力してください（任意）:')
    if (reason === null) return // キャンセル

    try {
      const response = await fetch(`/api/leave/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        onRefresh()
      } else {
        const data = await response.json()
        alert(data.error || '却下に失敗しました')
      }
    } catch (error) {
      console.error('Error rejecting leave:', error)
      alert('却下処理中にエラーが発生しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この休暇を削除しますか？')) return

    try {
      const response = await fetch(`/api/leave/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRefresh()
      } else {
        const data = await response.json()
        alert(data.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting leave:', error)
      alert('削除処理中にエラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-3 py-1 rounded-md text-sm ${
            selectedStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          全て
        </button>
        <button
          onClick={() => setSelectedStatus('pending')}
          className={`px-3 py-1 rounded-md text-sm ${
            selectedStatus === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          承認待ち
        </button>
        <button
          onClick={() => setSelectedStatus('approved')}
          className={`px-3 py-1 rounded-md text-sm ${
            selectedStatus === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          承認済み
        </button>
        <button
          onClick={() => setSelectedStatus('rejected')}
          className={`px-3 py-1 rounded-md text-sm ${
            selectedStatus === 'rejected'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          却下
        </button>
      </div>

      {/* テーブル（PC） */}
      <div className="hidden sm:block bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                日付
              </th>
              {isAdminOrManager && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  スタッフ
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                種別
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                理由
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ステータス
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaves.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdminOrManager ? 6 : 5}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  休暇データがありません
                </td>
              </tr>
            ) : (
              leaves.map((leave) => (
                <tr key={leave.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(leave.leave_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
                  </td>
                  {isAdminOrManager && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.user?.name || '不明'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {leaveTypeLabels[leave.leave_type] || leave.leave_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {leave.reason || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        statusColors[leave.status]
                      }`}
                    >
                      {statusLabels[leave.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {isAdminOrManager && leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(leave.id)}
                            className="text-green-600 hover:text-green-900"
                            title="承認"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(leave.id)}
                            className="text-red-600 hover:text-red-900"
                            title="却下"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onEdit(leave)}
                        className="text-blue-600 hover:text-blue-900"
                        title="編集"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(leave.id)}
                        className="text-red-600 hover:text-red-900"
                        title="削除"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* カード表示（モバイル） */}
      <div className="sm:hidden space-y-4">
        {leaves.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            休暇データがありません
          </div>
        ) : (
          leaves.map((leave) => (
            <div key={leave.id} className="bg-white rounded-lg shadow p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">
                    {new Date(leave.leave_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
                  </div>
                  {isAdminOrManager && (
                    <div className="text-sm text-gray-600">{leave.user?.name || '不明'}</div>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    statusColors[leave.status]
                  }`}
                >
                  {statusLabels[leave.status]}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                種別: {leaveTypeLabels[leave.leave_type] || leave.leave_type}
              </div>
              {leave.reason && (
                <div className="text-sm text-gray-600">理由: {leave.reason}</div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                {isAdminOrManager && leave.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(leave.id)}
                      className="text-green-600 hover:text-green-900"
                      title="承認"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleReject(leave.id)}
                      className="text-red-600 hover:text-red-900"
                      title="却下"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onEdit(leave)}
                  className="text-blue-600 hover:text-blue-900"
                  title="編集"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(leave.id)}
                  className="text-red-600 hover:text-red-900"
                  title="削除"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
