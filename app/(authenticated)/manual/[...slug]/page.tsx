import { notFound } from 'next/navigation'
import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import { getAllManualArticles } from '@/lib/manual/metadata'
import Link from 'next/link'

export async function generateStaticParams() {
  const articles = await getAllManualArticles()
  return articles.map((article) => ({
    slug: article.slug.split('/').filter(Boolean),
  }))
}

export default async function ManualArticlePage({
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
  const slugPath = `manual/${slug.join('/')}`

  // 記事を取得
  const allArticles = await getAllManualArticles()
  const article = allArticles.find((a) => a.slug === slugPath)

  if (!article) {
    notFound()
  }

  // 権限チェック
  if (article.frontmatter.permission > userPermission) {
    notFound()
  }

  // プランチェック
  const planMapping: Record<string, string> = {
    'none': 'basic',
    'full': 'basic',
    'asset': 'asset_pack',
    'dx': 'dx_pack'
  }
  const mappedPlan = planMapping[packageType] || 'basic'

  if (
    !article.frontmatter.plans.includes('basic') &&
    !article.frontmatter.plans.includes(mappedPlan as 'basic' | 'asset_pack' | 'dx_pack')
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
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  article.frontmatter.category === 'manual'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {article.frontmatter.category === 'manual' ? 'マニュアル' : 'Q&A'}
              </span>
            </li>
          </ol>
        </nav>

        {/* 記事ヘッダー */}
        <div className="mb-8">
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
        <article className="prose prose-blue max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <Link
            href="/manual"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
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
            ヘルプセンターに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
