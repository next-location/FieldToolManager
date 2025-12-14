import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
      .select('id, role, organization_id')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // manager以上の権限チェック
    if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '顧客却下を記録する権限がありません' }, { status: 403 })
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

    // sent ステータスのみ顧客却下可能
    if (estimate.status !== 'sent') {
      return NextResponse.json({
        error: '顧客送付済み状態の見積書のみ却下できます'
      }, { status: 400 })
    }

    // ステータスを rejected に更新
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('顧客却下記録エラー:', updateError)
      return NextResponse.json({ error: '顧客却下の記録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: '顧客却下を記録しました',
      status: 'rejected'
    })
  } catch (error) {
    console.error('顧客却下記録エラー:', error)
    return NextResponse.json({ error: '顧客却下の記録に失敗しました' }, { status: 500 })
  }
}
