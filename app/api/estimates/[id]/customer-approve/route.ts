import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createEstimateHistory } from '@/lib/estimate-history'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, organization_id, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 見積書取得
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id, status, organization_id, estimate_number, created_by')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: '見積書が見つかりません' }, { status: 404 })
    }

    // manager以上 または 作成者本人の権限チェック
    const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userData.role)
    const isCreator = estimate.created_by === userData.id

    if (!isManagerOrAdmin && !isCreator) {
      return NextResponse.json({ error: '顧客承認を記録する権限がありません' }, { status: 403 })
    }

    // sent ステータスのみ顧客承認可能
    if (estimate.status !== 'sent') {
      return NextResponse.json({
        error: '顧客送付済み状態の見積書のみ承認できます'
      }, { status: 400 })
    }

    // ステータスを accepted に更新
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('顧客承認記録エラー:', updateError)
      return NextResponse.json({ error: '顧客承認の記録に失敗しました' }, { status: 500 })
    }

    // 履歴記録
    await createEstimateHistory({
      estimateId: id,
      organizationId: userData.organization_id,
      actionType: 'customer_approved',
      performedBy: userData.id,
      performedByName: userData.name || 'Unknown',
    })

    // 通知を作成（作成者に通知）
    if (estimate.created_by && estimate.created_by !== userData.id) {
      await supabase
        .from('notifications')
        .insert({
          organization_id: userData.organization_id,
          target_user_id: estimate.created_by,
          related_estimate_id: id,
          type: 'estimate_customer_approved',
          title: '見積書が顧客承認されました',
          message: `見積書「${estimate.estimate_number}」が顧客により承認されました（記録者: ${userData.name}）。`,
          metadata: { estimate_id: id, estimate_number: estimate.estimate_number, link: `/estimates/${id}` }
        })
    }

    return NextResponse.json({
      message: '顧客承認を記録しました',
      status: 'accepted'
    })
  } catch (error) {
    console.error('顧客承認記録エラー:', error)
    return NextResponse.json({ error: '顧客承認の記録に失敗しました' }, { status: 500 })
  }
}
