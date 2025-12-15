import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createEstimateHistory } from '@/lib/estimate-history'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { reason } = body
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

    // manager以上の権限チェック
    if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '差し戻し権限がありません' }, { status: 403 })
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

    // submitted ステータスのみ差し戻し可能
    if (estimate.status !== 'submitted') {
      return NextResponse.json({
        error: '提出済み状態の見積書のみ差し戻しできます'
      }, { status: 400 })
    }

    // draft ステータスに戻す（承認情報もクリア）
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'draft',
        manager_approved_by: null,
        manager_approved_at: null,
        manager_approval_notes: reason ? `【差し戻し理由】${reason}` : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('見積書差し戻しエラー:', updateError)
      return NextResponse.json({ error: '見積書の差し戻しに失敗しました' }, { status: 500 })
    }

    // 履歴を記録
    await createEstimateHistory({
      estimateId: id,
      organizationId: userData.organization_id,
      actionType: 'returned',
      performedBy: userData.id,
      performedByName: userData.name || 'Unknown',
      notes: reason ? `差し戻し理由: ${reason}` : undefined,
    })

    // 通知を作成（作成者に通知）
    if (estimate.created_by && estimate.created_by !== userData.id) {
      await supabase
        .from('notifications')
        .insert({
          organization_id: userData.organization_id,
          target_user_id: estimate.created_by,
          related_estimate_id: id,
          type: 'estimate_returned',
          title: '見積書が差し戻されました',
          message: `見積書「${estimate.estimate_number}」が${userData.name}により差し戻されました。理由: ${reason || '（理由未記載）'}`,
          metadata: { estimate_id: id, estimate_number: estimate.estimate_number, link: `/estimates/${id}` }
        })
    }

    return NextResponse.json({
      message: '見積書を差し戻しました',
      status: 'draft'
    })
  } catch (error) {
    console.error('見積書差し戻しエラー:', error)
    return NextResponse.json({ error: '見積書の差し戻しに失敗しました' }, { status: 500 })
  }
}
