'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createConsumableOrder } from './actions'

interface Tool {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  unit: string
}

interface Supplier {
  id: string
  name: string
  client_code: string | null
  payment_terms: string | null
}

interface Props {
  consumables: Tool[]
  suppliers: Supplier[]
  suggestedOrderNumber: string
}

export default function ConsumableOrderForm({ consumables, suppliers, suggestedOrderNumber }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewConsumable, setIsNewConsumable] = useState(false)
  const [selectedConsumable, setSelectedConsumable] = useState<Tool | null>(null)

  // 自動計算: 単価 × 数量 = 合計金額（整数のみ）
  const [quantity, setQuantity] = useState<string>('')
  const [unitPrice, setUnitPrice] = useState<string>('')
  const [totalPrice, setTotalPrice] = useState<string>('')

  const handleQuantityChange = (value: string) => {
    setQuantity(value)
    if (unitPrice && value) {
      const total = parseInt(value) * parseInt(unitPrice)
      setTotalPrice(total.toString())
    } else {
      setTotalPrice('')
    }
  }

  const handleUnitPriceChange = (value: string) => {
    setUnitPrice(value)
    if (value && quantity) {
      const total = parseInt(quantity) * parseInt(value)
      setTotalPrice(total.toString())
    } else {
      setTotalPrice('')
    }
  }

  const handleConsumableChange = (toolId: string) => {
    if (toolId === '__new__') {
      setIsNewConsumable(true)
      setSelectedConsumable(null)
    } else {
      setIsNewConsumable(false)
      const consumable = consumables.find(c => c.id === toolId)
      setSelectedConsumable(consumable || null)
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && !isSubmitting && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-6">
          {/* 基本情報 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">発注情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 発注番号 */}
              <div className="md:col-span-2">
                <label htmlFor="order_number" className="block text-sm font-medium text-gray-700 mb-1">
                  発注番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="order_number"
                  id="order_number"
                  required
                  defaultValue={suggestedOrderNumber}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
                  自動生成された番号です。必要に応じて変更できます。
                </p>
              </div>

              {/* 消耗品選択 */}
              <div className="md:col-span-2">
                <label htmlFor="tool_id" className="block text-sm font-medium text-gray-700 mb-1">
                  消耗品 <span className="text-red-500">*</span>
                </label>
                <select
                  name="tool_id"
                  id="tool_id"
                  required={!isNewConsumable}
                  onChange={(e) => handleConsumableChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">消耗品を選択してください</option>
                  {consumables.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name}
                      {tool.model_number && ` (${tool.model_number})`}
                    </option>
                  ))}
                  <option value="__new__">+ 新しい消耗品を登録</option>
                </select>
              </div>

              {/* 新規消耗品登録フォーム */}
              {isNewConsumable && (
                <>
                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">新規消耗品情報</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="new_consumable_name" className="block text-sm font-medium text-gray-700 mb-1">
                          消耗品名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="new_consumable_name"
                          id="new_consumable_name"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="new_consumable_unit" className="block text-sm font-medium text-gray-700 mb-1">
                          単位 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="new_consumable_unit"
                          id="new_consumable_unit"
                          required
                          placeholder="例: 個、箱、本"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="new_consumable_model" className="block text-sm font-medium text-gray-700 mb-1">
                          型番
                        </label>
                        <input
                          type="text"
                          name="new_consumable_model"
                          id="new_consumable_model"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="new_consumable_manufacturer" className="block text-sm font-medium text-gray-700 mb-1">
                          メーカー
                        </label>
                        <input
                          type="text"
                          name="new_consumable_manufacturer"
                          id="new_consumable_manufacturer"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 発注日 */}
              <div>
                <label htmlFor="order_date" className="block text-sm font-medium text-gray-700 mb-1">
                  発注日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="order_date"
                  id="order_date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-1/2 md:w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 納品予定日 */}
              <div>
                <label htmlFor="expected_delivery_date" className="block text-sm font-medium text-gray-700 mb-1">
                  納品予定日
                </label>
                <input
                  type="date"
                  name="expected_delivery_date"
                  id="expected_delivery_date"
                  className="w-1/2 md:w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 発注数量 */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  発注数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  id="quantity"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 単価 */}
              <div>
                <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-1">
                  単価（円）
                </label>
                <input
                  type="number"
                  name="unit_price"
                  id="unit_price"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              {/* 合計金額（自動計算） */}
              <div>
                <label htmlFor="total_price" className="block text-sm font-medium text-gray-700 mb-1">
                  合計金額（円）
                </label>
                <input
                  type="number"
                  name="total_price"
                  id="total_price"
                  min="0"
                  value={totalPrice}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
                  単価 × 数量で自動計算されます
                </p>
              </div>

              {/* 仕入れ先 */}
              <div className="md:col-span-2">
                <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
                  仕入れ先
                </label>
                <select
                  name="client_id"
                  id="client_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">選択してください</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                      {supplier.client_code && ` (${supplier.client_code})`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
                  ※ 仕入れ先は取引先マスタで登録してください
                </p>
              </div>

              {/* メモ */}
              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="発注に関する特記事項など"
                />
              </div>
            </div>
          </div>
        </div>

        {/* フォームフッター */}
        <div className="px-4 py-3 bg-white text-right sm:px-6 space-x-3 sm:rounded-b-lg">
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
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '登録中...' : '発注を登録'}
          </button>
        </div>
      </div>
    </form>
  )
}
