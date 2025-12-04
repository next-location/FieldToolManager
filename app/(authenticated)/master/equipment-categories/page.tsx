import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EquipmentCategoriesClient } from './EquipmentCategoriesClient'

export default async function EquipmentCategoriesPage() {
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

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    redirect('/')
  }

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled')
    .eq('id', userData.organization_id)
    .single()

  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  // 重機カテゴリを取得（組織専用 + 共通）
  const { data: categories } = await supabase
    .from('heavy_equipment_categories')
    .select('*')
    .or(`organization_id.eq.${userData.organization_id},organization_id.is.null`)
    .order('sort_order')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← ダッシュボードに戻る
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">重機カテゴリ管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            重機のカテゴリを管理します。カテゴリを追加・編集・削除できます。
          </p>
        </div>

        <EquipmentCategoriesClient
          initialCategories={categories || []}
          organizationId={userData.organization_id}
        />
      </div>
    </div>
  )
}
