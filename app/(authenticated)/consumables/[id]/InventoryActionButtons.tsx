'use client'

import { useState } from 'react'
import { addConsumableInventory } from './add-inventory/actions'
import { consumeConsumable } from './consume/actions'

interface InventoryActionButtonsProps {
  consumableId: string
  inventoryId: string
  currentQuantity: number
  unit: string
  locationText: string
}

type ActionType = 'none' | 'add' | 'consume'

export function InventoryActionButtons({
  consumableId,
  inventoryId,
  currentQuantity,
  unit,
  locationText,
}: InventoryActionButtonsProps) {
  const [activeAction, setActiveAction] = useState<ActionType>('none')
  const [quantity, setQuantity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const addQty = parseInt(quantity)

    if (isNaN(addQty) || addQty <= 0) {
      setError('1以上の数値を入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      await addConsumableInventory({
        consumableId,
        inventoryId,
        quantity: addQty,
        locationText,
      })

      // 成功したらリセット
      setActiveAction('none')
      setQuantity('')
    } catch (err: any) {
      setError(err.message || '在庫追加に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConsumeSubmit = async (e: React.FormEvent) => {
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
      setActiveAction('none')
      setQuantity('')
    } catch (err: any) {
      setError(err.message || '消費記録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setActiveAction('none')
    setQuantity('')
    setError(null)
  }

  // 何も操作していない状態：両方のボタンを表示
  if (activeAction === 'none') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setActiveAction('add')}
          className="inline-flex items-center px-3 py-1 border border-green-600 rounded-md text-sm font-medium text-green-600 bg-white hover:bg-green-50 transition-colors"
        >
          ➕ 在庫追加
        </button>
        <button
          onClick={() => setActiveAction('consume')}
          className="inline-flex items-center px-3 py-1 border border-orange-600 rounded-md text-sm font-medium text-orange-600 bg-white hover:bg-orange-50 transition-colors"
        >
          📝 消費を記録
        </button>
      </div>
    )
  }

  // 在庫追加フォーム
  if (activeAction === 'add') {
    return (
      <form onSubmit={handleAddSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="追加個数"
            className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isSubmitting}
            autoFocus
          />
          <span className="text-sm text-gray-600">{unit}</span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {isSubmitting ? '追加中...' : '追加する'}
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

  // 消費記録フォーム
  if (activeAction === 'consume') {
    return (
      <form onSubmit={handleConsumeSubmit} className="flex flex-col gap-2">
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

  return null
}
