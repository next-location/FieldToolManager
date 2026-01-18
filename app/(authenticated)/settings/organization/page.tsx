import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { OrganizationSettingsForm } from './OrganizationSettingsForm'

export default async function OrganizationSettingsPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // ユーザー情報と組織情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  // admin権限がない場合はリダイレクト
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 組織設定を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  if (!organization) {
    redirect('/')
  }

  // 組織設定（organization_settings）を取得
  const { data: organizationSettings } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  // 倉庫階層テンプレートを取得
  const { data: warehouseTemplates } = await supabase
    .from('warehouse_location_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('level')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">運用設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            {organization.name} の運用設定を変更できます
          </p>
        </div>

        {/* 自社拠点管理へのリンク */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-blue-900 mb-1">自社拠点管理</h2>
              <p className="text-sm text-blue-700">
                本社倉庫、支店、資材置き場などの自社拠点を登録・管理します
              </p>
            </div>
            <Link
              href="/settings/locations"
              className="ml-4 flex-shrink-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              管理画面へ
            </Link>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <OrganizationSettingsForm
            organization={organization}
            organizationSettings={organizationSettings}
            warehouseTemplates={warehouseTemplates || []}
          />
        </div>
      </div>
    </div>
  )
}
