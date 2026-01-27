'use client'

import { useState, useEffect } from 'react'

interface AttendanceSettings {
  working_days: {
    mon: boolean
    tue: boolean
    wed: boolean
    thu: boolean
    fri: boolean
    sat: boolean
    sun: boolean
  }
  exclude_holidays: boolean
  default_checkin_time: string // HH:MM
  default_alert_time: string // HH:MM
  checkin_reminder_enabled: boolean
}

interface Props {
  organizationId: string
}

const DAY_LABELS = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日'
} as const

export function AttendanceMVPSettings({ organizationId }: Props) {
  const [settings, setSettings] = useState<AttendanceSettings>({
    working_days: {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: false,
      sun: false
    },
    exclude_holidays: true,
    default_checkin_time: '09:00',
    default_alert_time: '10:00',
    checkin_reminder_enabled: true
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [organizationId])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/attendance/settings')
      if (res.ok) {
        const response = await res.json()
        const data = response.settings // APIは { settings: {...} } という構造で返す
        if (data) {
          setSettings({
            working_days: data.working_days || settings.working_days,
            exclude_holidays: data.exclude_holidays ?? settings.exclude_holidays,
            default_checkin_time: data.default_checkin_time || settings.default_checkin_time,
            default_alert_time: data.default_alert_time || settings.default_alert_time,
            checkin_reminder_enabled: data.checkin_reminder_enabled ?? settings.checkin_reminder_enabled
          })
        }
      }
    } catch (error) {
      console.error('出退勤設定の取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/attendance/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '出退勤設定を保存しました' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const errorData = await res.json()
        setMessage({ type: 'error', text: errorData.error || '保存に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleWorkingDay = (day: keyof typeof settings.working_days) => {
    setSettings({
      ...settings,
      working_days: {
        ...settings.working_days,
        [day]: !settings.working_days[day]
      }
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* アラート有効化（マスタースイッチ） */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="checkin_reminder_enabled"
              checked={settings.checkin_reminder_enabled}
              onChange={(e) => setSettings({ ...settings, checkin_reminder_enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
            />
            <div className="ml-3 flex-1">
              <label htmlFor="checkin_reminder_enabled" className="block text-sm font-medium text-gray-900">
                出勤アラート機能を有効にする（全体スイッチ）
              </label>
              <p className="mt-1 text-xs text-yellow-700">
                ⚠️ OFFにすると、すべての勤務パターンのアラートが無効になります。<br />
                個別のON/OFFは「勤務パターン」ページで設定してください。
              </p>
            </div>
          </div>
        </div>

        {settings.checkin_reminder_enabled && (
          <>
            {/* 営業日設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                営業日設定
              </label>
              <p className="text-xs text-gray-500 mb-3">
                選択された曜日が営業日として扱われます。<br />
                • 営業日: 通常勤務として記録、アラート送信対象<br />
                • 休日: 休日出勤として記録、アラート送信なし
              </p>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkingDay(day)}
                    className={`px-4 py-2 rounded-md border font-medium transition-colors ${
                      settings.working_days[day]
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>

            {/* 祝日除外 */}
            <div className="border-t pt-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="exclude_holidays"
                  checked={settings.exclude_holidays}
                  onChange={(e) => setSettings({ ...settings, exclude_holidays: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <div className="ml-3 flex-1">
                  <label htmlFor="exclude_holidays" className="block text-sm font-medium text-gray-900">
                    祝日を休日として扱う
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    ONにすると、以下の動作になります：<br />
                    • 祝日は出勤アラートが送信されません<br />
                    • 祝日の出勤は「休日出勤」として記録されます
                  </p>
                </div>
              </div>
            </div>

            {/* 説明文 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>アラート時刻の設定について</strong>
              </p>
              <p className="text-xs text-blue-700 mt-2">
                アラート送信時刻は「勤務パターン」タブで個別に設定してください。<br />
                各スタッフの出勤予定時刻に合わせて、個別のアラート時刻を設定できます。
              </p>
            </div>
          </>
        )}

        {/* 保存ボタン */}
        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
