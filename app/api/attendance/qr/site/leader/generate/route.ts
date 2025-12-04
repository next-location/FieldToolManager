import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/attendance/qr/site/leader/generate
 * リーダーが現場用QRコードを発行（当日のみ有効）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リーダー・管理者権限確認
    if (!['leader', 'manager', 'admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'リーダー以上の権限が必要です' },
        { status: 403 }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const { site_id } = body

    if (!site_id) {
      return NextResponse.json({ error: '現場IDは必須です' }, { status: 400 })
    }

    // 現場存在確認と権限確認
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, organization_id')
      .eq('id', site_id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: '現場が見つかりません、または権限がありません' },
        { status: 404 }
      )
    }

    // 日本時間で今日の日付を取得
    const now = new Date()
    const jstOffset = 9 * 60 // 日本は UTC+9
    const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0] // YYYY-MM-DD

    // QRコードデータ生成
    // フォーマット: SITE:{site_id}:{leader_id}:{date}
    const qrData = `SITE:${site_id}:${userData.id}:${today}`

    // QRコード記録をデータベースに保存（履歴管理用）
    const { data: qrRecord, error: insertError } = await supabase
      .from('site_leader_qr_logs')
      .insert({
        organization_id: userData.organization_id,
        site_id,
        leader_id: userData.id,
        qr_data: qrData,
        valid_date: today,
        generated_at: now.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('QRコード記録エラー:', insertError)
      return NextResponse.json(
        { error: 'QRコードの記録に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      qr_data: qrData,
      site_name: site.name,
      valid_date: today,
      type: 'site_leader',
      message: `${site.name}の当日有効なQRコードを発行しました`,
    })
  } catch (error) {
    console.error('リーダーQR発行エラー:', error)
    return NextResponse.json(
      { error: 'QRコードの発行に失敗しました' },
      { status: 500 }
    )
  }
}
