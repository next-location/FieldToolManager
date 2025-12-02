'use client'

import { useState, useEffect } from 'react'
import type { OnboardingFormData, IndustryCategory } from '@/types/organization'

interface Step1Props {
  formData: OnboardingFormData
  updateFormData: (updates: Partial<OnboardingFormData>) => void
  onNext: () => void
}

export default function Step1OrganizationInfo({ formData, updateFormData, onNext }: Step1Props) {
  const [industries, setIndustries] = useState<{
    parent: IndustryCategory[]
    children: Record<string, IndustryCategory[]>
  }>({ parent: [], children: {} })
  const [selectedParentId, setSelectedParentId] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    // 業種データを取得
    fetch('/api/industries')
      .then((res) => res.json())
      .then((data) => {
        const parent = data.filter((item: IndustryCategory) => !item.parent_id)
        const children: Record<string, IndustryCategory[]> = {}

        data.forEach((item: IndustryCategory) => {
          if (item.parent_id) {
            if (!children[item.parent_id]) {
              children[item.parent_id] = []
            }
            children[item.parent_id].push(item)
          }
        })

        setIndustries({ parent, children })
      })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (
      !formData.organizationName ||
      !formData.representativeName ||
      !formData.phone ||
      formData.industryCategoryIds.length === 0
    ) {
      alert('必須項目を入力してください。業種は最低1つ選択してください。')
      return
    }

    onNext()
  }

  const handleParentChange = (parentId: string) => {
    setSelectedParentId(parentId)
    // 大分類が変わったら、中分類の選択をリセット
    updateFormData({ industryCategoryIds: [] })
  }

  const toggleIndustryCategory = (categoryId: string) => {
    const currentIds = formData.industryCategoryIds || []
    if (currentIds.includes(categoryId)) {
      updateFormData({
        industryCategoryIds: currentIds.filter((id) => id !== categoryId),
      })
    } else {
      updateFormData({
        industryCategoryIds: [...currentIds, categoryId],
      })
    }
  }

  const searchAddress = async () => {
    const postalCode = formData.postalCode.replace(/-/g, '')
    if (postalCode.length !== 7) {
      alert('7桁の郵便番号を入力してください')
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const address = `${result.address1}${result.address2}${result.address3}`
        updateFormData({ address })
      } else {
        alert('住所が見つかりませんでした')
      }
    } catch (error) {
      console.error('Address search error:', error)
      alert('住所検索に失敗しました')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-gray-800">ステップ 1/4: 組織情報</h2>
      <p className="mb-6 text-gray-600">
        貴社の基本情報を入力してください（所要時間: 約2分）
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 組織名 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            組織名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.organizationName}
            onChange={(e) => updateFormData({ organizationName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="例: A建設株式会社"
            required
          />
        </div>

        {/* 代表者名 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            代表者名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.representativeName}
            onChange={(e) => updateFormData({ representativeName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="例: 山田 太郎"
            required
          />
        </div>

        {/* 電話番号 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="例: 03-1234-5678"
            required
          />
        </div>

        {/* 郵便番号 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">郵便番号</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d-]/g, '')
                updateFormData({ postalCode: value })
              }}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="例: 100-0001"
              maxLength={8}
            />
            <button
              type="button"
              onClick={searchAddress}
              disabled={isSearching}
              className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              {isSearching ? '検索中...' : '住所検索'}
            </button>
          </div>
        </div>

        {/* 住所 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">住所</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateFormData({ address: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="例: 東京都千代田区千代田1-1"
          />
        </div>

        {/* 業種選択 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            業種 <span className="text-red-500">*</span>
          </label>
          <p className="mb-2 text-xs text-gray-500">
            貴社の主要業種分類を1つ選択し、該当する詳細業種を複数選択できます
          </p>

          {/* 大分類 */}
          <select
            value={selectedParentId}
            onChange={(e) => handleParentChange(e.target.value)}
            className="mb-3 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">大分類を選択してください</option>
            {industries.parent.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* 中分類（チェックボックス） */}
          {selectedParentId && industries.children[selectedParentId] && (
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">詳細業種を選択</p>
                <button
                  type="button"
                  onClick={() => {
                    const allIds = industries.children[selectedParentId].map((c) => c.id)
                    const allSelected = allIds.every((id) =>
                      formData.industryCategoryIds.includes(id)
                    )
                    if (allSelected) {
                      // 全て選択済みなら全解除
                      updateFormData({ industryCategoryIds: [] })
                    } else {
                      // 未選択があれば全選択
                      updateFormData({ industryCategoryIds: allIds })
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {industries.children[selectedParentId].every((c) =>
                    formData.industryCategoryIds.includes(c.id)
                  )
                    ? '全解除'
                    : '全選択'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {industries.children[selectedParentId].map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.industryCategoryIds.includes(category.id)}
                      onChange={() => toggleIndustryCategory(category.id)}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                選択中: {formData.industryCategoryIds.length}件
              </p>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div className="flex justify-end pt-4">
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
