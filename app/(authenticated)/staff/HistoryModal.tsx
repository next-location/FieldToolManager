'use client'

import { useEffect, useState } from 'react'

interface UserHistory {
  id: string
  change_type: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  notes: string | null
  created_at: string
  changed_by_user: {
    name: string
    email: string
  }
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  staffId: string
  staffName: string
}

// 変更種別の日本語表示
const getChangeTypeLabel = (changeType: string): string => {
  const labels: Record<string, string> = {
    created: '作成',
    updated: '更新',
    deleted: '削除',
    activated: '有効化',
    deactivated: '無効化',
    role_changed: '権限変更',
    department_changed: '部署変更',
    password_reset: 'パスワードリセット',
  }
  return labels[changeType] || changeType
}

// 変更種別のバッジ色
const getChangeTypeBadgeColor = (changeType: string): string => {
  const colors: Record<string, string> = {
    created: 'bg-green-100 text-green-800',
    updated: 'bg-blue-100 text-blue-800',
    deleted: 'bg-red-100 text-red-800',
    activated: 'bg-green-100 text-green-800',
    deactivated: 'bg-gray-100 text-gray-800',
    role_changed: 'bg-purple-100 text-purple-800',
    department_changed: 'bg-yellow-100 text-yellow-800',
    password_reset: 'bg-orange-100 text-orange-800',
  }
  return colors[changeType] || 'bg-gray-100 text-gray-800'
}

// 変更内容の詳細表示
const getChangeDetails = (history: UserHistory): string => {
  const { change_type, old_values, new_values } = history

  if (change_type === 'created') {
    return `新規スタッフとして追加されました`
  }

  if (change_type === 'deleted') {
    return `アカウントが削除されました`
  }

  if (change_type === 'activated') {
    return `アカウントが有効化されました`
  }

  if (change_type === 'deactivated') {
    return `アカウントが無効化されました`
  }

  if (change_type === 'role_changed') {
    const oldRole = old_values?.role || '未設定'
    const newRole = new_values?.role || '未設定'
    const roleLabels: Record<string, string> = {
      admin: '管理者',
      leader: 'リーダー',
      staff: 'スタッフ',
    }
    return `権限が「${roleLabels[oldRole] || oldRole}」から「${roleLabels[newRole] || newRole}」に変更されました`
  }

  if (change_type === 'department_changed') {
    const oldDept = old_values?.department || '未設定'
    const newDept = new_values?.department || '未設定'
    return `部署が「${oldDept}」から「${newDept}」に変更されました`
  }

  if (change_type === 'password_reset') {
    return `パスワードリセットが実行されました`
  }

  if (change_type === 'updated') {
    const changes: string[] = []
    if (old_values && new_values) {
      if (old_values.name !== new_values.name) {
        changes.push(`名前: ${old_values.name} → ${new_values.name}`)
      }
      if (old_values.email !== new_values.email) {
        changes.push(`メール: ${old_values.email} → ${new_values.email}`)
      }
      if (old_values.employee_id !== new_values.employee_id) {
        changes.push(`社員番号: ${old_values.employee_id || '未設定'} → ${new_values.employee_id || '未設定'}`)
      }
      if (old_values.phone !== new_values.phone) {
        changes.push(`電話番号: ${old_values.phone || '未設定'} → ${new_values.phone || '未設定'}`)
      }
    }
    return changes.length > 0 ? changes.join(', ') : '基本情報が更新されました'
  }

  return '変更されました'
}

export function HistoryModal({ isOpen, onClose, staffId, staffName }: HistoryModalProps) {
  const [history, setHistory] = useState<UserHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen, staffId])

  const fetchHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/staff/${staffId}/history`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '履歴の取得に失敗しました')
      }
      const data = await response.json()
      setHistory(data.history)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{staffName}の変更履歴</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading && (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>変更履歴がありません</p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getChangeTypeBadgeColor(
                          item.change_type
                        )}`}
                      >
                        {getChangeTypeLabel(item.change_type)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(item.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 mb-2">{getChangeDetails(item)}</div>

                  <div className="text-xs text-gray-500">
                    変更者: {item.changed_by_user.name} ({item.changed_by_user.email})
                  </div>

                  {item.notes && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
                      メモ: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
