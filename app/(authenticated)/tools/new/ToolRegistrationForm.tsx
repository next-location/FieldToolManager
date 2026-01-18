'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createToolWithItems } from '@/app/(authenticated)/tools/actions'

type Preset = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  unit: string
}

type ToolMaster = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  minimum_stock: number
  is_from_preset: boolean
}

export function ToolRegistrationForm({
  presets,
  toolMasters,
  enableLowStockAlert,
  organizationId,
}: {
  presets: Preset[]
  toolMasters: ToolMaster[]
  enableLowStockAlert: boolean
  organizationId: string
}) {
  const [mode, setMode] = useState<'preset' | 'select'>('preset')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [selectedMasterId, setSelectedMasterId] = useState('')
  const [formData, setFormData] = useState({
    quantity: '1',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const selectedPreset = presets.find(p => p.id === selectedPresetId)
  const selectedMaster = toolMasters.find(m => m.id === selectedMasterId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // プリセットまたは既存マスタから登録
      const result = await createToolWithItems({
        tool_master_id: mode === 'preset' ? undefined : selectedMasterId,
        preset_id: mode === 'preset' ? selectedPresetId : undefined,
        quantity: formData.quantity,
        notes: formData.notes,
      })

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
          value={
            mode === 'preset' ? `preset:${selectedPresetId}` : selectedMasterId
          }
          onChange={(e) => {
            const value = e.target.value
            if (value.startsWith('preset:')) {
              setMode('preset')
              setSelectedPresetId(value.replace('preset:', ''))
              setSelectedMasterId('')
            } else {
              setMode('select')
              setSelectedMasterId(value)
              setSelectedPresetId('')
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">道具マスタを選択...</option>

          {/* 共通マスタ（プリセット） */}
          {presets.length > 0 && (
            <optgroup label="🏢 共通マスタ">
              {presets.map((preset) => (
                <option key={preset.id} value={`preset:${preset.id}`}>
                  {preset.name}
                  {preset.model_number && ` (${preset.model_number})`}
                  {preset.manufacturer && ` - ${preset.manufacturer}`}
                </option>
              ))}
            </optgroup>
          )}

          {/* 自社マスタ */}
          {toolMasters.length > 0 && (
            <optgroup label="👥 自社マスタ">
              {toolMasters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.name}
                  {master.model_number && ` (${master.model_number})`}
                  {master.manufacturer && ` - ${master.manufacturer}`}
                  {master.is_from_preset && ' [プリセット]'}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <div className="mt-2 text-xs sm:text-sm text-gray-600">
          使いたい道具マスタが見つかりませんか？{' '}
          <Link href="/master/tools-consumables" className="text-blue-600 hover:text-blue-700 font-medium">
            道具・消耗品マスタページ
          </Link>
          {' '}で新規作成できます。
        </div>
      </div>

      {/* プリセット選択時の情報表示 */}
      {mode === 'preset' && selectedPreset && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
            <span className="mr-2">🏢</span>
            選択した共通マスタ
          </h4>
          <dl className="text-sm text-blue-700 space-y-1">
            <div>道具名: {selectedPreset.name}</div>
            {selectedPreset.model_number && <div>型番: {selectedPreset.model_number}</div>}
            {selectedPreset.manufacturer && <div>メーカー: {selectedPreset.manufacturer}</div>}
            <div>単位: {selectedPreset.unit}</div>
          </dl>
          <p className="mt-2 text-[10px] sm:text-xs text-blue-600">
            ※ このプリセットから自社マスタが自動作成され、個別アイテムが登録されます
          </p>
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
      {(selectedPresetId || selectedMasterId) && (
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
            <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
              ※ 指定した個数分の個別アイテム（#001, #002...）とQRコードが作成されます
            </p>
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
              maxLength={2000}
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
          disabled={loading || (!selectedPresetId && !selectedMasterId)}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  )
}
