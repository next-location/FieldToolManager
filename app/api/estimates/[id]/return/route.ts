import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
      .select('id, role, organization_id')
      .eq('auth_id', user.id)
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
      .select('*')
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

    return NextResponse.json({
      message: '見積書を差し戻しました',
      status: 'draft'
    })
  } catch (error) {
    console.error('見積書差し戻しエラー:', error)
    return NextResponse.json({ error: '見積書の差し戻しに失敗しました' }, { status: 500 })
  }
}
