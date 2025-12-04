'use client'

import { useState, useEffect } from 'react'

interface Alert {
  id: string
  alert_type: string
  target_date: string
  title: string
  message: string
  is_resolved: boolean
  created_at: string
  metadata: any
}

interface Props {
  userRole: string
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  checkin_reminder: '出勤忘れ',
  checkout_reminder: '退勤忘れ',
  qr_expiry_warning: 'QR期限警告',
  overtime_alert: '長時間労働',
  daily_report: '日次レポート',
}

const ALERT_TYPE_COLORS: Record<string, string> = {
  checkin_reminder: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  checkout_reminder: 'bg-orange-100 text-orange-800 border-orange-200',
  qr_expiry_warning: 'bg-purple-100 text-purple-800 border-purple-200',
  overtime_alert: 'bg-red-100 text-red-800 border-red-200',
  daily_report: 'bg-blue-100 text-blue-800 border-blue-200',
}

export default function AlertsList({ userRole }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [filter])

  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('is_resolved', (filter === 'resolved').toString())
      }

      const response = await fetch(`/api/attendance/alerts?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setAlerts(data.alerts || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'アラートの取得に失敗しました' })
      }
    } catch (error) {
      console.error('アラート取得エラー:', error)
      setMessage({ type: 'error', text: 'アラートの取得に失敗しました' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async (alertIds: string[]) => {
    if (alertIds.length === 0) return

    try {
      const response = await fetch('/api/attendance/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_ids: alertIds,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setSelectedAlerts(new Set())
        fetchAlerts()
      } else {
        setMessage({ type: 'error', text: data.error || 'アラートの解決に失敗しました' })
      }
    } catch (error) {
      console.error('アラート解決エラー:', error)
      setMessage({ type: 'error', text: 'アラートの解決に失敗しました' })
    }
  }

  const handleToggleSelect = (alertId: string) => {
    const newSelected = new Set(selectedAlerts)
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId)
    } else {
      newSelected.add(alertId)
    }
    setSelectedAlerts(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedAlerts.size === unresolvedAlerts.length) {
      setSelectedAlerts(new Set())
    } else {
      setSelectedAlerts(new Set(unresolvedAlerts.map((a) => a.id)))
    }
  }

  const unresolvedAlerts = alerts.filter((a) => !a.is_resolved)

  return (
    <div className="space-y-6">
      {/* メッセージ表示 */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* フィルター */}
      <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm border border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unresolved')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'unresolved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            未解決
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'resolved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            解決済み
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全て
          </button>
        </div>

        {filter === 'unresolved' && selectedAlerts.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedAlerts.size}件選択中</span>
            <button
              onClick={() => handleResolve(Array.from(selectedAlerts))}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              解決済みにする
            </button>
          </div>
        )}
      </div>

      {/* 一括選択 */}
      {filter === 'unresolved' && unresolvedAlerts.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 border border-gray-200">
          <input
            type="checkbox"
            checked={selectedAlerts.size === unresolvedAlerts.length && unresolvedAlerts.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">全て選択</span>
        </div>
      )}

      {/* アラート一覧 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">読み込み中...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-lg bg-white p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">アラートはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const colorClass = ALERT_TYPE_COLORS[alert.alert_type] || 'bg-gray-100 text-gray-800'

            return (
              <div
                key={alert.id}
                className={`rounded-lg bg-white p-4 shadow-sm border transition-colors ${
                  alert.is_resolved ? 'border-gray-200 opacity-60' : 'border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {!alert.is_resolved && (
                    <input
                      type="checkbox"
                      checked={selectedAlerts.has(alert.id)}
                      onChange={() => handleToggleSelect(alert.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${colorClass}`}>
                        {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
                      </span>
                      {alert.is_resolved && (
                        <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 border border-green-200">
                          解決済み
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(alert.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2">{alert.title}</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{alert.message}</p>

                    {!alert.is_resolved && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleResolve([alert.id])}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          解決済みにする →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
