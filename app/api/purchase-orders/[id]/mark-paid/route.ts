import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'
import { logPurchaseOrderUpdated } from '@/lib/audit-log'

// POST /api/purchase-orders/:id/mark-paid - 支払登録
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    console.log('[MARK PAID API] ===== 支払登録開始 =====')
    console.log('[MARK PAID API] orderId:', id)

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '支払登録権限がありません' }, { status: 403 })
    }

    // 発注書取得（支払記録作成に必要な情報を含む）
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, status, order_number, total_amount, order_date')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: '発注書が見つかりません' }, { status: 404 })
    }

    // ステータスチェック（受領済みのみ支払可能）
    if (order.status !== 'received') {
      return NextResponse.json(
        { error: '受領済みの発注書のみ支払登録できます' },
        { status: 400 }
      )
    }

    // ステータスを支払済みに更新
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('[MARK PAID API] 更新エラー:', updateError)
      return NextResponse.json({ error: '支払登録に失敗しました' }, { status: 500 })
    }

    // 入出金管理に支払記録を自動登録
    const paymentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        organization_id: userData.organization_id,
        payment_type: 'payment',
        purchase_order_id: id,
        payment_date: paymentDate,
        amount: order.total_amount,
        payment_method: 'bank_transfer', // デフォルトは銀行振込
        recorded_by: user.id,
        notes: `発注書「${order.order_number}」の支払`
      })

    if (paymentError) {
      console.error('[MARK PAID API] 入出金記録エラー:', paymentError)
      // 入出金記録失敗してもステータス更新は成功しているため、警告のみ
      console.warn('[MARK PAID API] 入出金記録に失敗しましたが、発注書のステータスは更新されました')
    } else {
      console.log('[MARK PAID API] 入出金記録作成成功')
    }

    // 履歴記録
    await createPurchaseOrderHistory({
      purchaseOrderId: id,
      organizationId: userData.organization_id,
      actionType: 'paid',
      performedBy: user.id,
      performedByName: userData.name,
      notes: '支払を完了しました',
    })

    // 監査ログ記録
    await logPurchaseOrderUpdated(id, {
      status: 'received'
    }, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: user.id,
      paid_by_name: userData.name,
      order_number: order.order_number,
      total_amount: order.total_amount
    }, user.id, userData.organization_id)

    console.log('[MARK PAID API] ===== 支払登録完了 =====')
    return NextResponse.json({ message: '支払登録しました' })
  } catch (error: any) {
    console.error('[MARK PAID API] エラー:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
