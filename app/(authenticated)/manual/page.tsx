import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import ManualSearch from '@/components/ManualSearch'
import ManualCategorySection from '@/components/ManualCategorySection'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'

type SearchIndexItem = {
  slug: string
  title: string
  description: string
  content: string
  category: string
  permission: number
  tags: string[]
}

type ManualArticle = {
  slug: string
  frontmatter: {
    title: string
    description: string
    category: string
    permission: number
    plans: string[]
    tags: string[]
  }
}

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

  // 検索インデックスから記事データを読み込む（高速化）
  const searchIndexPath = path.join(process.cwd(), 'public', 'search-index.json')
  const searchIndex: SearchIndexItem[] = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'))

  // ManualArticle形式に変換
  const allArticles: ManualArticle[] = searchIndex.map(item => ({
    slug: item.slug,
    frontmatter: {
      title: item.title,
      description: item.description,
      category: item.category,
      permission: item.permission,
      plans: ['basic'], // 検索インデックスにはplans情報がないのでbasicをデフォルトに
      tags: item.tags,
    }
  }))

  // ユーザーがアクセスできる記事のみをフィルタ（権限以下のもの全て）
  const accessibleArticles = allArticles
    .filter((a) => a.frontmatter.category === 'manual')
    .filter((article) => article.frontmatter.permission <= userPermission)

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

        {/* ジャンル別マニュアル一覧（折りたたみ可能） */}
        <div className="space-y-4">
          {CATEGORIES.map(category => (
            <ManualCategorySection
              key={category.id}
              categoryName={category.name}
              articles={articlesByCategory[category.id]}
            />
          ))}
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
