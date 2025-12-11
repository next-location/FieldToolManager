import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ToolMasterClient } from './ToolMasterClient'

export default async function ToolMasterPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック（leader以上）
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData.role)) {
    redirect('/')
  }

  const isAdmin = ['admin', 'super_admin'].includes(userData.role)

  // 共通マスタ（プリセット）を取得
  const { data: presets } = await supabase
    .from('tool_master_presets')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  // 組織固有マスタを取得
  const { data: organizationMasters } = await supabase
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
    .eq('organization_id', userData.organization_id)
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
      <div className="px-4 py-6 sm:px-0">
        <ToolMasterClient
          presets={presets || []}
          organizationMasters={organizationMasters || []}
          categories={categories || []}
          manufacturers={manufacturers || []}
          isAdmin={isAdmin}
          organizationId={userData.organization_id}
        />
      </div>
    </div>
  )
}
