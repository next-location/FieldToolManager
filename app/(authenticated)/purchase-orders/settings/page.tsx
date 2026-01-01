import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { PurchaseOrderSettingsClient } from './PurchaseOrderSettingsClient'

export default async function PurchaseOrderSettingsPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者のみアクセス可能
  if (userRole !== 'admin') {
    redirect('/purchase-orders')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">発注書設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          承認フローや発注書番号の設定をカスタマイズできます
        </p>
      </div>

      <PurchaseOrderSettingsClient />
      </div>
    </div>
  )
}
