import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'
import { logPurchaseOrderUpdated } from '@/lib/audit-log'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

// POST /api/purchase-orders/:id/mark-received - 受領登録
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 🔒 CSRF検証 - 一時的に無効化（Vercelキャッシュ問題のため）
  // TODO: キャッシュ問題解決後に再度有効化
  // const isValidCsrf = await verifyCsrfToken(request)
  // if (!isValidCsrf) {
  //   console.error('[API /api/purchase-orders/[id]/mark-received] CSRF validation failed')
  //   return csrfErrorResponse()
  // }

  try {
    const { id } = await params
    const supabase = await createClient()

    console.log('[MARK RECEIVED API] ===== 受領登録開始 =====')
    console.log('[MARK RECEIVED API] orderId:', id)

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

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 発注書取得
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, status, order_number')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: '発注書が見つかりません' }, { status: 404 })
    }

    // ステータスチェック（発注済みのみ受領可能）
    if (order.status !== 'ordered') {
      return NextResponse.json(
        { error: '発注済みの発注書のみ受領登録できます' },
        { status: 400 }
      )
    }

    // ステータスを受領済みに更新
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'received',
        delivered_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('[MARK RECEIVED API] 更新エラー:', updateError)
      return NextResponse.json({ error: '受領登録に失敗しました' }, { status: 500 })
    }

    // 履歴記録
    await createPurchaseOrderHistory({
      purchaseOrderId: id,
      organizationId: userData.organization_id,
      actionType: 'received',
      performedBy: user.id,
      performedByName: userData.name,
      notes: '商品・サービスを受領しました',
    })

    // 監査ログ記録
    await logPurchaseOrderUpdated(id, {
      status: 'ordered'
    }, {
      status: 'received',
      delivered_at: new Date().toISOString(),
      received_by: user.id,
      received_by_name: userData.name,
      order_number: order.order_number
    }, user.id, userData.organization_id)

    console.log('[MARK RECEIVED API] ===== 受領登録完了 =====')
    return NextResponse.json({ message: '受領登録しました' })
  } catch (error: any) {
    console.error('[MARK RECEIVED API] エラー:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
