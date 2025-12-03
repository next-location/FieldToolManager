'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { QrCameraScanner } from '@/components/QrCameraScanner'

interface ToolItem {
  id: string
  serial_number: string
  qr_code: string
  current_location: string
  current_site_id: string | null
  warehouse_location_id: string | null
  status: string
  tools: {
    id: string
    name: string
    model_number: string
  }
}

interface Site {
  id: string
  name: string
}

interface WarehouseLocation {
  id: string
  code: string
  display_name: string
}

interface BulkMovementFormProps {
  toolItems: ToolItem[]
  sites: Site[]
  warehouseLocations: WarehouseLocation[]
}

type DestinationType = 'warehouse' | 'site' | 'repair'

export function BulkMovementForm({
  toolItems,
  sites,
  warehouseLocations,
}: BulkMovementFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // 移動先の状態
  const [destinationType, setDestinationType] = useState<DestinationType>('warehouse')
  const [destinationSiteId, setDestinationSiteId] = useState<string>('')
  const [destinationWarehouseLocationId, setDestinationWarehouseLocationId] = useState<string>('')

  // 選択された道具の状態
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const selectedToolIdsRef = useRef<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [qrScanMode, setQrScanMode] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [lastScannedTool, setLastScannedTool] = useState<string | null>(null)

  // QRコードスキャン処理（カメラ or 入力欄）
  const handleQrScan = async (qrCode: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedQr = qrCode.trim()
    if (!trimmedQr) {
      return { success: false, message: 'QRコードが空です' }
    }

    // QRコードで道具を検索
    const tool = toolItems.find((item) => item.qr_code === trimmedQr)

    if (!tool) {
      setError('QRコードが見つかりません')
      setTimeout(() => setError(null), 3000)
      return { success: false, message: 'QRコードが見つかりません' }
    }

    // Setを使って重複チェック（即座に反映）
    if (selectedToolIdsRef.current.has(tool.id)) {
      setError('この道具は既に選択されています')
      setTimeout(() => setError(null), 3000)
      return { success: false, message: 'この道具は既に選択されています' }
    }

    // Setに追加（即座に反映）
    selectedToolIdsRef.current.add(tool.id)

    // 状態を更新
    setSelectedToolIds((prev) => [...prev, tool.id])
    setLastScannedTool(`${tool.tools.name} (${tool.serial_number})`)
    setScanSuccess(true)
    setSearchQuery('') // 検索欄をクリア
    setTimeout(() => {
      setScanSuccess(false)
      setLastScannedTool(null)
    }, 2000) // 2秒後に成功表示を消す

    return { success: true }
  }

  // 検索欄でEnterキー押下時の処理
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (qrScanMode) {
        // QRスキャンモード: Enterで即座にスキャン
        handleQrScan(searchQuery)
      }
    }
  }

  // 道具を追加
  const handleAddTool = (toolItemId: string) => {
    if (!selectedToolIdsRef.current.has(toolItemId)) {
      selectedToolIdsRef.current.add(toolItemId)
      setSelectedToolIds([...selectedToolIds, toolItemId])
      setSearchQuery('') // 検索をクリア
    }
  }

  // 道具を削除
  const handleRemoveTool = (toolItemId: string) => {
    selectedToolIdsRef.current.delete(toolItemId)
    setSelectedToolIds(selectedToolIds.filter((id) => id !== toolItemId))
  }

  // すべてクリア
  const handleClearAll = () => {
    selectedToolIdsRef.current.clear()
    setSelectedToolIds([])
    setError(null)
  }

  // 一括登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (selectedToolIds.length === 0) {
      setError('道具を少なくとも1つ選択してください')
      return
    }

    if (destinationType === 'site' && !destinationSiteId) {
      setError('移動先の現場を選択してください')
      return
    }

    setIsSubmitting(true)
    setProgress({ current: 0, total: selectedToolIds.length })

    let successCount = 0
    const errors: string[] = []

    try {
      for (let i = 0; i < selectedToolIds.length; i++) {
        const toolItemId = selectedToolIds[i]
        setProgress({ current: i + 1, total: selectedToolIds.length })

        try {
          // 移動履歴を作成
          const { error: movementError } = await supabase.from('movements').insert({
            tool_item_id: toolItemId,
            from_location: toolItems.find((t) => t.id === toolItemId)?.current_location || '',
            to_location: destinationType,
            site_id: destinationType === 'site' ? destinationSiteId : null,
          })

          if (movementError) throw movementError

          // 道具の現在位置を更新
          const updateData: any = {
            current_location: destinationType,
            status: destinationType === 'repair' ? 'in_repair' : 'in_use',
          }

          if (destinationType === 'site') {
            updateData.current_site_id = destinationSiteId
            updateData.warehouse_location_id = null
          } else if (destinationType === 'warehouse') {
            updateData.current_site_id = null
            updateData.warehouse_location_id = destinationWarehouseLocationId || null
          } else if (destinationType === 'repair') {
            updateData.current_site_id = null
            updateData.warehouse_location_id = null
          }

          const { error: updateError } = await supabase
            .from('tool_items')
            .update(updateData)
            .eq('id', toolItemId)

          if (updateError) throw updateError

          successCount++
        } catch (err: any) {
          const tool = toolItems.find((t) => t.id === toolItemId)
          const toolName = tool ? `${tool.tools.name} (${tool.serial_number})` : toolItemId
          errors.push(`${toolName}: ${err.message}`)
        }
      }

      if (successCount === selectedToolIds.length) {
        // すべて成功
        router.push('/movements')
        router.refresh()
      } else if (successCount > 0) {
        // 一部成功
        setError(
          `${successCount}件の移動が完了しましたが、${errors.length}件でエラーが発生しました:\n${errors.join('\n')}`
        )
        // 成功した道具を選択から除外
        const failedIds = selectedToolIds.filter((id, index) => errors[index])
        setSelectedToolIds(failedIds)
      } else {
        // すべて失敗
        setError(`移動の登録に失敗しました:\n${errors.join('\n')}`)
      }
    } finally {
      setIsSubmitting(false)
      setProgress(null)
    }
  }

  // 検索フィルタリング
  const filteredTools = toolItems.filter((item) => {
    const query = searchQuery.toLowerCase()
    return (
      item.serial_number.toLowerCase().includes(query) ||
      item.tools.name.toLowerCase().includes(query) ||
      (item.tools.model_number?.toLowerCase() || '').includes(query)
    )
  })

  // 選択された道具の情報
  const selectedTools = selectedToolIds
    .map((id) => toolItems.find((t) => t.id === id))
    .filter(Boolean) as ToolItem[]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
          {error}
        </div>
      )}

      {/* 1. 移動先選択 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">1. 移動先を選択</h3>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setDestinationType('warehouse')}
            disabled={isSubmitting}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              destinationType === 'warehouse'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🏢</div>
            <div className="font-medium">倉庫</div>
          </button>

          <button
            type="button"
            onClick={() => setDestinationType('site')}
            disabled={isSubmitting}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              destinationType === 'site'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🏗️</div>
            <div className="font-medium">現場</div>
          </button>

          <button
            type="button"
            onClick={() => setDestinationType('repair')}
            disabled={isSubmitting}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              destinationType === 'repair'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🔧</div>
            <div className="font-medium">修理</div>
          </button>
        </div>

        {/* 現場選択 */}
        {destinationType === 'site' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現場 <span className="text-red-500">*</span>
            </label>
            <select
              value={destinationSiteId}
              onChange={(e) => setDestinationSiteId(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">現場を選択してください</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 倉庫位置選択（オプション） */}
        {destinationType === 'warehouse' && warehouseLocations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              倉庫位置（オプション）
            </label>
            <select
              value={destinationWarehouseLocationId}
              onChange={(e) => setDestinationWarehouseLocationId(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">倉庫位置を選択（任意）</option>
              {warehouseLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. 道具選択 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">2. 道具を選択</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              📷 カメラでスキャン
            </button>
            <button
              type="button"
              onClick={() => setQrScanMode(!qrScanMode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                qrScanMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⌨️ 手動入力{qrScanMode ? ' ON' : ''}
            </button>
          </div>
        </div>

        {/* 成功メッセージ */}
        {scanSuccess && lastScannedTool && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2 animate-pulse">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-semibold">読み取り成功！</div>
              <div className="text-sm">{lastScannedTool}</div>
            </div>
          </div>
        )}

        {/* 検索・スキャン入力欄 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {qrScanMode ? 'QRコードをスキャン（Enterで確定）' : '道具を検索して追加'}
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            disabled={isSubmitting}
            placeholder={qrScanMode ? 'QRコードをスキャンしてEnterキーを押してください' : 'シリアル番号、道具名、型番で検索...'}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              qrScanMode
                ? 'border-green-500 focus:ring-green-500 bg-green-50'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            autoFocus={qrScanMode}
          />
        </div>

        {/* 検索結果（QRスキャンモード時は非表示） */}
        {searchQuery && !qrScanMode && (
          <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
            {filteredTools.length === 0 ? (
              <div className="p-4 text-center text-gray-500">該当する道具がありません</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTools.slice(0, 20).map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleAddTool(tool.id)}
                    disabled={selectedToolIds.includes(tool.id) || isSubmitting}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                      selectedToolIds.includes(tool.id)
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{tool.tools.name}</div>
                    <div className="text-xs text-gray-500">
                      {tool.serial_number} • {tool.tools.model_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      現在位置:{' '}
                      {tool.current_location === 'warehouse'
                        ? '倉庫'
                        : tool.current_location === 'site'
                        ? '現場'
                        : '修理中'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. 選択済み道具リスト */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            3. 選択中の道具（{selectedTools.length}件）
          </h3>
          {selectedTools.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isSubmitting}
              className="text-sm text-red-600 hover:text-red-700"
            >
              すべてクリア
            </button>
          )}
        </div>

        {selectedTools.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            道具が選択されていません
            <br />
            上の検索欄から道具を選択してください
          </div>
        ) : (
          <div className="border border-gray-300 rounded-md divide-y divide-gray-200 max-h-80 overflow-y-auto">
            {selectedTools.map((tool) => (
              <div key={tool.id} className="p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{tool.tools.name}</div>
                  <div className="text-xs text-gray-500">
                    {tool.serial_number} • {tool.tools.model_number}
                  </div>
                  <div className="text-xs text-gray-500">
                    現在位置:{' '}
                    {tool.current_location === 'warehouse'
                      ? '倉庫'
                      : tool.current_location === 'site'
                      ? '現場'
                      : '修理中'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTool(tool.id)}
                  disabled={isSubmitting}
                  className="ml-4 text-red-600 hover:text-red-700 disabled:text-gray-400"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 進捗表示 */}
      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              登録中... ({progress.current} / {progress.total})
            </span>
            <span className="text-sm text-blue-700">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting || selectedTools.length === 0}
          className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? '登録中...' : `${selectedTools.length}件を一括登録`}
        </button>

        <a
          href="/movements"
          className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 text-center"
        >
          キャンセル
        </a>
      </div>

      {/* QRカメラスキャナー */}
      {showCamera && (
        <QrCameraScanner
          onScan={async (qrCode) => {
            return await handleQrScan(qrCode)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </form>
  )
}
