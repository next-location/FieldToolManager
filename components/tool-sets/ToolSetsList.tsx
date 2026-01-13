'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ひらがな⇔カタカナ変換
const toHiragana = (str: string): string => {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })
}

const toKatakana = (str: string): string => {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60
    return String.fromCharCode(chr)
  })
}

const normalizeForSearch = (str: string): string => {
  const hiragana = toHiragana(str)
  const katakana = toKatakana(str)
  return `${str} ${hiragana} ${katakana}`.toLowerCase()
}

interface ToolSet {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string
  users: {
    name: string
  } | null
  itemCount: number
}

interface ToolSetsListProps {
  initialToolSets: ToolSet[]
}

export default function ToolSetsList({ initialToolSets }: ToolSetsListProps) {
  const [toolSets, setToolSets] = useState<ToolSet[]>(initialToolSets)
  const [filteredToolSets, setFilteredToolSets] = useState<ToolSet[]>(initialToolSets)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // 検索フィルター適用
    let result = [...toolSets]

    if (searchQuery) {
      const normalizedQuery = normalizeForSearch(searchQuery)
      result = result.filter((set) => {
        const normalizedName = normalizeForSearch(set.name)
        const normalizedDescription = set.description ? normalizeForSearch(set.description) : ''
        return normalizedName.includes(normalizedQuery) || normalizedDescription.includes(normalizedQuery)
      })
    }

    setFilteredToolSets(result)
  }, [toolSets, searchQuery])

  return (
    <>
      {/* 検索ボックス */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="セット名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 結果件数表示 */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredToolSets.length}件のセット
        {filteredToolSets.length !== toolSets.length && (
          <span className="ml-2">
            (全{toolSets.length}件中)
          </span>
        )}
      </div>

      {/* 縦並びリスト */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredToolSets && filteredToolSets.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredToolSets.map((set) => (
              <li key={set.id}>
                <div className="px-4 py-4 sm:px-6">
                  {/* PC: 横並び、スマホ: 縦並び */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {set.name}
                      </p>
                      {set.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {set.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center text-sm text-gray-500 flex-wrap gap-x-4 gap-y-1">
                        <span>🔧 {set.itemCount}個の道具</span>
                        <span>{new Date(set.created_at).toLocaleDateString('ja-JP')}</span>
                        {set.users && (
                          <span>作成者: {set.users.name}</span>
                        )}
                      </div>
                    </div>
                    {/* スマホ: 情報の下、PC: 右側 */}
                    <div className="mt-3 flex items-center space-x-2 sm:mt-0 sm:ml-4 sm:flex-shrink-0">
                      <Link
                        href={`/tool-sets/${set.id}`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        詳細
                      </Link>
                      <Link
                        href={`/movements/new?tool_set_id=${set.id}`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
                      >
                        📦 セット移動
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {toolSets.length === 0
                ? '登録されている道具セットがありません'
                : '検索条件に一致する道具セットがありません'}
            </p>
            {toolSets.length === 0 && (
              <Link
                href="/tool-sets/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                最初のセットを作成する
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
