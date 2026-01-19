import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'
import { logPurchaseOrderUpdated } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  console.log('[UPDATE DRAFT API] ===== 下書き保存開始 =====')
  console.log('[UPDATE DRAFT API] orderId:', id)

  try {
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[UPDATE DRAFT API] 認証エラー:', authError)
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    console.log('[UPDATE DRAFT API] userId:', user.id)

    // ユーザー情報と組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('[UPDATE DRAFT API] ユーザー情報が見つかりません')
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    console.log('[UPDATE DRAFT API] organization_id:', userData.organization_id)

    // 既存の発注書を取得（監査ログ用）
    const { data: existingOrder } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    // リクエストボディを取得
    const body = await request.json()
    const { orderData, items } = body

    console.log('[UPDATE DRAFT API] orderData:', orderData)
    console.log('[UPDATE DRAFT API] items count:', items?.length)

    // 発注書を更新
    console.log('[UPDATE DRAFT API] 発注書更新開始...')
    const { error: orderError } = await supabase
      .from('purchase_orders')
      .update(orderData)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (orderError) {
      console.error('[UPDATE DRAFT API] 発注書更新エラー:')
      console.error('[UPDATE DRAFT API] ERROR CODE:', orderError.code)
      console.error('[UPDATE DRAFT API] ERROR MESSAGE:', orderError.message)
      console.error('[UPDATE DRAFT API] ERROR DETAILS:', orderError.details)
      console.error('[UPDATE DRAFT API] ERROR HINT:', orderError.hint)
      throw orderError
    }

    console.log('[UPDATE DRAFT API] 発注書更新成功')

    // 明細を更新（一旦全削除して再作成）
    console.log('[UPDATE DRAFT API] 明細削除開始...')
    const { error: deleteError } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', id)

    if (deleteError) {
      console.error('[UPDATE DRAFT API] 明細削除エラー:')
      console.error('[UPDATE DRAFT API] ERROR CODE:', deleteError.code)
      console.error('[UPDATE DRAFT API] ERROR MESSAGE:', deleteError.message)
    } else {
      console.log('[UPDATE DRAFT API] 明細削除成功')
    }

    // 明細を挿入
    const itemsToInsert = items.map((item: any) => ({
      purchase_order_id: id,
      ...item
    }))

    console.log('[UPDATE DRAFT API] 挿入する明細データ:', JSON.stringify(itemsToInsert, null, 2))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('[UPDATE DRAFT API] 明細挿入エラー:')
      console.error('[UPDATE DRAFT API] ERROR CODE:', itemsError.code)
      console.error('[UPDATE DRAFT API] ERROR MESSAGE:', itemsError.message)
      console.error('[UPDATE DRAFT API] ERROR DETAILS:', itemsError.details)
      console.error('[UPDATE DRAFT API] ERROR HINT:', itemsError.hint)
      throw itemsError
    }

    console.log('[UPDATE DRAFT API] 明細挿入成功')

    // 履歴記録
    console.log('[UPDATE DRAFT API] ===== 履歴記録を開始します =====')
    console.log('[UPDATE DRAFT API] purchaseOrderId:', id)
    console.log('[UPDATE DRAFT API] organizationId:', userData.organization_id)
    console.log('[UPDATE DRAFT API] performedBy:', user.id)
    console.log('[UPDATE DRAFT API] performedByName:', userData.name)

    await createPurchaseOrderHistory({
      purchaseOrderId: id,
      organizationId: userData.organization_id,
      actionType: 'draft_saved',
      performedBy: user.id,
      performedByName: userData.name,
      notes: '下書きを保存しました',
    })

    console.log('[UPDATE DRAFT API] ===== 履歴記録が完了しました =====')

    // 監査ログ記録
    await logPurchaseOrderUpdated(id, existingOrder || {}, {
      ...orderData,
      items_count: items.length,
      draft_saved: true
    })

    console.log('[UPDATE DRAFT API] ===== 下書き保存完了 =====')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[UPDATE DRAFT API] ===== エラー発生 =====')
    console.error('[UPDATE DRAFT API] Error:', error)
    console.error('[UPDATE DRAFT API] Error message:', error?.message)
    console.error('[UPDATE DRAFT API] Error code:', error?.code)
    return NextResponse.json(
      { error: error?.message || '下書き保存に失敗しました' },
      { status: 500 }
    )
  }
}
