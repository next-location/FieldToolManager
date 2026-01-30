import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { notifyPurchaseOrderRejected } from '@/lib/notification'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'
import { logPurchaseOrderRejected } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// POST /api/purchase-orders/:id/reject - 発注書差戻し
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

    // 差し戻し権限チェック（管理者とマネージャーのみ）
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: '差戻し権限がありません' }, { status: 403 })
    }

    // 発注書取得
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('id, status, created_by, order_number')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (!order) {
      return NextResponse.json({ error: '発注書が見つかりません' }, { status: 404 })
    }

    // ステータスチェック（承認申請中のみ差戻し可能）
    if (order.status !== 'submitted') {
      return NextResponse.json({ error: '承認申請中の発注書のみ差戻しできます' }, { status: 400 })
    }

    // 差戻し理由チェック
    if (!body.comment) {
      return NextResponse.json({ error: '差戻し理由を入力してください' }, { status: 400 })
    }

    // 不審なパターン検出
    if (hasSuspiciousPattern(body.comment)) {
      return NextResponse.json(
        { error: '差戻し理由に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' },
        { status: 400 }
      )
    }

    // HTMLエスケープ処理
    const sanitizedComment = escapeHtml(body.comment)

    // ステータスを差戻しに更新
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'rejected',
        approved_by: null,
        approved_at: null,
      })
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (updateError) {
      console.error('Error rejecting purchase order:', updateError)
      return NextResponse.json({ error: '差戻しに失敗しました' }, { status: 500 })
    }

    // 履歴記録
    await createPurchaseOrderHistory({
      purchaseOrderId: id,
      organizationId: userData.organization_id,
      actionType: 'rejected',
      performedBy: user.id,
      performedByName: userData.name,
      notes: sanitizedComment,
    })

    // 監査ログ記録
    await logPurchaseOrderRejected(id, {
      rejected_by: user.id,
      rejected_by_name: userData.name,
      rejected_at: new Date().toISOString(),
      order_number: order.order_number,
      reason: body.comment
    }, user.id, userData.organization_id)

    // 作成者に通知
    if (order.created_by) {
      await notifyPurchaseOrderRejected(
        id,
        order.order_number,
        order.created_by,
        user.id,
        body.comment
      )
    }

    return NextResponse.json({ message: '発注書を差戻しました' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
