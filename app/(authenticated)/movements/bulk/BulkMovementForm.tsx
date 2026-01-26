'use client'

import { useState, useRef, useEffect } from 'react'
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
  tool_id: string
  tools: {
    id: string
    name: string
    model_number: string
  } | null
  current_site?: {
    id: string
    name: string
  }[] | null
  warehouse_location?: {
    id: string
    code: string
    display_name: string
  } | null
  inToolSet?: boolean
  toolSetName?: string | null
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

interface ToolSet {
  id: string
  name: string
  description: string | null
  tool_set_items: {
    tool_item: ToolItem | null
  }[]
}

interface BulkMovementFormProps {
  toolItems: ToolItem[]
  sites: Site[]
  warehouseLocations: WarehouseLocation[]
  toolSets: ToolSet[]
  scannedItemIds: string[]
  selectedToolSetId: string | null
  organizationId: string
  userId: string
  userRole: string
}

type DestinationType = 'warehouse' | 'site' | 'repair'
type SelectionMode = 'individual' | 'set'

export function BulkMovementForm({
  toolItems,
  sites,
  warehouseLocations,
  toolSets,
  scannedItemIds,
  selectedToolSetId: initialToolSetId,
  organizationId,
  userId,
  userRole,
}: BulkMovementFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // リーダー以上かどうか
  const canRemoveFromSet = userRole === 'admin' || userRole === 'manager' || userRole === 'leader'

  // 移動先の状態
  const [destinationType, setDestinationType] = useState<DestinationType>('warehouse')
  const [destinationSiteId, setDestinationSiteId] = useState<string>('')
  const [destinationWarehouseLocationId, setDestinationWarehouseLocationId] = useState<string>('')

  // 選択モード（セットIDがある場合はset、ない場合はindividual）
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(initialToolSetId ? 'set' : 'individual')

  // 選択された道具の状態（スキャン済みIDで初期化）
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(scannedItemIds)
  const selectedToolIdsRef = useRef<Set<string>>(new Set(scannedItemIds))
  const [searchQuery, setSearchQuery] = useState('')
  const [showCamera, setShowCamera] = useState(false)

  // 道具セット選択（初期値をpropsから設定）
  const [selectedToolSetId, setSelectedToolSetId] = useState<string>(initialToolSetId || '')

  // 同じ場所制限（一括移動は同じ場所の道具のみ）
  const [requiredLocation, setRequiredLocation] = useState<string | null>(null)

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [lastScannedTool, setLastScannedTool] = useState<string | null>(null)

  // QRコードスキャン処理（カメラのみ）
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

    // セット登録済み道具のチェック
    if (tool.inToolSet) {
      if (!canRemoveFromSet) {
        // 一般スタッフ：選択不可
        setError(
          `この道具はセット「${tool.toolSetName}」に登録されています。\n\n` +
          `スタッフ権限では移動できません（道具セットタブからのみ移動可能）`
        )
        setTimeout(() => setError(null), 5000)
        return {
          success: false,
          message: `この道具はセット「${tool.toolSetName}」に登録されています。スタッフ権限では移動できません`
        }
      } else {
        // リーダー以上：確認ダイアログ（削除を明示）
        const confirmed = window.confirm(
          `⚠️ 道具セット削除の警告\n\nこの道具はセット「${tool.toolSetName}」に登録されています。\n\n個別移動すると、このセットは完全に削除されます。\n\nセットを削除して個別移動しますか？`
        )
        if (!confirmed) {
          return { success: false, message: 'キャンセルしました' }
        }

        // セットから解除
        try {
          const { error: removeError } = await supabase
            .from('tool_set_items')
            .delete()
            .eq('tool_item_id', tool.id)

          if (removeError) {
            setError(`セット解除に失敗: ${removeError.message}`)
            setTimeout(() => setError(null), 5000)
            return { success: false, message: `セット解除に失敗: ${removeError.message}` }
          }
        } catch (err) {
          setError('セット解除中にエラーが発生しました')
          setTimeout(() => setError(null), 5000)
          return { success: false, message: 'セット解除中にエラーが発生しました' }
        }
      }
    }

    // 場所チェック（個別選択モードのみ）
    if (selectionMode === 'individual') {
      if (requiredLocation === null) {
        // 最初の1個：場所を記録
        setRequiredLocation(tool.current_location)
      } else if (tool.current_location !== requiredLocation) {
        // 異なる場所の道具
        const locationName = requiredLocation === 'warehouse' ? '倉庫' : requiredLocation === 'site' ? '現場' : '修理中'
        setError(`現在地が異なるため選択できません（選択中は全て${locationName}にある道具のみ）`)
        setTimeout(() => setError(null), 5000)
        return { success: false, message: `現在地が異なるため選択できません（選択中は全て${locationName}にある道具のみ）` }
      }
    }

    // Setに追加（即座に反映）
    selectedToolIdsRef.current.add(tool.id)

    // 状態を更新
    setSelectedToolIds((prev) => [...prev, tool.id])
    setLastScannedTool(`${tool.tools?.name || '不明'} (${tool.serial_number})`)
    setScanSuccess(true)
    setTimeout(() => {
      setScanSuccess(false)
      setLastScannedTool(null)
    }, 2000)

    return { success: true }
  }

  // 検索して手動で道具を追加
  const handleAddTool = async (toolId: string) => {
    if (selectedToolIds.includes(toolId)) return

    const tool = toolItems.find(t => t.id === toolId)
    if (!tool) return

    // セット登録済み道具のチェック
    if (tool.inToolSet) {
      if (!canRemoveFromSet) {
        // 一般スタッフ：選択不可
        setError(
          `この道具はセット「${tool.toolSetName}」に登録されています。\n\n` +
          `スタッフ権限では移動できません（道具セットタブからのみ移動可能）`
        )
        setTimeout(() => setError(null), 5000)
        return
      } else {
        // リーダー以上：確認ダイアログ（削除を明示）
        const confirmed = window.confirm(
          `⚠️ 道具セット削除の警告\n\nこの道具はセット「${tool.toolSetName}」に登録されています。\n\n個別移動すると、このセットは完全に削除されます。\n\nセットを削除して個別移動しますか？`
        )
        if (!confirmed) return

        // セットから解除
        try {
          const { error: removeError } = await supabase
            .from('tool_set_items')
            .delete()
            .eq('tool_item_id', toolId)

          if (removeError) {
            setError(`セット解除に失敗しました: ${removeError.message}`)
            return
          }
        } catch (err) {
          setError('セット解除中にエラーが発生しました')
          return
        }
      }
    }

    // 場所チェック（個別選択モードのみ）
    if (selectionMode === 'individual') {
      if (requiredLocation === null) {
        // 最初の1個：場所を記録
        setRequiredLocation(tool.current_location)
      } else if (tool.current_location !== requiredLocation) {
        // 異なる場所の道具
        const locationName = requiredLocation === 'warehouse' ? '倉庫' : requiredLocation === 'site' ? '現場' : '修理中'
        setError(`現在地が異なるため選択できません（選択中は全て${locationName}にある道具のみ）`)
        return
      }
    }

    selectedToolIdsRef.current.add(toolId)
    setSelectedToolIds((prev) => [...prev, toolId])
    setSearchQuery('')
  }

  // 道具を削除
  const handleRemoveTool = (toolId: string) => {
    selectedToolIdsRef.current.delete(toolId)
    const newSelected = selectedToolIds.filter((id) => id !== toolId)
    setSelectedToolIds(newSelected)

    // 全て削除された場合は場所制限をリセット
    if (newSelected.length === 0) {
      setRequiredLocation(null)
    }
  }

  // すべてクリア
  const handleClearAll = () => {
    setSelectedToolIds([])
    selectedToolIdsRef.current.clear()
    setSelectedToolSetId('')
    setRequiredLocation(null)
  }

  // 選択された道具の倉庫位置をデフォルト設定
  useEffect(() => {
    if (selectedToolIds.length > 0 && destinationType === 'site') {
      // 現在倉庫にある道具を探す
      const selectedTools = toolItems.filter(item => selectedToolIds.includes(item.id))
      const warehouseTools = selectedTools.filter(item => item.current_location === 'warehouse' && item.warehouse_location_id)

      if (warehouseTools.length > 0) {
        // 最初の道具の倉庫位置をデフォルトとして設定
        const defaultLocationId = warehouseTools[0].warehouse_location_id
        if (defaultLocationId && !destinationWarehouseLocationId) {
          setDestinationWarehouseLocationId(defaultLocationId)
        }
      }
    }
  }, [selectedToolIds, destinationType, toolItems])

  // タブ切り替え
  const handleTabChange = (mode: SelectionMode) => {
    setSelectionMode(mode)
    setSelectedToolIds([])
    setSelectedToolSetId('')
    selectedToolIdsRef.current.clear()
    setSearchQuery('')
    setError(null)
    setRequiredLocation(null)
  }

  // 道具セット選択
  const handleToolSetSelect = (toolSetId: string) => {
    setSelectedToolSetId(toolSetId)

    const toolSet = toolSets.find(set => set.id === toolSetId)
    if (toolSet) {
      const itemIds = toolSet.tool_set_items
        .map(item => item.tool_item?.id)
        .filter((id): id is string => !!id)

      setSelectedToolIds(itemIds)
      selectedToolIdsRef.current = new Set(itemIds)

      // セット内の最初の道具の場所を取得して設定
      const firstItem = toolSet.tool_set_items[0]?.tool_item
      if (firstItem) {
        setRequiredLocation(firstItem.current_location)
      }
    }
  }

  // 移動実行
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedToolIds.length === 0) {
      setError('道具を選択してください')
      return
    }

    if (destinationType === 'site' && !destinationSiteId) {
      setError('現場を選択してください')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setProgress({ current: 0, total: selectedToolIds.length })

    try {
      let successCount = 0
      const errors: string[] = []

      for (let i = 0; i < selectedToolIds.length; i++) {
        const toolItemId = selectedToolIds[i]
        setProgress({ current: i + 1, total: selectedToolIds.length })

        try {
          const tool = toolItems.find((t) => t.id === toolItemId)
          if (!tool) {
            throw new Error('道具が見つかりません')
          }

          // 移動種別を判定
          const from = tool.current_location
          const to = destinationType
          let movementType = ''

          if (to === 'repair') movementType = 'repair'
          else if (from === 'repair' && to === 'warehouse') movementType = 'return_from_repair'
          else if (from === 'warehouse' && to === 'warehouse') movementType = 'warehouse_move'
          else if (from === 'warehouse' && to === 'site') movementType = 'check_out'
          else if (from === 'site' && to === 'warehouse') movementType = 'check_in'
          else if (from === 'site' && to === 'site') movementType = 'transfer'

          // 移動履歴を登録
          console.log('[MOVEMENT INSERT START]', toolItemId, 'from', from, 'to', to)
          const { error: movementError } = await supabase.from('tool_movements').insert({
            organization_id: organizationId,
            performed_by: userId,
            tool_id: tool.tools?.id,
            tool_item_id: toolItemId,
            movement_type: movementType,
            from_location: from,
            to_location: to,
            from_site_id: tool.current_site_id || null,
            to_site_id: destinationType === 'site' ? destinationSiteId : null,
            quantity: 1,
            notes: selectionMode === 'set' && selectedToolSetId
              ? `[セット: ${toolSets.find(s => s.id === selectedToolSetId)?.name || '不明'}]`
              : null,
          })

          if (movementError) {
            console.error('[MOVEMENT INSERT ERROR]', movementError)
            throw movementError
          }
          console.log('[MOVEMENT INSERT SUCCESS]', toolItemId)

          // 道具の現在地を更新
          let updateData: any = {}

          if (destinationType === 'site') {
            updateData = {
              current_location: 'site',
              current_site_id: destinationSiteId,
              status: 'in_use',
              // 元の倉庫位置を保持（指定されている場合）
              warehouse_location_id: destinationWarehouseLocationId || tool.warehouse_location_id || null,
            }
          } else if (destinationType === 'warehouse') {
            updateData = {
              current_location: 'warehouse',
              current_site_id: null,
              warehouse_location_id: destinationWarehouseLocationId || null,
              status: 'available',
            }
          } else if (destinationType === 'repair') {
            updateData.current_location = 'repair'
            updateData.status = 'maintenance'
            updateData.current_site_id = null
            updateData.warehouse_location_id = null
          }

          console.log('[TOOL UPDATE START]', toolItemId, 'updateData:', updateData)

          const { error: updateError } = await supabase
            .from('tool_items')
            .update(updateData)
            .eq('id', toolItemId)

          if (updateError) {
            console.error('[TOOL UPDATE ERROR]', toolItemId, updateError)
            throw updateError
          }

          console.log('[TOOL UPDATED]', toolItemId, 'to', destinationType)

          successCount++
        } catch (err: any) {
          console.error('[MOVEMENT ERROR]', toolItemId, err)
          const tool = toolItems.find((t) => t.id === toolItemId)
          const toolName = tool ? `${tool.tools?.name || '不明'} (${tool.serial_number})` : toolItemId
          errors.push(`${toolName}: ${err.message}`)
        }
      }

      if (successCount === selectedToolIds.length) {
        // すべて成功 - セット削除処理を実行
        const toolSetsToDeleteStr = sessionStorage.getItem('toolSetsToDelete')
        console.log('[BULK MOVEMENT] sessionStorageから取得:', toolSetsToDeleteStr)
        if (toolSetsToDeleteStr) {
          try {
            const toolSetsToDelete = JSON.parse(toolSetsToDeleteStr) as string[]
            console.log('[BULK MOVEMENT] セット削除API呼び出し開始:', toolSetsToDelete)

            // セット削除APIを呼び出し
            const response = await fetch('/api/tool-sets/delete-for-individual-move', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                toolSetIds: toolSetsToDelete
              })
            })

            const result = await response.json()
            console.log('[BULK MOVEMENT] セット削除APIレスポンス:', response.status, result)

            if (response.ok && result.success) {
              console.log('[BULK MOVEMENT] セット削除成功:', result.deletedSets)
            } else {
              console.error('[BULK MOVEMENT] セット削除APIエラー:', result)
            }

            // sessionStorageをクリア
            sessionStorage.removeItem('toolSetsToDelete')
            console.log('[BULK MOVEMENT] sessionStorageクリア完了')
          } catch (err) {
            console.error('[BULK MOVEMENT] セット削除処理エラー:', err)
            // エラーでも移動は成功しているので続行
          }
        } else {
          console.log('[BULK MOVEMENT] 削除対象のセットなし（sessionStorageが空）')
        }

        router.push(`/movements?success=${encodeURIComponent(`${successCount}件の道具移動が完了しました`)}`)
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

  // ひらがな・カタカナ正規化関数
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (match) => {
        const chr = match.charCodeAt(0) - 0x60
        return String.fromCharCode(chr)
      })
  }

  // 検索フィルタリング
  const filteredTools = toolItems.filter((item) => {
    const query = normalizeText(searchQuery)
    return (
      normalizeText(item.serial_number).includes(query) ||
      normalizeText(item.tools?.name || '').includes(query) ||
      normalizeText(item.tools?.model_number || '').includes(query)
    )
  })

  // 選択された道具の情報（道具名でソート）
  const selectedTools = selectedToolIds
    .map((id) => toolItems.find((t) => t.id === id))
    .filter(Boolean)
    .sort((a, b) => {
      const nameA = a?.tools?.name || ''
      const nameB = b?.tools?.name || ''
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB, 'ja')
      }
      // 同じ道具名の場合はシリアル番号でソート
      return (a?.serial_number || '').localeCompare(b?.serial_number || '', 'ja')
    }) as ToolItem[]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
          {error}
        </div>
      )}

      {/* プログレス表示 */}
      {progress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          移動中... {progress.current} / {progress.total}
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
          <>
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

            {/* 倉庫から現場への移動時：元の倉庫位置を記録（オプション） */}
            {warehouseLocations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  元の倉庫位置（任意）
                  <span className="ml-2 text-xs text-gray-500">現場から戻る際に役立ちます</span>
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
          </>
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

      {/* 2. 道具選択方法 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">2. 移動する道具の選択方法</h3>

        {/* タブ */}
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => handleTabChange('individual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectionMode === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            個別選択
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('set')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectionMode === 'set'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            道具セット
          </button>
        </div>

        {/* 個別選択タブ */}
        {selectionMode === 'individual' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600">QRスキャンまたは検索して道具を選択</p>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                📷 QRコードをスキャン
              </button>
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

            {/* 検索入力欄 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                道具を検索して追加
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSubmitting}
                placeholder="シリアル番号、道具名、型番で検索..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 検索結果 */}
            {searchQuery && (
              <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
                {filteredTools.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">該当する道具がありません</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredTools.slice(0, 20).map((tool) => {
                      const isSelected = selectedToolIds.includes(tool.id)
                      const inSet = tool.inToolSet
                      const wrongLocation = requiredLocation !== null && tool.current_location !== requiredLocation
                      const isDisabled = isSelected || isSubmitting || (inSet && !canRemoveFromSet) || wrongLocation

                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleAddTool(tool.id)}
                          disabled={isDisabled}
                          className={`w-full text-left p-3 transition-colors ${
                            isDisabled
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm">{tool.tools?.name || '不明'}</div>
                            {inSet && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                セット: {tool.toolSetName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {tool.serial_number}{tool.tools?.model_number ? ` • ${tool.tools.model_number}` : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            現在位置:{' '}
                            {tool.current_location === 'warehouse'
                              ? tool.warehouse_location
                                ? `倉庫（${tool.warehouse_location.code} - ${tool.warehouse_location.display_name}）`
                                : '倉庫'
                              : tool.current_location === 'site'
                              ? (tool.current_site?.[0]?.name || '現場')
                              : '修理中'}
                          </div>
                          {inSet && !canRemoveFromSet && (
                            <div className="text-xs text-red-600 mt-1">
                              ⚠️ セット登録済みのため選択できません
                            </div>
                          )}
                          {wrongLocation && (
                            <div className="text-xs text-red-600 mt-1">
                              ⚠️ 現在地が異なるため選択できません
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 道具セットタブ */}
        {selectionMode === 'set' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">事前に登録した道具セットから選択</p>

            {toolSets.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                道具セットが登録されていません
                {canRemoveFromSet && (
                  <>
                    <br />
                    <a href="/tool-sets/new" className="text-blue-600 hover:text-blue-700 underline">
                      道具セットを登録する
                    </a>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {toolSets.map((toolSet) => {
                  const itemCount = toolSet.tool_set_items.filter(item => item.tool_item).length
                  const isSelected = selectedToolSetId === toolSet.id

                  return (
                    <button
                      key={toolSet.id}
                      type="button"
                      onClick={() => handleToolSetSelect(toolSet.id)}
                      disabled={isSubmitting}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📦</span>
                            <span className="font-medium text-gray-900">{toolSet.name}</span>
                            <span className="text-sm text-gray-500">({itemCount}個)</span>
                          </div>
                          {toolSet.description && (
                            <p className="text-sm text-gray-600 mt-1">{toolSet.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-blue-600 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. 選択済み道具リスト */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">
              3. 選択中の道具（{selectedTools.length}件）
            </h3>
            {requiredLocation && selectionMode === 'individual' && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                📍 {requiredLocation === 'warehouse' ? '倉庫' : requiredLocation === 'site' ? '現場' : '修理中'}のみ
              </span>
            )}
          </div>
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
            上の{selectionMode === 'individual' ? '検索欄' : '道具セット'}から道具を選択してください
          </div>
        ) : (
          <div className="border border-gray-300 rounded-md divide-y divide-gray-200 max-h-80 overflow-y-auto">
            {selectedTools.map((tool) => (
              <div key={tool.id} className="p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{tool.tools?.name || '不明'}</div>
                  <div className="text-xs text-gray-500">
                    {tool.serial_number}{tool.tools?.model_number ? ` • ${tool.tools.model_number}` : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    現在位置:{' '}
                    {tool.current_location === 'warehouse'
                      ? tool.warehouse_location
                        ? `倉庫（${tool.warehouse_location.code} - ${tool.warehouse_location.display_name}）`
                        : '倉庫'
                      : tool.current_location === 'site'
                      ? (tool.current_site?.[0]?.name || '現場')
                      : '修理中'}
                  </div>
                </div>
                {selectionMode === 'individual' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTool(tool.id)}
                    disabled={isSubmitting}
                    className="ml-4 text-red-600 hover:text-red-700 text-sm"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 実行ボタン */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-4 sm:px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-xs sm:text-sm whitespace-nowrap"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting || selectedTools.length === 0}
          className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm whitespace-nowrap"
        >
          {isSubmitting ? '移動中...' : `移動を実行（${selectedTools.length}個）`}
        </button>
      </div>

      {/* QRカメラスキャナー */}
      {showCamera && (
        <QrCameraScanner
          onScan={handleQrScan}
          onClose={() => setShowCamera(false)}
        />
      )}
    </form>
  )
}
