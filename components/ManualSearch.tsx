'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import FlexSearch from 'flexsearch'
import type { SearchResultItem } from '@/lib/manual/types'

interface ManualSearchProps {
  userPermission: number
  userPlan: string | null
}

export default function ManualSearch({ userPermission, userPlan }: ManualSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef<FlexSearch.Document<any> | null>(null)
  const router = useRouter()

  // 検索インデックスをロード
  useEffect(() => {
    async function loadSearchIndex() {
      try {
        const response = await fetch('/search-index.json')
        const data = await response.json()

        const index = new FlexSearch.Document({
          document: {
            id: 'slug',
            index: ['title', 'description', 'content', 'tags'],
            store: ['title', 'description', 'category', 'permission', 'tags', 'slug'],
          },
          tokenize: 'full',
          context: true,
        })

        // インデックスに追加
        data.forEach((doc: any) => {
          index.add(doc)
        })

        indexRef.current = index
      } catch (error) {
        console.error('Failed to load search index:', error)
      }
    }

    loadSearchIndex()
  }, [])

  // 外部クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 検索実行
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)

    const performSearch = async () => {
      if (!indexRef.current) {
        setIsLoading(false)
        return
      }

      try {
        const searchResults = await indexRef.current.search(query, {
          limit: 20,
          enrich: true,
        })

        const items: SearchResultItem[] = []
        const seenSlugs = new Set<string>()

        for (const fieldResult of searchResults) {
          for (const result of fieldResult.result) {
            const doc = result.doc as any

            // 権限チェック
            if (doc.permission > userPermission) continue

            // プランチェック（basicは全員OK）
            if (!doc.tags.includes('basic') && userPlan !== 'asset_pack' && userPlan !== 'dx_pack') {
              continue
            }

            if (!seenSlugs.has(doc.slug)) {
              seenSlugs.add(doc.slug)
              items.push({
                slug: doc.slug,
                title: doc.title,
                description: doc.description,
                category: doc.category,
                permission: doc.permission,
                tags: doc.tags.split(' ').filter(Boolean),
              })
            }
          }
        }

        setResults(items.slice(0, 10))
        setIsOpen(items.length > 0)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(performSearch, 200)
    return () => clearTimeout(debounce)
  }, [query, userPermission, userPlan])

  const handleResultClick = (slug: string) => {
    router.push(`/${slug}`)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* 検索ボックス */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="マニュアル・Q&Aを検索..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* 検索結果 */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.slug}
              onClick={() => handleResultClick(result.slug)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{result.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        result.category === 'manual'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {result.category === 'manual' ? 'マニュアル' : 'Q&A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{result.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 結果なし */}
      {isOpen && query && !isLoading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-8 text-center">
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
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">「{query}」に一致する記事が見つかりませんでした</p>
        </div>
      )}
    </div>
  )
}
