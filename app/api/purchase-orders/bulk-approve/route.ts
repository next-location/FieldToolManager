import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logPurchaseOrderApproved } from '@/lib/audit-log'

// POST /api/purchase-orders/bulk-approve - 発注書一括承認
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // リクエストボディ取得
    const body = await request.json()
    const { order_ids, comment } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: '発注書IDが指定されていません' }, { status: 400 })
    }

    // 最大100件まで
    if (order_ids.length > 100) {
      return NextResponse.json({ error: '一度に承認できるのは100件までです' }, { status: 400 })
    }

    // 対象の発注書を取得
    const { data: orders, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, order_number, status, total_amount, created_by')
      .in('id', order_ids)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('Error fetching orders:', fetchError)
      return NextResponse.json({ error: '発注書の取得に失敗しました' }, { status: 500 })
    }

    // 承認可能な発注書のみフィルタリング
    const approvableOrders = orders?.filter((order) => {
      // 承認申請中のみ承認可能
      if (order.status !== 'submitted') return false

      // 金額による承認権限チェック
      const totalAmount = Number(order.total_amount)

      // 10万円未満: leader以上
      if (totalAmount < 100000 && !['admin', 'leader'].includes(userData.role)) {
        return false
      }

      // 10万円以上100万円未満: admin必須
      if (totalAmount >= 100000 && totalAmount < 1000000 && userData.role !== 'admin') {
        return false
      }

      // 100万円以上: admin必須
      if (totalAmount >= 1000000 && userData.role !== 'admin') {
        return false
      }

      return true
    }) || []

    if (approvableOrders.length === 0) {
      return NextResponse.json(
        { error: '承認可能な発注書がありません。ステータスまたは権限を確認してください。' },
        { status: 400 }
      )
    }

    const approvedIds: string[] = []
    const failedIds: string[] = []
    const now = new Date().toISOString()

    // 各発注書を承認
    for (const order of approvableOrders) {
      try {
        // 発注書のステータス更新
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({
            status: 'approved',
            approved_by: userData.name,
            approved_at: now,
            updated_at: now,
          })
          .eq('id', order.id)
          .eq('organization_id', userData.organization_id)

        if (updateError) {
          console.error(`Error updating order ${order.order_number}:`, updateError)
          failedIds.push(order.id)
          continue
        }

        // 履歴記録
        await supabase.from('purchase_order_history').insert({
          purchase_order_id: order.id,
          organization_id: userData.organization_id,
          action: 'approved',
          changed_by: user.id,
          comment: comment || '一括承認',
          created_at: now,
        })

        // 通知作成（作成者への通知）
        if (order.created_by && order.created_by !== user.id) {
          await supabase.from('notifications').insert({
            user_id: order.created_by,
            type: 'purchase_order_approved',
            title: '発注書が承認されました',
            message: `発注書 ${order.order_number} が承認されました`,
            link: `/purchase-orders/${order.id}`,
            read: false,
            created_at: now,
          })
        }

        // 監査ログ記録
        await logPurchaseOrderApproved(order.id, {
          approved_by: user.id,
          approved_by_name: userData.name,
          approved_at: now,
          order_number: order.order_number,
          total_amount: order.total_amount,
          bulk_approval: true,
          comment: comment || '一括承認'
        }, user.id, userData.organization_id)

        approvedIds.push(order.id)
      } catch (error) {
        console.error(`Unexpected error approving order ${order.id}:`, error)
        failedIds.push(order.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${approvedIds.length}件の発注書を承認しました`,
      approved_count: approvedIds.length,
      failed_count: failedIds.length,
      approved_ids: approvedIds,
      failed_ids: failedIds,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
