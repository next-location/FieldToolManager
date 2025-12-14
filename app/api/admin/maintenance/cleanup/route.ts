/**
 * メンテナンス用クリーンアップAPI
 * 監査ログ、ログイン試行履歴、パスワード履歴の自動削除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（システム管理者のみ）
    const token = request.cookies.get('super_admin_token')?.value

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const jwt = await import('jsonwebtoken')
    let session: any

    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { retention_days = 365 } = body

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results = {
      audit_logs_deleted: 0,
      login_attempts_deleted: 0,
      password_history_deleted: 0,
      two_factor_tokens_deleted: 0,
    }

    // 監査ログの削除
    const { data: auditLogs } = await supabase.rpc('cleanup_old_audit_logs', {
      retention_days,
    })

    // ログイン試行履歴の削除
    const { data: loginAttempts } = await supabase.rpc('cleanup_old_login_attempts')

    // パスワード履歴の削除
    const { data: passwordHistory } = await supabase.rpc('cleanup_old_password_history')

    // 期限切れ2FAトークンの削除
    const { data: twoFactorTokens } = await supabase.rpc('cleanup_expired_2fa_tokens')

    // 削除件数を取得（簡易実装）
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retention_days)

    const { count: auditCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString())

    const { count: loginCount } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .lt('attempted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const { count: tokenCount } = await supabase
      .from('two_factor_tokens')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    results.audit_logs_deleted = auditCount || 0
    results.login_attempts_deleted = loginCount || 0
    results.two_factor_tokens_deleted = tokenCount || 0

    // 実際の削除実行
    await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    await supabase
      .from('login_attempts')
      .delete()
      .lt('attempted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    await supabase
      .from('two_factor_tokens')
      .delete()
      .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // パスワード履歴の削除（ユーザーごとに最新10件のみ保持）
    const { data: users } = await supabase.from('users').select('id')

    let passwordHistoryDeleted = 0
    for (const user of users || []) {
      const { data: histories } = await supabase
        .from('password_history')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (histories && histories.length > 10) {
        const toDelete = histories.slice(10).map((h) => h.id)
        const { count } = await supabase
          .from('password_history')
          .delete()
          .in('id', toDelete)
          .select('*', { count: 'exact', head: true })

        passwordHistoryDeleted += count || 0
      }
    }

    results.password_history_deleted = passwordHistoryDeleted

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'メンテナンスクリーンアップ実行',
      details: {
        retention_days,
        results,
      },
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json({
      success: true,
      message: 'クリーンアップが完了しました',
      results,
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}

/**
 * 自動クリーンアップスケジュール設定の取得・更新
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（システム管理者のみ）
    const token = request.cookies.get('super_admin_token')?.value

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const jwt = await import('jsonwebtoken')
    try {
      jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // システム設定から自動クリーンアップ設定を取得
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'auto_cleanup')
      .single()

    if (!settings) {
      return NextResponse.json({
        enabled: false,
        retention_days: 365,
        schedule: 'daily',
        last_run: null,
      })
    }

    return NextResponse.json(settings.value)
  } catch (error) {
    console.error('Get cleanup settings error:', error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}

/**
 * 自動クリーンアップスケジュール設定の更新
 */
export async function PUT(request: NextRequest) {
  try {
    // 認証チェック（システム管理者のみ）
    const token = request.cookies.get('super_admin_token')?.value

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const jwt = await import('jsonwebtoken')
    let session: any

    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { enabled, retention_days, schedule } = body

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 設定を更新
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'auto_cleanup',
        value: {
          enabled,
          retention_days,
          schedule,
          last_run: null,
        },
      })

    if (updateError) {
      console.error('Failed to update cleanup settings:', updateError)
      return NextResponse.json(
        { error: '設定の更新に失敗しました' },
        { status: 500 }
      )
    }

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: '自動クリーンアップ設定更新',
      details: {
        enabled,
        retention_days,
        schedule,
      },
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json({
      success: true,
      message: '自動クリーンアップ設定を更新しました',
    })
  } catch (error) {
    console.error('Update cleanup settings error:', error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}
