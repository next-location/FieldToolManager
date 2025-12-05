import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/staff/[id]/history - スタッフの変更履歴取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const userId = params.id

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの組織ID・権限取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック（adminとsuper_adminのみ）
    if (userData.role !== 'admin' && userData.role !== 'super_admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 対象スタッフが同じ組織に属しているか確認
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404 })
    }

    // 変更履歴取得（変更者の名前も取得）
    const { data: history, error: historyError } = await supabase
      .from('user_history')
      .select(
        `
        *,
        changed_by_user:users!user_history_changed_by_fkey(name, email)
      `
      )
      .eq('organization_id', userData.organization_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('History fetch error:', historyError)
      return NextResponse.json({ error: '履歴の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ history: history || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
