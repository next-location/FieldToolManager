import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/attendance/alerts
 * ユーザーのアラート一覧を取得
 * クエリパラメータ:
 * - is_resolved: boolean (オプション)
 * - alert_type: string (オプション)
 * - limit: number (デフォルト50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証確認
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
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const isResolved = searchParams.get('is_resolved')
    const alertType = searchParams.get('alert_type')
    const limit = parseInt(searchParams.get('limit') || '50')

    // クエリ構築
    let query = supabase
      .from('attendance_alerts')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // 管理者は全アラート、一般ユーザーは自分のアラートのみ
    if (!['admin', 'manager'].includes(userData.role)) {
      query = query.eq('target_user_id', userData.id)
    }

    // フィルター適用
    if (isResolved !== null) {
      query = query.eq('is_resolved', isResolved === 'true')
    }

    if (alertType) {
      query = query.eq('alert_type', alertType)
    }

    const { data: alerts, error: alertsError } = await query

    if (alertsError) {
      console.error('アラート取得エラー:', alertsError)
      return NextResponse.json({ error: 'アラートの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      alerts: alerts || [],
      total: alerts?.length || 0,
    })
  } catch (error) {
    console.error('アラート取得エラー:', error)
    return NextResponse.json({ error: 'アラートの取得に失敗しました' }, { status: 500 })
  }
}

/**
 * PATCH /api/attendance/alerts
 * アラートを解決済みにする
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証確認
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
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { alert_ids } = body

    if (!alert_ids || !Array.isArray(alert_ids) || alert_ids.length === 0) {
      return NextResponse.json({ error: 'alert_idsは必須です' }, { status: 400 })
    }

    // アラートを解決済みに更新
    const { error: updateError } = await supabase
      .from('attendance_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .in('id', alert_ids)
      .eq('organization_id', userData.organization_id)
      .eq('is_resolved', false)

    if (updateError) {
      console.error('アラート更新エラー:', updateError)
      return NextResponse.json({ error: 'アラートの更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${alert_ids.length}件のアラートを解決済みにしました`,
    })
  } catch (error) {
    console.error('アラート更新エラー:', error)
    return NextResponse.json({ error: 'アラートの更新に失敗しました' }, { status: 500 })
  }
}
