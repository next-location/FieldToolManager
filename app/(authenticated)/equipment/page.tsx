import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import EquipmentList from '@/components/equipment/EquipmentList'

export default async function EquipmentPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報と組織設定を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('email', user.email)
    .single()

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, heavy_equipment_settings')
    .eq('id', userData?.organization_id)
    .single()

  // 重機管理機能が無効の場合はダッシュボードへリダイレクト
  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  // 重機一覧を取得
  const { data: equipment, error } = await supabase
    .from('heavy_equipment')
    .select(`
      *,
      heavy_equipment_categories (
        name,
        icon
      ),
      sites!heavy_equipment_current_location_id_fkey (
        name
      ),
      users!heavy_equipment_current_user_id_fkey (
        name
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const isLeaderOrAdmin = ['leader', 'admin', 'super_admin'].includes(userData?.role || '')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">重機一覧</h1>
            <p className="mt-1 text-sm text-gray-500">
              登録されている重機の一覧を確認できます
            </p>
          </div>
          {isLeaderOrAdmin && (
            <Link
              href="/equipment/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + 新規登録
            </Link>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">
              エラーが発生しました: {error.message}
            </p>
          </div>
        )}

        <EquipmentList
          initialEquipment={equipment || []}
          organizationSettings={orgData?.heavy_equipment_settings || {}}
        />
      </div>
    </div>
  )
}
