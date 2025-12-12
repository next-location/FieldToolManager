import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EquipmentEditForm } from './EquipmentEditForm'

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // 重機情報を取得
  const { data: equipment, error } = await supabase
    .from('heavy_equipment')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !equipment) {
    redirect('/equipment')
  }

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, heavy_equipment_settings')
    .eq('id', userData?.organization_id)
    .single()

  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  // カテゴリ一覧を取得
  const { data: categories } = await supabase
    .from('heavy_equipment_categories')
    .select('id, name, code_prefix, icon')
    .or(`organization_id.is.null,organization_id.eq.${userData?.organization_id}`)
    .eq('is_active', true)
    .order('sort_order')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <a
            href={`/equipment/${id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            重機詳細に戻る
          </a>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              重機情報の編集
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              重機の情報を編集します。
            </p>

            <EquipmentEditForm
              equipment={equipment}
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
