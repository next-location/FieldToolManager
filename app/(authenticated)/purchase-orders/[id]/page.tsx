import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { PurchaseOrderDetailClient } from './PurchaseOrderDetailClient'
import { getPurchaseOrderHistory } from '@/lib/purchase-order-history'

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 発注書詳細を取得
  const { data: order, error: orderError } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      client:clients!purchase_orders_client_id_fkey(*),
      project:projects(id, project_name),
      items:purchase_order_items(*),
      created_by_user:users!purchase_orders_created_by_fkey(id, name),
      approved_by_user:users!purchase_orders_approved_by_fkey(id, name),
      rejected_by_user:users!purchase_orders_rejected_by_fkey(id, name)
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  console.log('[PURCHASE ORDER DETAIL] order:', order ? 'found' : 'not found')
  console.log('[PURCHASE ORDER DETAIL] error:', orderError)

  if (!order) {
    console.error('[PURCHASE ORDER DETAIL] Redirecting to list page - order not found')
    redirect('/purchase-orders')
  }

  // 操作履歴を取得
  const history = await getPurchaseOrderHistory(id)

  // 関連する支払記録を取得
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      recorded_by_user:users!payments_recorded_by_fkey(id, name)
    `)
    .eq('purchase_order_id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <PurchaseOrderDetailClient
        order={order}
        history={history}
        payments={payments || []}
        currentUserId={userId}
        currentUserRole={userRole}
      />
    </div>
  )
}
