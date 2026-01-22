import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { EstimateListClient } from '@/components/estimates/EstimateListClient'
import { checkAndUpdateExpiredEstimates } from '@/lib/estimate-expiry'
import EstimatePageFAB from '@/components/estimates/EstimatePageFAB'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ExportButton } from '@/components/export/ExportButton'

// キャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function EstimateList() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 期限切れチェックを実行
  if (organizationId) {
    await checkAndUpdateExpiredEstimates(organizationId)
  }

  // マネージャー・管理者用にスタッフ一覧を取得
  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole || '')
  let staffList: Array<{ id: string; name: string }> = []

  if (isManagerOrAdmin) {
    const { data: staff } = await supabase
      .from('users')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    staffList = staff || []
  }

  return (
    <EstimateListClient
      userRole={userRole || 'staff'}
      staffList={staffList}
    />
  )
}

export default async function EstimatesPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // 全ユーザーがアクセス可能（権限チェックなし）

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">見積書一覧</h1>
          <div className="hidden sm:flex gap-3">
            <ExportButton endpoint="/api/estimates/export" filename="estimates" />
            <Link
              href="/estimates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + 新規見積書作成
            </Link>
          </div>
        </div>

        <Suspense fallback={<LoadingSpinner inline />}>
          <EstimateList />
        </Suspense>

        <EstimatePageFAB />
      </div>
    </div>
  )
}
