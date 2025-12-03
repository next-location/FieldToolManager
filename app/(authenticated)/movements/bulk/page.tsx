import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BulkMovementForm } from './BulkMovementForm'

export default async function BulkMovementPage() {
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
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 道具個別アイテムを取得（削除されていないもの）
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(`
      id,
      serial_number,
      qr_code,
      current_location,
      current_site_id,
      warehouse_location_id,
      status,
      tools (
        id,
        name,
        model_number
      )
    `)
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('serial_number')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, is_active')
    .eq('organization_id', userData.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 倉庫位置一覧を取得
  const { data: warehouseLocations } = await supabase
    .from('warehouse_locations')
    .select('id, code, display_name')
    .eq('organization_id', userData.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('code')

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <a
            href="/movements"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 移動履歴に戻る
          </a>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              複数道具の一括移動
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              移動先を選択してから、道具を連続でスキャンまたは選択して一括移動できます。
            </p>

            <BulkMovementForm
              toolItems={toolItems || []}
              sites={sites || []}
              warehouseLocations={warehouseLocations || []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
