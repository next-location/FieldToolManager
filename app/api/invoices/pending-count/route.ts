import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // マネージャー以上のみ承認待ち件数を取得
    if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ count: 0 })
    }

    // 承認待ち（submitted）の請求書件数を取得
    const { count, error } = await supabase
      .from('billing_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .eq('status', 'submitted')
      .is('deleted_at', null)

    if (error) {
      console.error('Error fetching pending invoices count:', error)
      return NextResponse.json({ error: '承認待ち件数の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Pending invoices count error:', error)
    return NextResponse.json({ error: '承認待ち件数の取得に失敗しました' }, { status: 500 })
  }
}
