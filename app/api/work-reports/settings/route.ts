import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { createClient } from '@/lib/supabase/server'

// 組織の作業報告書設定を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 組織の作業報告書設定を取得
    const { data: settings, error } = await supabase
      .from('organization_report_settings')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = レコードが見つからない
      console.error('設定取得エラー:', error)
      return NextResponse.json(
        { error: '設定の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      return NextResponse.json({
        organization_id: userData?.organization_id,
        enable_work_location: true,
        enable_progress_rate: true,
        enable_materials: true,
        enable_tools: true,
        custom_fields: [],
        require_approval: false,
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('設定取得エラー:', error)
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 組織の作業報告書設定を更新（admin のみ）
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの組織IDと権限を取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 管理者権限チェック
    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // 設定を更新（upsert）
    const { data: settings, error } = await supabase
      .from('organization_report_settings')
      .upsert({
        organization_id: userData?.organization_id,
        enable_work_location: body.enable_work_location ?? true,
        enable_progress_rate: body.enable_progress_rate ?? true,
        enable_materials: body.enable_materials ?? true,
        enable_tools: body.enable_tools ?? true,
        custom_fields: body.custom_fields ?? [],
        require_approval: body.require_approval ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('設定更新エラー:', error)
      return NextResponse.json(
        { error: '設定の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('設定更新エラー:', error)
    return NextResponse.json(
      { error: '設定の更新に失敗しました' },
      { status: 500 }
    )
  }
}
