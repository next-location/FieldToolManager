import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/reset-password/validate?token=xxx - トークンの有効性を確認
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'トークンが指定されていません' }, { status: 400 })
    }

    const supabase = createClient()

    // トークンをpassword_reset_tokensテーブルから検索
    const { data: resetToken, error } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single()

    if (error || !resetToken) {
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
      .select('email')
      .eq('id', resetToken.user_id)
      .is('deleted_at', null)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ valid: true, email: user.email })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
