import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/staff/[id]/toggle-active - アカウント有効化/無効化
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id: userId } = await params

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの組織ID取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック（adminのみ）
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 現在の状態取得
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('is_active, role')
      .eq('id', userId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404 })
    }

    const newStatus = !targetUser.is_active

    // admin無効化チェック（最低1人のadminが必要）
    if (targetUser.role === 'admin' && !newStatus) {
      const { count: activeAdminCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', userData.organization_id)
        .eq('role', 'admin')
        .is('deleted_at', null)
        .eq('is_active', true)

      if (activeAdminCount !== null && activeAdminCount <= 1) {
        return NextResponse.json({ error: '最低1人のadminが有効である必要があります' }, { status: 400 })
      }
    }

    // 更新
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', userId)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('User toggle-active error:', updateError)
      return NextResponse.json({ error: 'ステータスの更新に失敗しました' }, { status: 500 })
    }

    // 変更履歴記録
    await supabase.from('user_history').insert({
      organization_id: userData.organization_id,
      user_id: userId,
      changed_by: user.id,
      change_type: newStatus ? 'activated' : 'deactivated',
      old_values: { is_active: targetUser.is_active },
      new_values: { is_active: newStatus },
    })

    return NextResponse.json({ success: true, is_active: newStatus })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
