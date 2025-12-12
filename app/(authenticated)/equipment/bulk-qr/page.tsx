import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EquipmentBulkQRClient } from './EquipmentBulkQRClient'

export default async function EquipmentBulkQRPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 組織設定を取得（QRサイズ、重機機能）
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, qr_print_size')
    .eq('id', userData?.organization_id)
    .single()

  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  const qrSize = orgData?.qr_print_size || 25

  // すべての重機を取得
  const { data: equipment } = await supabase
    .from('heavy_equipment')
    .select(`
      id,
      name,
      equipment_code,
      qr_code,
      heavy_equipment_categories (name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  const itemsWithDetails = (equipment || []).map((eq) => ({
    id: eq.id,
    qrCode: eq.qr_code,
    name: eq.name,
    code: `重機コード: ${eq.equipment_code}`,
    equipmentCode: eq.equipment_code,
    category: eq.heavy_equipment_categories?.name || '未分類',
  }))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/equipment"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 重機一覧に戻る
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            重機QRコード一括印刷
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            印刷したい重機を選択してください
          </p>
        </div>

        <EquipmentBulkQRClient items={itemsWithDetails} qrSize={qrSize} />
      </div>
    </div>
  )
}
