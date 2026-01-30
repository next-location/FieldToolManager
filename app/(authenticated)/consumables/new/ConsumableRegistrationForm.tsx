'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createConsumableMaster } from './actions'

interface ConsumableRegistrationFormProps {
  organizationId: string
  consumableCategoryId: string | null
}

export function ConsumableRegistrationForm({
  organizationId,
  consumableCategoryId,
}: ConsumableRegistrationFormProps) {
  const router = useRouter()

  // フォーム状態
  const [name, setName] = useState('')
  const [modelNumber, setModelNumber] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [unit, setUnit] = useState('個')
  const [minimumStock, setMinimumStock] = useState(10)
  const [initialQuantity, setInitialQuantity] = useState<number | ''>('')
  const [description, setDescription] = useState('')

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (!name.trim()) {
      setError('消耗品名を入力してください')
      return
    }

    if (minimumStock < 0) {
      setError('最小在庫数は0以上で入力してください')
      return
    }

    const initialQty = initialQuantity === '' ? 0 : initialQuantity
    if (initialQty < 0) {
      setError('初期在庫数は0以上で入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      // Server Actionを呼び出し（セキュリティチェック付き）
      const result = await createConsumableMaster({
        name: name,
        model_number: modelNumber || undefined,
        manufacturer: manufacturer || undefined,
        unit: unit,
        minimum_stock: minimumStock,
        initial_quantity: initialQty,
        description: description || undefined,
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      if (result.warning) {
        alert(result.warning)
      }

      // 成功したら消耗品一覧にリダイレクト
      router.push('/consumables')
      router.refresh()
    } catch (err: any) {
      console.error('登録エラー:', err)
      setError(err.message || '登録中にエラーが発生しました')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 消耗品名 */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          消耗品名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={isSubmitting}
          placeholder="例: 軍手、養生テープ、ビニール袋"
        />
      </div>

      {/* 型番 */}
      <div>
        <label
          htmlFor="modelNumber"
          className="block text-sm font-medium text-gray-700"
        >
          型番
        </label>
        <input
          type="text"
          id="modelNumber"
          value={modelNumber}
          onChange={(e) => setModelNumber(e.target.value)}
          maxLength={50}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          placeholder="例: ABC-123"
        />
      </div>

      {/* メーカー */}
      <div>
        <label
          htmlFor="manufacturer"
          className="block text-sm font-medium text-gray-700"
        >
          メーカー
        </label>
        <input
          type="text"
          id="manufacturer"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          maxLength={50}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          placeholder="例: ○○工業"
        />
      </div>

      {/* 単位 */}
      <div>
        <label
          htmlFor="unit"
          className="block text-sm font-medium text-gray-700"
        >
          単位 <span className="text-red-500">*</span>
        </label>
        <select
          id="unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={isSubmitting}
        >
          <option value="個">個</option>
          <option value="本">本</option>
          <option value="枚">枚</option>
          <option value="箱">箱</option>
          <option value="袋">袋</option>
          <option value="巻">巻</option>
          <option value="セット">セット</option>
          <option value="ケース">ケース</option>
        </select>
      </div>

      {/* 最小在庫数 */}
      <div>
        <label
          htmlFor="minimumStock"
          className="block text-sm font-medium text-gray-700"
        >
          最小在庫数 <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="minimumStock"
          value={minimumStock}
          onChange={(e) => setMinimumStock(parseInt(e.target.value) || 0)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          required
          min="0"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
          在庫がこの数を下回ると「在庫不足」として警告されます
        </p>
      </div>

      {/* 初期在庫数 */}
      <div>
        <label
          htmlFor="initialQuantity"
          className="block text-sm font-medium text-gray-700"
        >
          初期在庫数（倉庫）
        </label>
        <input
          type="number"
          id="initialQuantity"
          value={initialQuantity}
          onChange={(e) =>
            setInitialQuantity(e.target.value === '' ? '' : parseInt(e.target.value))
          }
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          min="0"
          disabled={isSubmitting}
          placeholder="例: 100"
        />
        <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
          登録時に倉庫に保管する初期在庫数を設定できます（0の場合は在庫レコードは作成されません）
        </p>
      </div>

      {/* 説明 */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          説明・備考
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          placeholder="例: サイズ、用途、注意事項など"
        />
      </div>

      {/* ボタン */}
      <div className="flex justify-end space-x-3">
        <a
          href="/consumables"
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </a>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  )
}
