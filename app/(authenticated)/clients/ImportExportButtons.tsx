'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ImportExportButtonsProps {
  filters?: {
    client_type?: string
    is_active?: string
  }
}

export default function ImportExportButtons({ filters }: ImportExportButtonsProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: number
    errors: Array<{ row: number; error: string; data: string }>
  } | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      // フィルターをクエリパラメータに変換
      const params = new URLSearchParams()
      if (filters?.client_type) params.append('client_type', filters.client_type)
      if (filters?.is_active) params.append('is_active', filters.is_active)

      const response = await fetch(`/api/clients/export?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'エクスポートに失敗しました')
      }

      // ファイルをダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'インポートに失敗しました')
      }

      setImportResult(data.results)

      // 成功したらリストを更新
      if (data.results.success > 0) {
        router.refresh()
      }

      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {exporting ? 'エクスポート中...' : 'CSVエクスポート'}
        </button>

        <button
          onClick={handleImportClick}
          disabled={importing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {importing ? 'インポート中...' : 'CSVインポート'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* インポート結果表示 */}
      {importResult && (
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">インポート結果</h3>
          <p className="text-sm text-gray-600 mb-3">
            成功: <span className="font-bold text-green-600">{importResult.success}件</span>
            {importResult.errors.length > 0 && (
              <>
                {' '}
                / エラー: <span className="font-bold text-red-600">{importResult.errors.length}件</span>
              </>
            )}
          </p>

          {importResult.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">エラー詳細:</h4>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">行</th>
                      <th className="px-3 py-2 text-left">エラー</th>
                      <th className="px-3 py-2 text-left">データ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importResult.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{err.row}</td>
                        <td className="px-3 py-2 text-red-600">{err.error}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs truncate max-w-xs">
                          {err.data}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={() => setImportResult(null)}
            className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
          >
            閉じる
          </button>
        </div>
      )}
    </>
  )
}
