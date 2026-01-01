import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { EquipmentRegistrationForm } from './EquipmentRegistrationForm'

export default async function NewEquipmentPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }


  // リーダー・管理者チェック
  if (!['leader', 'admin', 'super_admin'].includes(userRole)) {
    redirect('/equipment')
  }

  // 組織の重機管理機能設定を取得（設定がなくてもデフォルト値で動作）
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, heavy_equipment_settings')
    .eq('id', organizationId)
    .single()

  // heavy_equipment_enabled が明示的に false の場合のみリダイレクト
  // null や undefined の場合は利用可能とする
  if (orgData?.heavy_equipment_enabled === false) {
    redirect('/')
  }

  // カテゴリ一覧を取得
  const { data: categories } = await supabase
    .from('heavy_equipment_categories')
    .select('id, name, code_prefix, icon')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq('is_active', true)
    .order('sort_order')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            重機の新規登録
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            新しい重機を登録します。所有形態（自社所有・リース・レンタル）は必須項目です。
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <EquipmentRegistrationForm
              organizationId={organizationId}
              categories={categories || []}
              sites={sites || []}
              organizationSettings={orgData?.heavy_equipment_settings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
