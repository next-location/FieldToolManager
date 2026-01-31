'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 基本設定のみの型定義
interface BasicAttendanceSettings {
  // 打刻方法設定
  allow_manual: boolean
  allow_qr: boolean
  allow_location: boolean

  // QR設定
  qr_rotation_days: 1 | 3 | 7 | 30
  night_shift_button_allowed: boolean

  // 休憩設定
  break_recording_enabled: boolean
  auto_break_deduction: boolean
  auto_break_minutes: number | ''
}

const DEFAULT_SETTINGS: BasicAttendanceSettings = {
  allow_manual: true,
  allow_qr: false,
  allow_location: false,
  qr_rotation_days: 7,
  night_shift_button_allowed: false,
  break_recording_enabled: false,
  auto_break_deduction: false,
  auto_break_minutes: 45,
}

export function AttendanceBasicSettings({
  initialSettings,
  organizationId,
}: {
  initialSettings: any | null
  organizationId: string
}) {
  // 既存設定から基本設定のみを抽出
  const convertToBasic = (old: any): BasicAttendanceSettings => {
    if (!old) return DEFAULT_SETTINGS

    return {
      allow_manual: old.allow_manual ?? true,
      allow_qr: old.allow_qr ?? false,
      allow_location: old.allow_location ?? false,
      qr_rotation_days: old.office_qr_rotation_days ?? 7,
      night_shift_button_allowed: old.night_shift_button_allowed ?? false,
      break_recording_enabled: old.break_time_mode === 'simple' || old.break_time_mode === 'detailed',
      auto_break_deduction: old.auto_break_deduction ?? false,
      auto_break_minutes: old.auto_break_minutes ?? 45,
    }
  }

  const [settings, setSettings] = useState<BasicAttendanceSettings>(
    convertToBasic(initialSettings)
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

    // バリデーション: 少なくとも1つの打刻方法を有効にする必要がある
    if (!settings.allow_manual && !settings.allow_qr) {
      setMessage({
        type: 'error',
        text: '少なくとも1つの打刻方法を有効にしてください（手動打刻またはQRコード打刻）',
      })
      setLoading(false)
      return
    }

    try {
      // 基本設定のみを更新（既存のアラート設定は保持）
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
        night_shift_button_allowed: settings.night_shift_button_allowed,
        site_attendance_enabled: true,
        site_clock_methods: {
          manual: settings.allow_manual,
          qr_scan: settings.allow_qr,
          qr_display: settings.allow_qr,
        },
        site_qr_type: 'both' as const,
        break_time_mode: settings.break_recording_enabled ? 'simple' : 'none',
        auto_break_deduction: settings.auto_break_deduction,
        auto_break_minutes: settings.auto_break_minutes === '' ? 0 : settings.auto_break_minutes,
        // アラート設定は既存値を保持
        checkin_reminder_enabled: initialSettings?.checkin_reminder_enabled,
        checkin_reminder_time: initialSettings?.checkin_reminder_time,
        checkout_reminder_enabled: initialSettings?.checkout_reminder_enabled,
        checkout_reminder_time: initialSettings?.checkout_reminder_time,
        admin_daily_report_enabled: initialSettings?.admin_daily_report_enabled,
        admin_daily_report_time: initialSettings?.admin_daily_report_time,
        admin_daily_report_email: initialSettings?.admin_daily_report_email,
        qr_expiry_alert_enabled: initialSettings?.qr_expiry_alert_enabled,
        qr_expiry_alert_email: initialSettings?.qr_expiry_alert_email,
        overtime_alert_enabled: initialSettings?.overtime_alert_enabled,
        overtime_alert_hours: initialSettings?.overtime_alert_hours,
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

      setMessage({ type: 'success', text: '基本設定を更新しました' })
      // メッセージ表示位置までスクロール
      setTimeout(() => {
        document.getElementById('attendance-message')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '更新に失敗しました' })
      // エラーメッセージ表示位置までスクロール
      setTimeout(() => {
        document.getElementById('attendance-message')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
      {/* メッセージ表示 */}
      {message && (
        <div
          id="attendance-message"
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
              onChange={(e) => {
                // 両方OFFにならないようにする
                if (!e.target.checked && !settings.allow_qr) {
                  setMessage({
                    type: 'error',
                    text: '少なくとも1つの打刻方法を有効にする必要があります',
                  })
                  return
                }
                setMessage(null)
                setSettings({
                  ...settings,
                  allow_manual: e.target.checked,
                })
              }}
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
              onChange={(e) => {
                // 両方OFFにならないようにする
                if (!e.target.checked && !settings.allow_manual) {
                  setMessage({
                    type: 'error',
                    text: '少なくとも1つの打刻方法を有効にする必要があります',
                  })
                  return
                }
                setMessage(null)
                setSettings({
                  ...settings,
                  allow_qr: e.target.checked,
                })
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allow_qr" className="ml-2 block text-sm text-gray-900">
              QRコード打刻 - QRコードで場所を自動判別
            </label>
          </div>
        </div>

        {settings.allow_qr && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QRコード更新頻度
              </label>
              <select
                value={settings.qr_rotation_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qr_rotation_days: Number(e.target.value) as 1 | 3 | 7 | 30,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value={1}>1日（当日23:59まで有効）</option>
                <option value={3}>3日（3日後の23:59まで有効）</option>
                <option value={7}>7日（7日後の23:59まで有効・推奨）</option>
                <option value={30}>30日（30日後の23:59まで有効）</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                QRコードは指定した日数後の23:59まで有効です。それ以降は新しいQRコードが必要になります。
              </p>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                QRコード打刻時の特例
              </h4>
              <div className="flex items-start">
                <input
                  id="night_shift_button_allowed"
                  type="checkbox"
                  checked={settings.night_shift_button_allowed}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      night_shift_button_allowed: e.target.checked,
                    })
                  }
                  className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-2">
                  <label htmlFor="night_shift_button_allowed" className="block text-sm text-gray-900">
                    夜勤パターンのスタッフはボタン打刻も許可
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    勤務パターンが「夜勤」に設定されているスタッフは、QRコード必須の場合でもボタンで打刻できるようになります。
                    夜間のリーダー不在時などに便利です。
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 休憩時間設定 */}
      <div className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            休憩時間設定
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            休憩時間の管理方法を選択してください
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="break_not_record"
              type="radio"
              name="break_recording"
              checked={!settings.break_recording_enabled}
              onChange={() =>
                setSettings({ ...settings, break_recording_enabled: false })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="break_not_record" className="ml-2 block text-sm text-gray-900">
              休憩時刻をスタッフは記録しない
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="break_record"
              type="radio"
              name="break_recording"
              checked={settings.break_recording_enabled}
              onChange={() =>
                setSettings({ ...settings, break_recording_enabled: true })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="break_record" className="ml-2 block text-sm text-gray-900">
              休憩時間をスタッフが記録する
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="auto_break"
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
            <label htmlFor="auto_break" className="ml-2 block text-sm text-gray-900">
              自動休憩控除を有効化
            </label>
          </div>

          {settings.auto_break_deduction && (
            <div className="pl-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                控除時間（分）
              </label>
              <input
                type="number"
                value={settings.auto_break_minutes}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setSettings({ ...settings, auto_break_minutes: '' })
                  } else {
                    const num = parseInt(value)
                    if (!isNaN(num)) {
                      setSettings({ ...settings, auto_break_minutes: num })
                    }
                  }
                }}
                min="0"
                max="180"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                勤務時間から自動的に控除される休憩時間
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="pt-6">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '基本設定を保存'}
        </button>
      </div>
    </form>
  )
}
