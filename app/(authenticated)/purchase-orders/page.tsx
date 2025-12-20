import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PurchaseOrderListClient } from './PurchaseOrderListClient'

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    search?: string
  }>
}) {
  const params = await searchParams
  const status = params.status || 'all'
  const search = params.search || ''

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 発注書一覧を取得（新しい順）
  // リーダーは自分が作成した発注書のみ、マネージャー・管理者は全て表示
  let query = supabase
    .from('purchase_orders')
    .select(`
      *,
      client:clients!purchase_orders_client_id_fkey(id, name, client_code),
      project:projects(id, project_name),
      created_by_user:users!purchase_orders_created_by_fkey(id, name),
      approved_by_user:users!purchase_orders_approved_by_fkey(id, name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)

  // リーダーは自分が作成した発注書のみ表示
  if (userData.role === 'leader') {
    query = query.eq('created_by', user.id)
  }

  query = query
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,notes.ilike.%${search}%`
    )
  }

  const { data: orders, error: ordersError } = await query

  console.log('[PURCHASE ORDERS PAGE] ===== デバッグ開始 =====')
  console.log('[PURCHASE ORDERS PAGE] organization_id:', userData?.organization_id)
  console.log('[PURCHASE ORDERS PAGE] status filter:', status)
  console.log('[PURCHASE ORDERS PAGE] search filter:', search)
  console.log('[PURCHASE ORDERS PAGE] orders count:', orders?.length || 0)
  if (ordersError) {
    console.error('[PURCHASE ORDERS PAGE] ERROR CODE:', ordersError.code)
    console.error('[PURCHASE ORDERS PAGE] ERROR MESSAGE:', ordersError.message)
    console.error('[PURCHASE ORDERS PAGE] ERROR DETAILS:', ordersError.details)
    console.error('[PURCHASE ORDERS PAGE] ERROR HINT:', ordersError.hint)
  }
  if (orders && orders.length > 0) {
    orders.forEach((order, index) => {
      console.log(`[PURCHASE ORDERS PAGE] Order ${index + 1}:`, {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        order_date: order.order_date,
        deleted_at: order.deleted_at,
        created_by_user: order.created_by_user,
        approved_by_user: order.approved_by_user,
        approved_at: order.approved_at
      })
    })
  } else {
    console.log('[PURCHASE ORDERS PAGE] orders data: null or empty')
  }

  // 仕入先一覧取得（フィルター用）- clientsテーブルから取得
  const { data: suppliers } = await supabase
    .from('clients')
    .select('id, name, client_code')
    .eq('organization_id', userData?.organization_id)
    .in('client_type', ['supplier', 'both'])
    .eq('is_active', true)
    .order('name')

  console.log('[PURCHASE ORDERS PAGE] suppliers count:', suppliers?.length || 0)

  // プロジェクト一覧取得（フィルター用）
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('organization_id', userData?.organization_id)
    .order('project_name')

  console.log('[PURCHASE ORDERS PAGE] projects count:', projects?.length || 0)

  // スタッフ一覧取得（作成者フィルタ用）
  const { data: staffList } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .order('name')

  console.log('[PURCHASE ORDERS PAGE] staff count:', staffList?.length || 0)
  console.log('[PURCHASE ORDERS PAGE] ===== デバッグ終了 =====')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* 発注書一覧 */}
        <PurchaseOrderListClient
          orders={orders || []}
          suppliers={suppliers || []}
          projects={projects || []}
          currentUserRole={userData.role}
          staffList={staffList || []}
        />
      </div>
    </div>
  )
}