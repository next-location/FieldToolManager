'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// シンプル統一型の設定
interface SimpleAttendanceSettings {
  // 打刻方法設定
  allow_manual: boolean
  allow_qr: boolean
  allow_location: boolean

  // QR設定
  qr_rotation_days: 1 | 3 | 7 | 30

  // 休憩設定
  break_time_mode: 'none' | 'simple' | 'detailed'
  auto_break_deduction: boolean
  auto_break_minutes: number

  // リマインダー設定
  checkin_reminder_enabled: boolean
  checkin_reminder_time: string
  checkout_reminder_enabled: boolean
  checkout_reminder_time: string

  // レポート設定
  admin_daily_report_enabled: boolean
  admin_daily_report_time: string
  admin_daily_report_email: boolean

  // アラート設定
  qr_expiry_alert_enabled: boolean
  qr_expiry_alert_email: boolean
  overtime_alert_enabled: boolean
  overtime_alert_hours: number
}

const DEFAULT_SETTINGS: SimpleAttendanceSettings = {
  allow_manual: true,
  allow_qr: false,
  allow_location: false,
  qr_rotation_days: 7,
  break_time_mode: 'simple',
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

export function AttendanceSettingsFormSimple({
  initialSettings,
  organizationId,
}: {
  initialSettings: any | null
  organizationId: string
}) {
  // 時刻をHH:MM形式に正規化する関数
  const normalizeTime = (time: string | undefined): string => {
    if (!time) return ''
    if (time.includes(':')) {
      const parts = time.split(':')
      return `${parts[0]}:${parts[1]}`
    }
    return time
  }

  // 既存設定から統一型に変換
  const convertToSimple = (old: any): SimpleAttendanceSettings => {
    if (!old) return DEFAULT_SETTINGS

    return {
      allow_manual: old.allow_manual ?? true,
      allow_qr: old.allow_qr ?? false,
      allow_location: old.allow_location ?? false,
      qr_rotation_days: old.office_qr_rotation_days ?? 7,
      break_time_mode: old.break_time_mode ?? 'simple',
      auto_break_deduction: old.auto_break_deduction ?? false,
      auto_break_minutes: old.auto_break_minutes ?? 45,
      checkin_reminder_enabled: old.checkin_reminder_enabled ?? true,
      checkin_reminder_time: normalizeTime(old.checkin_reminder_time) || '10:00',
      checkout_reminder_enabled: old.checkout_reminder_enabled ?? true,
      checkout_reminder_time: normalizeTime(old.checkout_reminder_time) || '20:00',
      admin_daily_report_enabled: old.admin_daily_report_enabled ?? true,
      admin_daily_report_time: normalizeTime(old.admin_daily_report_time) || '10:00',
      admin_daily_report_email: old.admin_daily_report_email ?? true,
      qr_expiry_alert_enabled: old.qr_expiry_alert_enabled ?? true,
      qr_expiry_alert_email: old.qr_expiry_alert_email ?? true,
      overtime_alert_enabled: old.overtime_alert_enabled ?? false,
      overtime_alert_hours: old.overtime_alert_hours ?? 12,
    }
  }

  const [settings, setSettings] = useState<SimpleAttendanceSettings>(
    convertToSimple(initialSettings)
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
      // 統一型設定を旧形式に変換してAPIに送信
      const requestBody = {
        allow_manual: settings.allow_manual,
        allow_qr: settings.allow_qr,
        allow_location: settings.allow_location,
        office_attendance_enabled: true,
        office_clock_methods: {
          manual: settings.allow_manual,
          qr_scan: settings.allow_qr,
          qr_display: settings.allow_qr,
        },
        office_qr_rotation_days: settings.qr_rotation_days,
        site_attendance_enabled: true,
        site_clock_methods: {
          manual: settings.allow_manual,
          qr_scan: settings.allow_qr,
          qr_display: settings.allow_qr,
        },
        site_qr_type: 'both' as const,
        break_time_mode: settings.break_time_mode,
        auto_break_deduction: settings.auto_break_deduction,
        auto_break_minutes: settings.auto_break_minutes,
        checkin_reminder_enabled: settings.checkin_reminder_enabled,
        checkin_reminder_time: settings.checkin_reminder_time,
        checkout_reminder_enabled: settings.checkout_reminder_enabled,
        checkout_reminder_time: settings.checkout_reminder_time,
        admin_daily_report_enabled: settings.admin_daily_report_enabled,
        admin_daily_report_time: settings.admin_daily_report_time,
        admin_daily_report_email: settings.admin_daily_report_email,
        qr_expiry_alert_enabled: settings.qr_expiry_alert_enabled,
        qr_expiry_alert_email: settings.qr_expiry_alert_email,
        overtime_alert_enabled: settings.overtime_alert_enabled,
        overtime_alert_hours: settings.overtime_alert_hours,
        // MVP用フィールドを保持（上書きしない）
        working_days: initialSettings?.working_days,
        exclude_holidays: initialSettings?.exclude_holidays,
        default_checkin_time: initialSettings?.default_checkin_time,
        default_alert_time: initialSettings?.default_alert_time,
      }

      const response = await fetch('/api/attendance/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

      {/* 打刻方法設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            打刻方法設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            出退勤打刻で利用可能な方法を選択してください（複数選択可）
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="allow_manual"
              type="checkbox"
              checked={settings.allow_manual}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allow_manual: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allow_manual" className="ml-2 block text-sm text-gray-900">
              手動打刻（ボタンタップ）- 場所を選択して打刻
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="allow_qr"
              type="checkbox"
              checked={settings.allow_qr}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allow_qr: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allow_qr" className="ml-2 block text-sm text-gray-900">
              QRコード打刻 - QRコードで場所を自動判別
            </label>
          </div>
        </div>

        {settings.allow_qr && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QRコード更新頻度
            </label>
            <p className="text-xs text-gray-500 mb-3">
              セキュリティのため、QRコードは定期的に更新されます
            </p>
            <div className="flex space-x-4">
              {[1, 3, 7, 30].map((days) => (
                <label key={days} className="flex items-center">
                  <input
                    type="radio"
                    name="qr_rotation_days"
                    value={days}
                    checked={settings.qr_rotation_days === days}
                    onChange={() =>
                      setSettings({
                        ...settings,
                        qr_rotation_days: days as 1 | 3 | 7 | 30,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{days}日</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 休憩時間設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            休憩時間設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            休憩時間の記録方法を選択してください
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              休憩時間モード
            </label>
            <select
              value={settings.break_time_mode}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  break_time_mode: e.target.value as 'none' | 'simple' | 'detailed',
                })
              }
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="none">休憩時間を記録しない</option>
              <option value="simple">簡易モード（休憩開始・終了ボタン）</option>
              <option value="detailed">詳細モード（複数回の休憩を記録）</option>
            </select>
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
            <label htmlFor="auto_break_deduction" className="ml-2 block text-sm text-gray-900">
              休憩時間を自動差し引き
            </label>
          </div>

          {settings.auto_break_deduction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自動差し引き時間（分）
              </label>
              <input
                type="number"
                min="0"
                max="120"
                step="15"
                value={settings.auto_break_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_break_minutes: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* リマインダー設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            リマインダー設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            打刻忘れを防ぐためのリマインダー通知設定
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center mb-2">
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
              <label htmlFor="checkin_reminder_enabled" className="ml-2 block text-sm text-gray-900">
                出勤リマインダーを有効にする
              </label>
            </div>
            {settings.checkin_reminder_enabled && (
              <input
                type="time"
                value={settings.checkin_reminder_time}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkin_reminder_time: e.target.value,
                  })
                }
                className="ml-6 block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            )}
          </div>

          <div>
            <div className="flex items-center mb-2">
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
              <label htmlFor="checkout_reminder_enabled" className="ml-2 block text-sm text-gray-900">
                退勤リマインダーを有効にする
              </label>
            </div>
            {settings.checkout_reminder_enabled && (
              <input
                type="time"
                value={settings.checkout_reminder_time}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    checkout_reminder_time: e.target.value,
                  })
                }
                className="ml-6 block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* 管理者向け設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            管理者向け設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            レポートとアラートの設定
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center mb-2">
              <input
                id="admin_daily_report_enabled"
                type="checkbox"
                checked={settings.admin_daily_report_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    admin_daily_report_enabled: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="admin_daily_report_enabled" className="ml-2 block text-sm text-gray-900">
                日次レポートを有効にする
              </label>
            </div>
            {settings.admin_daily_report_enabled && (
              <div className="ml-6 space-y-2">
                <input
                  type="time"
                  value={settings.admin_daily_report_time}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      admin_daily_report_time: e.target.value,
                    })
                  }
                  className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="flex items-center">
                  <input
                    id="admin_daily_report_email"
                    type="checkbox"
                    checked={settings.admin_daily_report_email}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        admin_daily_report_email: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="admin_daily_report_email" className="ml-2 block text-sm text-gray-700">
                    メールで送信
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center mb-2">
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
              <label htmlFor="overtime_alert_enabled" className="ml-2 block text-sm text-gray-900">
                長時間労働アラートを有効にする
              </label>
            </div>
            {settings.overtime_alert_enabled && (
              <div className="ml-6">
                <label className="block text-sm text-gray-700 mb-1">
                  アラート基準時間（時間）
                </label>
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={settings.overtime_alert_hours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      overtime_alert_hours: parseInt(e.target.value) || 12,
                    })
                  }
                  className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="pt-6">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {loading ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </form>
  )
}
