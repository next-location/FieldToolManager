import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsageAnalyticsView from './UsageAnalyticsView'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'

export default async function UsageAnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 権限チェック（リーダー以上のみ）
  if (userData.role === 'staff') {
    redirect('/')
  }

  // パッケージチェック（現場資産パック必須）
  if (userData?.organization_id) {
    const features = await getOrganizationFeatures(userData.organization_id)
    if (!hasPackage(features, 'asset')) {
      return <PackageRequired packageType="asset" featureName="使用頻度分析" userRole={userData.role} />
    }
  }

  // 道具マスタ取得（カテゴリ込み）
  const { data: tools } = await supabase
    .from('tools')
    .select(`
      *,
      categories:category_id (
        id,
        name
      )
    `)
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 移動履歴取得（過去1年）
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: movements } = await supabase
    .from('tool_movements')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .gte('created_at', oneYearAgo.toISOString())

  // 消耗品移動履歴
  const { data: consumableMovements } = await supabase
    .from('consumable_movements')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .gte('created_at', oneYearAgo.toISOString())

  // 現場一覧取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)

  // ユーザー一覧取得
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)

  // ツールにカテゴリ名を追加
  const toolsWithCategory = (tools || []).map((tool: any) => ({
    ...tool,
    category_name: tool.categories?.name || null,
  }))

  return (
    <UsageAnalyticsView
      tools={toolsWithCategory}
      movements={[...(movements || []), ...(consumableMovements || [])]}
      sites={sites || []}
      users={users || []}
    />
  )
}
