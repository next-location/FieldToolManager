'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

interface Site {
  id: string
  name: string
}

interface Props {
  sites: Site[]
}

export default function LeaderQRGenerator({ sites }: Props) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrInfo, setQrInfo] = useState<{
    site_name: string
    valid_date: string
    qr_data: string
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleGenerate = async () => {
    if (!selectedSiteId) {
      setMessage({ type: 'error', text: '現場を選択してください' })
      return
    }

    setIsGenerating(true)
    setMessage(null)

    try {
      // QRコード発行API呼び出し
      const response = await fetch('/api/attendance/qr/site/leader/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_id: selectedSiteId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'QRコードの発行に失敗しました')
      }

      // QRコード画像生成
      const qrImageUrl = await QRCode.toDataURL(data.qr_data, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      setQrDataUrl(qrImageUrl)
      setQrInfo({
        site_name: data.site_name,
        valid_date: data.valid_date,
        qr_data: data.qr_data,
      })
      setMessage({ type: 'success', text: data.message })
    } catch (error) {
      console.error('QRコード発行エラー:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'QRコードの発行に失敗しました',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `leader-qr-${qrInfo?.site_name}-${qrInfo?.valid_date}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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

      {/* QR発行フォーム */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">QRコード発行</h2>

        <div className="space-y-4">
          {/* 現場選択 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">現場選択</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value="">現場を選択してください</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          {/* 発行ボタン */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedSiteId}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? '発行中...' : 'QRコード発行'}
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
          <h3 className="mb-2 text-sm font-semibold text-yellow-900">注意事項</h3>
          <ul className="space-y-1 text-xs text-yellow-800">
            <li>• 発行されたQRコードは当日のみ有効です</li>
            <li>• 翌日以降は新しくQRコードを発行してください</li>
            <li>• スタッフは出退勤時にこのQRコードをスキャンします</li>
            <li>• QRコードは印刷するか、タブレットで表示してください</li>
          </ul>
        </div>
      </div>

      {/* QRコード表示エリア */}
      {qrDataUrl && qrInfo && (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">発行されたQRコード</h2>

          <div className="space-y-6">
            {/* QRコード情報 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-gray-600">現場名</span>
                <p className="mt-1 font-medium text-gray-900">{qrInfo.site_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">有効期限</span>
                <p className="mt-1 font-medium text-gray-900">{qrInfo.valid_date}</p>
              </div>
            </div>

            {/* QRコード画像 */}
            <div className="flex justify-center">
              <div className="rounded-lg border-4 border-gray-200 p-4 bg-white">
                <img src={qrDataUrl} alt="QRコード" className="h-auto w-80" />
              </div>
            </div>

            {/* アクションボタン */}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={handlePrint}
                className="rounded-lg border-2 border-blue-600 bg-white px-4 py-2.5 font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                印刷する
              </button>
              <button
                onClick={handleDownload}
                className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
              >
                画像として保存
              </button>
            </div>

            {/* 使用方法 */}
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">使用方法</h3>
              <ol className="space-y-1 text-xs text-blue-800 list-decimal list-inside">
                <li>このQRコードを印刷するか、タブレットで表示します</li>
                <li>現場の見やすい場所に設置します</li>
                <li>スタッフは出勤時・退勤時にスマホでスキャンします</li>
                <li>スキャンすると自動的に出退勤が記録されます</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
