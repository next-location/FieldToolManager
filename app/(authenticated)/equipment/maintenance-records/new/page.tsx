import { redirect } from 'next/navigation'
import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import NewMaintenanceRecordForm from './NewMaintenanceRecordForm'

export default async function NewMaintenanceRecordPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 権限チェック（リーダー・管理者のみ）
  if (userRole === 'staff') {
    redirect('/equipment/maintenance-records')
  }

  // パッケージチェック（現場資産パック または フル機能統合パックが必要）
  const packages = await getOrganizationPackages(organizationId, supabase)
  if (!packages.hasAssetPackage && packages.packageType !== 'full') {
    redirect('/')
  }

  // 組織の重機管理機能設定を取得
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled')
    .eq('id', organizationId)
    .single()

  // 運用設定で重機機能が無効化されている場合はリダイレクト
  if (orgData?.heavy_equipment_enabled === false) {
    redirect('/equipment')
  }

  // ユーザー名取得
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

  // 重機一覧を取得
  const { data: equipment } = await supabase
    .from('heavy_equipment')
    .select('id, equipment_code, name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('equipment_code', { ascending: true })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <a
            href="/equipment/maintenance-records"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            修理・点検記録一覧に戻る
          </a>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">修理・点検記録の登録</h1>
          <p className="mt-1 text-sm text-gray-500">
            重機の点検・車検・保険更新・修理記録を登録します
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <NewMaintenanceRecordForm
              equipment={equipment || []}
              currentUserName={userData?.name || ''}
              organizationId={organizationId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
