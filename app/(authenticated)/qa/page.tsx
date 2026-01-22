import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import { getRolePermissionLevel } from '@/lib/manual/permissions'
import QASearch from '@/components/QASearch'
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

  // 検索インデックスから記事データを読み込む（ビルド済み）
  const searchIndexPath = path.join(process.cwd(), 'public', 'search-index.json')
  const searchIndex: SearchIndexItem[] = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'))

  // Q&Aのみをフィルタ（権限チェック）
  const qaArticles = searchIndex
    .filter((article) => article.category === 'qa' && article.permission <= userPermission)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      content: article.content,
      tags: article.tags,
    }))

  return <QASearch articles={qaArticles} />
}
