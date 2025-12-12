import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { OrganizationSettingsForm } from './OrganizationSettingsForm'

export default async function OrganizationSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報と組織情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  // admin権限がない場合はリダイレクト
  if (userData?.role !== 'admin') {
    redirect('/')
  }

  // 組織設定を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userData?.organization_id)
    .single()

  if (!organization) {
    redirect('/')
  }

  // 組織設定（organization_settings）を取得
  const { data: organizationSettings } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .single()

  // 倉庫階層テンプレートを取得
  const { data: warehouseTemplates } = await supabase
    .from('warehouse_location_templates')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .order('level')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">運用設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            {organization.name} の運用設定を変更できます
          </p>
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
