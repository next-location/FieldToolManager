'use client'

import { useState } from 'react'

interface Site {
  id: string
  name: string
}

interface RegisterTerminalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  sitesList: Site[]
}

export function RegisterTerminalModal({
  isOpen,
  onClose,
  onSuccess,
  sitesList,
}: RegisterTerminalModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    device_name: '',
    device_type: 'office' as 'office' | 'site',
    site_id: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAccessToken(null)

    try {
      const response = await fetch('/api/attendance/terminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました')
      }

      // アクセストークンを表示
      setAccessToken(data.terminal.access_token)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (accessToken) {
      onSuccess()
    }
    setFormData({ device_name: '', device_type: 'office', site_id: '' })
    setAccessToken(null)
    setError(null)
    onClose()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose}></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              タブレット端末登録
            </h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
              {error}
            </div>
          )}

          {!accessToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 端末名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  端末名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  placeholder="例: 会社受付タブレット"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              {/* 端末タイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  端末タイプ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.device_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      device_type: e.target.value as 'office' | 'site',
                      site_id: e.target.value === 'office' ? '' : formData.site_id,
                    })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="office">会社用（会社QRコード表示）</option>
                  <option value="site">現場用（現場QRコード表示）</option>
                </select>
              </div>

              {/* 現場選択（現場端末の場合のみ） */}
              {formData.device_type === 'site' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    現場 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.site_id}
                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">選択してください</option>
                    {sitesList.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 説明 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 text-sm">📱 登録後の手順</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>登録完了後、アクセスURLが表示されます</li>
                  <li>タブレットのブラウザでそのURLを開いてください</li>
                  <li>QRコードが自動的に表示されます</li>
                  <li>ブックマークに登録して、常時表示してください</li>
                </ol>
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? '登録中...' : '登録'}
                </button>
              </div>
            </form>
          ) : (
            /* 登録完了画面 */
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-800 font-medium">端末を登録しました</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR表示URL（タブレットで開いてください）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/attendance/terminal/${accessToken}`}
                    className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-sm font-mono"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/attendance/terminal/${accessToken}`)
                    }
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  このURLはタブレット設定完了後は保存されません。必要に応じてメモしてください。
                </p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2 text-sm">⚠️ 重要</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                  <li>このURLは第三者に知られないよう管理してください</li>
                  <li>タブレットのブラウザでこのURLを開き、ブックマークに登録してください</li>
                  <li>QRコードは自動的に30秒ごとに更新されます</li>
                </ul>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleClose}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
