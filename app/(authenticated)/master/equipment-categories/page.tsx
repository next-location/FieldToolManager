import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { EquipmentCategoriesClient } from './EquipmentCategoriesClient'

export default async function EquipmentCategoriesPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userRole)) {
    redirect('/')
  }

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled')
    .eq('id', organizationId)
    .single()

  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  // 重機カテゴリを取得（組織専用 + 共通）
  const { data: categories } = await supabase
    .from('heavy_equipment_categories')
    .select('*')
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order('sort_order')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <EquipmentCategoriesClient
          initialCategories={categories || []}
          organizationId={organizationId}
        />
      </div>
    </div>
  )
}
