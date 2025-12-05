'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Scanner } from '@yudiel/react-qr-scanner'

interface Site {
  id: string
  name: string
}

interface OrgSettings {
  clock_method: 'manual' | 'qr_code' | 'location'
  allow_manual: boolean
  allow_qr: boolean
  allow_location: boolean
}

interface AttendanceClockClientProps {
  userId: string
  orgSettings: OrgSettings | null
  sites: Site[]
}

interface TodayRecord {
  clock_in_time: string | null
  clock_out_time: string | null
  location_type: 'office' | 'site' | null
  site_name: string | null
}

export function AttendanceClockClient({ userId, orgSettings, sites }: AttendanceClockClientProps) {
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

  const canUseManual = orgSettings?.allow_manual || false
  const canUseQR = orgSettings?.allow_qr || false

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_type: location,
          site_id: location === 'site' ? selectedSiteId : null,
          method: 'manual',
          device_type: 'mobile',
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_type: location,
          site_id: location === 'site' ? selectedSiteId : null,
          method: 'manual',
          device_type: 'mobile',
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

    const qrData = detectedCodes[0].rawValue
    setShowQRScanner(false)
    setActionLoading(true)
    setMessage(null)

    try {
      // 出勤中かどうかで判断
      const endpoint = todayRecord?.clock_in_time && !todayRecord?.clock_out_time
        ? '/api/attendance/clock-out'
        : '/api/attendance/clock-in'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'qr',
          qr_data: qrData,
          device_type: 'mobile',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '打刻に失敗しました')
      }

      setMessage({
        type: 'success',
        text: endpoint === '/api/attendance/clock-in' ? '出勤打刻が完了しました' : '退勤打刻が完了しました',
      })
      await fetchTodayRecord()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '打刻に失敗しました' })
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
    <div className="space-y-6">
      {/* 日付と現在の状態 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {today.getMonth() + 1}月{today.getDate()}日（
            {['日', '月', '火', '水', '木', '金', '土'][today.getDay()]}）
          </h2>
          <p className="text-sm text-gray-500 mt-1">{today.getFullYear()}年</p>
        </div>

        {/* 当日の出退勤記録 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-xs text-blue-600 font-medium mb-1">出勤時刻</div>
            <div className="text-2xl font-bold text-blue-900">
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

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 font-medium mb-1">退勤時刻</div>
            <div className="text-2xl font-bold text-gray-900">
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
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-sm text-green-700 mb-1">勤務時間</div>
            <div className="text-3xl font-bold text-green-900">
              {duration.hours}時間{duration.minutes}分
            </div>
          </div>
        )}
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* QRスキャナー */}
      {showQRScanner && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">QRコードをスキャン</h3>
            <button
              onClick={() => setShowQRScanner(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="aspect-square max-w-md mx-auto">
            <Scanner
              onScan={(detectedCodes) => handleQRScan(detectedCodes)}
              onError={(error) => console.error('QR Scanner error:', error)}
            />
          </div>

          <p className="text-sm text-gray-600 text-center mt-4">
            出退勤用のQRコードをカメラでスキャンしてください
          </p>
        </div>
      )}

      {/* 打刻ボタン */}
      {!isWorking ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">出勤打刻</h3>

          {/* QRコードスキャンボタン */}
          {canUseQR && !showQRScanner && (
            <button
              onClick={() => setShowQRScanner(true)}
              className="w-full mb-4 inline-flex justify-center items-center px-6 py-4 border-2 border-blue-600 text-lg font-medium rounded-lg text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {canUseQR && <div className="text-center text-sm text-gray-500 mb-4">または</div>}

              <div className="space-y-4">
                {/* 場所選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    どこで打刻していますか？
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
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
                      <span className="ml-3 text-sm text-gray-900">🏢 会社（オフィス）</span>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="location"
                        value="site"
                        checked={location === 'site'}
                        onChange={(e) => setLocation('site')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-900">🏗️ 現場</span>
                    </label>
                  </div>
                </div>

                {/* 現場選択 */}
                {location === 'site' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      現場を選択
                    </label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
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
                  className="w-full inline-flex justify-center items-center px-6 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  {actionLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                        className="w-6 h-6 mr-2"
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
            <div className="text-center py-8 text-gray-500">
              <p>出退勤の打刻方法が設定されていません。</p>
              <p className="text-sm mt-2">管理者にお問い合わせください。</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">退勤打刻</h3>

          {/* QRコードスキャンボタン */}
          {canUseQR && !showQRScanner && (
            <button
              onClick={() => setShowQRScanner(true)}
              className="w-full mb-4 inline-flex justify-center items-center px-6 py-4 border-2 border-gray-600 text-lg font-medium rounded-lg text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {canUseQR && <div className="text-center text-sm text-gray-500 mb-4">または</div>}

              <div className="space-y-4">
                {/* 場所選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    どこで退勤しますか？
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
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
                      <span className="ml-3 text-sm text-gray-900">🏢 会社（オフィス）</span>
                    </label>

                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="location-out"
                        value="site"
                        checked={location === 'site'}
                        onChange={(e) => setLocation('site')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-900">🏗️ 現場</span>
                    </label>
                  </div>
                </div>

                {/* 現場選択 */}
                {location === 'site' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      現場を選択
                    </label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
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
                  className="w-full inline-flex justify-center items-center px-6 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-400"
                >
                  {actionLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                        className="w-6 h-6 mr-2"
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
  )
}
