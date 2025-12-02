'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createToolWithItems } from '@/app/tools/actions'

type ToolMaster = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  minimum_stock: number
}

export function ToolRegistrationForm({ toolMasters }: { toolMasters: ToolMaster[] }) {
  const [mode, setMode] = useState<'select' | 'new'>('select')
  const [selectedMasterId, setSelectedMasterId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    model_number: '',
    manufacturer: '',
    management_type: 'individual' as 'individual' | 'consumable',
    unit: '個',
    minimum_stock: '1',
    quantity: '1',
    purchase_date: '',
    purchase_price: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const selectedMaster = toolMasters.find(m => m.id === selectedMasterId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let result
      if (mode === 'select' && selectedMasterId) {
        // 既存マスタから登録
        result = await createToolWithItems({
          tool_master_id: selectedMasterId,
          quantity: formData.quantity,
          purchase_date: formData.purchase_date,
          purchase_price: formData.purchase_price,
          notes: formData.notes,
        })
      } else {
        // 新規マスタ作成 + 個別アイテム登録
        result = await createToolWithItems({
          name: formData.name,
          model_number: formData.model_number,
          manufacturer: formData.manufacturer,
          management_type: formData.management_type,
          unit: formData.unit,
          minimum_stock: formData.minimum_stock,
          quantity: formData.quantity,
          purchase_date: formData.purchase_date,
          purchase_price: formData.purchase_price,
          notes: formData.notes,
        })
      }

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/tools')
      }
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 道具マスタ選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          道具マスタ <span className="text-red-500">*</span>
        </label>
        <select
          value={mode === 'select' ? selectedMasterId : 'new'}
          onChange={(e) => {
            if (e.target.value === 'new') {
              setMode('new')
              setSelectedMasterId('')
            } else {
              setMode('select')
              setSelectedMasterId(e.target.value)
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">既存の道具マスタを選択...</option>
          {toolMasters.map((master) => (
            <option key={master.id} value={master.id}>
              {master.name}
              {master.model_number && ` (${master.model_number})`}
              {master.manufacturer && ` - ${master.manufacturer}`}
            </option>
          ))}
          <option value="new">+ 新しい道具マスタを作成</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          既存の道具マスタを選ぶか、新規作成を選択してください
        </p>
      </div>

      {/* 新規マスタ作成時のフォーム */}
      {mode === 'new' && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <h3 className="text-base font-medium text-gray-900">
            道具マスタ情報（新規作成）
          </h3>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              道具名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="management_type" className="block text-sm font-medium text-gray-700">
              管理タイプ <span className="text-red-500">*</span>
            </label>
            <select
              name="management_type"
              id="management_type"
              value={formData.management_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  management_type: e.target.value as 'individual' | 'consumable',
                })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="individual">個別管理（電動ドリルなど、1つ1つ追跡する道具）</option>
              <option value="consumable">消耗品管理（軍手など、数量だけ管理する道具）</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              個別管理: 各個体にQRコードを付けて追跡 | 消耗品管理: 数量だけを記録
            </p>
          </div>

          {formData.management_type === 'consumable' && (
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                単位 <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="個">個</option>
                <option value="本">本</option>
                <option value="枚">枚</option>
                <option value="セット">セット</option>
                <option value="箱">箱</option>
                <option value="袋">袋</option>
                <option value="缶">缶</option>
                <option value="L">L（リットル）</option>
                <option value="ml">ml（ミリリットル）</option>
                <option value="kg">kg（キログラム）</option>
                <option value="g">g（グラム）</option>
                <option value="m">m（メートル）</option>
                <option value="cm">cm（センチメートル）</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                消耗品を数える単位を選択してください
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="model_number" className="block text-sm font-medium text-gray-700">
                型番
              </label>
              <input
                type="text"
                name="model_number"
                id="model_number"
                value={formData.model_number}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
                メーカー
              </label>
              <input
                type="text"
                name="manufacturer"
                id="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="minimum_stock" className="block text-sm font-medium text-gray-700">
              最小在庫数
            </label>
            <input
              type="number"
              name="minimum_stock"
              id="minimum_stock"
              min="1"
              value={formData.minimum_stock}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              この数を下回ると低在庫アラートが表示されます
            </p>
          </div>
        </div>
      )}

      {/* 既存マスタ選択時の情報表示 */}
      {mode === 'select' && selectedMaster && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">選択した道具マスタ</h4>
          <dl className="text-sm text-blue-700 space-y-1">
            <div>道具名: {selectedMaster.name}</div>
            {selectedMaster.model_number && <div>型番: {selectedMaster.model_number}</div>}
            {selectedMaster.manufacturer && <div>メーカー: {selectedMaster.manufacturer}</div>}
            <div>最小在庫数: {selectedMaster.minimum_stock}</div>
          </dl>
        </div>
      )}

      {/* 個別アイテム登録情報 */}
      {(mode === 'new' || selectedMasterId) && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <h3 className="text-base font-medium text-gray-900">
            個別アイテム登録情報
          </h3>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              登録する個数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              id="quantity"
              min="1"
              required
              value={formData.quantity}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              ※ 指定した個数分の個別アイテム（#001, #002...）とQRコードが作成されます
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
                購入日
              </label>
              <input
                type="date"
                name="purchase_date"
                id="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700">
                購入価格（円）
              </label>
              <input
                type="number"
                name="purchase_price"
                id="purchase_price"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              備考
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* ボタン */}
      <div className="flex justify-end space-x-3">
        <Link
          href="/tools"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={loading || (mode === 'select' && !selectedMasterId)}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  )
}
