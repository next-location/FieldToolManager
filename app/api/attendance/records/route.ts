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

    // 権限チェック: staffは自分のみ閲覧可能
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    const viewUserId = targetUserId || user.id

    if (!isAdminOrManager && viewUserId !== user.id) {
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
        user:users!attendance_records_user_id_fkey(name, email),
        clock_in_site:sites!attendance_records_clock_in_site_id_fkey(name),
        clock_out_site:sites!attendance_records_clock_out_site_id_fkey(name)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', userData.organization_id)

    // admin/manager以外は自分のみ
    if (!isAdminOrManager) {
      query = query.eq('user_id', user.id)
    } else if (targetUserId) {
      query = query.eq('user_id', targetUserId)
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

    // レスポンス整形
    const formattedRecords = (records || []).map((record: any) => ({
      ...record,
      user_name: record.user?.name || '',
      user_email: record.user?.email || '',
      clock_in_site_name: record.clock_in_site?.name || null,
      clock_out_site_name: record.clock_out_site?.name || null,
    }))

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
