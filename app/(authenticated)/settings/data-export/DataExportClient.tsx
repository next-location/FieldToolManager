'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface DataExportClientProps {
  counts: {
    tools: number
    consumables: number
    staff: number
    sites: number
    movements: number
    equipment: number
    clients: number
    purchaseOrders: number
    estimates: number
    invoices: number
  }
}

export function DataExportClient({ counts }: DataExportClientProps) {
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExport = async (type: string, label: string) => {
    setExporting(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/${type}/export`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'エクスポートに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: `${label}をエクスポートしました` })
    } catch (error) {
      console.error('Export error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'エクスポートに失敗しました',
      })
    } finally {
      setExporting(false)
    }
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

      {/* マスタデータ */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">マスタデータ</h2>
          <p className="mt-1 text-sm text-gray-500">
            基本的な登録データをエクスポートします
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          <ExportRow
            label="取引先マスタ"
            count={counts.clients}
            onExport={() => handleExport('clients', '取引先マスタ')}
            disabled={exporting}
          />
          <ExportRow
            label="道具マスタ"
            count={counts.tools}
            onExport={() => handleExport('tools', '道具マスタ')}
            disabled={exporting}
          />
          <ExportRow
            label="消耗品マスタ"
            count={counts.consumables}
            onExport={() => handleExport('consumables', '消耗品マスタ')}
            disabled={exporting}
          />
          <ExportRow
            label="スタッフ情報"
            count={counts.staff}
            onExport={() => handleExport('staff', 'スタッフ情報')}
            disabled={exporting}
          />
          <ExportRow
            label="現場情報"
            count={counts.sites}
            onExport={() => handleExport('sites', '現場情報')}
            disabled={exporting}
          />
          <ExportRow
            label="設備管理"
            count={counts.equipment}
            onExport={() => handleExport('equipment', '設備管理')}
            disabled={exporting}
          />
        </div>
      </div>

      {/* 取引・履歴データ */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">取引・履歴データ</h2>
          <p className="mt-1 text-sm text-gray-500">
            見積書、請求書、発注書、操作履歴や移動記録をエクスポートします
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          <ExportRow
            label="見積書一覧"
            count={counts.estimates}
            onExport={() => handleExport('estimates', '見積書一覧')}
            disabled={exporting}
          />
          <ExportRow
            label="請求書一覧"
            count={counts.invoices}
            onExport={() => handleExport('invoices', '請求書一覧')}
            disabled={exporting}
          />
          <ExportRow
            label="発注書一覧"
            count={counts.purchaseOrders}
            onExport={() => handleExport('purchase-orders', '発注書一覧')}
            disabled={exporting}
          />
          <ExportRow
            label="在庫移動履歴"
            count={Math.min(counts.movements, 1000)}
            onExport={() => handleExport('movements', '在庫移動履歴')}
            disabled={exporting}
            note="直近1000件"
          />
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📌 注意事項</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• エクスポートされるデータはCSV形式（Excel対応）です</li>
          <li>• BOM付きUTF-8エンコーディングで日本語が正しく表示されます</li>
          <li>• 削除済みデータは含まれません</li>
          <li>• 大量データの場合、処理に時間がかかることがあります</li>
        </ul>
      </div>
    </div>
  )
}

interface ExportRowProps {
  label: string
  count: number
  onExport: () => void
  disabled: boolean
  note?: string
}

function ExportRow({ label, count, onExport, disabled, note }: ExportRowProps) {
  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <span className="text-sm text-gray-500">({count.toLocaleString()}件)</span>
        </div>
        {note && <span className="text-xs text-gray-400 mt-1">{note}</span>}
      </div>
      <button
        onClick={onExport}
        disabled={disabled || count === 0}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        CSVエクスポート
      </button>
    </div>
  )
}
