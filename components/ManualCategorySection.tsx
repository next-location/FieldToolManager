'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ManualArticle } from '@/lib/manual/types'

interface ManualCategorySectionProps {
  categoryName: string
  articles: ManualArticle[]
}

export default function ManualCategorySection({ categoryName, articles }: ManualCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (articles.length === 0) return null

  return (
    <div>
      {/* カテゴリヘッダー（クリック可能） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <h2 className="text-lg font-bold text-gray-900">{categoryName}</h2>
          <span className="ml-2 text-sm text-gray-500">({articles.length}件)</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* マニュアルリスト（折りたたみ可能） */}
      {isOpen && (
        <div className="mb-8 bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/${article.slug}`}
              className="block px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{article.frontmatter.title}</h3>
                  <p className="text-sm text-gray-600">{article.frontmatter.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {article.frontmatter.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
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
      )}
    </div>
  )
}
