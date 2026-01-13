import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import { getAllManualArticles, groupArticlesByPermission } from '@/lib/manual/metadata'
import ManualSearch from '@/components/ManualSearch'
import Link from 'next/link'

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

  // 全マニュアル記事を取得して権限別に分類
  const allArticles = await getAllManualArticles()
  const articlesByPermission = groupArticlesByPermission(
    allArticles.filter((a) => a.frontmatter.category === 'manual')
  )

  // ユーザーがアクセスできる記事のみをフィルタ
  const accessibleArticles = allArticles.filter(
    (article) =>
      article.frontmatter.permission <= userPermission &&
      (article.frontmatter.plans.includes('basic') ||
        article.frontmatter.plans.includes(mappedPlan as 'basic' | 'asset_pack' | 'dx_pack'))
  )

  // 最近更新された記事（上位5件）
  const recentArticles = [...accessibleArticles]
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.lastUpdated).getTime()
      const dateB = new Date(b.frontmatter.lastUpdated).getTime()
      return dateB - dateA
    })
    .slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">ヘルプセンター</h1>
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

        {/* 最近更新された記事 */}
        {recentArticles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">最近更新された記事</h2>
            <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
              {recentArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/${article.slug}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{article.frontmatter.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            article.frontmatter.category === 'manual'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {article.frontmatter.category === 'manual' ? 'マニュアル' : 'Q&A'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{article.frontmatter.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        更新日: {article.frontmatter.lastUpdated}
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
        )}

        {/* マニュアル記事一覧 */}
        <div className="space-y-8">
          {/* スタッフ向け */}
          {userPermission >= 1 && articlesByPermission.staff.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">📱</span>
                <h2 className="text-lg font-bold text-gray-900">スタッフ向けマニュアル</h2>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
                {articlesByPermission.staff.map((article) => (
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
          )}

          {/* リーダー向け */}
          {userPermission >= 2 && articlesByPermission.leader.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">👥</span>
                <h2 className="text-lg font-bold text-gray-900">リーダー向けマニュアル</h2>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
                {articlesByPermission.leader.map((article) => (
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
          )}

          {/* マネージャー向け */}
          {userPermission >= 3 && articlesByPermission.manager.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">💼</span>
                <h2 className="text-lg font-bold text-gray-900">マネージャー向けマニュアル</h2>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
                {articlesByPermission.manager.map((article) => (
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
          )}

          {/* オーナー向け */}
          {userPermission >= 4 && articlesByPermission.owner.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">⚙️</span>
                <h2 className="text-lg font-bold text-gray-900">オーナー向けマニュアル</h2>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
                {articlesByPermission.owner.map((article) => (
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
          )}
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
