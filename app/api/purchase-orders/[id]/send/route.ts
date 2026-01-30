import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'
import { logPurchaseOrderUpdated } from '@/lib/audit-log'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

// POST /api/purchase-orders/:id/send - 仕入先送付
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 🔒 CSRF検証（Double Submit Cookie パターン）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/purchase-orders/[id]/send] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const { id } = await params
    const supabase = await createClient()

    console.log('[SEND PURCHASE ORDER API] ===== 送付開始 =====')
    console.log('[SEND PURCHASE ORDER API] orderId:', id)

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('[SEND PURCHASE ORDER API] 認証エラー: ユーザーなし')
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    console.log('[SEND PURCHASE ORDER API] userId:', user.id)

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('[SEND PURCHASE ORDER API] ユーザー情報が見つかりません')
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    console.log('[SEND PURCHASE ORDER API] organization_id:', userData.organization_id)
    console.log('[SEND PURCHASE ORDER API] user role:', userData.role)

    // 発注書取得
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, status, order_number')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !order) {
      console.error('[SEND PURCHASE ORDER API] 発注書が見つかりません')
      return NextResponse.json({ error: '発注書が見つかりません' }, { status: 404 })
    }

    console.log('[SEND PURCHASE ORDER API] 発注書データ:', order)

    // ステータスチェック（承認済みのみ送付可能）
    if (order.status !== 'approved') {
      console.log('[SEND PURCHASE ORDER API] ステータスチェック失敗: status =', order.status)
      return NextResponse.json(
        { error: '承認済みの発注書のみ送付できます' },
        { status: 400 }
      )
    }

    // ステータスを発注済みに更新
    console.log('[SEND PURCHASE ORDER API] ステータス更新中...')
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'ordered',
        ordered_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('[SEND PURCHASE ORDER API] ステータス更新エラー:', updateError)
      return NextResponse.json({ error: '送付に失敗しました' }, { status: 500 })
    }

    console.log('[SEND PURCHASE ORDER API] ステータス更新成功')

    // 履歴記録
    console.log('[SEND PURCHASE ORDER API] 履歴記録中...')
    await createPurchaseOrderHistory({
      purchaseOrderId: id,
      organizationId: userData.organization_id,
      actionType: 'sent',
      performedBy: user.id,
      performedByName: userData.name,
      notes: '仕入先へ発注書を送付しました',
    })
    console.log('[SEND PURCHASE ORDER API] 履歴記録成功')

    // 監査ログ記録
    await logPurchaseOrderUpdated(id, {
      status: 'approved'
    }, {
      status: 'ordered',
      ordered_at: new Date().toISOString(),
      sent_by: user.id,
      sent_by_name: userData.name,
      order_number: order.order_number
    }, user.id, userData.organization_id)

    console.log('[SEND PURCHASE ORDER API] ===== 送付完了 =====')
    return NextResponse.json({ message: '発注書を送付しました' })
  } catch (error: any) {
    console.error('[SEND PURCHASE ORDER API] ===== エラー発生 =====')
    console.error('[SEND PURCHASE ORDER API] Error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
