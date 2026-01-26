import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/attendance/work-patterns/[id] - 特定の勤務パターン取得
export async function GET(
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 勤務パターン取得
    const { data: pattern, error: patternError } = await supabase
      .from('work_patterns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (patternError || !pattern) {
      return NextResponse.json({ error: '勤務パターンが見つかりません' }, { status: 404 })
    }

    // 適用スタッフ数をカウント
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('work_pattern_id', id)
      .is('deleted_at', null)

    return NextResponse.json({
      pattern: {
        ...pattern,
        user_count: count || 0,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// PATCH /api/attendance/work-patterns/[id] - 勤務パターン更新
export async function PATCH(
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

    // 権限チェック
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 既存パターン確認
    const { data: existingPattern, error: fetchError } = await supabase
      .from('work_patterns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !existingPattern) {
      return NextResponse.json({ error: '勤務パターンが見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { name, expected_checkin_time, alert_time, is_night_shift, is_default } = body

    // デフォルトパターンの場合、既存のデフォルトを解除
    if (is_default && !existingPattern.is_default) {
      await supabase
        .from('work_patterns')
        .update({ is_default: false })
        .eq('organization_id', userData.organization_id)
        .eq('is_default', true)
    }

    // 更新データ準備
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (expected_checkin_time !== undefined) updateData.expected_checkin_time = expected_checkin_time
    if (alert_time !== undefined) updateData.alert_time = alert_time
    if (is_night_shift !== undefined) updateData.is_night_shift = is_night_shift
    if (is_default !== undefined) updateData.is_default = is_default

    // 更新実行
    const { data: updatedPattern, error: updateError } = await supabase
      .from('work_patterns')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Work pattern update error:', updateError)
      if (updateError.code === '23505') {
        return NextResponse.json({ error: '同じ名前の勤務パターンが既に存在します' }, { status: 400 })
      }
      return NextResponse.json({ error: '勤務パターンの更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pattern: updatedPattern })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/attendance/work-patterns/[id] - 勤務パターン削除
export async function DELETE(
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

    // 権限チェック
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 適用スタッフ数をチェック
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('work_pattern_id', id)
      .is('deleted_at', null)

    if (count && count > 0) {
      return NextResponse.json(
        { error: `このパターンは${count}人のスタッフに適用されています。先にスタッフの設定を変更してください。` },
        { status: 400 }
      )
    }

    // 削除実行
    const { error: deleteError } = await supabase
      .from('work_patterns')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      console.error('Work pattern delete error:', deleteError)
      return NextResponse.json({ error: '勤務パターンの削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
