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
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // manager以上の権限チェック
    if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '送付権限がありません' }, { status: 403 })
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

    // submitted かつ承認済みのみ送付可能
    if (estimate.status !== 'submitted') {
      return NextResponse.json({
        error: '提出済み（確定）状態の見積書のみ送付できます'
      }, { status: 400 })
    }

    if (!estimate.manager_approved_at) {
      return NextResponse.json({
        error: '承認済みの見積書のみ送付できます'
      }, { status: 400 })
    }

    // ステータスを sent に更新
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('見積書送付エラー:', updateError)
      return NextResponse.json({ error: '見積書の送付に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: '見積書を顧客に送付しました',
      status: 'sent'
    })
  } catch (error) {
    console.error('見積書送付エラー:', error)
    return NextResponse.json({ error: '見積書の送付に失敗しました' }, { status: 500 })
  }
}
