'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { copyPresetToOrganization, deleteToolMaster, deleteCategoryMaster } from './actions'
import { ToolMasterForm } from './ToolMasterForm'
import { CategoryMasterForm } from './CategoryMasterForm'
import ToolMasterFiltersModal from '@/components/master/ToolMasterFiltersModal'

type Preset = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  category: string | null
  unit: string
  image_url: string | null
  description: string | null
  notes: string | null
}

type Master = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  unit: string
  minimum_stock: number
  image_url: string | null
  notes: string | null
  is_from_preset?: boolean
  preset_id?: string | null
  tool_categories: {
    id: string
    name: string
  } | null
}

type Category = {
  id: string
  name: string
  description?: string | null
}

type Manufacturer = {
  id: string
  name: string
  country?: string
}

type Props = {
  toolPresets: Preset[]
  toolMasters: Master[]
  categories: Category[]
  manufacturers: Manufacturer[]
  isAdmin: boolean
  organizationId: string
}

export function ToolsConsumablesMasterClient({
  toolPresets,
  toolMasters,
  categories,
  manufacturers,
  isAdmin,
  organizationId,
}: Props) {
  const [activeTab, setActiveTab] = useState<'categories' | 'tools'>('tools')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showToolForm, setShowToolForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingToolMaster, setEditingToolMaster] = useState<Master | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // フィルタリング処理
  const filteredToolPresets = toolPresets.filter((preset) => {
    const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.model_number?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || preset.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredToolMasters = toolMasters.filter((master) => {
    const matchesSearch = master.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      master.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      master.model_number?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || master.tool_categories?.name === selectedCategory
    return matchesSearch && matchesCategory
  })


  // プリセットからコピー
  const handleCopyPreset = async (presetId: string) => {
    setLoading(presetId)
    setError(null)
    setSuccessMessage(null)

    const result = await copyPresetToOrganization(presetId)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage('プリセットから道具マスタを作成しました')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }

    setLoading(null)
  }

  // 道具マスタ削除
  const handleDeleteToolMaster = async (masterId: string) => {
    if (!confirm('この道具マスタを削除してもよろしいですか？\n※この道具マスタを使用している個別道具は削除されません。')) {
      return
    }

    setLoading(masterId)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteToolMaster(masterId)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage('道具マスタを削除しました')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }

    setLoading(null)
  }


  // カテゴリ削除
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('このカテゴリを削除してもよろしいですか？\n※このカテゴリを使用している道具・消耗品は削除されません。')) {
      return
    }

    setLoading(categoryId)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteCategoryMaster(categoryId)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage('カテゴリを削除しました')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }

    setLoading(null)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
          道具マスタ
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          道具のマスタデータを管理します。ここで登録したマスタは、道具の新規登録時に選択できます。
        </p>
      </div>

      {/* メッセージ表示 */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setActiveTab('tools')
              setSearchQuery('')
              setSelectedCategory('')
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tools'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            道具マスタ
          </button>
          <button
            onClick={() => {
              setActiveTab('categories')
              setSearchQuery('')
              setSelectedCategory('')
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            カテゴリ管理
          </button>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">

        {/* タブコンテンツ */}
        <div className="p-6">
          {/* カテゴリ管理タブ */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="sm:flex sm:justify-between sm:items-center">
                <p className="text-sm text-gray-600 mb-3 sm:mb-0">
                  道具や消耗品を分類するためのカテゴリを管理します。
                </p>
                <button
                  onClick={() => setShowCategoryForm(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新規作成
                </button>
              </div>

              {/* カテゴリフォーム */}
              {showCategoryForm && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingCategory ? 'カテゴリ編集' : 'カテゴリ新規作成'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowCategoryForm(false)
                        setEditingCategory(null)
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <CategoryMasterForm
                    organizationId={organizationId}
                    editingCategory={editingCategory}
                    onSuccess={() => {
                      setShowCategoryForm(false)
                      setEditingCategory(null)
                      window.location.reload()
                    }}
                    onCancel={() => {
                      setShowCategoryForm(false)
                      setEditingCategory(null)
                    }}
                  />
                </div>
              )}

              {/* カテゴリ一覧 */}
              <div>
                {categories.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">カテゴリなし</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      新規作成ボタンからカテゴリを登録してください
                    </p>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {categories.map((category) => {
                        const isSystemCategory = category.name === '消耗品'
                        return (
                          <li key={category.id} className="px-6 py-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {category.name}
                                  </h4>
                                  {isSystemCategory && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      システム
                                    </span>
                                  )}
                                </div>
                                {category.description && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    {category.description}
                                  </p>
                                )}
                              </div>
                              {!isSystemCategory && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setEditingCategory(category)
                                      setShowCategoryForm(true)
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    編集
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteCategory(category.id)}
                                      disabled={loading === category.id}
                                      className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                    >
                                      {loading === category.id ? '削除中...' : '削除'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 道具マスタタブ */}
          {activeTab === 'tools' && (
            <div className="space-y-6">
              {/* 説明と新規作成ボタン */}
              <div className="sm:flex sm:justify-between sm:items-center">
                <p className="text-sm text-gray-600 mb-3 sm:mb-0">
                  道具の種類（テンプレート）を管理します。ここで登録したマスタは、実際の道具を登録する際に選択できます。<br className="hidden sm:block" />
                  <span className="text-xs text-gray-500">※実際の道具を登録してQRコードを発行するには、「道具一覧」ページから行います。</span>
                </p>
                <button
                  onClick={() => setShowToolForm(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新規作成
                </button>
              </div>

              {/* 検索・フィルター - モバイル */}
              <div className="sm:hidden mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="道具名、メーカー、型番で検索..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="relative p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                    aria-label="フィルター"
                  >
                    <SlidersHorizontal className="h-5 w-5 text-gray-600" />
                    {selectedCategory && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        1
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* 検索・フィルター - PC */}
              <div className="hidden sm:block bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">検索・フィルター</h3>
                  {(searchQuery || selectedCategory) && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory('')
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      クリア
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tool-search" className="block text-sm font-medium text-gray-700 mb-1">
                      道具名
                    </label>
                    <input
                      type="text"
                      id="tool-search"
                      placeholder="道具名、メーカー、型番で検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="tool-category" className="block text-sm font-medium text-gray-700 mb-1">
                      カテゴリー
                    </label>
                    <select
                      id="tool-category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">すべて</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* アクティブなフィルターの表示 */}
                {(searchQuery || selectedCategory) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-sm text-gray-500">適用中:</span>
                    {searchQuery && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        検索: {searchQuery}
                        <button
                          onClick={() => setSearchQuery('')}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {selectedCategory && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        カテゴリー: {selectedCategory}
                        <button
                          onClick={() => setSelectedCategory('')}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 道具マスタフォーム */}
              {showToolForm && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingToolMaster ? '道具マスタ編集' : '道具マスタ新規作成'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowToolForm(false)
                        setEditingToolMaster(null)
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <ToolMasterForm
                    categories={categories}
                    manufacturers={manufacturers}
                    organizationId={organizationId}
                    editingMaster={editingToolMaster}
                    onSuccess={() => {
                      setShowToolForm(false)
                      setEditingToolMaster(null)
                      window.location.reload()
                    }}
                    onCancel={() => {
                      setShowToolForm(false)
                      setEditingToolMaster(null)
                    }}
                  />
                </div>
              )}

              {/* システム共通プリセット */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  システム共通プリセット（{filteredToolPresets.length}件）
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-4">
                    システム共通のプリセットから選択して、組織独自の道具マスタとして登録できます。
                  </p>
                  {filteredToolPresets.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      該当するプリセットが見つかりません
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredToolPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                          {preset.image_url && (
                            <img
                              src={preset.image_url}
                              alt={preset.name}
                              className="w-full h-32 object-cover rounded-md mb-3"
                            />
                          )}
                          <h4 className="font-medium text-gray-900">{preset.name}</h4>
                          {preset.model_number && (
                            <p className="text-sm text-gray-500">型番: {preset.model_number}</p>
                          )}
                          {preset.manufacturer && (
                            <p className="text-sm text-gray-500">メーカー: {preset.manufacturer}</p>
                          )}
                          {preset.category && (
                            <p className="text-sm text-gray-500">カテゴリ: {preset.category}</p>
                          )}
                          <button
                            onClick={() => handleCopyPreset(preset.id)}
                            disabled={loading === preset.id}
                            className="mt-3 w-full inline-flex justify-center items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {loading === preset.id ? '処理中...' : 'マスタに追加'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 組織固有の道具マスタ */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  組織固有の道具マスタ（{filteredToolMasters.length}件）
                </h3>
                {filteredToolMasters.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">道具マスタなし</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      新規作成ボタンから道具マスタを登録してください
                    </p>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {filteredToolMasters.map((master) => (
                        <li key={master.id} className="px-6 py-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                {master.image_url && (
                                  <img
                                    src={master.image_url}
                                    alt={master.name}
                                    className="h-12 w-12 rounded object-cover"
                                  />
                                )}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                    {master.name}
                                    {master.is_from_preset && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        プリセット
                                      </span>
                                    )}
                                  </h4>
                                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                    {master.model_number && <span>型番: {master.model_number}</span>}
                                    {master.manufacturer && <span>メーカー: {master.manufacturer}</span>}
                                    {master.tool_categories && (
                                      <span>カテゴリ: {master.tool_categories.name}</span>
                                    )}
                                    <span>単位: {master.unit}</span>
                                    <span>最小在庫: {master.minimum_stock}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingToolMaster(master)
                                  setShowToolForm(true)
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                編集
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteToolMaster(master.id)}
                                  disabled={loading === master.id}
                                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                  {loading === master.id ? '削除中...' : '削除'}
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フィルターモーダル */}
      <ToolMasterFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        categories={categories}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onReset={() => {
          setSearchQuery('')
          setSelectedCategory('')
        }}
      />
    </div>
  )
}
