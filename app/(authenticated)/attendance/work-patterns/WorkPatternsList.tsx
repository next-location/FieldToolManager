'use client'

import { useState, useEffect } from 'react'
import { Edit, Trash2, AlertCircle } from 'lucide-react'

interface WorkPattern {
  id: string
  name: string
  expected_checkin_time: string
  alert_enabled: boolean
  alert_hours_after: number
  is_night_shift: boolean
  is_default: boolean
  user_count: number
}

interface WorkPatternsListProps {
  onEdit: (pattern: WorkPattern) => void
  onRefresh: () => void
}

export function WorkPatternsList({ onEdit, onRefresh }: WorkPatternsListProps) {
  const [patterns, setPatterns] = useState<WorkPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPatterns()
  }, [])

  const fetchPatterns = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/attendance/work-patterns')
      if (!response.ok) {
        throw new Error('勤務パターンの取得に失敗しました')
      }

      const data = await response.json()
      setPatterns(data.patterns || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (pattern: WorkPattern) => {
    if (pattern.user_count > 0) {
      alert(`このパターンは${pattern.user_count}人のスタッフに適用されています。先にスタッフの設定を変更してください。`)
      return
    }

    if (!confirm(`「${pattern.name}」を削除してもよろしいですか?`)) {
      return
    }

    try {
      const response = await fetch(`/api/attendance/work-patterns/${pattern.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '削除に失敗しました')
      }

      alert('削除しました')
      onRefresh()
    } catch (err: any) {
      alert(`削除エラー: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (patterns.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <p className="text-gray-500">勤務パターンが登録されていません</p>
        <p className="text-sm text-gray-400 mt-2">右上の「新規作成」ボタンから追加してください</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {patterns.map((pattern) => (
          <li key={pattern.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium text-gray-900 truncate">
                    {pattern.name}
                  </h3>
                  {pattern.is_default && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      デフォルト
                    </span>
                  )}
                  {pattern.is_night_shift && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                      夜勤
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600">
                  <p>出勤予定: {pattern.expected_checkin_time.slice(0, 5)}</p>
                  <p>
                    アラート: {pattern.alert_enabled ? `${pattern.alert_hours_after}時間後` : 'OFF'}
                  </p>
                  <p className="text-gray-500">{pattern.user_count}人が使用中</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onEdit(pattern)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                  title="編集"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(pattern)}
                  disabled={pattern.user_count > 0}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title={pattern.user_count > 0 ? 'スタッフが使用中のため削除できません' : '削除'}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
