'use client'

import { useState } from 'react'
import { consumeConsumable } from './consume/actions'

interface ConsumeButtonProps {
  consumableId: string
  inventoryId: string
  currentQuantity: number
  unit: string
  locationText: string
}

export function ConsumeButton({
  consumableId,
  inventoryId,
  currentQuantity,
  unit,
  locationText,
}: ConsumeButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const consumeQty = parseInt(quantity)

    if (isNaN(consumeQty) || consumeQty <= 0) {
      setError('1以上の数値を入力してください')
      return
    }

    if (consumeQty > currentQuantity) {
      setError(`在庫が不足しています（在庫: ${currentQuantity}${unit}）`)
      return
    }

    setIsSubmitting(true)

    try {
      await consumeConsumable({
        consumableId,
        inventoryId,
        quantity: consumeQty,
        locationText,
      })

      // 成功したらリセット
      setIsOpen(false)
      setQuantity('')
    } catch (err: any) {
      setError(err.message || '消費記録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    setQuantity('')
    setError(null)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-1 border border-orange-600 rounded-md text-sm font-medium text-orange-600 bg-white hover:bg-orange-50 transition-colors"
      >
        📝 消費を記録
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max={currentQuantity}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="消費個数"
          className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={isSubmitting}
          autoFocus
        />
        <span className="text-sm text-gray-600">{unit}</span>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
        >
          {isSubmitting ? '記録中...' : '記録する'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
        >
          キャンセル
        </button>
      </div>
      {error && (
        <div className="text-xs text-red-600">
          {error}
        </div>
      )}
    </form>
  )
}
