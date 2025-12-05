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

    const supabase = await createClient()

    // トークンを持つユーザーを検索
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_reset_expires_at')
      .eq('password_reset_token', token)
      .is('deleted_at', null)
      .single()

    if (error || !user) {
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

    return NextResponse.json({ valid: true, email: user.email })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
