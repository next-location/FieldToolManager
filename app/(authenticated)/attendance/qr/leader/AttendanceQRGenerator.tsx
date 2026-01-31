'use client'

import { useState, useEffect } from 'react'

interface Site {
  id: string
  name: string
}

interface ExistingQR {
  id: string
  site_id: string
  qr_code_data: string
  qr_image?: string
  generated_at: string
  expires_at: string
  is_active: boolean
  sites: {
    name: string
  } | null
}

interface Props {
  sites: Site[]
  existingQRs: ExistingQR[]
  userRole: string
  isAdminOrManager: boolean
}

interface QRState {
  [siteId: string]: {
    qr_data: string
    qr_image: string
    generated_at: string
    expires_at: string
  }
}

interface OfficeQRState {
  qr_data: string
  qr_image: string
  valid_from: string
  valid_until: string
  days_remaining: number
}

export default function AttendanceQRGenerator({ sites, existingQRs, userRole, isAdminOrManager }: Props) {
  // 現場QR状態
  const [qrStates, setQrStates] = useState<QRState>({})
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [viewingSiteId, setViewingSiteId] = useState<string | null>(null)

  // 会社QR状態
  const [officeQR, setOfficeQR] = useState<OfficeQRState | null>(null)
  const [isGeneratingOffice, setIsGeneratingOffice] = useState(false)
  const [showOfficeQR, setShowOfficeQR] = useState(false)

  // 既存の現場QRをロード
  useEffect(() => {
    const newQrStates: QRState = {}

    for (const qr of existingQRs) {
      newQrStates[qr.site_id] = {
        qr_data: qr.qr_code_data,
        qr_image: qr.qr_image || '',
        generated_at: qr.generated_at,
        expires_at: qr.expires_at,
      }
    }

    setQrStates(newQrStates)
  }, [existingQRs])

  // 会社QRをロード
  useEffect(() => {
    if (isAdminOrManager) {
      loadOfficeQR()
    }
  }, [isAdminOrManager])

  const loadOfficeQR = async () => {
    try {
      const response = await fetch('/api/attendance/qr/office/current')
      if (response.ok) {
        const data = await response.json()
        setOfficeQR({
          qr_data: data.qr_data,
          qr_image: data.qr_image,
          valid_from: data.valid_from,
          valid_until: data.valid_until,
          days_remaining: data.days_remaining,
        })
      }
    } catch (error) {
      console.error('会社QR取得エラー:', error)
    }
  }

  const handleGenerateOffice = async () => {
    setIsGeneratingOffice(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/qr/office/generate', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '会社QRコードの発行に失敗しました')
      }

      setOfficeQR({
        qr_data: data.qr_data,
        qr_image: data.qr_image,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        days_remaining: data.days_remaining,
      })

      setShowOfficeQR(true)
      setMessage({ type: 'success', text: '会社QRコードを発行しました' })
    } catch (error: any) {
      console.error('会社QR発行エラー:', error)
      setMessage({ type: 'error', text: error.message || '会社QRコードの発行に失敗しました' })
    } finally {
      setIsGeneratingOffice(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedSiteId) {
      setMessage({ type: 'error', text: '現場を選択してください' })
      return
    }

    setIsGenerating(true)
    setMessage(null)

    try {
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

      setQrStates((prev) => ({
        ...prev,
        [selectedSiteId]: {
          qr_data: data.qr_data,
          qr_image: data.qr_image,
          generated_at: data.generated_at,
          expires_at: data.expires_at,
        },
      }))

      setViewingSiteId(selectedSiteId)
      setSelectedSiteId('')
      setMessage({ type: 'success', text: data.message })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsGenerating(false)
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
    link.download = `site-qr-${site?.name || siteId}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadOffice = () => {
    if (!officeQR) return

    const link = document.createElement('a')
    link.href = officeQR.qr_image
    link.download = `office-qr.png`
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
        <title>現場QRコード - ${site?.name}</title>
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
        <h1>${site?.name} - 現場QRコード</h1>
        <img src="${qr.qr_image}" alt="QRコード" />
        <div class="info">
          <p>発行日時: ${new Date(qr.generated_at).toLocaleString('ja-JP')}</p>
          <p>有効期限: ${new Date(qr.expires_at).toLocaleString('ja-JP')}</p>
          <p>期限切れ後は新しいQRコードを発行してください</p>
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

  const handlePrintOffice = () => {
    if (!officeQR) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>会社QRコード</title>
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
        <h1>会社QRコード</h1>
        <img src="${officeQR.qr_image}" alt="QRコード" />
        <div class="info">
          <p>有効期限: ${new Date(officeQR.valid_until).toLocaleString('ja-JP')}</p>
          <p>残り ${officeQR.days_remaining} 日</p>
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

      {/* 会社QR発行セクション（管理者のみ） */}
      {isAdminOrManager && (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">会社QR発行（管理者専用）</h2>

          {officeQR ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                {/* スマホ: 縦並び、PC: 横並び */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">会社QRコード</h3>
                    <p className="text-sm text-gray-500">
                      有効期限: {new Date(officeQR.valid_until).toLocaleString('ja-JP')}
                    </p>
                    <p className="text-sm text-gray-500">残り {officeQR.days_remaining} 日</p>
                  </div>
                  {/* スマホ: 2x2グリッド、PC: 横並び */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                    <button
                      onClick={() => setShowOfficeQR(!showOfficeQR)}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      {showOfficeQR ? '非表示' : '表示'}
                    </button>
                    <button
                      onClick={handleDownloadOffice}
                      className="rounded-lg border-2 border-blue-600 bg-white px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      保存
                    </button>
                    <button
                      onClick={handlePrintOffice}
                      className="rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      印刷
                    </button>
                    <button
                      onClick={handleGenerateOffice}
                      disabled={isGeneratingOffice}
                      className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:bg-gray-300"
                    >
                      {isGeneratingOffice ? '再発行中...' : '再発行'}
                    </button>
                  </div>
                </div>
              </div>

              {showOfficeQR && (
                <div className="flex justify-center border-t border-gray-200 pt-4">
                  <div className="rounded-lg border-4 border-gray-300 p-4 bg-white">
                    <img src={officeQR.qr_image} alt="会社QRコード" className="h-auto w-80" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleGenerateOffice}
              disabled={isGeneratingOffice}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isGeneratingOffice ? '発行中...' : '会社QR発行'}
            </button>
          )}

          <div className="mt-4 rounded-lg bg-blue-50 p-4 border border-blue-200">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">会社QRコードについて</h3>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>• 会社での出退勤に使用するQRコードです</li>
              <li>• 管理者・マネージャーのみ発行できます</li>
              <li>• 有効期限は出退勤設定で指定した日数です</li>
              <li>• 会社の入口に印刷して貼るか、タブレットに表示してください</li>
            </ul>
          </div>
        </div>
      )}

      {/* 現場QR発行フォーム */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">現場QR発行</h2>

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
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}{qrStates[site.id] ? ' （発行済み）' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedSiteId}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? '発行中...' : selectedSiteId && qrStates[selectedSiteId] ? 'QRコード再発行' : 'QRコード発行'}
          </button>
        </div>

        <div className="mt-6 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
          <h3 className="mb-2 text-sm font-semibold text-yellow-900">注意事項</h3>
          <ul className="space-y-1 text-xs text-yellow-800">
            <li>• 発行されたQRコードは設定された有効期限まで使用できます</li>
            <li>• 有効期限は出退勤設定の「QR更新頻度」で設定されます（1日/3日/7日/30日）</li>
            <li>• 期限切れ後は新しくQRコードを発行してください</li>
            <li>• スタッフは出退勤時にこのQRコードをスキャンします</li>
            <li>• QRコードは印刷するか、タブレットで表示してください</li>
          </ul>
        </div>
      </div>

      {/* 発行済み現場QR一覧 */}
      {sitesWithQR.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">有効な現場QRコード</h2>

          <div className="space-y-4">
            {sitesWithQR.map((site) => {
              const qr = qrStates[site.id]
              const isViewing = viewingSiteId === site.id
              const expiresAt = new Date(qr.expires_at)
              const now = new Date()
              const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div key={site.id} className="rounded-lg border border-gray-200 p-4">
                  {/* スマホ: 縦並び、PC: 横並び */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{site.name}</h3>
                      <p className="text-sm text-gray-500">
                        有効期限: {expiresAt.toLocaleString('ja-JP')}
                      </p>
                      <p className="text-sm text-gray-500">残り {daysRemaining} 日</p>
                    </div>
                    {/* スマホ: 2x2グリッド、PC: 横並び */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                      <button
                        onClick={() => handleView(site.id)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        {isViewing ? '非表示' : '表示'}
                      </button>
                      <button
                        onClick={() => handleDownload(site.id)}
                        className="rounded-lg border-2 border-blue-600 bg-white px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => handlePrint(site.id)}
                        className="rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        印刷
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSiteId(site.id)
                          handleGenerate()
                        }}
                        disabled={isGenerating}
                        className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:bg-gray-300"
                      >
                        {isGenerating ? '再発行中...' : '再発行'}
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
