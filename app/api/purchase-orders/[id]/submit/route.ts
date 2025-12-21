import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'

// POST /api/purchase-orders/:id/submit - 発注書承認申請
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    console.log('[SUBMIT PURCHASE ORDER API] ===== 提出開始 =====')
    console.log('[SUBMIT PURCHASE ORDER API] orderId:', id)

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('[SUBMIT PURCHASE ORDER API] 認証エラー: ユーザーなし')
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    console.log('[SUBMIT PURCHASE ORDER API] userId:', user.id)

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('[SUBMIT PURCHASE ORDER API] ユーザー情報が見つかりません')
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    console.log('[SUBMIT PURCHASE ORDER API] organization_id:', userData.organization_id)
    console.log('[SUBMIT PURCHASE ORDER API] user role:', userData.role)
    console.log('[SUBMIT PURCHASE ORDER API] user name:', userData.name)

    // 発注書取得
    console.log('[SUBMIT PURCHASE ORDER API] 発注書取得中...')
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, status, created_by, order_number, total_amount')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      console.error('[SUBMIT PURCHASE ORDER API] 発注書取得エラー:')
      console.error('[SUBMIT PURCHASE ORDER API] ERROR CODE:', fetchError.code)
      console.error('[SUBMIT PURCHASE ORDER API] ERROR MESSAGE:', fetchError.message)
    }

    if (!order) {
      console.error('[SUBMIT PURCHASE ORDER API] 発注書が見つかりません')
      return NextResponse.json({ error: '発注書が見つかりません' }, { status: 404 })
    }

    console.log('[SUBMIT PURCHASE ORDER API] 発注書データ:', order)

    // ステータスチェック（下書きまたは差戻しのみ申請可能）
    if (!['draft', 'rejected'].includes(order.status)) {
      console.log('[SUBMIT PURCHASE ORDER API] ステータスチェック失敗: status =', order.status)
      return NextResponse.json(
        { error: '下書きまたは差戻しの発注書のみ申請できます' },
        { status: 400 }
      )
    }

    // 作成者本人のみ申請可能
    if (order.created_by !== user.id) {
      console.log('[SUBMIT PURCHASE ORDER API] 権限チェック失敗: created_by =', order.created_by, 'user.id =', user.id)
      return NextResponse.json({ error: '作成者のみ申請できます' }, { status: 403 })
    }

    // マネージャー以上の場合は自動承認
    const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userData.role)
    const newStatus = isManagerOrAdmin ? 'approved' : 'submitted'

    console.log('[SUBMIT PURCHASE ORDER API] Is manager or admin:', isManagerOrAdmin, 'New status:', newStatus)

    // ステータスを更新
    const updateData: any = {
      status: newStatus,
    }

    // マネージャー以上の場合は承認情報も記録
    if (isManagerOrAdmin) {
      updateData.approved_by = userData.id
      updateData.approved_at = new Date().toISOString()
    }

    console.log('[SUBMIT PURCHASE ORDER API] ステータス更新中...', updateData)
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (updateError) {
      console.error('[SUBMIT PURCHASE ORDER API] ステータス更新エラー:')
      console.error('[SUBMIT PURCHASE ORDER API] ERROR CODE:', updateError.code)
      console.error('[SUBMIT PURCHASE ORDER API] ERROR MESSAGE:', updateError.message)
      console.error('[SUBMIT PURCHASE ORDER API] ERROR DETAILS:', updateError.details)
      console.error('[SUBMIT PURCHASE ORDER API] ERROR HINT:', updateError.hint)
      return NextResponse.json({ error: '承認申請に失敗しました' }, { status: 500 })
    }

    console.log('[SUBMIT PURCHASE ORDER API] ステータス更新成功')

    // 履歴記録
    console.log('[SUBMIT PURCHASE ORDER API] 履歴記録中...')
    await createPurchaseOrderHistory({
      purchaseOrderId: id,
      organizationId: userData.organization_id,
      actionType: isManagerOrAdmin ? 'approved' : 'submitted',
      performedBy: user.id,
      performedByName: userData.name,
      notes: isManagerOrAdmin ? 'マネージャーによる自動承認' : '承認申請を提出しました',
    })
    console.log('[SUBMIT PURCHASE ORDER API] 履歴記録成功')

    // 通知作成（リーダーが提出した場合のみ承認者に通知）
    if (!isManagerOrAdmin) {
      const totalAmount = Number(order.total_amount)
      let requiredRole = 'manager' // デフォルトはマネージャー

      if (totalAmount >= 1000000) {
        // 100万円以上は管理者
        requiredRole = 'admin'
      }

      console.log('[SUBMIT PURCHASE ORDER API] 承認者検索中... requiredRole:', requiredRole, 'totalAmount:', totalAmount)

      // 承認権限を持つユーザーを取得
      const { data: approvers } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', userData?.organization_id)
        .in('role', requiredRole === 'admin' ? ['admin', 'super_admin'] : ['manager', 'admin', 'super_admin'])
        .limit(10)

      console.log('[SUBMIT PURCHASE ORDER API] 承認者数:', approvers?.length || 0)

      if (approvers && approvers.length > 0) {
        const notifications = approvers.map((approver) => ({
          user_id: approver.id,
          title: '発注書の承認申請',
          message: `${userData.name}さんから発注書（${order.order_number}）の承認申請がありました。金額: ¥${totalAmount.toLocaleString()}`,
          type: 'purchase_order_approval',
          related_id: id,
        }))

        console.log('[SUBMIT PURCHASE ORDER API] 通知作成中... 通知数:', notifications.length)
        const { error: notifError } = await supabase.from('notifications').insert(notifications)

        if (notifError) {
          console.error('[SUBMIT PURCHASE ORDER API] 通知作成エラー:')
          console.error('[SUBMIT PURCHASE ORDER API] ERROR CODE:', notifError.code)
          console.error('[SUBMIT PURCHASE ORDER API] ERROR MESSAGE:', notifError.message)
        } else {
          console.log('[SUBMIT PURCHASE ORDER API] 通知作成成功')
        }
      }
    } else {
      console.log('[SUBMIT PURCHASE ORDER API] マネージャー以上による自動承認のため通知は送信しません')
    }

    console.log('[SUBMIT PURCHASE ORDER API] ===== 提出完了 =====')
    return NextResponse.json({ message: '承認申請を送信しました' })
  } catch (error: any) {
    console.error('[SUBMIT PURCHASE ORDER API] ===== エラー発生 =====')
    console.error('[SUBMIT PURCHASE ORDER API] Error:', error)
    console.error('[SUBMIT PURCHASE ORDER API] Error message:', error?.message)
    console.error('[SUBMIT PURCHASE ORDER API] Error code:', error?.code)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
