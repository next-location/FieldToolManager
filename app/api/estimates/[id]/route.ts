import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createEstimateHistory } from '@/lib/estimate-history'
import { logEstimateUpdated } from '@/lib/audit-log'

// DELETE - 見積書削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[見積書削除API] 削除リクエスト受信:', id)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // 見積書を取得して承認済みかチェック
  const { data: estimate, error: fetchError } = await supabase
    .from('estimates')
    .select('manager_approved_at')
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)
    .single()

  if (fetchError || !estimate) {
    return NextResponse.json({ error: '見積書が見つかりません' }, { status: 404 })
  }

  // 承認済みの見積書は削除不可
  if (estimate.manager_approved_at) {
    return NextResponse.json({
      error: '承認済みの見積書は削除できません。重要な記録として保持する必要があります。'
    }, { status: 403 })
  }

  // 明細を削除（カスケード削除されるが、明示的に実行）
  console.log('[見積書削除API] 明細削除開始')
  const { error: itemsDeleteError } = await supabase
    .from('estimate_items')
    .delete()
    .eq('estimate_id', id)

  if (itemsDeleteError) {
    console.error('[見積書削除API] 明細削除エラー:', itemsDeleteError)
  }

  // 見積書を削除
  console.log('[見積書削除API] 見積書削除開始')
  const { error: deleteError } = await supabase
    .from('estimates')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[見積書削除API] 見積書削除エラー:', deleteError)
    return NextResponse.json({ error: '見積書の削除に失敗しました', details: deleteError }, { status: 500 })
  }

  console.log('[見積書削除API] 見積書削除成功:', id)
  return NextResponse.json({ message: '見積書を削除しました' }, { status: 200 })
}

// PUT - 見積書更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[見積書更新API] 更新リクエスト受信:', id)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, name')
    .eq('id', user.id)
    .single()

  // リーダー以上のみ更新可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const body = await request.json()
  console.log('[見積書更新API] リクエストボディ:', body)

  try {
    // 見積書を更新
    const { error: estimateError } = await supabase
      .from('estimates')
      .update({
        estimate_number: body.estimate_number,
        client_id: body.client_id,
        project_id: body.project_id || null,
        estimate_date: body.estimate_date,
        valid_until: body.valid_until || null,
        title: body.title,
        notes: body.notes || null,
        internal_notes: body.internal_notes || null,
        status: body.status,
        subtotal: body.subtotal,
        tax_amount: body.tax_amount,
        total_amount: body.total_amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (estimateError) {
      console.error('[見積書更新API] 見積書更新エラー:', estimateError)
      throw estimateError
    }

    // 既存の明細を削除
    const { error: deleteItemsError } = await supabase
      .from('estimate_items')
      .delete()
      .eq('estimate_id', id)

    if (deleteItemsError) {
      console.error('[見積書更新API] 明細削除エラー:', deleteItemsError)
      throw deleteItemsError
    }

    // 新しい明細を挿入
    if (body.items && body.items.length > 0) {
      const validItemTypes = ['construction', 'material', 'expense', 'labor', 'subcontract', 'other']

      const items = body.items.map((item: any, index: number) => {
        // item_typeが定義済みの値でない場合は'other'にして、元の値をcustom_typeに
        const isValidType = validItemTypes.includes(item.item_type)
        const itemType = isValidType ? item.item_type : 'other'
        const customType = isValidType ? (item.custom_type || null) : item.item_type

        return {
          estimate_id: id,
          display_order: index + 1,
          item_type: itemType,
          custom_type: customType,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity,
          unit: item.unit,
          custom_unit: item.unit === 'other' ? (item.custom_unit || null) : null,
          unit_price: item.unit_price,
          amount: item.amount,
          tax_rate: item.tax_rate
        }
      })

      console.log('[見積書更新API] 挿入する明細:', items)

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(items)

      if (itemsError) {
        console.error('[見積書更新API] 明細挿入エラー:', itemsError)
        throw itemsError
      }
    }

    // 履歴を記録
    const actionType = body.status === 'submitted' ? 'submitted' : 'draft_saved'
    await createEstimateHistory({
      estimateId: id,
      organizationId: userData?.organization_id,
      actionType,
      performedBy: user.id,
      performedByName: userData?.name || 'Unknown',
    })

    // 監査ログを記録
    await logEstimateUpdated(
      id,
      {},
      {
        estimate_number: body.estimate_number,
        client_id: body.client_id,
        project_id: body.project_id,
        status: body.status,
        total_amount: body.total_amount,
      },
      user.id,
      userData?.organization_id
    )

    console.log('[見積書更新API] 更新成功')
    return NextResponse.json({ message: '見積書を更新しました' }, { status: 200 })
  } catch (error) {
    console.error('[見積書更新API] エラー:', error)
    return NextResponse.json({ error: '見積書の更新に失敗しました', details: error }, { status: 500 })
  }
}
