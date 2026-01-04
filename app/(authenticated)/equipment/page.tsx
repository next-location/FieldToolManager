import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import EquipmentList from '@/components/equipment/EquipmentList'
import EquipmentPageMobileMenu from '@/components/equipment/EquipmentPageMobileMenu'
import EquipmentPageFAB from '@/components/equipment/EquipmentPageFAB'

export default async function EquipmentPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, heavy_equipment_settings')
    .eq('id', organizationId)
    .single()

  // 重機一覧を取得（機能が無効でも空配列として表示）
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

  const isAdmin = userRole === 'admin'

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">重機一覧</h1>
          {isAdmin && (
            <>
              {/* PC表示: 従来通り横並び */}
              <div className="hidden sm:flex space-x-3">
                <Link
                  href="/equipment/bulk-qr"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  🖨️ QRコード一括印刷
                </Link>
                <Link
                  href="/equipment/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  + 新規登録
                </Link>
              </div>

              {/* スマホ表示: 3点メニューのみ */}
              <div className="sm:hidden">
                <EquipmentPageMobileMenu />
              </div>
            </>
          )}
        </div>

        {/* FAB for mobile */}
        {isAdmin && <EquipmentPageFAB />}

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
