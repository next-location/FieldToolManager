'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationAttendanceSettings } from '@/types/attendance'

// デフォルト設定
const DEFAULT_SETTINGS = {
  office_attendance_enabled: true,
  office_clock_methods: {
    manual: true,
    qr_scan: false,
    qr_display: false,
  },
  office_qr_rotation_days: 7 as 1 | 3 | 7 | 30,
  site_attendance_enabled: true,
  site_clock_methods: {
    manual: true,
    qr_scan: false,
    qr_display: false,
  },
  site_qr_type: 'leader' as 'leader' | 'fixed' | 'both',
  break_time_mode: 'simple' as 'none' | 'simple' | 'detailed',
  auto_break_deduction: false,
  auto_break_minutes: 45,
  checkin_reminder_enabled: true,
  checkin_reminder_time: '10:00',
  checkout_reminder_enabled: true,
  checkout_reminder_time: '20:00',
  admin_daily_report_enabled: true,
  admin_daily_report_time: '10:00',
  admin_daily_report_email: true,
  qr_expiry_alert_enabled: true,
  qr_expiry_alert_email: true,
  overtime_alert_enabled: false,
  overtime_alert_hours: 12,
}

export function AttendanceSettingsForm({
  initialSettings,
  organizationId,
}: {
  initialSettings: OrganizationAttendanceSettings | null
  organizationId: string
}) {
  // 時刻をHH:MM形式に正規化する関数
  const normalizeTime = (time: string | undefined): string => {
    if (!time) return ''
    // HH:MM:SS形式の場合はHH:MMに変換
    if (time.includes(':')) {
      const parts = time.split(':')
      return `${parts[0]}:${parts[1]}`
    }
    return time
  }

  const [settings, setSettings] = useState(
    initialSettings
      ? {
          office_attendance_enabled: initialSettings.office_attendance_enabled,
          office_clock_methods: initialSettings.office_clock_methods,
          office_qr_rotation_days: initialSettings.office_qr_rotation_days,
          site_attendance_enabled: initialSettings.site_attendance_enabled,
          site_clock_methods: initialSettings.site_clock_methods,
          site_qr_type: initialSettings.site_qr_type,
          break_time_mode: initialSettings.break_time_mode,
          auto_break_deduction: initialSettings.auto_break_deduction,
          auto_break_minutes: initialSettings.auto_break_minutes,
          checkin_reminder_enabled: initialSettings.checkin_reminder_enabled,
          checkin_reminder_time: normalizeTime(initialSettings.checkin_reminder_time),
          checkout_reminder_enabled: initialSettings.checkout_reminder_enabled,
          checkout_reminder_time: normalizeTime(initialSettings.checkout_reminder_time),
          admin_daily_report_enabled: initialSettings.admin_daily_report_enabled,
          admin_daily_report_time: normalizeTime(initialSettings.admin_daily_report_time),
          admin_daily_report_email: initialSettings.admin_daily_report_email,
          qr_expiry_alert_enabled: initialSettings.qr_expiry_alert_enabled,
          qr_expiry_alert_email: initialSettings.qr_expiry_alert_email,
          overtime_alert_enabled: initialSettings.overtime_alert_enabled,
          overtime_alert_hours: initialSettings.overtime_alert_hours,
        }
      : DEFAULT_SETTINGS
  )

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '設定の更新に失敗しました')
      }

      setMessage({ type: 'success', text: '設定を更新しました' })
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '更新に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 p-6">
      {/* メッセージ表示 */}
      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* 会社出勤設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            会社出勤設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            会社（オフィス）への出勤に関する設定
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="office_attendance_enabled"
              name="office_attendance_enabled"
              type="checkbox"
              checked={settings.office_attendance_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  office_attendance_enabled: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="office_attendance_enabled"
              className="ml-2 block text-sm text-gray-900"
            >
              会社出勤機能を使用する
            </label>
          </div>

          {settings.office_attendance_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  利用可能な打刻方法（複数選択可）
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="office_manual"
                      type="checkbox"
                      checked={settings.office_clock_methods.manual}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          office_clock_methods: {
                            ...settings.office_clock_methods,
                            manual: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="office_manual" className="ml-2 block text-sm text-gray-700">
                      手動打刻（ボタンタップ）
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="office_qr_scan"
                      type="checkbox"
                      checked={settings.office_clock_methods.qr_scan}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          office_clock_methods: {
                            ...settings.office_clock_methods,
                            qr_scan: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="office_qr_scan" className="ml-2 block text-sm text-gray-700">
                      QRスキャン（スマホでQRを読み取る）
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="office_qr_display"
                      type="checkbox"
                      checked={settings.office_clock_methods.qr_display}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          office_clock_methods: {
                            ...settings.office_clock_methods,
                            qr_display: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="office_qr_display" className="ml-2 block text-sm text-gray-700">
                      QR常時表示（タブレット設置）
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QRコード更新頻度
                </label>
                <div className="flex space-x-4">
                  {[1, 3, 7, 30].map((days) => (
                    <label key={days} className="flex items-center">
                      <input
                        type="radio"
                        name="office_qr_rotation_days"
                        value={days}
                        checked={settings.office_qr_rotation_days === days}
                        onChange={() =>
                          setSettings({
                            ...settings,
                            office_qr_rotation_days: days as 1 | 3 | 7 | 30,
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">{days}日</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 現場出勤設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            現場出勤設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            工事現場への直行出勤に関する設定
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="site_attendance_enabled"
              type="checkbox"
              checked={settings.site_attendance_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  site_attendance_enabled: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="site_attendance_enabled" className="ml-2 block text-sm text-gray-900">
              現場出勤機能を使用する
            </label>
          </div>

          {settings.site_attendance_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  利用可能な打刻方法（複数選択可）
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="site_manual"
                      type="checkbox"
                      checked={settings.site_clock_methods.manual}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          site_clock_methods: {
                            ...settings.site_clock_methods,
                            manual: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="site_manual" className="ml-2 block text-sm text-gray-700">
                      手動打刻
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="site_qr_scan"
                      type="checkbox"
                      checked={settings.site_clock_methods.qr_scan}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          site_clock_methods: {
                            ...settings.site_clock_methods,
                            qr_scan: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="site_qr_scan" className="ml-2 block text-sm text-gray-700">
                      QRスキャン
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="site_qr_display"
                      type="checkbox"
                      checked={settings.site_clock_methods.qr_display}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          site_clock_methods: {
                            ...settings.site_clock_methods,
                            qr_display: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="site_qr_display" className="ml-2 block text-sm text-gray-700">
                      QR常時表示（タブレット設置）
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  現場QRコードタイプ
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="site_qr_leader"
                      type="radio"
                      name="site_qr_type"
                      value="leader"
                      checked={settings.site_qr_type === 'leader'}
                      onChange={() =>
                        setSettings({ ...settings, site_qr_type: 'leader' })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="site_qr_leader" className="ml-2 block text-sm text-gray-700">
                      リーダー発行型（リーダーが毎日QR発行）
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="site_qr_fixed"
                      type="radio"
                      name="site_qr_type"
                      value="fixed"
                      checked={settings.site_qr_type === 'fixed'}
                      onChange={() =>
                        setSettings({ ...settings, site_qr_type: 'fixed' })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="site_qr_fixed" className="ml-2 block text-sm text-gray-700">
                      固定型（現場ごとに固定QR）
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="site_qr_both"
                      type="radio"
                      name="site_qr_type"
                      value="both"
                      checked={settings.site_qr_type === 'both'}
                      onChange={() =>
                        setSettings({ ...settings, site_qr_type: 'both' })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="site_qr_both" className="ml-2 block text-sm text-gray-700">
                      両方使用（現場ごとに選択可能）
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 休憩時間設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            休憩時間設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            休憩時間の管理方法
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              休憩時間管理モード
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="break_none"
                  type="radio"
                  name="break_time_mode"
                  value="none"
                  checked={settings.break_time_mode === 'none'}
                  onChange={() =>
                    setSettings({ ...settings, break_time_mode: 'none' })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="break_none" className="ml-2 block text-sm text-gray-700">
                  なし（休憩時間を記録しない）
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="break_simple"
                  type="radio"
                  name="break_time_mode"
                  value="simple"
                  checked={settings.break_time_mode === 'simple'}
                  onChange={() =>
                    setSettings({ ...settings, break_time_mode: 'simple' })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="break_simple" className="ml-2 block text-sm text-gray-700">
                  シンプル（開始・終了のみ）
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="break_detailed"
                  type="radio"
                  name="break_time_mode"
                  value="detailed"
                  checked={settings.break_time_mode === 'detailed'}
                  onChange={() =>
                    setSettings({ ...settings, break_time_mode: 'detailed' })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="break_detailed" className="ml-2 block text-sm text-gray-700">
                  詳細（複数回の休憩を記録）
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="auto_break_deduction"
              type="checkbox"
              checked={settings.auto_break_deduction}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  auto_break_deduction: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="auto_break_deduction" className="ml-2 block text-sm text-gray-700">
              休憩時間を自動控除する
            </label>
          </div>

          {settings.auto_break_deduction && (
            <div>
              <label htmlFor="auto_break_minutes" className="block text-sm font-medium text-gray-700">
                自動控除時間（分）
              </label>
              <input
                id="auto_break_minutes"
                type="number"
                min="0"
                max="180"
                value={settings.auto_break_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_break_minutes: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* 通知設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            通知・アラート設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            出退勤忘れや異常勤務時間の通知
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="checkin_reminder_enabled"
                type="checkbox"
                checked={settings.checkin_reminder_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkin_reminder_enabled: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="checkin_reminder_enabled" className="text-sm font-medium text-gray-700">
                出勤忘れリマインダー
              </label>
              {settings.checkin_reminder_enabled && (
                <div className="mt-2">
                  <input
                    type="time"
                    value={settings.checkin_reminder_time}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        checkin_reminder_time: e.target.value,
                      })
                    }
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="checkout_reminder_enabled"
                type="checkbox"
                checked={settings.checkout_reminder_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkout_reminder_enabled: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="checkout_reminder_enabled" className="text-sm font-medium text-gray-700">
                退勤忘れリマインダー
              </label>
              {settings.checkout_reminder_enabled && (
                <div className="mt-2">
                  <input
                    type="time"
                    value={settings.checkout_reminder_time}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        checkout_reminder_time: e.target.value,
                      })
                    }
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="overtime_alert_enabled"
                type="checkbox"
                checked={settings.overtime_alert_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    overtime_alert_enabled: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="overtime_alert_enabled" className="text-sm font-medium text-gray-700">
                長時間労働アラート
              </label>
              {settings.overtime_alert_enabled && (
                <div className="mt-2">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={settings.overtime_alert_hours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        overtime_alert_hours: parseInt(e.target.value) || 12,
                      })
                    }
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">時間を超えたらアラート</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="pt-6">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {loading ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>
    </form>
  )
}
