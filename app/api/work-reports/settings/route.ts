import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

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

    // カスタムフィールドの不審なパターン検出
    if (body.custom_fields && Array.isArray(body.custom_fields)) {
      for (let i = 0; i < body.custom_fields.length; i++) {
        const field = body.custom_fields[i]

        // フィールド名のチェック
        if (field.name && hasSuspiciousPattern(field.name)) {
          return NextResponse.json(
            { error: `カスタムフィールド[${i + 1}]の名前に不正な文字列が含まれています` },
            { status: 400 }
          )
        }

        // 単位のチェック
        if (field.unit && hasSuspiciousPattern(field.unit)) {
          return NextResponse.json(
            { error: `カスタムフィールド[${i + 1}]の単位に不正な文字列が含まれています` },
            { status: 400 }
          )
        }

        // 選択肢のチェック
        if (field.options && Array.isArray(field.options)) {
          for (let j = 0; j < field.options.length; j++) {
            if (hasSuspiciousPattern(field.options[j])) {
              return NextResponse.json(
                { error: `カスタムフィールド[${i + 1}]の選択肢[${j + 1}]に不正な文字列が含まれています` },
                { status: 400 }
              )
            }
          }
        }
      }
    }

    // カスタムフィールドのHTMLエスケープ処理
    const sanitizedCustomFields = body.custom_fields
      ? body.custom_fields.map((field: any) => ({
          ...field,
          name: field.name ? escapeHtml(field.name) : field.name,
          unit: field.unit ? escapeHtml(field.unit) : field.unit,
          options: field.options
            ? field.options.map((opt: string) => escapeHtml(opt))
            : field.options,
        }))
      : []

    // 設定を更新（upsert）
    const { data: settings, error } = await supabase
      .from('organization_report_settings')
      .upsert({
        organization_id: userData?.organization_id,
        enable_work_location: body.enable_work_location ?? true,
        enable_progress_rate: body.enable_progress_rate ?? true,
        enable_materials: body.enable_materials ?? true,
        enable_tools: body.enable_tools ?? true,
        custom_fields: sanitizedCustomFields,
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
