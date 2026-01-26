import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/attendance/work-patterns - 勤務パターン一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // 勤務パターン一覧を取得
    const { data: patterns, error: patternsError } = await supabase
      .from('work_patterns')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (patternsError) {
      console.error('Work patterns fetch error:', patternsError)
      return NextResponse.json({ error: '勤務パターンの取得に失敗しました' }, { status: 500 })
    }

    // 各パターンの適用スタッフ数をカウント
    const patternsWithCount = await Promise.all(
      (patterns || []).map(async (pattern) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('work_pattern_id', pattern.id)
          .is('deleted_at', null)

        return {
          ...pattern,
          user_count: count || 0,
        }
      })
    )

    return NextResponse.json({ patterns: patternsWithCount })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/attendance/work-patterns - 勤務パターン作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // 権限チェック（admin または manager のみ）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { name, expected_checkin_time, alert_time, is_night_shift, is_default } = body

    // 必須項目チェック
    if (!name || !expected_checkin_time || !alert_time) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // デフォルトパターンの場合、既存のデフォルトを解除
    if (is_default) {
      await supabase
        .from('work_patterns')
        .update({ is_default: false })
        .eq('organization_id', userData.organization_id)
        .eq('is_default', true)
    }

    // 新規作成
    const { data: newPattern, error: insertError } = await supabase
      .from('work_patterns')
      .insert({
        organization_id: userData.organization_id,
        name,
        expected_checkin_time,
        alert_time,
        is_night_shift: is_night_shift || false,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Work pattern insert error:', insertError)
      if (insertError.code === '23505') {
        return NextResponse.json({ error: '同じ名前の勤務パターンが既に存在します' }, { status: 400 })
      }
      return NextResponse.json({ error: '勤務パターンの作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pattern: newPattern })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
