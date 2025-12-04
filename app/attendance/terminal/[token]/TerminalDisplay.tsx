'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface TerminalData {
  organization_name: string
  device_type: 'office' | 'site'
  device_name: string
  site_name: string | null
  current_qr: {
    qr_data: string
    valid_until: string | null
  } | null
  refresh_interval: number
}

export function TerminalDisplay({ token }: { token: string }) {
  const [data, setData] = useState<TerminalData | null>(null)
  const [qrImage, setQrImage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // データ取得
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/attendance/terminal/${token}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '端末データの取得に失敗しました')
      }

      const terminalData = await response.json()
      setData(terminalData)

      // QRコード生成
      if (terminalData.current_qr?.qr_data) {
        const qrDataUrl = await QRCode.toDataURL(terminalData.current_qr.qr_data, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        setQrImage(qrDataUrl)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  // 初回データ取得
  useEffect(() => {
    fetchData()
  }, [token])

  // 定期更新
  useEffect(() => {
    if (!data) return

    const interval = setInterval(() => {
      fetchData()
    }, data.refresh_interval * 1000)

    return () => clearInterval(interval)
  }, [data, token])

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatValidUntil = (dateStr: string | null) => {
    if (!dateStr) return '期限なし'
    const date = new Date(dateStr)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">エラー</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {data.organization_name}
            </h1>
            <p className="text-xl text-gray-600">出退勤管理システム</p>
            {data.device_type === 'site' && data.site_name && (
              <p className="text-lg text-blue-600 mt-2 font-medium">
                {data.site_name}
              </p>
            )}
          </div>
        </div>

        {/* QRコード表示 */}
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {data.device_type === 'office' ? '📅 会社出退勤用QRコード' : '🏗️ 現場出退勤用QRコード'}
            </h2>
            <p className="text-gray-600">
              このQRコードをスキャンして出退勤してください
            </p>
          </div>

          {qrImage && data.current_qr ? (
            <div className="flex flex-col items-center">
              {/* QRコード */}
              <div className="bg-white p-8 rounded-xl shadow-lg mb-6">
                <img
                  src={qrImage}
                  alt="QR Code"
                  className="w-96 h-96"
                />
              </div>

              {/* 有効期限 */}
              {data.current_qr.valid_until && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 font-medium text-center">
                    有効期限: {formatValidUntil(data.current_qr.valid_until)}
                  </p>
                </div>
              )}

              {/* 説明 */}
              <div className="bg-blue-50 rounded-lg p-6 max-w-2xl">
                <h3 className="font-bold text-blue-900 mb-3 text-lg">
                  📱 使い方
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-800">
                  <li>スマートフォンのカメラアプリを起動</li>
                  <li>上記のQRコードをスキャン</li>
                  <li>表示されたリンクをタップ</li>
                  <li>出勤または退勤を選択</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                QRコードを生成中です...
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-2xl font-mono text-gray-700">
              現在時刻: {formatDateTime(currentTime)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {data.refresh_interval}秒ごとに自動更新
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
