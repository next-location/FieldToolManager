'use client'

import { useState } from 'react'
import type { OnboardingFormData } from '@/types/organization'

interface Step3Props {
  formData: OnboardingFormData
  updateFormData: (updates: Partial<OnboardingFormData>) => void
  onNext: () => void
  onBack: () => void
}

const DEFAULT_CATEGORIES = [
  { id: 'electric-tools', name: '電動工具', icon: '⚡' },
  { id: 'measuring', name: '測定機器', icon: '📏' },
  { id: 'safety', name: '安全装備', icon: '🦺' },
  { id: 'painting', name: '塗装用具', icon: '🎨' },
  { id: 'hand-tools', name: '手工具', icon: '🔧' },
  { id: 'consumables', name: '消耗品', icon: '📦' },
]

export default function Step3CategorySetup({
  formData,
  updateFormData,
  onNext,
  onBack,
}: Step3Props) {
  const [customCategory, setCustomCategory] = useState('')

  const toggleCategory = (categoryId: string) => {
    const selected = formData.selectedCategories.includes(categoryId)
    if (selected) {
      updateFormData({
        selectedCategories: formData.selectedCategories.filter((id) => id !== categoryId),
      })
    } else {
      updateFormData({
        selectedCategories: [...formData.selectedCategories, categoryId],
      })
    }
  }

  const addCustomCategory = () => {
    if (customCategory.trim()) {
      const customId = `custom-${Date.now()}`
      updateFormData({
        selectedCategories: [...formData.selectedCategories, customId + ':' + customCategory],
      })
      setCustomCategory('')
    }
  }

  const removeCustomCategory = (categoryStr: string) => {
    updateFormData({
      selectedCategories: formData.selectedCategories.filter((cat) => cat !== categoryStr),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const customCategories = formData.selectedCategories.filter((cat) => cat.startsWith('custom-'))

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-gray-800">ステップ 3/4: カテゴリー設定</h2>
      <p className="mb-6 text-gray-600">
        道具を分類するためのカテゴリーを選択してください
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* デフォルトカテゴリー */}
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-700">デフォルトカテゴリー</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {DEFAULT_CATEGORIES.map((category) => (
              <label
                key={category.id}
                className={`flex cursor-pointer items-center rounded-lg border-2 p-3 transition-colors ${
                  formData.selectedCategories.includes(category.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.selectedCategories.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  className="mr-2 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="mr-2 text-2xl">{category.icon}</span>
                <span className="text-sm font-medium text-gray-700">{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* カスタムカテゴリー追加 */}
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-700">カスタムカテゴリー追加</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="カテゴリー名を入力"
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomCategory}
              className="rounded-md bg-gray-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-700"
            >
              追加
            </button>
          </div>

          {/* カスタムカテゴリー一覧 */}
          {customCategories.length > 0 && (
            <div className="mt-3 space-y-2">
              {customCategories.map((catStr) => {
                const name = catStr.split(':')[1]
                return (
                  <div
                    key={catStr}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomCategory(catStr)}
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 注意事項 */}
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            💡
            カテゴリーは後から追加・編集・削除が可能です。最初は少なめに設定し、必要に応じて追加することをお勧めします。
          </p>
        </div>

        {/* ボタン */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gray-300 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            戻る
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            次へ
          </button>
        </div>
      </form>
    </div>
  )
}
