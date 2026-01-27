import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkIsHolidayWork } from '@/lib/attendance/is-holiday-work'

/**
 * POST /api/attendance/check-holiday
 * 指定日が休日かどうかを判定するAPI
 *
 * リクエストボディ:
 * {
 *   "date": "2026-01-27" // YYYY-MM-DD形式
 * }
 *
 * レスポンス:
 * {
 *   "is_holiday": true,
 *   "reason": "祝日（元日）" or "休日（日曜日）" or null
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { date } = await request.json()

    if (!date) {
      return NextResponse.json({ error: '日付が必要です' }, { status: 400 })
    }

    // 日付フォーマットの検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: '日付はYYYY-MM-DD形式で指定してください' },
        { status: 400 }
      )
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 休日判定
    const result = await checkIsHolidayWork(date, userData.organization_id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Holiday Check] Error:', error)
    return NextResponse.json({ error: '祝日判定に失敗しました' }, { status: 500 })
  }
}
