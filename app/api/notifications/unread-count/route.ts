import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 未読通知数を取得（target_user_idが指定されている場合はそのユーザー宛、なければ組織全体）
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData?.organization_id)
      .eq('is_read', false)
      .is('deleted_at', null)
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)

    if (error) {
      console.error('Failed to fetch unread count:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
