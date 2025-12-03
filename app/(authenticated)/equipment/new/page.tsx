import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EquipmentRegistrationForm } from './EquipmentRegistrationForm'

export default async function NewEquipmentPage() {
  const supabase = await createClient()

  // 認証チェック
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

  // リーダー・管理者チェック
  if (!['leader', 'admin', 'super_admin'].includes(userData.role)) {
    redirect('/equipment')
  }

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, heavy_equipment_settings')
    .eq('id', userData.organization_id)
    .single()

  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  // カテゴリ一覧を取得
  const { data: categories } = await supabase
    .from('heavy_equipment_categories')
    .select('id, name, code_prefix, icon')
    .or(`organization_id.is.null,organization_id.eq.${userData.organization_id}`)
    .eq('is_active', true)
    .order('sort_order')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <a
            href="/equipment"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            重機一覧に戻る
          </a>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              重機の新規登録
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              新しい重機を登録します。所有形態（自社所有・リース・レンタル）は必須項目です。
            </p>

            <EquipmentRegistrationForm
              organizationId={userData.organization_id}
              categories={categories || []}
              sites={sites || []}
              organizationSettings={orgData.heavy_equipment_settings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
