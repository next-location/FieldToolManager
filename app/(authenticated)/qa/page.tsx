import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import { getAllManualArticles, groupArticlesByCategory } from '@/lib/manual/metadata'
import Link from 'next/link'

export default async function QAPage() {
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

  // 全記事を取得してQ&Aのみをフィルタ
  const allArticles = await getAllManualArticles()
  const qaArticles = allArticles.filter(
    (article) =>
      article.frontmatter.category === 'qa' &&
      article.frontmatter.permission <= userPermission &&
      (article.frontmatter.plans.includes('basic') ||
        article.frontmatter.plans.includes(mappedPlan as 'basic' | 'asset_pack' | 'dx_pack'))
  )

  // タグ別に分類
  const articlesByTag: Record<string, typeof qaArticles> = {}
  qaArticles.forEach((article) => {
    article.frontmatter.tags.forEach((tag) => {
      if (!articlesByTag[tag]) {
        articlesByTag[tag] = []
      }
      articlesByTag[tag].push(article)
    })
  })

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
            ヘルプセンターに戻る
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            よくある質問（Q&A）
          </h1>
          <p className="text-sm text-gray-600">
            トラブルシューティングとよくある質問の回答集
          </p>
        </div>

        {/* 記事一覧 */}
        {qaArticles.length === 0 ? (
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
            <p className="mt-4 text-gray-600">Q&A記事はまだありません</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* タグ別に表示 */}
            {Object.entries(articlesByTag).map(([tag, articles]) => (
              <div key={tag}>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm mr-3">
                    {tag}
                  </span>
                  <span className="text-gray-600 text-sm font-normal">
                    {articles.length}件
                  </span>
                </h2>
                <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
                  {articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/${article.slug}`}
                      className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {article.frontmatter.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {article.frontmatter.description}
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
