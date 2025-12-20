import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  console.log('[DELETE PURCHASE ORDER API] ===== 削除開始 =====')
  console.log('[DELETE PURCHASE ORDER API] orderId:', id)

  try {
    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[DELETE PURCHASE ORDER API] 認証エラー:', authError)
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    console.log('[DELETE PURCHASE ORDER API] userId:', user.id)

    // ユーザー情報と組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('[DELETE PURCHASE ORDER API] ユーザー情報が見つかりません')
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    console.log('[DELETE PURCHASE ORDER API] organization_id:', userData.organization_id)
    console.log('[DELETE PURCHASE ORDER API] user role:', userData.role)

    // 発注書を取得
    console.log('[DELETE PURCHASE ORDER API] 発注書取得中...')
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !order) {
      console.error('[DELETE PURCHASE ORDER API] 発注書取得エラー:', fetchError)
      return NextResponse.json({ error: '発注書が見つかりません' }, { status: 404 })
    }

    console.log('[DELETE PURCHASE ORDER API] 発注書データ:', JSON.stringify(order, null, 2))
    console.log('[DELETE PURCHASE ORDER API] status:', order.status)

    // 承認済みの発注書は削除不可
    if (order.status === 'approved' || order.status === 'ordered' || order.status === 'received' || order.status === 'paid') {
      console.log('[DELETE PURCHASE ORDER API] 削除不可: 承認済み・発注済み・納品済み・支払済み')
      return NextResponse.json(
        { error: '承認済み・発注済み・納品済み・支払済みの発注書は削除できません' },
        { status: 400 }
      )
    }

    // 発注書明細を削除（管理者権限でRLSバイパス）
    console.log('[DELETE PURCHASE ORDER API] 明細削除中...')
    const { error: itemsDeleteError } = await adminClient
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', id)

    if (itemsDeleteError) {
      console.error('[DELETE PURCHASE ORDER API] 明細削除エラー:')
      console.error('[DELETE PURCHASE ORDER API] ERROR CODE:', itemsDeleteError.code)
      console.error('[DELETE PURCHASE ORDER API] ERROR MESSAGE:', itemsDeleteError.message)
      console.error('[DELETE PURCHASE ORDER API] ERROR DETAILS:', itemsDeleteError.details)
      console.error('[DELETE PURCHASE ORDER API] ERROR HINT:', itemsDeleteError.hint)
      return NextResponse.json({ error: '発注書明細の削除に失敗しました' }, { status: 500 })
    }

    console.log('[DELETE PURCHASE ORDER API] 明細削除成功')

    // 発注書履歴を削除（管理者権限でRLSバイパス）
    console.log('[DELETE PURCHASE ORDER API] 履歴削除中...')
    const { error: historyDeleteError } = await adminClient
      .from('purchase_order_history')
      .delete()
      .eq('purchase_order_id', id)

    if (historyDeleteError) {
      console.error('[DELETE PURCHASE ORDER API] 履歴削除エラー:')
      console.error('[DELETE PURCHASE ORDER API] ERROR CODE:', historyDeleteError.code)
      console.error('[DELETE PURCHASE ORDER API] ERROR MESSAGE:', historyDeleteError.message)
    } else {
      console.log('[DELETE PURCHASE ORDER API] 履歴削除成功')
    }

    // 発注書を削除（管理者権限でRLSバイパス）
    console.log('[DELETE PURCHASE ORDER API] 発注書削除中...')
    const { error: deleteError } = await adminClient
      .from('purchase_orders')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      console.error('[DELETE PURCHASE ORDER API] 発注書削除エラー:')
      console.error('[DELETE PURCHASE ORDER API] ERROR CODE:', deleteError.code)
      console.error('[DELETE PURCHASE ORDER API] ERROR MESSAGE:', deleteError.message)
      console.error('[DELETE PURCHASE ORDER API] ERROR DETAILS:', deleteError.details)
      console.error('[DELETE PURCHASE ORDER API] ERROR HINT:', deleteError.hint)
      return NextResponse.json({ error: '発注書の削除に失敗しました' }, { status: 500 })
    }

    console.log('[DELETE PURCHASE ORDER API] 発注書削除成功')
    console.log('[DELETE PURCHASE ORDER API] ===== 削除完了 =====')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE PURCHASE ORDER API] ===== エラー発生 =====')
    console.error('[DELETE PURCHASE ORDER API] Error:', error)
    console.error('[DELETE PURCHASE ORDER API] Error message:', error?.message)
    console.error('[DELETE PURCHASE ORDER API] Error code:', error?.code)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
