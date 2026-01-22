import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import { getAllManualArticles } from '@/lib/manual/metadata'
import QASearch from '@/components/QASearch'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import strip from 'strip-markdown'

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

  // 検索用に本文をプレーンテキストに変換
  const qaArticlesWithContent = await Promise.all(
    qaArticles.map(async (article) => {
      const processed = await remark()
        .use(remarkGfm)
        .use(strip)
        .process(article.content)

      const plainText = processed.toString()

      return {
        slug: article.slug,
        title: article.frontmatter.title,
        description: article.frontmatter.description,
        content: plainText,
        tags: article.frontmatter.tags,
      }
    })
  )

  return <QASearch articles={qaArticlesWithContent} />
}
