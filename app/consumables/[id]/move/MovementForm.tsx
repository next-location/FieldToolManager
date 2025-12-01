'use client'

import { useState } from 'react'
import { moveConsumable } from './actions'

type Site = {
  id: string
  name: string
  status: string
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
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <input type="hidden" name="consumableId" value={consumableId} />
      <input type="hidden" name="trackingMode" value={trackingMode} />

      {/* 移動方向 */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          移動方向
        </label>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="direction_to_site"
                name="direction"
                type="radio"
                value="to_site"
                checked={direction === 'to_site'}
                onChange={(e) => setDirection(e.target.value as 'to_site')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="direction_to_site"
                className="font-medium text-gray-700"
              >
                倉庫 → 現場（持ち出し）
              </label>
              <p className="text-gray-500">
                倉庫から現場に消耗品を持ち出します
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="direction_from_site"
                name="direction"
                type="radio"
                value="from_site"
                checked={direction === 'from_site'}
                onChange={(e) => setDirection(e.target.value as 'from_site')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="direction_from_site"
                className="font-medium text-gray-700"
              >
                現場 → 倉庫（返却）
              </label>
              <p className="text-gray-500">
                現場から倉庫に消耗品を返却します
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 現場選択 */}
      <div>
        <label
          htmlFor="siteId"
          className="block text-sm font-medium text-gray-700"
        >
          {direction === 'to_site' ? '持ち出し先の現場' : '返却元の現場'}
          <span className="text-red-500">*</span>
        </label>
        <select
          id="siteId"
          name="siteId"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">選択してください</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {/* 移動元の在庫表示 */}
      {siteId && (
        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            {direction === 'to_site' ? '倉庫' : '現場'}の現在の在庫:{' '}
            <span className="font-medium">
              {sourceQuantity} {unit}
            </span>
          </p>
        </div>
      )}

      {/* 数量入力（quantity モードのみ） */}
      {trackingMode === 'quantity' && (
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-700"
          >
            移動数量<span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={sourceQuantity}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="数量を入力"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">{unit}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            移動可能: 最大 {sourceQuantity} {unit}
          </p>
        </div>
      )}

      {/* 備考（simple/quantity モード） */}
      {trackingMode !== 'none' && (
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700"
          >
            備考
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="例：塗装作業用、返却時の状態など"
          />
        </div>
      )}

      {/* 移動ボタン */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={loading || !siteId}
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            ℹ️ 組織設定で「移動のみ記録（数量なし）」が選択されているため、数量は記録されません
          </p>
        </div>
      )}
    </form>
  )
}
