import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { ToolsConsumablesMasterClient } from './ToolsConsumablesMasterClient'

export default async function ToolsConsumablesMasterPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得

  // 管理者権限チェック（Manager/Admin のみ）
  if (!['manager', 'admin', 'super_admin'].includes(userRole)) {
    redirect('/')
  }

  const isAdmin = ['admin', 'super_admin'].includes(userRole)

  // 道具マスタ用：共通マスタ（プリセット）を取得
  const { data: toolPresets } = await supabase
    .from('tool_master_presets')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  // 道具マスタ用：組織固有マスタを取得
  const { data: toolMasters } = await supabase
    .from('tools')
    .select(`
      *,
      tool_categories (
        id,
        name
      ),
      tool_manufacturers (
        id,
        name,
        country
      )
    `)
    .eq('organization_id', organizationId)
    .eq('management_type', 'individual')
    .is('deleted_at', null)
    .order('name')

  // カテゴリ一覧を取得
  const { data: categories } = await supabase
    .from('tool_categories')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  // メーカー一覧を取得（システム共通 + 組織独自）
  const { data: manufacturers } = await supabase
    .from('tool_manufacturers')
    .select('id, name, country')
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <ToolsConsumablesMasterClient
          toolPresets={toolPresets || []}
          toolMasters={toolMasters || []}
          categories={categories || []}
          manufacturers={manufacturers || []}
          isAdmin={isAdmin}
          organizationId={organizationId}
        />
      </div>
    </div>
  )
}
