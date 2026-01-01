import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { EquipmentEditForm } from './EquipmentEditForm'

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // リーダー・管理者チェック
  if (!['leader', 'admin', 'super_admin'].includes(userRole)) {
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
    .eq('id', organizationId)
    .single()

  if (!orgData?.heavy_equipment_enabled) {
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

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">重機情報の編集</h1>
          <p className="mt-1 text-sm text-gray-500">
            重機の情報を編集します。
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">

            <EquipmentEditForm
              equipment={equipment}
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
