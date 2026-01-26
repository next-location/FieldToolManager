'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface LeaveModalProps {
  leave: any | null
  isOpen: boolean
  userRole: string
  userId: string
  onClose: () => void
  onSuccess: () => void
}

const leaveTypes = [
  { value: 'paid', label: '有給休暇' },
  { value: 'sick', label: '病気休暇' },
  { value: 'personal', label: '私用休暇' },
  { value: 'other', label: 'その他' },
]

export function LeaveModal({
  leave,
  isOpen,
  userRole,
  userId,
  onClose,
  onSuccess,
}: LeaveModalProps) {
  const [targetUserId, setTargetUserId] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [leaveType, setLeaveType] = useState<string>('paid')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  const isAdminOrManager = ['admin', 'manager'].includes(userRole)

  useEffect(() => {
    if (isOpen && isAdminOrManager) {
      fetchUsers()
    }
  }, [isOpen])

  useEffect(() => {
    if (leave) {
      setTargetUserId(leave.user_id || userId)
      setLeaveDate(leave.leave_date || '')
      setLeaveType(leave.leave_type || 'paid')
      setReason(leave.reason || '')
      setNotes(leave.notes || '')
    } else {
      // 新規作成時
      setTargetUserId(userId)
      setLeaveDate('')
      setLeaveType('paid')
      setReason('')
      setNotes('')
    }
  }, [leave, userId])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!leaveDate || !leaveType) {
      alert('必須項目を入力してください')
      return
    }

    setSubmitting(true)

    try {
      const body: any = {
        user_id: targetUserId,
        leave_date: leaveDate,
        leave_type: leaveType,
        reason,
        notes,
      }

      let url = '/api/leave'
      let method = 'POST'

      if (leave) {
        // 編集モード
        url = `/api/leave/${leave.id}`
        method = 'PATCH'
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        alert(data.error || '保存に失敗しました')
      }
    } catch (error) {
      console.error('Error saving leave:', error)
      alert('保存処理中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4"
      style={{ zIndex: 9998 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ position: 'relative', zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {leave ? '休暇編集' : '休暇登録'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* スタッフ選択（管理者のみ） */}
          {isAdminOrManager && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                スタッフ <span className="text-red-500">*</span>
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="">選択してください</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 休暇日 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              休暇日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              style={{ position: 'relative', zIndex: 9999 }}
              required
            />
          </div>

          {/* 種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              種別 <span className="text-red-500">*</span>
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              {leaveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* 理由 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              理由
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              placeholder="休暇の理由を入力（任意）"
            />
          </div>

          {/* 備考（管理者のみ） */}
          {isAdminOrManager && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={2}
                placeholder="管理者用メモ（任意）"
              />
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
