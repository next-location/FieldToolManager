'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createConsumableOrder } from './actions'

interface Tool {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
}

interface Props {
  consumables: Tool[]
  suggestedOrderNumber: string
}

export default function ConsumableOrderForm({ consumables, suggestedOrderNumber }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 自動計算: 単価 × 数量 = 合計金額
  const [quantity, setQuantity] = useState<number>(1)
  const [unitPrice, setUnitPrice] = useState<string>('')
  const [totalPrice, setTotalPrice] = useState<string>('')

  const handleQuantityChange = (value: number) => {
    setQuantity(value)
    if (unitPrice) {
      const total = value * parseFloat(unitPrice)
      setTotalPrice(total.toFixed(2))
    }
  }

  const handleUnitPriceChange = (value: string) => {
    setUnitPrice(value)
    if (value && quantity) {
      const total = quantity * parseFloat(value)
      setTotalPrice(total.toFixed(2))
    } else {
      setTotalPrice('')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      await createConsumableOrder(formData)
      router.push('/consumables/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : '発注の登録に失敗しました')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 発注番号 */}
        <div>
          <label htmlFor="order_number" className="block text-sm font-medium text-gray-700">
            発注番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="order_number"
            id="order_number"
            required
            defaultValue={suggestedOrderNumber}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            自動生成された番号です。必要に応じて変更できます。
          </p>
        </div>

        {/* 消耗品選択 */}
        <div>
          <label htmlFor="tool_id" className="block text-sm font-medium text-gray-700">
            消耗品 <span className="text-red-500">*</span>
          </label>
          <select
            name="tool_id"
            id="tool_id"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">選択してください</option>
            {consumables.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
                {tool.model_number && ` (${tool.model_number})`}
              </option>
            ))}
          </select>
        </div>

        {/* 発注日 */}
        <div>
          <label htmlFor="order_date" className="block text-sm font-medium text-gray-700">
            発注日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="order_date"
            id="order_date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* 納品予定日 */}
        <div>
          <label htmlFor="expected_delivery_date" className="block text-sm font-medium text-gray-700">
            納品予定日
          </label>
          <input
            type="date"
            name="expected_delivery_date"
            id="expected_delivery_date"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* 発注数量 */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            発注数量 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="quantity"
            id="quantity"
            required
            min="1"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* 単価 */}
        <div>
          <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700">
            単価（円）
          </label>
          <input
            type="number"
            name="unit_price"
            id="unit_price"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => handleUnitPriceChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="0.00"
          />
        </div>

        {/* 合計金額（自動計算） */}
        <div>
          <label htmlFor="total_price" className="block text-sm font-medium text-gray-700">
            合計金額（円）
          </label>
          <input
            type="number"
            name="total_price"
            id="total_price"
            step="0.01"
            min="0"
            value={totalPrice}
            readOnly
            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="0.00"
          />
          <p className="mt-1 text-sm text-gray-500">
            単価 × 数量で自動計算されます
          </p>
        </div>

        {/* 仕入れ先名 */}
        <div>
          <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700">
            仕入れ先名
          </label>
          <input
            type="text"
            name="supplier_name"
            id="supplier_name"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* 仕入れ先連絡先 */}
        <div>
          <label htmlFor="supplier_contact" className="block text-sm font-medium text-gray-700">
            仕入れ先連絡先
          </label>
          <input
            type="text"
            name="supplier_contact"
            id="supplier_contact"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="電話番号、メール、担当者名など"
          />
        </div>

        {/* メモ */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            メモ
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="発注に関する特記事項など"
          />
        </div>
      </div>

      {/* フォームフッター */}
      <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-3 sm:rounded-b-lg">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={isSubmitting}
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? '登録中...' : '発注を登録'}
        </button>
      </div>
    </form>
  )
}
