import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/reset-password/update - パスワードを更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'トークンとパスワードが必要です' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 })
    }

    const supabase = await createClient()

    // トークンを持つユーザーを検索
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, organization_id, password_reset_expires_at')
      .eq('password_reset_token', token)
      .is('deleted_at', null)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'トークンが無効です' }, { status: 404 })
    }

    // トークンの有効期限をチェック
    if (!user.password_reset_expires_at) {
      return NextResponse.json({ error: 'トークンが無効です' }, { status: 400 })
    }

    const expiresAt = new Date(user.password_reset_expires_at)
    const now = new Date()

    if (now > expiresAt) {
      return NextResponse.json({ error: 'トークンの有効期限が切れています' }, { status: 400 })
    }

    // Supabase Authでパスワードを更新
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'パスワードの更新に失敗しました' }, { status: 500 })
    }

    // トークンを無効化
    await supabase
      .from('users')
      .update({
        password_reset_token: null,
        password_reset_expires_at: null,
      })
      .eq('id', user.id)

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
