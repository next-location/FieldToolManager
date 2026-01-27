import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // ユーザー認証
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const locationType = searchParams.get('location_type')
    const siteId = searchParams.get('site_id')

    // 勤怠記録を取得
    let query = supabase
      .from('attendance_records')
      .select(
        `
        id,
        date,
        clock_in_time,
        clock_out_time,
        clock_in_location_type,
        clock_out_location_type,
        is_manually_edited,
        edited_by_user_id,
        created_at,
        users!attendance_records_user_id_fkey (
          id,
          name,
          email
        ),
        clock_in_site:sites!attendance_records_clock_in_site_id_fkey (
          id,
          name
        ),
        clock_out_site:sites!attendance_records_clock_out_site_id_fkey (
          id,
          name
        )
      `
      )
      .eq('organization_id', userData.organization_id)
      .order('date', { ascending: false })
      .order('clock_in_time', { ascending: false })

    // フィルター適用
    if (userId) {
      query = query.eq('user_id', userId)
    }

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

    const { data: records, error } = await query

    if (error) {
      console.error('Failed to fetch attendance records:', error)
      return NextResponse.json({ error: '勤怠記録の取得に失敗しました' }, { status: 500 })
    }

    // CSV生成
    const csvRows: string[] = []

    // ヘッダー行
    csvRows.push(
      [
        '日付',
        'スタッフ名',
        'メールアドレス',
        '出勤時刻',
        '退勤時刻',
        '勤務時間（時間）',
        '出勤場所種別',
        '出勤現場',
        '退勤場所種別',
        '退勤現場',
        '編集済み',
        '登録日時',
      ].join(',')
    )

    // データ行
    for (const record of records || []) {
      const user = record.users as any
      const clockInSite = record.clock_in_site as any
      const clockOutSite = record.clock_out_site as any

      // 勤務時間計算
      let workHours = ''
      if (record.clock_in_time && record.clock_out_time) {
        const clockIn = new Date(record.clock_in_time)
        const clockOut = new Date(record.clock_out_time)
        const diffMs = clockOut.getTime() - clockIn.getTime()
        const hours = (diffMs / (1000 * 60 * 60)).toFixed(2)
        workHours = hours
      }

      // 場所種別のラベル
      const getLocationLabel = (type: string | null) => {
        if (!type) return ''
        switch (type) {
          case 'office':
            return '会社'
          case 'site':
            return '現場'
          case 'remote':
            return 'リモート'
          default:
            return type
        }
      }

      // 時刻フォーマット
      const formatTime = (datetime: string | null) => {
        if (!datetime) return ''
        return new Date(datetime).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        })
      }

      // 日付フォーマット
      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('ja-JP')
      }

      csvRows.push(
        [
          formatDate(record.date),
          user?.name || '',
          user?.email || '',
          formatTime(record.clock_in_time),
          formatTime(record.clock_out_time),
          workHours,
          getLocationLabel(record.clock_in_location_type),
          clockInSite?.name || '',
          getLocationLabel(record.clock_out_location_type),
          clockOutSite?.name || '',
          record.is_manually_edited ? 'はい' : 'いいえ',
          new Date(record.created_at).toLocaleString('ja-JP'),
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`) // CSVエスケープ
          .join(',')
      )
    }

    const csv = csvRows.join('\n')

    // BOMを追加してExcelで文字化けを防ぐ
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="attendance_records_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'エクスポートに失敗しました' }, { status: 500 })
  }
}
