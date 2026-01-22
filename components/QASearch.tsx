'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type QAArticle = {
  slug: string
  title: string
  description: string
  content: string
  tags: string[]
}

type QASearchProps = {
  articles: QAArticle[]
}

// カタカナをひらがなに変換
function kanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })
}

// テキストを正規化（小文字 + ひらがな化）
function normalizeText(text: string): string {
  return kanaToHiragana(text.toLowerCase())
}

export default function QASearch({ articles }: QASearchProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // 検索フィルタリング
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return articles
    }

    const normalizedQuery = normalizeText(searchQuery)
    const keywords = normalizedQuery.split(/\s+/).filter(Boolean)

    return articles.filter((article) => {
      const searchableText = normalizeText(
        `${article.title} ${article.description} ${article.content} ${article.tags.join(' ')}`
      )
      return keywords.every((keyword) => searchableText.includes(keyword))
    })
  }, [articles, searchQuery])

  // タグ別にグループ化
  const articlesByTag = useMemo(() => {
    const grouped: Record<string, QAArticle[]> = {}
    filteredArticles.forEach((article) => {
      article.tags.forEach((tag) => {
        if (!grouped[tag]) {
          grouped[tag] = []
        }
        // 重複を防ぐ
        if (!grouped[tag].some((a) => a.slug === article.slug)) {
          grouped[tag].push(article)
        }
      })
    })
    return grouped
  }, [filteredArticles])

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link
            href="/manual"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            マニュアルに戻る
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            よくある質問（Q&A）
          </h1>
          <p className="text-sm text-gray-600">
            トラブルシューティングとよくある質問の回答集
          </p>
        </div>

        {/* 検索ボックス */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Q&Aを検索... （例: QRコード, 勤怠, 見積書）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
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
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              {filteredArticles.length}件の記事が見つかりました
            </p>
          )}
        </div>

        {/* 記事一覧 */}
        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
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
            <p className="mt-4 text-gray-600">
              {searchQuery
                ? '検索条件に一致するQ&A記事が見つかりませんでした'
                : 'Q&A記事はまだありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* タグ別に表示 */}
            {Object.entries(articlesByTag).map(([tag, tagArticles]) => (
              <div key={tag}>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm mr-3">
                    {tag}
                  </span>
                  <span className="text-gray-600 text-sm font-normal">
                    {tagArticles.length}件
                  </span>
                </h2>
                <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
                  {tagArticles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/${article.slug}`}
                      className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {article.description}
                          </p>
                        </div>
                        <svg
                          className="ml-4 h-5 w-5 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* サポート情報 */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                解決しない場合は
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Q&Aで解決しない場合は、管理者またはザイロクサポートにお問い合わせください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
