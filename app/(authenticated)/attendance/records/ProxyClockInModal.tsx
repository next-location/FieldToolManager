'use client'

import { useState, useEffect } from 'react'

interface Staff {
  id: string
  name: string
  email: string
}

interface Site {
  id: string
  name: string
}

interface ProxyClockInModalProps {
  staffList: Staff[]
  sitesList: Site[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ProxyClockInModal({
  staffList,
  sitesList,
  isOpen,
  onClose,
  onSuccess,
}: ProxyClockInModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フォーム状態
  const [formData, setFormData] = useState({
    user_id: '',
    clock_in_date: '',
    clock_in_time: '',
    clock_in_location_type: 'office' as 'office' | 'site' | 'remote',
    clock_in_site_id: '',
    clock_out_date: '',
    clock_out_time: '',
    clock_out_location_type: 'office' as 'office' | 'site' | 'remote' | 'direct_home',
    clock_out_site_id: '',
    proxy_reason: '',
    is_holiday_work: false,
  })

  // モーダルが開いたらフォームをリセット
  useEffect(() => {
    if (isOpen) {
      // 今日の日付をデフォルトに設定
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        user_id: '',
        clock_in_date: today,
        clock_in_time: '',
        clock_in_location_type: 'office',
        clock_in_site_id: '',
        clock_out_date: '',
        clock_out_time: '',
        clock_out_location_type: 'office',
        clock_out_site_id: '',
        proxy_reason: '',
        is_holiday_work: false,
      })
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 日時を結合してISO文字列に変換
      const clockInDateTime = new Date(
        `${formData.clock_in_date}T${formData.clock_in_time}:00`
      ).toISOString()

      let clockOutDateTime = null
      if (formData.clock_out_date && formData.clock_out_time) {
        clockOutDateTime = new Date(
          `${formData.clock_out_date}T${formData.clock_out_time}:00`
        ).toISOString()
      }

      const response = await fetch('/api/attendance/records/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: formData.user_id,
          clock_in_time: clockInDateTime,
          clock_in_location_type: formData.clock_in_location_type,
          clock_in_site_id:
            formData.clock_in_location_type === 'site'
              ? formData.clock_in_site_id
              : null,
          clock_out_time: clockOutDateTime,
          clock_out_location_type: formData.clock_out_location_type,
          clock_out_site_id:
            formData.clock_out_location_type === 'site'
              ? formData.clock_out_site_id
              : null,
          proxy_reason: formData.proxy_reason,
          is_holiday_work: formData.is_holiday_work,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '代理打刻に失敗しました')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedStaff = staffList.find((s) => s.id === formData.user_id)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center pt-20 p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              代理打刻（新規作成）
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* スタッフ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                スタッフ <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.user_id}
                onChange={(e) =>
                  setFormData({ ...formData, user_id: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">選択してください</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.email})
                  </option>
                ))}
              </select>
            </div>

            {/* 出勤情報 */}
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-900 mb-3">出勤情報</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    出勤日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.clock_in_date}
                    onChange={(e) =>
                      setFormData({ ...formData, clock_in_date: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    出勤時刻 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.clock_in_time}
                    onChange={(e) =>
                      setFormData({ ...formData, clock_in_time: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    出勤場所 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.clock_in_location_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clock_in_location_type: e.target.value as any,
                      })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="office">会社</option>
                    <option value="site">現場</option>
                    <option value="remote">リモート</option>
                  </select>
                </div>

                {formData.clock_in_location_type === 'site' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      現場選択 <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.clock_in_site_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clock_in_site_id: e.target.value,
                        })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">選択してください</option>
                      {sitesList.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 退勤情報 */}
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-900 mb-3">退勤情報（任意）</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    退勤日
                  </label>
                  <input
                    type="date"
                    value={formData.clock_out_date}
                    onChange={(e) =>
                      setFormData({ ...formData, clock_out_date: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    退勤時刻
                  </label>
                  <input
                    type="time"
                    value={formData.clock_out_time}
                    onChange={(e) =>
                      setFormData({ ...formData, clock_out_time: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    退勤場所
                  </label>
                  <select
                    value={formData.clock_out_location_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clock_out_location_type: e.target.value as any,
                      })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="office">会社</option>
                    <option value="site">現場</option>
                    <option value="remote">リモート</option>
                    <option value="direct_home">直帰</option>
                  </select>
                </div>

                {formData.clock_out_location_type === 'site' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      現場選択
                    </label>
                    <select
                      value={formData.clock_out_site_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clock_out_site_id: e.target.value,
                        })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">選択してください</option>
                      {sitesList.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 休日出勤 */}
            <div className="border-t pt-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="is_holiday_work"
                  checked={formData.is_holiday_work}
                  onChange={(e) =>
                    setFormData({ ...formData, is_holiday_work: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <div className="ml-3 flex-1">
                  <label htmlFor="is_holiday_work" className="block text-sm font-medium text-gray-900">
                    休日出勤として記録
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    祝日・休日の勤務の場合はチェックしてください
                  </p>
                </div>
              </div>
            </div>

            {/* 代理打刻理由 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                代理打刻理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.proxy_reason}
                onChange={(e) =>
                  setFormData({ ...formData, proxy_reason: e.target.value })
                }
                placeholder="例: 打刻忘れのため管理者が代理で登録"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? '処理中...' : '代理打刻を登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
