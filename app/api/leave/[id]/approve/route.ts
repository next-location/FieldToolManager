import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/leave/[id]/approve - 休暇承認
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック（管理者またはマネージャーのみ）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 既存休暇取得
    const { data: existingLeave, error: fetchError } = await supabase
      .from('user_leave_records')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !existingLeave) {
      return NextResponse.json({ error: '休暇が見つかりません' }, { status: 404 })
    }

    // 承認実行
    const { data: approvedLeave, error: updateError } = await supabase
      .from('user_leave_records')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Leave approve error:', updateError)
      return NextResponse.json({ error: '休暇の承認に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, leave: approvedLeave })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
