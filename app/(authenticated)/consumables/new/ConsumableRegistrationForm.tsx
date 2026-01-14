'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ConsumableRegistrationFormProps {
  organizationId: string
  consumableCategoryId: string | null
}

export function ConsumableRegistrationForm({
  organizationId,
  consumableCategoryId,
}: ConsumableRegistrationFormProps) {
  const router = useRouter()
  const supabase = createClient()

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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('ユーザーが見つかりません')
      }

      // 消耗品マスターを作成（カテゴリは自動的に「消耗品」）
      const { data: newConsumable, error: insertError } = await supabase
        .from('tools')
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          model_number: modelNumber.trim() || null,
          manufacturer: manufacturer.trim() || null,
          category_id: consumableCategoryId,
          management_type: 'consumable',
          unit: unit,
          minimum_stock: minimumStock,
          notes: description.trim() || null,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(
          `消耗品の登録に失敗しました: ${insertError.message}`
        )
      }

      // 初期在庫がある場合は在庫レコードを作成
      if (initialQty > 0) {
        const { error: inventoryError } = await supabase
          .from('consumable_inventory')
          .insert({
            organization_id: organizationId,
            tool_id: newConsumable.id,
            location_type: 'warehouse',
            site_id: null,
            warehouse_location_id: null,
            quantity: initialQty,
          })

        if (inventoryError) {
          console.error('初期在庫の登録エラー:', inventoryError)
          // 在庫登録に失敗しても消耗品マスターは作成されているので、エラーは警告にとどめる
          alert(
            '消耗品は登録されましたが、初期在庫の登録に失敗しました。後ほど在庫調整で追加してください。'
          )
        } else {
          // 在庫調整履歴を記録
          const { error: movementError } = await supabase
            .from('consumable_movements')
            .insert({
              organization_id: organizationId,
              tool_id: newConsumable.id,
              movement_type: '調整',
              from_location_type: 'warehouse',
              from_site_id: null,
              to_location_type: 'warehouse',
              to_site_id: null,
              quantity: initialQty,
              performed_by: user.id,
              notes: `[初期在庫] 新規登録時の初期在庫`,
            })

          if (movementError) {
            console.error('在庫調整履歴の記録エラー:', movementError)
          }
        }
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
