import { notFound } from 'next/navigation'
import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import { getAllManualArticles } from '@/lib/manual/metadata'
import Link from 'next/link'

export async function generateStaticParams() {
  const articles = getAllManualArticles()
  const qaArticles = articles.filter((a) => a.frontmatter.category === 'qa')
  return qaArticles.map((article) => ({
    slug: article.slug.replace('qa/', '').split('/').filter(Boolean),
  }))
}

export default async function QAArticlePage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { userId, organizationId, userRole, supabase } = await requireAuth()
  const userPermission = getRolePermissionLevel(userRole)
  const { packageType } = await getOrganizationPackages(organizationId, supabase)

  // paramsを解決
  const { slug } = await params

  // slug配列からパスを構築
  const slugPath = `qa/${slug.join('/')}`

  // 記事を取得
  const allArticles = getAllManualArticles()
  const article = allArticles.find((a) => a.slug === slugPath)

  if (!article) {
    notFound()
  }

  // 権限チェック
  if (article.frontmatter.permission > userPermission) {
    notFound()
  }

  // プランチェック
  if (
    !article.frontmatter.plans.includes('basic') &&
    !article.frontmatter.plans.includes(packageType)
  ) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0">
        {/* パンくずリスト */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/manual" className="hover:text-blue-600">
                ヘルプセンター
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li>
              <Link href="/qa" className="hover:text-green-600">
                Q&A
              </Link>
            </li>
          </ol>
        </nav>

        {/* 記事ヘッダー */}
        <div className="mb-8">
          <div className="mb-3">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Q&A
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{article.frontmatter.title}</h1>
          <p className="text-gray-600 mb-4">{article.frontmatter.description}</p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>更新日: {article.frontmatter.lastUpdated}</span>
            {article.frontmatter.tags.length > 0 && (
              <>
                <span>•</span>
                <div className="flex gap-2">
                  {article.frontmatter.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 記事本文 */}
        <article className="prose prose-green max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-center">
          <Link
            href="/qa"
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            <svg
              className="mr-2 h-5 w-5"
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
            Q&A一覧に戻る
          </Link>

          <Link
            href="/manual"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
          >
            ヘルプセンターに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
