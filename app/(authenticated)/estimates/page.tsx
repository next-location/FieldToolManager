import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EstimateListClient } from '@/components/estimates/EstimateListClient'
import { checkAndUpdateExpiredEstimates } from '@/lib/estimate-expiry'

// キャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function EstimateList() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  // 期限切れチェックを実行
  if (userData?.organization_id) {
    await checkAndUpdateExpiredEstimates(userData.organization_id)
  }

  // リーダーは自分の見積もりのみ、マネージャー・管理者は全ての見積もりを表示
  let estimatesQuery = supabase
    .from('estimates')
    .select(`
      *,
      client:clients(name),
      project:projects(project_name),
      manager_approved_by_user:users!estimates_manager_approved_by_fkey(name),
      created_by_user:users!estimates_created_by_fkey(id, name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)

  // リーダーの場合は自分が作成した見積もりのみフィルタ
  if (userData?.role === 'leader') {
    estimatesQuery = estimatesQuery.eq('created_by', user.id)
    console.log('[見積もり一覧] リーダーでフィルタ適用:', { userId: user.id, role: userData.role })
  }

  const { data: estimates, error } = await estimatesQuery.order('created_at', { ascending: false })

  if (error) {
    console.error('[見積もり一覧] クエリエラー:', error)
  }
  console.log('[見積もり一覧] 取得件数:', estimates?.length, 'role:', userData?.role)

  // マネージャー・管理者用にスタッフ一覧を取得
  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userData?.role || '')
  let staffList: Array<{ id: string; name: string }> = []

  if (isManagerOrAdmin) {
    const { data: staff } = await supabase
      .from('users')
      .select('id, name')
      .eq('organization_id', userData?.organization_id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    staffList = staff || []
  }

  return (
    <EstimateListClient
      estimates={estimates || []}
      userRole={userData?.role || 'staff'}
      staffList={staffList}
    />
  )
}

export default async function EstimatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 全ユーザーがアクセス可能（権限チェックなし）

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">見積書管理</h1>
            <p className="mt-2 text-sm text-gray-600">
              見積書の作成・管理を行います
            </p>
          </div>
          <Link
            href="/estimates/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + 新規見積書作成
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <EstimateList />
        </Suspense>
      </div>
    </div>
  )
}
