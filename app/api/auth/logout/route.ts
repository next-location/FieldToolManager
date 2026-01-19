import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logLogout } from '@/lib/audit-log'

export async function POST() {
  const supabase = await createClient()

  // ログアウト前にユーザーIDを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.auth.signOut()

  // 監査ログを記録
  if (user) {
    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userData) {
      await logLogout(user.id, undefined, user.id, userData.organization_id)
    }
  }

  return NextResponse.json({ success: true })
}
