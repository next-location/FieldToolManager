'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface Site {
  id: string
  name: string
}

interface ExistingQR {
  id: string
  site_id: string
  qr_data: string
  generated_at: string
  is_active: boolean
  sites: {
    name: string
  } | null
}

interface Props {
  sites: Site[]
  existingQRs: ExistingQR[]
}

interface QRState {
  [siteId: string]: {
    qr_data: string
    qr_image: string
    generated_at: string
  }
}

export default function SiteQRManagement({ sites, existingQRs }: Props) {
  const [qrStates, setQrStates] = useState<QRState>({})
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [viewingSiteId, setViewingSiteId] = useState<string | null>(null)

  // 初期データロード
  useEffect(() => {
    const loadExistingQRs = async () => {
      const newQrStates: QRState = {}

      for (const qr of existingQRs) {
        try {
          const qrImage = await QRCode.toDataURL(qr.qr_data, {
            width: 400,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          })

          newQrStates[qr.site_id] = {
            qr_data: qr.qr_data,
            qr_image: qrImage,
            generated_at: qr.generated_at,
          }
        } catch (error) {
          console.error('QRコード画像生成エラー:', error)
        }
      }

      setQrStates(newQrStates)
    }

    loadExistingQRs()
  }, [existingQRs])

  const handleGenerate = async (regenerate: boolean = false) => {
    if (!selectedSiteId) {
      setMessage({ type: 'error', text: '現場を選択してください' })
      return
    }

    // 既にQRが存在する場合、再生成フラグを確認
    if (qrStates[selectedSiteId] && !regenerate) {
      if (!confirm('この現場には既にQRコードが発行されています。再発行しますか？')) {
        return
      }
    }

    setIsGenerating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/qr/site/fixed/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_id: selectedSiteId,
          regenerate: qrStates[selectedSiteId] ? true : false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'QRコードの発行に失敗しました')
      }

      // QRコード画像生成
      const qrImage = await QRCode.toDataURL(data.qr_data, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      setQrStates((prev) => ({
        ...prev,
        [selectedSiteId]: {
          qr_data: data.qr_data,
          qr_image: qrImage,
          generated_at: new Date().toISOString(),
        },
      }))

      setViewingSiteId(selectedSiteId)
      setMessage({ type: 'success', text: data.message })
      setSelectedSiteId('')
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

  const handleDelete = async (siteId: string, siteName: string) => {
    if (!confirm(`${siteName}のQRコードを無効化しますか？\n無効化後、このQRコードは使用できなくなります。`)) {
      return
    }

    try {
      const response = await fetch(`/api/attendance/qr/site/fixed/${siteId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'QRコードの無効化に失敗しました')
      }

      // 状態から削除
      setQrStates((prev) => {
        const newStates = { ...prev }
        delete newStates[siteId]
        return newStates
      })

      if (viewingSiteId === siteId) {
        setViewingSiteId(null)
      }

      setMessage({ type: 'success', text: data.message })
    } catch (error) {
      console.error('QRコード無効化エラー:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'QRコードの無効化に失敗しました',
      })
    }
  }

  const handleView = (siteId: string) => {
    setViewingSiteId(viewingSiteId === siteId ? null : siteId)
  }

  const handleDownload = (siteId: string) => {
    const qr = qrStates[siteId]
    if (!qr) return

    const site = sites.find((s) => s.id === siteId)
    const link = document.createElement('a')
    link.href = qr.qr_image
    link.download = `site-fixed-qr-${site?.name || siteId}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = (siteId: string) => {
    const qr = qrStates[siteId]
    if (!qr) return

    const site = sites.find((s) => s.id === siteId)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>固定QRコード - ${site?.name}</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: sans-serif;
          }
          h1 {
            margin-bottom: 20px;
            font-size: 24px;
          }
          img {
            border: 4px solid #333;
            padding: 20px;
            background: white;
          }
          .info {
            margin-top: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
          }
          @media print {
            @page {
              margin: 2cm;
            }
          }
        </style>
      </head>
      <body>
        <h1>${site?.name} - 固定QRコード</h1>
        <img src="${qr.qr_image}" alt="QRコード" />
        <div class="info">
          <p>このQRコードは永続的に有効です</p>
          <p>スタッフは出退勤時にスキャンしてください</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // QRが発行済みの現場を除外
  const availableSites = sites.filter((site) => !qrStates[site.id])

  // QRが発行済みの現場リスト
  const sitesWithQR = sites.filter((site) => qrStates[site.id])

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

      {/* 新規QR発行フォーム */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">新規固定QR発行</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">現場選択</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value="">現場を選択してください</option>
              {availableSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            {availableSites.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">全ての現場にQRコードが発行されています</p>
            )}
          </div>

          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating || !selectedSiteId}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? '発行中...' : '固定QR発行'}
          </button>
        </div>

        <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">固定QRコードについて</h3>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>• 固定QRコードは永続的に有効です（期限なし）</li>
            <li>• タブレット端末に表示したり、印刷して現場に設置できます</li>
            <li>• セキュリティ上の理由で再発行が必要な場合、既存のQRは無効化されます</li>
            <li>• スタッフは出退勤時にこのQRコードをスキャンします</li>
          </ul>
        </div>
      </div>

      {/* 発行済みQR一覧 */}
      {sitesWithQR.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">発行済み固定QRコード</h2>

          <div className="space-y-4">
            {sitesWithQR.map((site) => {
              const qr = qrStates[site.id]
              const isViewing = viewingSiteId === site.id

              return (
                <div key={site.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{site.name}</h3>
                      <p className="text-sm text-gray-500">
                        発行日: {new Date(qr.generated_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(site.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        {isViewing ? '非表示' : '表示'}
                      </button>
                      <button
                        onClick={() => handleDownload(site.id)}
                        className="rounded-lg border-2 border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => handlePrint(site.id)}
                        className="rounded-lg border-2 border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        印刷
                      </button>
                      <button
                        onClick={() => handleDelete(site.id, site.name)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                      >
                        無効化
                      </button>
                    </div>
                  </div>

                  {isViewing && (
                    <div className="mt-4 flex justify-center border-t border-gray-200 pt-4">
                      <div className="rounded-lg border-4 border-gray-300 p-4 bg-white">
                        <img src={qr.qr_image} alt="QRコード" className="h-auto w-80" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
