'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adjustConsumableInventory } from './actions'

export function AdjustmentForm({
  consumableId,
  consumableName,
  unit,
  currentQuantity,
}: {
  consumableId: string
  consumableName: string
  unit: string
  currentQuantity: number
}) {
  const router = useRouter()
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateNewQuantity = () => {
    const qty = parseInt(quantity) || 0
    switch (adjustmentType) {
      case 'add':
        return currentQuantity + qty
      case 'remove':
        return Math.max(0, currentQuantity - qty)
      case 'set':
        return qty
      default:
        return currentQuantity
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 0) {
      setError('有効な数量を入力してください')
      setLoading(false)
      return
    }

    if (adjustmentType === 'remove' && qty > currentQuantity) {
      setError('現在の在庫数を超えて減らすことはできません')
      setLoading(false)
      return
    }

    try {
      await adjustConsumableInventory({
        consumableId,
        adjustmentType,
        quantity: qty,
        reason,
      })
      router.push('/consumables')
    } catch (err: any) {
      setError(err.message || '在庫調整に失敗しました')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 調整タイプ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          調整タイプ <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              checked={adjustmentType === 'add'}
              onChange={() => setAdjustmentType('add')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-700">
              在庫を追加（入庫・購入など）
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={adjustmentType === 'remove'}
              onChange={() => setAdjustmentType('remove')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-700">
              在庫を減らす（紛失・破損など）
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={adjustmentType === 'set'}
              onChange={() => setAdjustmentType('set')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-700">
              在庫を設定（棚卸など）
            </span>
          </label>
        </div>
      </div>

      {/* 数量 */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          数量 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="number"
            id="quantity"
            min="0"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="block w-32 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-700">{unit}</span>
        </div>
        {quantity && (
          <p className="mt-2 text-sm text-gray-600">
            {adjustmentType === 'add' && '+ '}
            {adjustmentType === 'remove' && '- '}
            {adjustmentType === 'set' && '→ '}
            調整後の在庫：
            <strong className="ml-1 text-gray-900">
              {calculateNewQuantity()} {unit}
            </strong>
          </p>
        )}
      </div>

      {/* 理由 */}
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
          理由 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="reason"
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="例：新規購入、棚卸による修正、紛失など"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* ボタン */}
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '調整中...' : '在庫を調整'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
