import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import { getAllManualArticles } from '@/lib/manual/metadata'
import ManualSearch from '@/components/ManualSearch'
import Link from 'next/link'
import type { ManualArticle } from '@/lib/manual/types'

// ジャンル定義
const CATEGORIES = [
  { id: 'getting-started', name: '🚀 はじめに', keywords: ['getting_started', 'ログイン', '初回', 'クイックガイド'] },
  { id: 'basic', name: '📱 基本操作', keywords: ['基本操作', 'スマホ', 'モバイル', 'QRコード', 'スキャン'] },
  { id: 'tool', name: '🔧 備品管理', keywords: ['備品', '道具', '工具', 'ツール', '資機材', '在庫', 'tool', 'equipment', 'consumable'] },
  { id: 'attendance', name: '⏰ 勤怠管理', keywords: ['勤怠', '出勤', '退勤', '打刻', 'attendance', 'clock'] },
  { id: 'document', name: '📄 書類管理', keywords: ['見積', '請求', '発注', 'estimate', 'invoice', 'purchase'] },
  { id: 'work-report', name: '📝 作業報告', keywords: ['作業報告', 'work_report', '報告'] },
  { id: 'project', name: '🏗️ 現場・取引先', keywords: ['現場', '取引先', 'site', 'client', 'project', 'company_site'] },
  { id: 'staff', name: '👥 従業員管理', keywords: ['従業員', 'スタッフ', '社員', 'staff'] },
  { id: 'settings', name: '⚙️ 設定', keywords: ['設定', 'setting'] },
  { id: 'other', name: '📚 その他', keywords: [] }, // 残り全て
]

function categorizeArticle(article: ManualArticle): string {
  const searchText = [
    article.frontmatter.title,
    article.frontmatter.description,
    article.slug,
    ...article.frontmatter.tags,
  ].join(' ').toLowerCase()

  for (const category of CATEGORIES.slice(0, -1)) { // 「その他」以外をチェック
    if (category.keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
      return category.id
    }
  }

  return 'other' // どれにも当てはまらない場合
}

export default async function ManualPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザーの権限レベルを取得
  const userPermission = getRolePermissionLevel(userRole)

  // ユーザーのプラン情報を取得
  const { packageType } = await getOrganizationPackages(organizationId, supabase)

  // プランマッピング
  const planMapping: Record<string, string> = {
    'none': 'basic',
    'full': 'basic',
    'asset': 'asset_pack',
    'dx': 'dx_pack'
  }
  const mappedPlan = planMapping[packageType] || 'basic'

  // 全マニュアル記事を取得
  const allArticles = await getAllManualArticles()

  // ユーザーがアクセスできる記事のみをフィルタ（権限以下のもの全て）
  const accessibleArticles = allArticles
    .filter((a) => a.frontmatter.category === 'manual')
    .filter(
      (article) =>
        article.frontmatter.permission <= userPermission &&
        (article.frontmatter.plans.includes('basic') ||
          article.frontmatter.plans.includes(mappedPlan as 'basic' | 'asset_pack' | 'dx_pack'))
    )

  // ジャンル別にグループ化
  const articlesByCategory: Record<string, ManualArticle[]> = {}
  CATEGORIES.forEach(cat => {
    articlesByCategory[cat.id] = []
  })

  accessibleArticles.forEach(article => {
    const categoryId = categorizeArticle(article)
    articlesByCategory[categoryId].push(article)
  })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">マニュアル</h1>
          <p className="text-sm text-gray-600">
            マニュアルとQ&Aで使い方を確認できます
          </p>
        </div>

        {/* 検索ボックス */}
        <div className="mb-8">
          <ManualSearch userPermission={userPermission} userPlan={packageType} />
        </div>

        {/* カテゴリ別表示 */}
        <div className="mb-8">
          <Link
            href="/qa"
            className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">💡</div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Q&A</h2>
                  <p className="text-green-100 text-sm">よくある質問</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                トラブルシューティングとよくある質問の回答集
              </p>
              <div className="flex items-center text-green-600 font-medium text-sm">
                Q&Aを見る
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* ジャンル別マニュアル一覧 */}
        <div className="space-y-8">
          {CATEGORIES.map(category => {
            const articles = articlesByCategory[category.id]
            if (articles.length === 0) return null

            return (
              <div key={category.id}>
                <div className="flex items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
                  <span className="ml-2 text-sm text-gray-500">({articles.length})</span>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
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
              </div>
            )
          })}
        </div>

        {/* サポート情報 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">お困りの際は</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  マニュアルやQ&Aで解決しない場合は、管理者またはザイロクサポートにお問い合わせください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
