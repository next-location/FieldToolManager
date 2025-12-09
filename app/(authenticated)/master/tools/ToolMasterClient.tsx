'use client'

import { useState } from 'react'
import Link from 'next/link'
import { copyPresetToOrganization, deleteToolMaster } from './actions'
import { ToolMasterForm } from './ToolMasterForm'

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

type OrganizationMaster = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  unit: string
  minimum_stock: number
  image_url: string | null
  notes: string | null
  is_from_preset: boolean
  preset_id: string | null
  tool_categories: {
    id: string
    name: string
  } | null
}

type Category = {
  id: string
  name: string
}

type Props = {
  presets: Preset[]
  organizationMasters: OrganizationMaster[]
  categories: Category[]
  isAdmin: boolean
  organizationId: string
}

export function ToolMasterClient({
  presets,
  organizationMasters,
  categories,
  isAdmin,
  organizationId,
}: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'presets' | 'organization'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingMaster, setEditingMaster] = useState<OrganizationMaster | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // フィルタリング処理
  const filteredPresets = presets.filter((preset) => {
    const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.model_number?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || preset.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredOrgMasters = organizationMasters.filter((master) => {
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
      setSuccessMessage('プリセットをコピーしました')
      // ページをリロードして最新データを取得
      window.location.reload()
    }

    setLoading(null)
  }

  // 削除
  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return

    setLoading(id)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteToolMaster(id)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage('削除しました')
      window.location.reload()
    }

    setLoading(null)
  }

  // カテゴリ一覧（プリセット + 組織カテゴリ）
  const allCategories = Array.from(
    new Set([
      ...presets.map((p) => p.category).filter(Boolean),
      ...categories.map((c) => c.name),
    ])
  ) as string[]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">道具マスタ管理</h1>
        {isAdmin && (
          <div className="flex space-x-3">
            <Link
              href="/master/tools/import"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              📥 CSVインポート
            </Link>
            <button
              onClick={() => {
                setEditingMaster(null)
                setShowForm(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              + 新規登録
            </button>
          </div>
        )}
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* フォーム表示 */}
      {showForm && (
        <div className="mb-6">
          <ToolMasterForm
            categories={categories}
            organizationId={organizationId}
            editingMaster={editingMaster}
            onCancel={() => {
              setShowForm(false)
              setEditingMaster(null)
            }}
            onSuccess={() => {
              setShowForm(false)
              setEditingMaster(null)
              setSuccessMessage(editingMaster ? '更新しました' : '登録しました')
              window.location.reload()
            }}
          />
        </div>
      )}

      {!showForm && (
        <>
          {/* タブ切替 */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                すべて ({presets.length + organizationMasters.length})
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'presets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏢 共通マスタ ({presets.length})
              </button>
              <button
                onClick={() => setActiveTab('organization')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'organization'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 自社マスタ ({organizationMasters.length})
              </button>
            </nav>
          </div>

          {/* 検索・フィルタ */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="道具名、メーカー、型番で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべてのカテゴリ</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 一覧表示 */}
          <div className="space-y-4">
            {/* 共通マスタ（プリセット） */}
            {(activeTab === 'all' || activeTab === 'presets') &&
              filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-white border border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {preset.name}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🏢 共通マスタ
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {preset.model_number && <div>型番: {preset.model_number}</div>}
                          {preset.manufacturer && <div>メーカー: {preset.manufacturer}</div>}
                          {preset.category && <div>カテゴリ: {preset.category}</div>}
                          <div>単位: {preset.unit}</div>
                          {preset.description && (
                            <div className="mt-2 text-gray-500">{preset.description}</div>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleCopyPreset(preset.id)}
                          disabled={loading === preset.id}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading === preset.id ? '処理中...' : '自社にコピー'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            {/* 組織固有マスタ */}
            {(activeTab === 'all' || activeTab === 'organization') &&
              filteredOrgMasters.map((master) => (
                <div
                  key={master.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {master.name}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            👥 自社マスタ
                          </span>
                          {master.is_from_preset && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              プリセットから作成
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {master.model_number && <div>型番: {master.model_number}</div>}
                          {master.manufacturer && <div>メーカー: {master.manufacturer}</div>}
                          {master.tool_categories && (
                            <div>カテゴリ: {master.tool_categories.name}</div>
                          )}
                          <div>単位: {master.unit}</div>
                          <div>最小在庫数: {master.minimum_stock}</div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="ml-4 flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingMaster(master)
                              setShowForm(true)
                            }}
                            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(master.id)}
                            disabled={loading === master.id}
                            className="px-3 py-2 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-50"
                          >
                            {loading === master.id ? '処理中...' : '削除'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            {/* 結果なし */}
            {((activeTab === 'all' && filteredPresets.length === 0 && filteredOrgMasters.length === 0) ||
              (activeTab === 'presets' && filteredPresets.length === 0) ||
              (activeTab === 'organization' && filteredOrgMasters.length === 0)) && (
              <div className="text-center py-12">
                <p className="text-gray-500">該当する道具マスタがありません</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
