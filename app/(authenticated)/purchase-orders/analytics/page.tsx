import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { PurchaseOrderAnalyticsClient } from './PurchaseOrderAnalyticsClient'

export default async function PurchaseOrderAnalyticsPage() {

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

  // 管理者・リーダーのみアクセス可能
  if (!['admin', 'leader'].includes(userRole)) {
    redirect('/purchase-orders')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">発注分析レポート</h1>
        <p className="mt-2 text-sm text-gray-600">
          発注書の統計データと傾向を確認できます
        </p>
      </div>

      <PurchaseOrderAnalyticsClient />
      </div>
    </div>
  )
}
