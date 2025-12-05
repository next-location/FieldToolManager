import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// POST /api/staff/[id]/reset-password - パスワードリセットトークン発行
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const userId = params.id

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの組織ID・権限取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック（adminのみ）
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 対象スタッフが同じ組織に属しているか確認
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404 })
    }

    // トークン生成（ランダム32バイト）
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24時間有効

    // トークンをデータベースに保存
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_reset_token: resetToken,
        password_reset_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('Token update error:', updateError)
      return NextResponse.json({ error: 'トークンの保存に失敗しました' }, { status: 500 })
    }

    // 変更履歴記録
    await supabase.from('user_history').insert({
      organization_id: userData.organization_id,
      user_id: userId,
      changed_by: user.id,
      change_type: 'password_reset',
      old_values: {},
      new_values: { reset_requested: true },
      notes: 'パスワードリセットトークンが発行されました',
    })

    // メール送信（実装は環境に応じて）
    // 本番環境ではメール送信サービス（SendGrid, AWS SES等）を使用
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

    // TODO: 本番環境ではメール送信を実装
    // await sendEmail({
    //   to: targetUser.email,
    //   subject: 'パスワードリセットのご案内',
    //   html: `パスワードリセットのリクエストを受け付けました。以下のリンクから24時間以内にリセットしてください: ${resetUrl}`,
    // })

    return NextResponse.json({
      success: true,
      message: 'パスワードリセットトークンを発行しました',
      // 開発環境のみトークンURLを返す
      ...(process.env.NODE_ENV === 'development' && { reset_url: resetUrl }),
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
