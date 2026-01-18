'use client'

import { useState } from 'react'
import { moveConsumable } from './actions'

type Site = {
  id: string
  name: string
  is_active: boolean
}

type Inventory = {
  id: string
  quantity: number
  location_type: string
  site_id: string | null
}

export function MovementForm({
  consumableId,
  consumableName,
  unit,
  warehouseInventory,
  siteInventories,
  sites,
  trackingMode,
}: {
  consumableId: string
  consumableName: string
  unit: string
  warehouseInventory: Inventory | null
  siteInventories: Inventory[]
  sites: Site[]
  trackingMode: 'quantity' | 'simple' | 'none'
}) {
  const [direction, setDirection] = useState<'to_site' | 'from_site'>('to_site')
  const [siteId, setSiteId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 移動元の在庫を取得
  const getSourceInventory = () => {
    if (direction === 'to_site') {
      return warehouseInventory?.quantity || 0
    } else {
      if (!siteId) return 0
      const siteInv = siteInventories.find((inv) => inv.site_id === siteId)
      return siteInv?.quantity || 0
    }
  }

  const sourceQuantity = getSourceInventory()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // バリデーション
      if (!siteId) {
        setError('現場を選択してください')
        setLoading(false)
        return
      }

      if (trackingMode === 'quantity') {
        const qty = parseInt(quantity)
        if (!qty || qty <= 0) {
          setError('正しい数量を入力してください')
          setLoading(false)
          return
        }

        if (qty > sourceQuantity) {
          setError('移動元の在庫が不足しています')
          setLoading(false)
          return
        }
      }

      const formData = new FormData(e.currentTarget)
      await moveConsumable(formData)
    } catch (err: any) {
      setError(err.message || '移動に失敗しました')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <input type="hidden" name="consumableId" value={consumableId} />
      <input type="hidden" name="trackingMode" value={trackingMode} />

      {/* 1. 移動方向選択 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">1. 移動方向を選択</h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDirection('to_site')}
            disabled={loading}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              direction === 'to_site'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🏢 → 🏗️</div>
            <div className="font-medium">倉庫 → 現場</div>
          </button>

          <button
            type="button"
            onClick={() => setDirection('from_site')}
            disabled={loading}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              direction === 'from_site'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🏗️ → 🏢</div>
            <div className="font-medium">現場 → 倉庫</div>
          </button>
        </div>
        <input type="hidden" name="direction" value={direction} />

        {/* 現場選択 */}
        <div>
          <label
            htmlFor="siteId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            現場 <span className="text-red-500">*</span>
          </label>
          <select
            id="siteId"
            name="siteId"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            required
            disabled={loading}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">現場を選択してください</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {/* 移動元の在庫表示 */}
        {siteId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            {direction === 'to_site' ? '倉庫' : '現場'}の現在の在庫:{' '}
            <span className="font-medium">
              {sourceQuantity} {unit}
            </span>
          </div>
        )}
      </div>

      {/* 2. 数量入力（quantity モードのみ） */}
      {trackingMode === 'quantity' && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900">2. 移動数量を入力</h3>

          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              移動数量 <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                max={sourceQuantity}
                required
                disabled={loading}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="数量を入力"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">{unit}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              移動可能: 最大 {sourceQuantity} {unit}
            </p>
          </div>
        </div>
      )}

      {/* 3. 備考（simple/quantity モード） */}
      {trackingMode !== 'none' && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            {trackingMode === 'quantity' ? '3. 備考（任意）' : '2. 備考（任意）'}
          </h3>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              備考
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              disabled={loading}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例：塗装作業用、返却時の状態など"
            />
          </div>
        </div>
      )}

      {/* 移動ボタン */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={loading || !siteId}
          className="w-full sm:w-auto px-6 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? '移動中...'
            : direction === 'to_site'
              ? '現場に持ち出す'
              : '倉庫に返却する'}
        </button>
      </div>

      {/* 説明 */}
      {trackingMode === 'simple' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          ℹ️ 組織設定で「移動のみ記録（数量なし）」が選択されているため、数量は記録されません
        </div>
      )}
    </form>
  )
}
