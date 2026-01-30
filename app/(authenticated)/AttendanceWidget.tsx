'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Scanner } from '@yudiel/react-qr-scanner'

interface Site {
  id: string
  name: string
}

interface AttendanceWidgetProps {
  attendanceSettings: {
    office_attendance_enabled: boolean
    site_attendance_enabled: boolean
    office_clock_methods: any  // jsonb型
    site_clock_methods: any    // jsonb型
    site_qr_type: string
  } | null
  sites: Site[]
}

interface TodayRecord {
  clock_in_time: string | null
  clock_out_time: string | null
  location_type: 'office' | 'site' | null
  site_name: string | null
}

export function AttendanceWidget({ attendanceSettings, sites }: AttendanceWidgetProps) {
  const router = useRouter()
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // QRスキャン用
  const [showQRScanner, setShowQRScanner] = useState(false)

  // 手動打刻用の場所選択
  const [location, setLocation] = useState<'office' | 'site' | ''>('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')

  // 新しい構造から判定：office_clock_methodsまたはsite_clock_methodsでmanualまたはqr_scanが有効か
  const canUseManual = attendanceSettings ?
    (attendanceSettings.office_clock_methods?.manual || attendanceSettings.site_clock_methods?.manual) : false
  const canUseQR = attendanceSettings ?
    (attendanceSettings.office_clock_methods?.qr_scan || attendanceSettings.site_clock_methods?.qr_scan) : false

  // 当日の出退勤記録を取得
  useEffect(() => {
    fetchTodayRecord()
  }, [])

  const fetchTodayRecord = async () => {
    try {
      const response = await fetch('/api/attendance/status')
      if (response.ok) {
        const data = await response.json()
        setTodayRecord({
          clock_in_time: data.clock_in_time || null,
          clock_out_time: data.clock_out_time || null,
          location_type: data.location_type || null,
          site_name: data.site_name || null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch today record:', error)
    } finally {
      setLoading(false)
    }
  }

  // 手動出勤打刻
  const handleManualClockIn = async () => {
    if (!location) {
      setMessage({ type: 'error', text: '打刻場所を選択してください' })
      return
    }

    if (location === 'site' && !selectedSiteId) {
      setMessage({ type: 'error', text: '現場を選択してください' })
      return
    }

    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_type: location,
          site_id: location === 'site' ? selectedSiteId : null,
          method: 'manual',
          device_type: 'desktop',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '出勤打刻に失敗しました')
      }

      setMessage({ type: 'success', text: '出勤打刻が完了しました' })
      setLocation('')
      setSelectedSiteId('')
      await fetchTodayRecord()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 手動退勤打刻
  const handleManualClockOut = async () => {
    if (!location) {
      setMessage({ type: 'error', text: '打刻場所を選択してください' })
      return
    }

    if (location === 'site' && !selectedSiteId) {
      setMessage({ type: 'error', text: '現場を選択してください' })
      return
    }

    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_type: location,
          site_id: location === 'site' ? selectedSiteId : null,
          method: 'manual',
          device_type: 'desktop',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '退勤打刻に失敗しました')
      }

      setMessage({ type: 'success', text: '退勤打刻が完了しました' })
      setLocation('')
      setSelectedSiteId('')
      await fetchTodayRecord()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // QRコードスキャン処理
  const handleQRScan = async (detectedCodes: any[]) => {
    if (detectedCodes.length === 0) return

    const result = detectedCodes[0].rawValue
    setShowQRScanner(false)
    setActionLoading(true)
    setMessage(null)

    try {
      // QRコードのデータを解析
      const qrData = JSON.parse(result)

      if (!qrData.type || !qrData.location_type) {
        throw new Error('無効なQRコードです')
      }

      // 出勤または退勤のAPIを呼び出し
      const endpoint =
        qrData.type === 'clock-in' ? '/api/attendance/clock-in' : '/api/attendance/clock-out'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_type: qrData.location_type,
          site_id: qrData.site_id || null,
          method: 'qr_code',
          device_type: 'desktop',
          qr_code_id: qrData.qr_code_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '打刻に失敗しました')
      }

      setMessage({
        type: 'success',
        text: qrData.type === 'clock-in' ? '出勤打刻が完了しました' : '退勤打刻が完了しました',
      })
      await fetchTodayRecord()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 勤務時間を計算
  const getWorkDuration = () => {
    if (!todayRecord?.clock_in_time) return null

    const clockIn = new Date(todayRecord.clock_in_time)
    const clockOut = todayRecord.clock_out_time ? new Date(todayRecord.clock_out_time) : new Date()

    const diffMs = clockOut.getTime() - clockIn.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return { hours, minutes }
  }

  const duration = getWorkDuration()
  const today = new Date()
  const isWorking = todayRecord?.clock_in_time && !todayRecord?.clock_out_time

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">出退勤</h3>
          <Link href="/attendance/clock" className="text-xs text-blue-600 hover:text-blue-800">
            専用ページ →
          </Link>
        </div>

        {/* 日付表示 */}
        <div className="text-center mb-4">
          <div className="text-xl font-bold text-gray-900">
            {today.getMonth() + 1}月{today.getDate()}日（
            {['日', '月', '火', '水', '木', '金', '土'][today.getDay()]}）
          </div>
        </div>

        {/* 出退勤時刻表示 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium mb-1">出勤</div>
            <div className="text-lg font-bold text-blue-900">
              {todayRecord?.clock_in_time
                ? new Date(todayRecord.clock_in_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}
            </div>
            {todayRecord?.location_type && (
              <div className="text-xs text-blue-700 mt-1">
                {todayRecord.location_type === 'office'
                  ? '🏢 会社'
                  : `🏗️ ${todayRecord.site_name || '現場'}`}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-medium mb-1">退勤</div>
            <div className="text-lg font-bold text-gray-900">
              {todayRecord?.clock_out_time
                ? new Date(todayRecord.clock_out_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}
            </div>
          </div>
        </div>

        {/* 勤務時間表示 */}
        {isWorking && duration && (
          <div className="bg-green-50 rounded-lg p-3 text-center mb-4">
            <div className="text-xs text-green-700 mb-1">勤務時間</div>
            <div className="text-xl font-bold text-green-900">
              {duration.hours}時間{duration.minutes}分
            </div>
          </div>
        )}

        {/* メッセージ表示 */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* QRスキャナー */}
        {showQRScanner && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">QRコードをスキャン</span>
              <button
                onClick={() => setShowQRScanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="aspect-square max-w-sm mx-auto">
              <Scanner
                onScan={(detectedCodes) => handleQRScan(detectedCodes)}
                onError={(error) => console.error('QR Scanner error:', error)}
              />
            </div>

            <p className="text-xs text-gray-600 text-center mt-2">
              出退勤用のQRコードをスキャンしてください
            </p>
          </div>
        )}

        {/* 打刻ボタン */}
        {!isWorking ? (
          <div className="space-y-3">
            {/* QRコードスキャンボタン */}
            {canUseQR && !showQRScanner && (
              <button
                onClick={() => setShowQRScanner(true)}
                className="w-full inline-flex justify-center items-center px-4 py-3 border-2 border-blue-600 text-sm font-medium rounded-lg text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                QRコードでスキャン
              </button>
            )}

            {/* 手動打刻 */}
            {canUseManual && (
              <>
                {canUseQR && <div className="text-center text-xs text-gray-500">または</div>}

                <div className="space-y-3">
                  {/* 場所選択 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      どこで打刻していますか？
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="location"
                          value="office"
                          checked={location === 'office'}
                          onChange={(e) => {
                            setLocation('office')
                            setSelectedSiteId('')
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">🏢 会社</span>
                      </label>

                      <label className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="location"
                          value="site"
                          checked={location === 'site'}
                          onChange={(e) => setLocation('site')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">🏗️ 現場</span>
                      </label>
                    </div>
                  </div>

                  {/* 現場選択 */}
                  {location === 'site' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        現場を選択
                      </label>
                      <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      >
                        <option value="">選択してください</option>
                        {sites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={handleManualClockIn}
                    disabled={actionLoading}
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                  >
                    {actionLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        処理中...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        出勤する
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {!canUseManual && !canUseQR && (
              <div className="text-center py-6 text-gray-500 text-sm">
                <p>出退勤の打刻方法が設定されていません</p>
                <p className="text-xs mt-1">管理者にお問い合わせください</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* QRコードスキャンボタン */}
            {canUseQR && !showQRScanner && (
              <button
                onClick={() => setShowQRScanner(true)}
                className="w-full inline-flex justify-center items-center px-4 py-3 border-2 border-gray-600 text-sm font-medium rounded-lg text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                QRコードでスキャン
              </button>
            )}

            {/* 手動打刻 */}
            {canUseManual && (
              <>
                {canUseQR && <div className="text-center text-xs text-gray-500">または</div>}

                <div className="space-y-3">
                  {/* 場所選択 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      どこで退勤しますか？
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="location-out"
                          value="office"
                          checked={location === 'office'}
                          onChange={(e) => {
                            setLocation('office')
                            setSelectedSiteId('')
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">🏢 会社</span>
                      </label>

                      <label className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="location-out"
                          value="site"
                          checked={location === 'site'}
                          onChange={(e) => setLocation('site')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">🏗️ 現場</span>
                      </label>
                    </div>
                  </div>

                  {/* 現場選択 */}
                  {location === 'site' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        現場を選択
                      </label>
                      <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      >
                        <option value="">選択してください</option>
                        {sites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={handleManualClockOut}
                    disabled={actionLoading}
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-400"
                  >
                    {actionLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        処理中...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        退勤する
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
