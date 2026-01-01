import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { ConsumableBulkQRClient } from './ConsumableBulkQRClient'

export default async function ConsumablesBulkQRPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得

  // 組織設定を取得（QRサイズ）
  const { data: organization } = await supabase
    .from('organizations')
    .select('qr_print_size')
    .eq('id', organizationId)
    .single()

  const qrSize = organization?.qr_print_size || 25

  // すべての消耗品を取得
  const { data: consumables } = await supabase
    .from('tools')
    .select('id, name, qr_code, unit, tool_categories (name)')
    .eq('management_type', 'consumable')
    .is('deleted_at', null)
    .order('name')

  const itemsWithDetails = (consumables || []).map((consumable) => ({
    id: consumable.id,
    qrCode: consumable.qr_code,
    name: consumable.name,
    code: `ID: ${consumable.id.substring(0, 8)}...`,
    unit: consumable.unit,
    category: Array.isArray(consumable.tool_categories)
      ? (consumable.tool_categories[0] as any)?.name || '未分類'
      : (consumable.tool_categories as any)?.name || '未分類',
  }))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/consumables"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 消耗品一覧に戻る
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            消耗品QRコード一括印刷
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            印刷したい消耗品を選択してください
          </p>
        </div>

        <ConsumableBulkQRClient items={itemsWithDetails} qrSize={qrSize} />
      </div>
    </div>
  )
}
