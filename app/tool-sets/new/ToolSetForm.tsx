'use client'

import { useState } from 'react'
import Link from 'next/link'

type ToolItem = {
  id: string
  serial_number: string
  current_location: string
  current_site_id: string | null
  status: string
  tools: {
    id: string
    name: string
    model_number: string | null
    manufacturer: string | null
  }
  current_site?: {
    name: string
  }
}

type ToolSetFormProps = {
  toolItems: ToolItem[]
  action: (formData: FormData) => Promise<void>
}

export function ToolSetForm({ toolItems, action }: ToolSetFormProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const toggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId))
    } else {
      setSelectedItemIds([...selectedItemIds, itemId])
    }
  }

  const filteredItems = toolItems.filter((item) => {
    const tool = item.tools as any
    const searchLower = searchTerm.toLowerCase()
    return (
      tool.name.toLowerCase().includes(searchLower) ||
      item.serial_number.includes(searchLower) ||
      tool.model_number?.toLowerCase().includes(searchLower) ||
      false
    )
  })

  // 道具マスタごとにグループ化
  const groupedItems = filteredItems.reduce((acc, item) => {
    const tool = item.tools as any
    const key = tool.id
    if (!acc[key]) {
      acc[key] = {
        tool: tool,
        items: [],
      }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { tool: any; items: ToolItem[] }>)

  return (
    <form action={action}>
      <div className="space-y-6">
        {/* セット名 */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            セット名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: 基本工具セット、電動工具セット"
          />
        </div>

        {/* 説明 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            説明
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="このセットの用途や内容を説明"
          />
        </div>

        {/* 道具選択 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              道具を選択 <span className="text-red-500">*</span>
              <span className="ml-2 text-sm font-normal text-gray-500">
                （{selectedItemIds.length}個選択中）
              </span>
            </label>
          </div>

          {/* 検索ボックス */}
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="道具名、型番、シリアル番号で検索..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 個別アイテムのリスト */}
          <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
            {Object.keys(groupedItems).length > 0 ? (
              Object.values(groupedItems).map((group) => (
                <div key={group.tool.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="bg-gray-50 px-4 py-2 font-medium text-gray-900">
                    {group.tool.name}
                    {group.tool.model_number && ` (${group.tool.model_number})`}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => {
                      const currentSite = item.current_site as any
                      const locationText =
                        item.current_location === 'warehouse'
                          ? '倉庫'
                          : item.current_location === 'site'
                          ? currentSite?.name || '現場'
                          : item.current_location === 'repair'
                          ? '修理中'
                          : '不明'

                      const statusColor =
                        item.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'in_use'
                          ? 'bg-blue-100 text-blue-800'
                          : item.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.status === 'lost'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'

                      return (
                        <label
                          key={item.id}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                #{item.serial_number}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${statusColor}`}
                              >
                                {item.status === 'available'
                                  ? '利用可能'
                                  : item.status === 'in_use'
                                  ? '使用中'
                                  : item.status === 'maintenance'
                                  ? 'メンテナンス'
                                  : item.status === 'lost'
                                  ? '紛失'
                                  : item.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              📍 {locationText}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm
                  ? '検索結果が見つかりません'
                  : '道具が登録されていません'}
              </div>
            )}
          </div>

          {/* Hidden inputs for selected tool item IDs */}
          {selectedItemIds.map((itemId) => (
            <input key={itemId} type="hidden" name="tool_item_ids" value={itemId} />
          ))}

          <p className="mt-2 text-sm text-gray-500">
            ※ セットに含める個別アイテムを選択してください（チェックボックス）
          </p>
        </div>

        {/* ボタン */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={selectedItemIds.length === 0}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            セットを作成 ({selectedItemIds.length}個)
          </button>
          <Link
            href="/tool-sets"
            className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium text-center"
          >
            キャンセル
          </Link>
        </div>
      </div>
    </form>
  )
}
