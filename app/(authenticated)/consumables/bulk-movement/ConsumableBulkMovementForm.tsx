'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

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

type LocationType = 'warehouse' | 'site'

export function ConsumableBulkMovementForm({
  consumables,
  sites,
  inventories,
  warehouseLocations,
}: ConsumableBulkMovementFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // 移動元の状態
  const [sourceLocationType, setSourceLocationType] = useState<LocationType | ''>('')
  const [sourceSiteId, setSourceSiteId] = useState<string>('')
  const [sourceWarehouseLocationId, setSourceWarehouseLocationId] = useState<string>('')

  // 移動先の状態
  const [destinationType, setDestinationType] = useState<LocationType>('warehouse')
  const [destinationSiteId, setDestinationSiteId] = useState<string>('')
  const [destinationWarehouseLocationId, setDestinationWarehouseLocationId] = useState<string>('')

  // 選択された消耗品の状態（消耗品ID → quantity）
  const [selectedConsumables, setSelectedConsumables] = useState<Map<string, number>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState('')

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // 移動元の場所にある消耗品を取得
  const getConsumablesAtSourceLocation = () => {
    if (!sourceLocationType) return []

    const locationInventories = inventories.filter(inv => {
      if (inv.quantity <= 0) return false
      if (inv.location_type !== sourceLocationType) return false

      if (sourceLocationType === 'site') {
        return inv.site_id === sourceSiteId
      } else {
        // warehouse - 指定された倉庫位置のみ
        return inv.warehouse_location_id === sourceWarehouseLocationId
      }
    })

    // 消耗品ごとにグループ化
    const consumableMap = new Map<string, Inventory[]>()
    locationInventories.forEach(inv => {
      const existing = consumableMap.get(inv.tool_id) || []
      consumableMap.set(inv.tool_id, [...existing, inv])
    })

    return Array.from(consumableMap.entries()).map(([toolId, invs]) => ({
      consumable: consumables.find(c => c.id === toolId)!,
      inventories: invs,
      totalQuantity: invs.reduce((sum, inv) => sum + inv.quantity, 0)
    })).filter(item => item.consumable)
  }

  const availableConsumables = getConsumablesAtSourceLocation()

  // 消耗品のチェック状態を切り替え
  const handleToggleConsumable = (consumableId: string) => {
    const newMap = new Map(selectedConsumables)

    if (newMap.has(consumableId)) {
      newMap.delete(consumableId)
    } else {
      newMap.set(consumableId, 0)
    }

    setSelectedConsumables(newMap)
  }

  // 数量を更新
  const handleUpdateQuantity = (consumableId: string, quantity: number) => {
    const newMap = new Map(selectedConsumables)
    newMap.set(consumableId, quantity)
    setSelectedConsumables(newMap)
  }

  // すべてクリア
  const handleClearAll = () => {
    setSelectedConsumables(new Map())
    setError(null)
  }

  // 一括移動実行
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (!sourceLocationType) {
      setError('移動元を選択してください')
      return
    }

    if (sourceLocationType === 'site' && !sourceSiteId) {
      setError('移動元の現場を選択してください')
      return
    }

    if (sourceLocationType === 'warehouse' && !sourceWarehouseLocationId) {
      setError('移動元の倉庫位置を選択してください')
      return
    }

    if (selectedConsumables.size === 0) {
      setError('移動する消耗品を少なくとも1つ選択してください')
      return
    }

    // 数量が0の消耗品がないかチェック
    const invalidItems: string[] = []
    selectedConsumables.forEach((quantity, consumableId) => {
      if (quantity === 0) {
        invalidItems.push(consumableId)
      }
    })

    if (invalidItems.length > 0) {
      setError('すべての消耗品の個数を入力してください')
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
        ? destinationWarehouseLocationId === ''
        : sourceSiteId === destinationSiteId)

    if (isSameLocation && sourceLocationType === 'site') {
      setError('移動元と移動先が同じです。異なる場所を選択してください。')
      return
    }

    setIsSubmitting(true)
    setProgress({ current: 0, total: selectedConsumables.size })

    try {
      // 不審なパターン検出
      if (notes && hasSuspiciousPattern(notes)) {
        setError('備考に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
        setIsSubmitting(false)
        setProgress(null)
        return
      }

      // HTMLエスケープ処理
      const sanitizedNotes = notes ? escapeHtml(notes) : null

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

      const toLocationType = destinationType
      const toSiteId = destinationType === 'site' ? destinationSiteId : null
      const toWarehouseLocationId = destinationType === 'warehouse' ? (destinationWarehouseLocationId || null) : null

      // 各消耗品を移動
      let processedCount = 0
      for (const [consumableId, quantity] of selectedConsumables.entries()) {
        processedCount++
        setProgress({ current: processedCount, total: selectedConsumables.size })

        const fromLocationType = sourceLocationType as LocationType
        const fromSiteId = sourceLocationType === 'site' ? sourceSiteId : null
        const fromWarehouseLocationId = sourceLocationType === 'warehouse' ? sourceWarehouseLocationId : null

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
          from_location_id: fromSiteId || null,
          from_warehouse_location_id: fromWarehouseLocationId,
          to_location_type: toLocationType,
          to_site_id: toSiteId,
          to_location_id: toSiteId || null,
          to_warehouse_location_id: toWarehouseLocationId,
          quantity: quantity,
          performed_by: user.id,
          notes: sanitizedNotes,
        })

        if (movementError) {
          console.error('移動履歴記録エラー:', movementError)
          throw new Error(`移動履歴の記録に失敗しました: ${movementError.message}`)
        }
      }

      // 成功したら移動履歴ページ（消耗品タブ）にリダイレクト
      const successMessage = `${selectedConsumables.size}件の消耗品移動が完了しました`
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

  // 検索フィルタリング
  const filteredConsumables = availableConsumables.filter((item) => {
    if (searchQuery === '') return true
    const query = normalizeText(searchQuery)
    return normalizeText(item.consumable.name).includes(query) ||
      normalizeText(item.consumable.model_number || '').includes(query)
  })

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
            onClick={() => {
              setSourceLocationType('warehouse')
              setSelectedConsumables(new Map())
            }}
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
            onClick={() => {
              setSourceLocationType('site')
              setSelectedConsumables(new Map())
            }}
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

        {/* 倉庫位置選択 */}
        {sourceLocationType === 'warehouse' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              倉庫位置 <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceWarehouseLocationId}
              onChange={(e) => {
                setSourceWarehouseLocationId(e.target.value)
                setSelectedConsumables(new Map())
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              required
            >
              <option value="">倉庫位置を選択してください</option>
              {warehouseLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 現場選択 */}
        {sourceLocationType === 'site' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現場 <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceSiteId}
              onChange={(e) => {
                setSourceSiteId(e.target.value)
                setSelectedConsumables(new Map())
              }}
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
      </div>

      {/* 2. 消耗品を選択 */}
      {sourceLocationType && ((sourceLocationType === 'warehouse' && sourceWarehouseLocationId) || (sourceLocationType === 'site' && sourceSiteId)) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">2. 移動する消耗品を選択</h3>
            {selectedConsumables.size > 0 && (
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

          {/* 検索バー */}
          <div>
            <input
              type="text"
              placeholder="消耗品名、型番で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* 消耗品リスト */}
          {availableConsumables.length > 0 ? (
            <div className="border-2 border-gray-300 rounded-lg divide-y divide-gray-200">
              {(isSearchFocused || searchQuery ? filteredConsumables : availableConsumables).map(({ consumable, inventories, totalQuantity }) => {
                const isSelected = selectedConsumables.has(consumable.id)
                const selectedQuantity = selectedConsumables.get(consumable.id)

                return (
                  <div key={consumable.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleConsumable(consumable.id)}
                        className="mt-1"
                        disabled={isSubmitting}
                      />
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
                          在庫: {totalQuantity}{consumable.unit}
                        </div>

                        {isSelected && (
                          <div className="mt-3">
                            {/* 数量入力 */}
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-gray-700">
                                移動数量:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={totalQuantity}
                                value={selectedQuantity === 0 ? '' : selectedQuantity}
                                placeholder="個数"
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '') {
                                    handleUpdateQuantity(consumable.id, 0)
                                    return
                                  }
                                  const numValue = parseInt(value)
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    handleUpdateQuantity(consumable.id, numValue)
                                  }
                                }}
                                className="w-20 px-2 py-1 border rounded text-center text-sm border-gray-300"
                                disabled={isSubmitting}
                              />
                              <span className="text-sm text-gray-600">{consumable.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
              この場所に在庫のある消耗品はありません
            </div>
          )}
        </div>
      )}

      {/* 3. 移動先選択 */}
      {selectedConsumables.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900">3. 移動先を選択</h3>

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
      )}

      {/* メモ */}
      {selectedConsumables.size > 0 && (
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
      )}

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
          disabled={isSubmitting || selectedConsumables.size === 0}
          className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm whitespace-nowrap"
        >
          {isSubmitting
            ? '移動中...'
            : `移動を実行（${selectedConsumables.size}個）`}
        </button>
      </div>
    </form>
  )
}
