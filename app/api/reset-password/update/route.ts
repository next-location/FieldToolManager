import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validatePassword, DEFAULT_PASSWORD_POLICY } from '@/lib/password-policy'

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

    const supabase = await createClient()

    // トークンをpassword_reset_tokensテーブルから検索
    const { data: resetToken, error: tokenError } = await supabase
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

    // ユーザー情報を取得
    const { data: user } = await supabase
      .from('users')
      .select('id, email, organization_id')
      .eq('id', resetToken.user_id)
      .is('deleted_at', null)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // Supabase Authでパスワードを更新
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'パスワードの更新に失敗しました' }, { status: 500 })
    }

    // トークンを使用済みにする
    await supabase
      .from('password_reset_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', resetToken.id)

    // 変更履歴記録
    await supabase.from('user_history').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      changed_by: user.id, // 自分自身
      change_type: 'password_reset',
      old_values: {},
      new_values: { password_reset_completed: true },
      notes: 'パスワードリセットが完了しました',
    })

    return NextResponse.json({ success: true, message: 'パスワードが更新されました' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
