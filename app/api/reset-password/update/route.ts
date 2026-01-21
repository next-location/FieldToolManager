import { NextRequest, NextResponse } from 'next/server'
import { validatePassword, DEFAULT_PASSWORD_POLICY } from '@/lib/password-policy'
import { sendPasswordChangedEmail } from '@/lib/email'

// POST /api/reset-password/update - パスワードを更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'トークンとパスワードが必要です' }, { status: 400 })
    }

    // パスワードポリシーチェック（8文字以上、大文字・小文字・数字必須）
    const passwordValidation = validatePassword(password, DEFAULT_PASSWORD_POLICY)
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        error: 'パスワードが要件を満たしていません',
        details: passwordValidation.errors
      }, { status: 400 })
    }

    // Service Role Keyでデータ取得・更新（RLS回避）
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // トークンをpassword_reset_tokensテーブルから検索
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single()

    if (tokenError || !resetToken) {
      return NextResponse.json({ error: 'トークンが無効です' }, { status: 404 })
    }

    // 使用済みチェック
    if (resetToken.used) {
      return NextResponse.json({ error: 'このトークンは既に使用されています' }, { status: 400 })
    }

    // トークンの有効期限をチェック
    const expiresAt = new Date(resetToken.expires_at)
    const now = new Date()

    if (now > expiresAt) {
      return NextResponse.json({ error: 'トークンの有効期限が切れています' }, { status: 400 })
    }

    // ユーザー情報と組織情報を取得
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, name, organization_id, organizations(subdomain, name)')
      .eq('id', resetToken.user_id)
      .is('deleted_at', null)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const subdomain = (user.organizations as any)?.subdomain
    const organizationName = (user.organizations as any)?.name || 'ザイロク'

    // Supabase Authでパスワードを更新
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'パスワードの更新に失敗しました' }, { status: 500 })
    }

    // トークンを使用済みにする
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', resetToken.id)

    // 変更履歴記録
    await supabaseAdmin.from('user_history').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      changed_by: user.id, // 自分自身
      change_type: 'password_reset',
      old_values: {},
      new_values: { password_reset_completed: true },
      notes: 'パスワードリセットが完了しました',
    })

    // パスワード変更完了メールを送信
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const changedAt = new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    await sendPasswordChangedEmail(user.email, {
      userName: user.name || user.email,
      changedAt,
      ipAddress: clientIp,
      organizationName,
      supportEmail: 'support@zairoku.com'
    })

    return NextResponse.json({
      success: true,
      message: 'パスワードが更新されました',
      subdomain: subdomain || null
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
