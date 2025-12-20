import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { notifyPurchaseOrderApproved } from '@/lib/notification'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'

// POST /api/purchase-orders/:id/approve - 発注書承認
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 承認権限チェック（管理者とマネージャーのみ）
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: '承認権限がありません' }, { status: 403 })
    }

    // 発注書取得
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('id, status, created_by, order_number, total_amount, created_by_user:users!purchase_orders_created_by_fkey(name)')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (!order) {
      return NextResponse.json({ error: '発注書が見つかりません' }, { status: 404 })
    }

    // ステータスチェック（承認申請中のみ承認可能）
    if (order.status !== 'submitted') {
      return NextResponse.json({ error: '承認申請中の発注書のみ承認できます' }, { status: 400 })
    }

    // 作成者自身は承認できない
    if (order.created_by === user.id) {
      return NextResponse.json({ error: '自分が作成した発注書は承認できません' }, { status: 403 })
    }

    // ステータスを承認済みに更新
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (updateError) {
      console.error('Error approving purchase order:', updateError)
      return NextResponse.json({ error: '承認に失敗しました' }, { status: 500 })
    }

    // 履歴記録
    await createPurchaseOrderHistory({
      purchaseOrderId: id,
      organizationId: userData.organization_id,
      actionType: 'approved',
      performedBy: user.id,
      performedByName: userData.name,
      notes: body.comment || '承認しました',
    })

    // 作成者に通知
    if (order.created_by) {
      await notifyPurchaseOrderApproved(
        id,
        order.order_number,
        order.created_by,
        user.id
      )
    }

    return NextResponse.json({ message: '発注書を承認しました' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
