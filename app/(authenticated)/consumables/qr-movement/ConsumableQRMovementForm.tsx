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

interface ConsumableQRMovementFormProps {
  consumable: Consumable
  inventories: Inventory[]
  sites: Site[]
  warehouseLocations: WarehouseLocation[]
}

type LocationType = 'warehouse' | 'site'

export function ConsumableQRMovementForm({
  consumable,
  inventories,
  sites,
  warehouseLocations,
}: ConsumableQRMovementFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // 移動元の状態（在庫の中から選択）
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState<number>(-1)

  // 移動数量
  const [moveQuantity, setMoveQuantity] = useState<number>(0)

  // 移動先の状態
  const [destinationType, setDestinationType] = useState<LocationType>('warehouse')
  const [destinationSiteId, setDestinationSiteId] = useState<string>('')
  const [destinationWarehouseLocationId, setDestinationWarehouseLocationId] = useState<string>('')

  const [notes, setNotes] = useState('')

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedInventory = selectedInventoryIndex >= 0 ? inventories[selectedInventoryIndex] : null

  // 在庫場所の表示名を生成
  const getInventoryLocationLabel = (inv: Inventory) => {
    if (inv.location_type === 'warehouse') {
      if (inv.warehouse_location) {
        return `倉庫（${inv.warehouse_location.display_name}） - 在庫: ${inv.quantity}${consumable.unit}`
      }
      return `倉庫 - 在庫: ${inv.quantity}${consumable.unit}`
    } else if (inv.location_type === 'site') {
      if (inv.site) {
        return `${inv.site.name} - 在庫: ${inv.quantity}${consumable.unit}`
      }
      return `現場 - 在庫: ${inv.quantity}${consumable.unit}`
    }
    return `不明 - 在庫: ${inv.quantity}${consumable.unit}`
  }

  // 一括移動実行
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (selectedInventoryIndex < 0) {
      setError('移動元の場所を選択してください')
      return
    }

    if (!moveQuantity || moveQuantity <= 0) {
      setError('移動する個数を入力してください')
      return
    }

    if (selectedInventory && moveQuantity > selectedInventory.quantity) {
      setError(`在庫数（${selectedInventory.quantity}${consumable.unit}）を超えて移動できません`)
      return
    }

    if (destinationType === 'site' && !destinationSiteId) {
      setError('移動先の現場を選択してください')
      return
    }

    if (destinationType === 'warehouse' && !destinationWarehouseLocationId) {
      setError('移動先の倉庫位置を選択してください')
      return
    }

    // 移動元と移動先が同一かチェック
    if (selectedInventory) {
      const isSameLocation =
        selectedInventory.location_type === destinationType &&
        (destinationType === 'warehouse'
          ? selectedInventory.warehouse_location_id === destinationWarehouseLocationId
          : selectedInventory.site_id === destinationSiteId)

      if (isSameLocation) {
        setError('移動元と移動先が同じです。異なる場所を選択してください。')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // 不審なパターン検出
      if (notes && hasSuspiciousPattern(notes)) {
        setError('備考に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
        setIsSubmitting(false)
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

      if (!selectedInventory) {
        throw new Error('移動元が選択されていません')
      }

      const fromLocationType = selectedInventory.location_type as LocationType
      const fromSiteId = selectedInventory.site_id
      const fromWarehouseLocationId = selectedInventory.warehouse_location_id

      const toLocationType = destinationType
      const toSiteId = destinationType === 'site' ? destinationSiteId : null
      const toWarehouseLocationId = destinationType === 'warehouse' ? destinationWarehouseLocationId : null

      // 移動元の在庫を取得（再確認）
      let sourceInventoryQuery = supabase
        .from('consumable_inventory')
        .select('*')
        .eq('tool_id', consumable.id)
        .eq('organization_id', userData.organization_id)
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

      const { data: sourceInventoryData } = await sourceInventoryQuery.single()

      if (!sourceInventoryData) {
        throw new Error('移動元の在庫が見つかりません')
      }

      // 移動元の在庫を減らす
      const newSourceQuantity = sourceInventoryData.quantity - moveQuantity
      if (newSourceQuantity === 0) {
        const { error: deleteError } = await supabase
          .from('consumable_inventory')
          .delete()
          .eq('id', sourceInventoryData.id)

        if (deleteError) {
          throw new Error(`在庫削除に失敗: ${deleteError.message}`)
        }
      } else {
        const { error: updateError } = await supabase
          .from('consumable_inventory')
          .update({
            quantity: newSourceQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sourceInventoryData.id)

        if (updateError) {
          throw new Error(`在庫更新に失敗: ${updateError.message}`)
        }
      }

      // 移動先の在庫を取得
      let destInventoryQuery = supabase
        .from('consumable_inventory')
        .select('*')
        .eq('tool_id', consumable.id)
        .eq('organization_id', userData.organization_id)
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

      const { data: destInventoryData } = await destInventoryQuery.single()

      // 移動先の在庫を増やす
      if (destInventoryData) {
        const { error: updateError } = await supabase
          .from('consumable_inventory')
          .update({
            quantity: destInventoryData.quantity + moveQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', destInventoryData.id)

        if (updateError) {
          throw new Error(`在庫更新に失敗: ${updateError.message}`)
        }
      } else {
        const { error: insertError } = await supabase.from('consumable_inventory').insert({
          organization_id: userData.organization_id,
          tool_id: consumable.id,
          location_type: toLocationType,
          site_id: toSiteId,
          warehouse_location_id: toWarehouseLocationId,
          quantity: moveQuantity,
        })

        if (insertError) {
          throw new Error(`在庫追加に失敗: ${insertError.message}`)
        }
      }

      // 移動履歴を記録
      const movementData = {
        organization_id: userData.organization_id,
        tool_id: consumable.id,
        movement_type: '移動',
        from_location_type: fromLocationType,
        from_site_id: fromSiteId,
        from_location_id: fromSiteId || null,
        from_warehouse_location_id: fromWarehouseLocationId,
        to_location_type: toLocationType,
        to_site_id: toSiteId,
        to_location_id: toSiteId || null,
        to_warehouse_location_id: toWarehouseLocationId,
        quantity: moveQuantity,
        performed_by: user.id,
        notes: sanitizedNotes,
      }

      console.log('[QR Movement] Inserting movement history:', movementData)

      const { error: movementError } = await supabase.from('consumable_movements').insert(movementData)

      if (movementError) {
        console.error('[QR Movement] 移動履歴の記録エラー:', movementError)
        throw new Error(`移動履歴の記録に失敗しました: ${movementError.message}`)
      }

      console.log('[QR Movement] Movement history recorded successfully')

      // 成功: 移動履歴ページへリダイレクト
      router.push('/movements?tab=consumable&success=' + encodeURIComponent('消耗品を移動しました'))
    } catch (err) {
      console.error('移動エラー:', err)
      setError(err instanceof Error ? err.message : '移動に失敗しました')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
          {error}
        </div>
      )}

      {/* 選択された消耗品 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">選択された消耗品</h3>
        <div className="flex items-center gap-2">
          <span className="text-blue-500 text-xl">✓</span>
          <div>
            <div className="font-medium text-blue-900">{consumable.name}</div>
            {consumable.model_number && (
              <div className="text-xs text-blue-700">型番: {consumable.model_number}</div>
            )}
          </div>
        </div>
      </div>

      {/* 1. 移動元選択 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">1. この消耗品はどこにありますか？</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            移動元の場所 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedInventoryIndex}
            onChange={(e) => {
              const index = parseInt(e.target.value)
              setSelectedInventoryIndex(index)
              setMoveQuantity(0)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            required
          >
            <option value="-1">在庫場所を選択してください</option>
            {inventories.map((inv, index) => (
              <option key={index} value={index}>
                {getInventoryLocationLabel(inv)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. 移動数量入力 */}
      {selectedInventory && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900">2. 移動する個数は？</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              移動数量 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={selectedInventory.quantity}
                value={moveQuantity === 0 ? '' : moveQuantity}
                placeholder="個数"
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setMoveQuantity(0)
                    return
                  }
                  const numValue = parseInt(value)
                  if (!isNaN(numValue) && numValue >= 0) {
                    setMoveQuantity(numValue)
                  }
                }}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                required
              />
              <span className="text-sm text-gray-600">{consumable.unit}</span>
              <span className="text-xs text-gray-500">（最大: {selectedInventory.quantity}{consumable.unit}）</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 移動先選択 */}
      {moveQuantity > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900">3. どこに移動しますか？</h3>

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

          {/* 倉庫位置選択 */}
          {destinationType === 'warehouse' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                倉庫位置 <span className="text-red-500">*</span>
              </label>
              <select
                value={destinationWarehouseLocationId}
                onChange={(e) => setDestinationWarehouseLocationId(e.target.value)}
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
        </div>
      )}

      {/* 備考 */}
      {moveQuantity > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            備考（任意）
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="移動理由など..."
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* 実行ボタン */}
      {moveQuantity > 0 && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={isSubmitting}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? '移動中...' : '移動を実行'}
          </button>
        </div>
      )}
    </form>
  )
}
