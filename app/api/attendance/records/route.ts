import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { GetAttendanceRecordsResponse } from '@/types/attendance'

// GET /api/attendance/records - 勤怠一覧取得（フィルタリング・ページネーション）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('user_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const locationType = searchParams.get('location_type')
    const siteId = searchParams.get('site_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 権限チェック: leader, manager, adminのみ全員分閲覧可能、それ以外は自分のみ
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    const isLeaderOrAbove = ['leader', 'manager', 'admin'].includes(userData.role)
    const viewUserId = targetUserId || user.id

    // leaderは全員分閲覧可能だが、自分以外を指定して閲覧する場合はleader以上の権限が必要
    if (!isLeaderOrAbove && targetUserId && targetUserId !== user.id) {
      return NextResponse.json(
        { error: '他のユーザーの勤怠記録を閲覧する権限がありません' },
        { status: 403 }
      )
    }

    // クエリ構築
    let query = supabase
      .from('attendance_records')
      .select(
        `
        *,
        user:users!attendance_records_user_id_fkey(name, email, work_pattern_id),
        clock_in_site:sites!attendance_records_clock_in_site_id_fkey(name),
        clock_out_site:sites!attendance_records_clock_out_site_id_fkey(name),
        editor:users!attendance_records_edited_by_fkey(name)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', userData?.organization_id)

    // leader以上は全員分、それ以外は自分のみ（targetUserIdが指定されていればそのユーザーのみ）
    if (isLeaderOrAbove) {
      // leader以上: targetUserIdが指定されていればそのユーザー、なければ全員
      if (targetUserId) {
        query = query.eq('user_id', targetUserId)
      }
      // targetUserIdがない場合は全員分を取得（フィルタなし）
    } else {
      // user: 常に自分のみ
      query = query.eq('user_id', user.id)
    }

    // フィルター適用
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }
    if (locationType) {
      query = query.eq('clock_in_location_type', locationType)
    }
    if (siteId) {
      query = query.eq('clock_in_site_id', siteId)
    }

    // ソート（日付降順）
    query = query.order('date', { ascending: false })
    query = query.order('clock_in_time', { ascending: false })

    // ページネーション
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: records, error: fetchError, count } = await query

    if (fetchError) {
      console.error('Records fetch error:', fetchError)
      return NextResponse.json(
        { error: '勤怠記録の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 勤務パターン情報を取得
    const { data: workPatterns } = await supabase
      .from('work_patterns')
      .select('id, expected_checkin_time, expected_checkout_time')
      .eq('organization_id', userData?.organization_id)

    const workPatternMap = new Map(
      workPatterns?.map((wp) => [wp.id, wp]) || []
    )

    // レスポンス整形
    const formattedRecords = (records || []).map((record: any) => {
      const workPatternId = record.user?.work_pattern_id
      const workPattern = workPatternId ? workPatternMap.get(workPatternId) : null

      return {
        ...record,
        user_name: record.user?.name || '',
        user_email: record.user?.email || '',
        clock_in_site_name: record.clock_in_site?.name || null,
        clock_out_site_name: record.clock_out_site?.name || null,
        work_pattern: workPattern || null,
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    const response: GetAttendanceRecordsResponse = {
      records: formattedRecords,
      total: count || 0,
      page,
      limit,
      total_pages: totalPages,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/attendance/records error:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}
