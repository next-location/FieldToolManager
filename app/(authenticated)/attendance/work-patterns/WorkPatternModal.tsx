'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface WorkPattern {
  id: string
  name: string
  expected_checkin_time: string
  expected_checkout_time: string | null
  alert_enabled: boolean
  alert_hours_after: number
  checkout_alert_enabled: boolean
  checkout_alert_hours_after: number
  is_night_shift: boolean
  is_default: boolean
}

interface WorkPatternModalProps {
  pattern: WorkPattern | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function WorkPatternModal({
  pattern,
  isOpen,
  onClose,
  onSuccess,
}: WorkPatternModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    expected_checkin_time: '09:00',
    expected_checkout_time: '18:00',
    alert_enabled: true,
    alert_hours_after: '2.0',
    checkout_alert_enabled: false,
    checkout_alert_hours_after: '1.0',
    is_night_shift: false,
    is_default: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && pattern) {
      console.log('[WorkPatternModal] Initializing form with pattern:', pattern)
      // 数値を.0付きの文字列に変換（3 -> "3.0"）
      const formatHours = (value: number) => {
        return value % 1 === 0 ? `${value}.0` : String(value)
      }
      setFormData({
        name: pattern.name,
        expected_checkin_time: pattern.expected_checkin_time.slice(0, 5),
        expected_checkout_time: pattern.expected_checkout_time ? pattern.expected_checkout_time.slice(0, 5) : '18:00',
        alert_enabled: pattern.alert_enabled,
        alert_hours_after: formatHours(pattern.alert_hours_after),
        checkout_alert_enabled: pattern.checkout_alert_enabled,
        checkout_alert_hours_after: formatHours(pattern.checkout_alert_hours_after),
        is_night_shift: pattern.is_night_shift,
        is_default: pattern.is_default,
      })
      setError(null)
    } else if (isOpen && !pattern) {
      console.log('[WorkPatternModal] Initializing form for new pattern')
      setFormData({
        name: '',
        expected_checkin_time: '09:00',
        expected_checkout_time: '18:00',
        alert_enabled: true,
        alert_hours_after: '2.0',
        checkout_alert_enabled: false,
        checkout_alert_hours_after: '1.0',
        is_night_shift: false,
        is_default: false,
      })
      setError(null)
    }
  }, [isOpen, pattern ? JSON.stringify(pattern) : null])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('[WorkPatternModal] Current formData before submit:', formData)

      const payload = {
        ...formData,
        alert_hours_after: parseFloat(formData.alert_hours_after),
        checkout_alert_hours_after: parseFloat(formData.checkout_alert_hours_after),
      }

      console.log('[WorkPatternModal] Submitting payload:', payload)

      const url = pattern
        ? `/api/attendance/work-patterns/${pattern.id}`
        : '/api/attendance/work-patterns'

      const response = await fetch(url, {
        method: pattern ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()
      console.log('[WorkPatternModal] Response:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || '保存に失敗しました')
      }

      alert(pattern ? '更新しました' : '作成しました')
      onSuccess()
    } catch (err: any) {
      console.error('[WorkPatternModal] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pt-16 sm:pt-20">
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] px-4 py-4 sm:py-8">
        {/* 背景オーバーレイ */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* モーダル本体 */}
        <div className="relative inline-block w-full max-w-lg overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {pattern ? '勤務パターン編集' : '勤務パターン作成'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* パターン名 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パターン名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 日勤、夜勤、早朝勤務"
              />
            </div>

            {/* 出勤予定時刻 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出勤予定時刻 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.expected_checkin_time}
                onChange={(e) =>
                  setFormData({ ...formData, expected_checkin_time: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 退勤予定時刻 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                退勤予定時刻
              </label>
              <input
                type="time"
                value={formData.expected_checkout_time}
                onChange={(e) =>
                  setFormData({ ...formData, expected_checkout_time: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                勤務時間の管理や残業判定に使用されます
              </p>
            </div>

            {/* アラート有効/無効 */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.alert_enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_enabled: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  打刻忘れアラートを有効にする
                </span>
              </label>
            </div>

            {/* アラート時間（有効時のみ表示） */}
            {formData.alert_enabled && (
              <div className="mb-4 ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出勤予定時刻から何時間後にアラートを送信するか
                </label>
                <select
                  value={formData.alert_hours_after}
                  onChange={(e) => {
                    console.log('[WorkPatternModal] alert_hours_after changed:', e.target.value)
                    setFormData({ ...formData, alert_hours_after: e.target.value })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0.5">0.5時間（30分）</option>
                  <option value="1.0">1.0時間</option>
                  <option value="1.5">1.5時間</option>
                  <option value="2.0">2.0時間</option>
                  <option value="2.5">2.5時間</option>
                  <option value="3.0">3.0時間</option>
                </select>
              </div>
            )}

            {/* 退勤アラート有効/無効 */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.checkout_alert_enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, checkout_alert_enabled: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  退勤打刻忘れアラートを有効にする
                </span>
              </label>
            </div>

            {/* 退勤アラート時間（有効時のみ表示） */}
            {formData.checkout_alert_enabled && (
              <div className="mb-4 ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  退勤予定時刻から何時間後にアラートを送信するか
                </label>
                <select
                  value={formData.checkout_alert_hours_after}
                  onChange={(e) => {
                    console.log('[WorkPatternModal] checkout_alert_hours_after changed:', e.target.value)
                    setFormData({ ...formData, checkout_alert_hours_after: e.target.value })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0.5">0.5時間（30分）</option>
                  <option value="1.0">1.0時間</option>
                  <option value="1.5">1.5時間</option>
                  <option value="2.0">2.0時間</option>
                  <option value="2.5">2.5時間</option>
                  <option value="3.0">3.0時間</option>
                </select>
              </div>
            )}

            {/* 夜勤フラグ */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_night_shift}
                  onChange={(e) =>
                    setFormData({ ...formData, is_night_shift: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">夜勤</span>
              </label>
              <p className="ml-6 mt-1 text-xs text-gray-500">
                夜勤の場合、日付を跨ぐ勤務として扱います
              </p>
            </div>

            {/* デフォルトフラグ */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) =>
                    setFormData({ ...formData, is_default: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  デフォルトパターンにする
                </span>
              </label>
              <p className="ml-6 mt-1 text-xs text-gray-500">
                新規スタッフ追加時に自動的に適用されます
              </p>
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '保存中...' : pattern ? '更新' : '作成'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
