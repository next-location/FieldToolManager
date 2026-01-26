'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { QrCameraScanner } from '@/components/QrCameraScanner'

interface Consumable {
  id: string
  name: string
  model_number: string | null
  unit: string
  qr_code?: string
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

interface Inventory {
  tool_id: string
  location_type: string
  site_id: string | null
  warehouse_location_id: string | null
  quantity: number
  site?: {
    id: string
    name: string
  } | null
  warehouse_location?: {
    id: string
    code: string
    display_name: string
  } | null
}

interface ConsumableBulkMovementFormProps {
  consumables: Consumable[]
  sites: Site[]
  inventories: Inventory[]
  warehouseLocations: WarehouseLocation[]
}

interface SelectedConsumable {
  consumableId: string
  quantity: number
}

type LocationType = 'warehouse' | 'site'

export function ConsumableBulkMovementForm({
  consumables,
  sites,
  inventories,
  warehouseLocations,
}: ConsumableBulkMovementFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // 移動元の状態
  const [sourceLocationType, setSourceLocationType] = useState<LocationType>('warehouse')
  const [sourceSiteId, setSourceSiteId] = useState<string>('')
  const [sourceWarehouseLocationId, setSourceWarehouseLocationId] = useState<string>('')

  // 移動先と現場・倉庫位置の状態
  const [destinationType, setDestinationType] = useState<LocationType>('warehouse')
  const [destinationSiteId, setDestinationSiteId] = useState<string>('')
  const [destinationWarehouseLocationId, setDestinationWarehouseLocationId] = useState<string>('')

  // 選択された消耗品の状態
  const [selectedConsumables, setSelectedConsumables] = useState<SelectedConsumable[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState('')

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [lastScannedConsumable, setLastScannedConsumable] = useState<string | null>(null)
  const [quantityErrors, setQuantityErrors] = useState<string[]>([])

  // QRコードスキャン処理
  const handleQrScan = async (qrCode: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedQr = qrCode.trim()
    if (!trimmedQr) {
      return { success: false, message: 'QRコードが空です' }
    }

    // QRコードで消耗品を検索
    const consumable = consumables.find((c) => c.qr_code === trimmedQr)

    if (!consumable) {
      setError('QRコードが見つかりません')
      setTimeout(() => setError(null), 3000)
      return { success: false, message: 'QRコードが見つかりません' }
    }

    // 重複チェック
    if (selectedConsumables.find((sc) => sc.consumableId === consumable.id)) {
      setError('この消耗品は既に選択されています')
      setTimeout(() => setError(null), 3000)
      return { success: false, message: 'この消耗品は既に選択されています' }
    }

    // 消耗品を追加
    setSelectedConsumables([...selectedConsumables, { consumableId: consumable.id, quantity: 0 }])
    setLastScannedConsumable(`${consumable.name}${consumable.model_number ? ` (${consumable.model_number})` : ''}`)
    setScanSuccess(true)
    setTimeout(() => {
      setScanSuccess(false)
      setLastScannedConsumable(null)
    }, 2000)

    return { success: true }
  }

  // 消耗品を追加
  const handleAddConsumable = (consumableId: string) => {
    if (!selectedConsumables.find((sc) => sc.consumableId === consumableId)) {
      setSelectedConsumables([...selectedConsumables, { consumableId, quantity: 0 }])
      setSearchQuery('')
    }
  }

  // 消耗品を削除
  const handleRemoveConsumable = (consumableId: string) => {
    setSelectedConsumables(
      selectedConsumables.filter((sc) => sc.consumableId !== consumableId)
    )
  }

  // 数量を更新
  const handleUpdateQuantity = (consumableId: string, quantity: number) => {
    setSelectedConsumables(
      selectedConsumables.map((sc) =>
        sc.consumableId === consumableId ? { ...sc, quantity } : sc
      )
    )
    // 数量を入力したらそのアイテムのエラーを削除
    if (quantity > 0) {
      setQuantityErrors(quantityErrors.filter(id => id !== consumableId))
    }
  }

  // すべてクリア
  const handleClearAll = () => {
    setSelectedConsumables([])
    setError(null)
  }

  // URLパラメータから消耗品IDを取得して初期選択
  useEffect(() => {
    const itemsParam = searchParams.get('items')
    if (itemsParam && consumables.length > 0) {
      const itemIds = itemsParam.split(',').filter(id => id.trim())
      const initialSelected: SelectedConsumable[] = itemIds
        .map(id => {
          const consumable = consumables.find(c => c.id === id.trim())
          return consumable ? { consumableId: consumable.id, quantity: 0 } : null
        })
        .filter((item): item is SelectedConsumable => item !== null)

      if (initialSelected.length > 0) {
        setSelectedConsumables(initialSelected)
      }
    }
  }, [searchParams, consumables])

  // 一括移動実行
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setQuantityErrors([])

    // バリデーション
    if (sourceLocationType === 'site' && !sourceSiteId) {
      setError('移動元の現場を選択してください')
      return
    }

    if (destinationType === 'site' && !destinationSiteId) {
      setError('移動先の現場を選択してください')
      return
    }

    // 移動元と移動先が同一かチェック
    const isSameLocation =
      sourceLocationType === destinationType &&
      (sourceLocationType === 'warehouse'
        ? sourceWarehouseLocationId === destinationWarehouseLocationId
        : sourceSiteId === destinationSiteId)

    if (isSameLocation) {
      setError('移動元と移動先が同じです。異なる場所を選択してください。')
      return
    }

    if (selectedConsumables.length === 0) {
      setError('移動する消耗品を少なくとも1つ選択してください')
      return
    }

    // 数量が0の消耗品がないかチェック
    const invalidItems = selectedConsumables.filter(sc => sc.quantity === 0)
    if (invalidItems.length > 0) {
      setQuantityErrors(invalidItems.map(item => item.consumableId))
      setError('すべての消耗品の個数を入力してください')
      return
    }

    setIsSubmitting(true)
    setProgress({ current: 0, total: selectedConsumables.length })

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('ユーザーが見つかりません')
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userData) {
        throw new Error('組織情報が見つかりません')
      }

      const fromLocationType = sourceLocationType
      const fromSiteId = sourceLocationType === 'site' ? sourceSiteId : null
      const fromWarehouseLocationId = sourceLocationType === 'warehouse' ? (sourceWarehouseLocationId || null) : null

      const toLocationType = destinationType
      const toSiteId = destinationType === 'site' ? destinationSiteId : null
      const toWarehouseLocationId = destinationType === 'warehouse' ? (destinationWarehouseLocationId || null) : null

      // 各消耗品を移動
      for (let i = 0; i < selectedConsumables.length; i++) {
        const { consumableId, quantity } = selectedConsumables[i]
        setProgress({ current: i + 1, total: selectedConsumables.length })

        // 移動元の在庫を取得（選択された場所のみ）
        let sourceInventoryQuery = supabase
          .from('consumable_inventory')
          .select('*')
          .eq('tool_id', consumableId)
          .eq('organization_id', userData?.organization_id)
          .eq('location_type', fromLocationType)

        if (fromSiteId) {
          sourceInventoryQuery = sourceInventoryQuery.eq('site_id', fromSiteId)
        } else {
          sourceInventoryQuery = sourceInventoryQuery.is('site_id', null)
        }

        if (fromWarehouseLocationId) {
          sourceInventoryQuery = sourceInventoryQuery.eq('warehouse_location_id', fromWarehouseLocationId)
        } else {
          sourceInventoryQuery = sourceInventoryQuery.is('warehouse_location_id', null)
        }

        const { data: sourceInventory } = await sourceInventoryQuery.single()

        if (!sourceInventory) {
          const consumable = consumables.find((c) => c.id === consumableId)
          const locationName = fromLocationType === 'warehouse'
            ? fromWarehouseLocationId
              ? `倉庫（${warehouseLocations.find(l => l.id === fromWarehouseLocationId)?.display_name}）`
              : '倉庫'
            : sites.find(s => s.id === fromSiteId)?.name || '現場'
          throw new Error(
            `${consumable?.name || '不明'}の在庫が${locationName}にありません`
          )
        }

        // 在庫数が足りるかチェック
        if (sourceInventory.quantity < quantity) {
          const consumable = consumables.find((c) => c.id === consumableId)
          const locationName = fromLocationType === 'warehouse'
            ? fromWarehouseLocationId
              ? `倉庫（${warehouseLocations.find(l => l.id === fromWarehouseLocationId)?.display_name}）`
              : '倉庫'
            : sites.find(s => s.id === fromSiteId)?.name || '現場'
          throw new Error(
            `${consumable?.name || '不明'}の在庫が不足しています（${locationName}の在庫: ${sourceInventory.quantity}${consumable?.unit}, 必要: ${quantity}${consumable?.unit}）`
          )
        }

        // 移動元の在庫を減らす
        const newSourceQuantity = sourceInventory.quantity - quantity
        if (newSourceQuantity === 0) {
          const { error: deleteError } = await supabase
            .from('consumable_inventory')
            .delete()
            .eq('id', sourceInventory.id)

          if (deleteError) {
            console.error('在庫削除エラー:', deleteError)
            throw new Error(`在庫削除に失敗: ${deleteError.message}`)
          }
        } else {
          const { error: updateError } = await supabase
            .from('consumable_inventory')
            .update({
              quantity: newSourceQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sourceInventory.id)

          if (updateError) {
            console.error('在庫更新エラー:', updateError)
            throw new Error(`在庫更新に失敗: ${updateError.message}`)
          }
        }

        // 移動先の在庫を取得
        let destInventoryQuery = supabase
          .from('consumable_inventory')
          .select('*')
          .eq('tool_id', consumableId)
          .eq('organization_id', userData?.organization_id)
          .eq('location_type', toLocationType)

        if (toSiteId) {
          destInventoryQuery = destInventoryQuery.eq('site_id', toSiteId)
        } else {
          destInventoryQuery = destInventoryQuery.is('site_id', null)
        }

        if (toWarehouseLocationId) {
          destInventoryQuery = destInventoryQuery.eq('warehouse_location_id', toWarehouseLocationId)
        } else {
          destInventoryQuery = destInventoryQuery.is('warehouse_location_id', null)
        }

        const { data: destInventory } = await destInventoryQuery.single()

        // 移動先の在庫を増やす
        if (destInventory) {
          const { error: updateError } = await supabase
            .from('consumable_inventory')
            .update({
              quantity: destInventory.quantity + quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', destInventory.id)

          if (updateError) {
            console.error('在庫更新エラー:', updateError)
            throw new Error(`在庫更新に失敗: ${updateError.message}`)
          }
        } else {
          const { error: insertError } = await supabase.from('consumable_inventory').insert({
            organization_id: userData?.organization_id,
            tool_id: consumableId,
            location_type: toLocationType,
            site_id: toSiteId,
            warehouse_location_id: toWarehouseLocationId,
            quantity: quantity,
          })

          if (insertError) {
            console.error('在庫追加エラー:', insertError)
            throw new Error(`在庫追加に失敗: ${insertError.message}`)
          }
        }

        // 移動履歴を記録
        const { error: movementError } = await supabase.from('consumable_movements').insert({
          organization_id: userData?.organization_id,
          tool_id: consumableId,
          movement_type: '一括移動',
          from_location_type: fromLocationType,
          from_site_id: fromSiteId,
          from_location_id: fromWarehouseLocationId ? null : fromSiteId,
          to_location_type: toLocationType,
          to_site_id: toSiteId,
          to_location_id: toWarehouseLocationId ? null : toSiteId,
          quantity: quantity,
          performed_by: user.id,
          notes: notes || null,
        })

        if (movementError) {
          console.error('移動履歴記録エラー:', movementError)
          throw new Error(`移動履歴の記録に失敗しました: ${movementError.message}`)
        }
      }

      // 成功したら移動履歴ページ（消耗品タブ）にリダイレクト
      const successMessage = `${selectedConsumables.length}件の消耗品移動が完了しました`
      router.push(`/movements?tab=consumable&success=${encodeURIComponent(successMessage)}`)
      router.refresh()
    } catch (err: any) {
      console.error('移動エラー:', err)
      setError(err.message || '移動中にエラーが発生しました')
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

  // 検索フィルタリング（移動元に在庫がある消耗品のみ）
  const filteredConsumables = consumables.filter((consumable) => {
    const query = normalizeText(searchQuery)
    const matchesQuery = normalizeText(consumable.name).includes(query) ||
      normalizeText(consumable.model_number || '').includes(query)

    if (!matchesQuery) return false

    // 移動元に在庫があるかチェック
    const hasSourceInventory = inventories.some(inv => {
      if (inv.tool_id !== consumable.id) return false
      if (inv.location_type !== sourceLocationType) return false

      if (sourceLocationType === 'site') {
        return inv.site_id === sourceSiteId
      } else {
        // warehouse
        if (sourceWarehouseLocationId) {
          return inv.warehouse_location_id === sourceWarehouseLocationId
        } else {
          return inv.warehouse_location_id === null
        }
      }
    })

    return hasSourceInventory
  })

  // 選択された消耗品の詳細情報
  const selectedConsumableDetails = selectedConsumables
    .map((sc) => {
      const consumable = consumables.find((c) => c.id === sc.consumableId)
      return consumable ? { ...sc, consumable } : null
    })
    .filter(Boolean) as (SelectedConsumable & { consumable: Consumable })[]

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
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
          移動中... {progress.current} / {progress.total}
        </div>
      )}

      {/* 1. 移動元選択 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">1. 移動元を選択</h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSourceLocationType('warehouse')}
            disabled={isSubmitting}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              sourceLocationType === 'warehouse'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🏢</div>
            <div className="font-medium">倉庫</div>
          </button>

          <button
            type="button"
            onClick={() => setSourceLocationType('site')}
            disabled={isSubmitting}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              sourceLocationType === 'site'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🏗️</div>
            <div className="font-medium">現場</div>
          </button>
        </div>

        {/* 現場選択 */}
        {sourceLocationType === 'site' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現場 <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceSiteId}
              onChange={(e) => setSourceSiteId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
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
        {sourceLocationType === 'warehouse' && warehouseLocations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              倉庫位置（オプション）
            </label>
            <select
              value={sourceWarehouseLocationId}
              onChange={(e) => setSourceWarehouseLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
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

      {/* 2. 移動先選択 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">2. 移動先を選択</h3>

        <div className="grid grid-cols-2 gap-3">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
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

      {/* 3. 消耗品選択 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">3. 消耗品を選択</h3>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-600">QRスキャンまたは検索して消耗品を選択</p>
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
        {scanSuccess && lastScannedConsumable && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2 animate-pulse">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-semibold">読み取り成功！</div>
              <div className="text-sm">{lastScannedConsumable}</div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            消耗品を検索して追加
          </label>
          <input
            type="text"
            placeholder="消耗品名、型番で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* 検索結果 */}
        {searchQuery && filteredConsumables.length > 0 && (
          <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
            {filteredConsumables.slice(0, 10).map((consumable) => {
              const isSelected = selectedConsumables.some(
                (sc) => sc.consumableId === consumable.id
              )
              // 移動元の在庫のみを表示
              const sourceInventory = inventories.find(inv => {
                if (inv.tool_id !== consumable.id) return false
                if (inv.location_type !== sourceLocationType) return false
                if (sourceLocationType === 'site') {
                  return inv.site_id === sourceSiteId
                } else {
                  if (sourceWarehouseLocationId) {
                    return inv.warehouse_location_id === sourceWarehouseLocationId
                  } else {
                    return inv.warehouse_location_id === null
                  }
                }
              })
              return (
                <button
                  key={consumable.id}
                  type="button"
                  onClick={() => !isSelected && handleAddConsumable(consumable.id)}
                  disabled={isSubmitting || isSelected}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${
                    isSelected ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="font-medium text-sm">
                    {consumable.name}
                    {isSelected && (
                      <span className="ml-2 text-xs text-gray-500">(選択済み)</span>
                    )}
                  </div>
                  {consumable.model_number && (
                    <div className="text-xs text-gray-500">{consumable.model_number}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {sourceInventory ? (
                      <div>
                        {sourceLocationType === 'warehouse'
                          ? sourceInventory.warehouse_location
                            ? `倉庫（${sourceInventory.warehouse_location.code} - ${sourceInventory.warehouse_location.display_name}）: ${sourceInventory.quantity}${consumable.unit}`
                            : `倉庫: ${sourceInventory.quantity}${consumable.unit}`
                          : sourceInventory.site
                          ? `${sourceInventory.site.name}: ${sourceInventory.quantity}${consumable.unit}`
                          : `現場: ${sourceInventory.quantity}${consumable.unit}`
                        }
                      </div>
                    ) : (
                      <div className="text-gray-400">在庫なし</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. 選択中の消耗品 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            4. 選択中の消耗品（{selectedConsumables.length}件）
          </h3>
          {selectedConsumables.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-sm text-red-600 hover:text-red-800"
              disabled={isSubmitting}
            >
              すべてクリア
            </button>
          )}
        </div>

        {selectedConsumableDetails.length > 0 ? (
          <div className="border-2 border-gray-300 rounded-lg divide-y divide-gray-200">
            {selectedConsumableDetails.map(({ consumableId, quantity, consumable }) => {
              // 移動元の在庫のみを表示
              const sourceInventory = inventories.find(inv => {
                if (inv.tool_id !== consumableId) return false
                if (inv.location_type !== sourceLocationType) return false
                if (sourceLocationType === 'site') {
                  return inv.site_id === sourceSiteId
                } else {
                  if (sourceWarehouseLocationId) {
                    return inv.warehouse_location_id === sourceWarehouseLocationId
                  } else {
                    return inv.warehouse_location_id === null
                  }
                }
              })
              return (
                <div key={consumableId} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {consumable.name}
                    </div>
                    {consumable.model_number && (
                      <div className="text-xs text-gray-500 mt-1">
                        型番: {consumable.model_number}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {sourceInventory ? (
                        <div>
                          移動元在庫: {' '}
                          {sourceLocationType === 'warehouse'
                            ? sourceInventory.warehouse_location
                              ? `倉庫（${sourceInventory.warehouse_location.code} - ${sourceInventory.warehouse_location.display_name}）: ${sourceInventory.quantity}${consumable.unit}`
                              : `倉庫: ${sourceInventory.quantity}${consumable.unit}`
                            : sourceInventory.site
                            ? `${sourceInventory.site.name}: ${sourceInventory.quantity}${consumable.unit}`
                            : `現場: ${sourceInventory.quantity}${consumable.unit}`
                          }
                        </div>
                      ) : (
                        <div className="text-red-600">移動元に在庫なし</div>
                      )}
                    </div>
                  </div>
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={quantity === 0 ? '' : quantity}
                        placeholder="個数"
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            handleUpdateQuantity(consumableId, 0)
                            return
                          }
                          const numValue = parseInt(value)
                          if (!isNaN(numValue) && numValue >= 0) {
                            handleUpdateQuantity(consumableId, numValue)
                          }
                        }}
                        className={`w-20 px-2 py-1 border rounded text-center ${
                          quantityErrors.includes(consumableId)
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        }`}
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-gray-600">{consumable.unit}</span>
                    </div>
                    {quantityErrors.includes(consumableId) && (
                      <p className="text-xs text-red-600">消耗品の数を入力してください</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveConsumable(consumableId)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={isSubmitting}
                  >
                    削除
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            消耗品が選択されていません
            <br />
            上の検索欄から消耗品を選択してください
          </div>
        )}
      </div>

      {/* メモ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          メモ（任意）
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          placeholder="移動に関するメモがあれば記入してください"
        />
      </div>

      {/* ボタン */}
      <div className="flex justify-end gap-3">
        <a
          href="/consumables"
          className="px-4 sm:px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-xs sm:text-sm whitespace-nowrap"
        >
          キャンセル
        </a>
        <button
          type="submit"
          disabled={isSubmitting || selectedConsumables.length === 0}
          className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm whitespace-nowrap"
        >
          {isSubmitting
            ? '移動中...'
            : `移動を実行（${selectedConsumables.length}個）`}
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
