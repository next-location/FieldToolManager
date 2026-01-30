import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// GET /api/purchase-orders/settings - 発注書設定取得
export async function GET() {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 設定取得
    let { data: settings } = await supabase
      .from('purchase_order_settings')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .maybeSingle()

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      settings = {
        organization_id: userData.organization_id,
        approval_threshold_level1: 100000,
        approval_threshold_level2: 1000000,
        require_project: false,
        auto_numbering_prefix: 'PO',
      }
    }

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// PUT /api/purchase-orders/settings - 発注書設定更新（管理者のみ）
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

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 管理者のみ更新可能
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const {
      approval_threshold_level1,
      approval_threshold_level2,
      require_project,
      auto_numbering_prefix,
    } = body

    // バリデーション
    if (approval_threshold_level1 < 0 || approval_threshold_level2 < 0) {
      return NextResponse.json({ error: '承認金額は0以上である必要があります' }, { status: 400 })
    }

    if (approval_threshold_level1 >= approval_threshold_level2) {
      return NextResponse.json(
        { error: 'レベル1の閾値はレベル2より小さい値にしてください' },
        { status: 400 }
      )
    }

    // 不審なパターン検出
    if (auto_numbering_prefix && hasSuspiciousPattern(auto_numbering_prefix)) {
      return NextResponse.json(
        { error: '自動採番接頭辞に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' },
        { status: 400 }
      )
    }

    // HTMLエスケープ処理
    const sanitizedPrefix = auto_numbering_prefix ? escapeHtml(auto_numbering_prefix) : 'PO'

    // 既存設定確認
    const { data: existingSettings } = await supabase
      .from('purchase_order_settings')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .maybeSingle()

    const now = new Date().toISOString()
    let result

    if (existingSettings) {
      // 更新
      result = await supabase
        .from('purchase_order_settings')
        .update({
          approval_threshold_level1,
          approval_threshold_level2,
          require_project,
          auto_numbering_prefix: sanitizedPrefix,
          updated_at: now,
        })
        .eq('organization_id', userData.organization_id)
        .select()
        .single()
    } else {
      // 新規作成
      result = await supabase
        .from('purchase_order_settings')
        .insert({
          organization_id: userData.organization_id,
          approval_threshold_level1,
          approval_threshold_level2,
          require_project,
          auto_numbering_prefix: sanitizedPrefix,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error updating settings:', result.error)
      return NextResponse.json({ error: '設定の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ data: result.data, message: '設定を更新しました' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
