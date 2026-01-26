'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

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

export function LeaveList({ userRole, userId, onEdit, onRefresh }: LeaveListProps) {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdminOrManager = ['admin', 'manager'].includes(userRole)

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leave')
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaves.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdminOrManager ? 5 : 4}
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
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
              </div>
              <div className="text-sm text-gray-600">
                種別: {leaveTypeLabels[leave.leave_type] || leave.leave_type}
              </div>
              {leave.reason && (
                <div className="text-sm text-gray-600">理由: {leave.reason}</div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
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
