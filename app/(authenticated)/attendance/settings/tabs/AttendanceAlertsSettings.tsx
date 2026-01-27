'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// アラート設定のみの型定義
interface AlertsSettings {
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

const DEFAULT_SETTINGS: AlertsSettings = {
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

export function AttendanceAlertsSettings({
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

  // 既存設定からアラート設定のみを抽出
  const convertToAlerts = (old: any): AlertsSettings => {
    if (!old) return DEFAULT_SETTINGS

    return {
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

  const [settings, setSettings] = useState<AlertsSettings>(
    convertToAlerts(initialSettings)
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
      // アラート設定のみを更新（基本設定は保持）
      const requestBody = {
        // 基本設定は既存値を保持
        allow_manual: initialSettings?.allow_manual,
        allow_qr: initialSettings?.allow_qr,
        allow_location: initialSettings?.allow_location,
        office_attendance_enabled: initialSettings?.office_attendance_enabled,
        office_clock_methods: initialSettings?.office_clock_methods,
        office_qr_rotation_days: initialSettings?.office_qr_rotation_days,
        site_attendance_enabled: initialSettings?.site_attendance_enabled,
        site_clock_methods: initialSettings?.site_clock_methods,
        site_qr_type: initialSettings?.site_qr_type,
        break_time_mode: initialSettings?.break_time_mode,
        auto_break_deduction: initialSettings?.auto_break_deduction,
        auto_break_minutes: initialSettings?.auto_break_minutes,
        // アラート設定を更新
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
        // MVP用フィールドを保持
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

      setMessage({ type: 'success', text: 'アラート・通知設定を更新しました' })
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '更新に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
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

      {/* スタッフへのリマインダー */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            スタッフへのリマインダー
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            出勤・退勤の打刻忘れを防ぐリマインダー通知を設定します
          </p>
        </div>

        <div className="space-y-6">
          {/* 出勤リマインダー */}
          <div>
            <div className="flex items-center mb-2">
              <input
                id="checkin_reminder"
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
              <label htmlFor="checkin_reminder" className="ml-2 block text-sm font-medium text-gray-900">
                出勤リマインダー
              </label>
            </div>
            {settings.checkin_reminder_enabled && (
              <div className="pl-6">
                <label className="block text-sm text-gray-700 mb-1">送信時刻</label>
                <input
                  type="time"
                  value={settings.checkin_reminder_time}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      checkin_reminder_time: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  設定時刻に未出勤のスタッフへ通知を送信します
                </p>
              </div>
            )}
          </div>

          {/* 退勤リマインダー */}
          <div>
            <div className="flex items-center mb-2">
              <input
                id="checkout_reminder"
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
              <label htmlFor="checkout_reminder" className="ml-2 block text-sm font-medium text-gray-900">
                退勤リマインダー
              </label>
            </div>
            {settings.checkout_reminder_enabled && (
              <div className="pl-6">
                <label className="block text-sm text-gray-700 mb-1">送信時刻</label>
                <input
                  type="time"
                  value={settings.checkout_reminder_time}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      checkout_reminder_time: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  設定時刻に未退勤のスタッフへ通知を送信します
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 管理者向けレポート */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            管理者向けレポート
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            管理者へ日次の勤怠レポートを送信します
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="daily_report"
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
            <label htmlFor="daily_report" className="ml-2 block text-sm font-medium text-gray-900">
              毎日の勤怠レポートを送信
            </label>
          </div>

          {settings.admin_daily_report_enabled && (
            <div className="pl-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">送信時刻</label>
                <input
                  type="time"
                  value={settings.admin_daily_report_time}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      admin_daily_report_time: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="report_email"
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
                <label htmlFor="report_email" className="ml-2 block text-sm text-gray-900">
                  メール通知も送信
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* アラート設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            アラート設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            異常や期限切れを検知してアラートを送信します
          </p>
        </div>

        <div className="space-y-6">
          {/* QR期限切れアラート */}
          <div>
            <div className="flex items-center mb-2">
              <input
                id="qr_alert"
                type="checkbox"
                checked={settings.qr_expiry_alert_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qr_expiry_alert_enabled: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="qr_alert" className="ml-2 block text-sm font-medium text-gray-900">
                QR期限切れアラート
              </label>
            </div>
            {settings.qr_expiry_alert_enabled && (
              <div className="pl-6">
                <div className="flex items-center">
                  <input
                    id="qr_email"
                    type="checkbox"
                    checked={settings.qr_expiry_alert_email}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        qr_expiry_alert_email: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="qr_email" className="ml-2 block text-sm text-gray-900">
                    メール通知
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  QRコードの期限が切れる1日前に通知します
                </p>
              </div>
            )}
          </div>

          {/* 長時間労働アラート */}
          <div>
            <div className="flex items-center mb-2">
              <input
                id="overtime_alert"
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
              <label htmlFor="overtime_alert" className="ml-2 block text-sm font-medium text-gray-900">
                長時間労働アラート
              </label>
            </div>
            {settings.overtime_alert_enabled && (
              <div className="pl-6">
                <label className="block text-sm text-gray-700 mb-1">連続勤務時間（時間）</label>
                <input
                  type="number"
                  value={settings.overtime_alert_hours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      overtime_alert_hours: parseInt(e.target.value) || 0,
                    })
                  }
                  min="1"
                  max="24"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  設定時間を超えた場合に管理者へアラートを送信します
                </p>
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
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : 'アラート・通知設定を保存'}
        </button>
      </div>
    </form>
  )
}
